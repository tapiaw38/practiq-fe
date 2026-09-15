import type { Exercise } from "@/types";
import { practiqApi } from "@/api/request/server";
import { fileKind } from "@/utils/fileKind";

type JsonRecord = Record<string, unknown>;

export type AssistantMediaAttachment = {
  dataUrl: string;
  filename: string;
  contentType: string;
  field: "voice_content";
};

// Base64 expands media by roughly one third. Keep browser-generated payloads
// below the assistant proxy's 25 MiB cap.
const maxAssistantMediaBytes = 18 << 20;

const teacherImageKeys = [
  "teacher_image",
  "teacherImage",
  "prompt_image",
  "promptImage",
  "question_image",
  "questionImage",
  "image",
  "image_data",
  "imageData",
  "content_data",
  "contentData",
  "canvas_data",
  "canvasData",
];

function isDataUrlImage(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

export function parseExerciseMetadata(metadata?: string): JsonRecord | null {
  if (!metadata) return null;

  const trimmed = metadata.trim();
  if (!trimmed) return null;
  if (isDataUrlImage(trimmed)) {
    return { image_data: trimmed };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? (parsed as JsonRecord) : null;
  } catch {
    return null;
  }
}

export function extractTeacherImageDataUrl(
  exercise?: Pick<Exercise, "question" | "metadata"> | null,
): string {
  if (!exercise) return "";
  if (isDataUrlImage(exercise.question)) {
    return exercise.question;
  }

  const metadata = parseExerciseMetadata(exercise.metadata);
  if (!metadata) return "";

  for (const key of teacherImageKeys) {
    const value = metadata[key];
    if (isDataUrlImage(value)) {
      return value;
    }
  }

  return "";
}

export function summarizeExerciseMetadata(
  exercise?: Pick<Exercise, "metadata"> | null,
): JsonRecord | null {
  const metadata = parseExerciseMetadata(exercise?.metadata);
  if (!metadata) return null;

  const summary: JsonRecord = {};

  for (const [key, value] of Object.entries(metadata)) {
    // The bucket is private, so the raw URL is noise the assistant cannot use.
    // It still gets told the statement has media attached.
    if (key === "media_url") {
      if (value) summary[key] = "[statement_media]";
      continue;
    }
    if (teacherImageKeys.includes(key)) {
      summary[key] = isDataUrlImage(value) ? "[teacher_image_data_url]" : value;
      continue;
    }
    if (typeof value === "string") {
      summary[key] = value.length > 400 ? `${value.slice(0, 400)}...` : value;
      continue;
    }
    summary[key] = value;
  }

  return Object.keys(summary).length > 0 ? summary : null;
}

async function fetchStatementMedia(url: string, assistantMediaPath?: string): Promise<Blob | null> {
  try {
    if (assistantMediaPath) {
      const response = await practiqApi.get<Blob>(assistantMediaPath, {
        responseType: "blob",
      });
      const blob = response.data;
      return blob.size > 0 && blob.size <= maxAssistantMediaBytes ? blob : null;
    }
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return blob.size > 0 && blob.size <= maxAssistantMediaBytes ? blob : null;
  } catch {
    return null;
  }
}

async function blobToDataURL(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Only statement images have a Gillie Vision channel. Videos are not accepted
// for new exercises until a supported video-analysis flow exists.
export async function statementMediaPreviewDataURL(
  exercise?: Pick<Exercise, "media_view_url"> | null,
  assistantMediaPath?: string,
): Promise<string> {
  const url = exercise?.media_view_url || "";
  const kind = fileKind(url);
  if (!url || kind !== "image") return "";
  const blob = await fetchStatementMedia(url, assistantMediaPath);
  if (!blob) return "";
  return blobToDataURL(blob);
}

export async function statementMediaAudioAttachment(
  exercise?: Pick<Exercise, "media_view_url"> | null,
  assistantMediaPath?: string,
): Promise<AssistantMediaAttachment | null> {
  const url = exercise?.media_view_url || "";
  if (!url || fileKind(url) !== "audio") return null;
  const blob = await fetchStatementMedia(url, assistantMediaPath);
  if (!blob) return null;
  const contentType = blob.type.startsWith("audio/") ? blob.type : "audio/mpeg";
  const extension = contentType.includes("ogg") ? "ogg" : contentType.includes("wav") ? "wav" : contentType.includes("webm") ? "webm" : contentType.includes("mp4") ? "m4a" : "mp3";
  return {
    dataUrl: await blobToDataURL(blob),
    filename: `enunciado.${extension}`,
    contentType,
    field: "voice_content",
  };
}

export async function loadImageFromDataUrl(
  dataUrl: string,
): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = dataUrl;
  });
}

/** Anything at or below this grey counts as a stroke rather than page. */
const INK_GREY_MAX = 188;
/** Breathing room kept around the strokes, in source pixels. */
const INK_CROP_PADDING = 28;

/**
 * Turns a raw drawing-canvas export into the image the grader should see:
 * the strokes over the white page the student actually had, trimmed to what
 * they wrote.
 *
 * Two things this deliberately does NOT do:
 *
 * DrawingCanvas only ever clears its bitmap, so `toDataURL` hands back the
 * `#1e293b` strokes over fully transparent pixels — the page white is CSS on
 * the element, not part of the image. Whoever flattens that transparency picks
 * the ink's background, and the grading pipeline picks black, which leaves
 * near-black strokes on black and reads back UNREADABLE. So it fills white.
 *
 * And it does not threshold to pure black and white. Practice and the level
 * test used to, the notebook still did until this replaced it, and on a real
 * `#1e293b` stroke that collapses 162 grey levels to 2 and drops ~16% of the
 * stroke's pixels — the antialiased edge a vision model reads weight and shape
 * from. A 1-bit threshold is preprocessing for classical OCR, not for this.
 */
export async function prepareHandwritingImage(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return "";

  let img: HTMLImageElement;
  try {
    img = await loadImageFromDataUrl(dataUrl);
  } catch {
    return dataUrl;
  }

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return dataUrl;

  const flat = document.createElement("canvas");
  flat.width = width;
  flat.height = height;
  const flatCtx = flat.getContext("2d");
  if (!flatCtx) return dataUrl;

  flatCtx.fillStyle = "#ffffff";
  flatCtx.fillRect(0, 0, width, height);
  flatCtx.drawImage(img, 0, 0);

  const bounds = inkBounds(flatCtx, width, height);
  // No strokes found: send the flattened page rather than an empty crop.
  if (!bounds) return flat.toDataURL("image/png");

  const minX = Math.max(0, bounds.minX - INK_CROP_PADDING);
  const minY = Math.max(0, bounds.minY - INK_CROP_PADDING);
  const maxX = Math.min(width - 1, bounds.maxX + INK_CROP_PADDING);
  const maxY = Math.min(height - 1, bounds.maxY + INK_CROP_PADDING);
  const cropW = Math.max(1, maxX - minX + 1);
  const cropH = Math.max(1, maxY - minY + 1);

  if (cropW === width && cropH === height) return flat.toDataURL("image/png");

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  const ctx = out.getContext("2d");
  if (!ctx) return flat.toDataURL("image/png");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cropW, cropH);
  ctx.drawImage(flat, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  // PNG, like composeTeacherAndStudentImage: handwriting is line art, so this
  // stays small and skips the JPEG ringing that blurs thin strokes.
  return out.toDataURL("image/png");
}

/** Tightest box containing the strokes, or null when the page is blank. */
function inkBounds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const grey =
        0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      if (pixels[idx + 3] < 8 || grey > INK_GREY_MAX) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  return maxX < minX || maxY < minY ? null : { minX, minY, maxX, maxY };
}

export async function composeTeacherAndStudentImage(params: {
  teacherDataUrl?: string;
  studentDataUrl?: string;
  teacherLabel?: string;
  studentLabel?: string;
}): Promise<string> {
  const teacherDataUrl = params.teacherDataUrl || "";
  const studentDataUrl = params.studentDataUrl || "";

  if (!teacherDataUrl) return studentDataUrl;
  if (!studentDataUrl) return teacherDataUrl;

  const [teacherImg, studentImg] = await Promise.all([
    loadImageFromDataUrl(teacherDataUrl),
    loadImageFromDataUrl(studentDataUrl),
  ]);

  const sourceTeacherWidth = teacherImg.naturalWidth || teacherImg.width;
  const sourceTeacherHeight = teacherImg.naturalHeight || teacherImg.height;
  const sourceStudentWidth = studentImg.naturalWidth || studentImg.width;
  const sourceStudentHeight = studentImg.naturalHeight || studentImg.height;
  const width = Math.max(sourceTeacherWidth, sourceStudentWidth, 1100);
  const labelHeight = 42;
  const gap = 18;
  const padding = 20;
  const contentWidth = width - padding * 2;
  const teacherScale = contentWidth / sourceTeacherWidth;
  const studentScale = contentWidth / sourceStudentWidth;
  const teacherHeight = Math.round(sourceTeacherHeight * teacherScale);
  const studentHeight = Math.round(sourceStudentHeight * studentScale);
  const height =
    padding +
    labelHeight +
    teacherHeight +
    gap +
    labelHeight +
    studentHeight +
    padding;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return teacherDataUrl || studentDataUrl;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#123c52";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(
    params.teacherLabel || "Consigna del docente",
    padding,
    padding + 26,
  );
  ctx.drawImage(
    teacherImg,
    padding,
    padding + labelHeight,
    contentWidth,
    teacherHeight,
  );

  const studentTop = padding + labelHeight + teacherHeight + gap;
  ctx.fillStyle = "#123c52";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(
    params.studentLabel || "Respuesta del alumno",
    padding,
    studentTop + 26,
  );
  ctx.drawImage(
    studentImg,
    padding,
    studentTop + labelHeight,
    contentWidth,
    studentHeight,
  );

  return canvas.toDataURL("image/png");
}

export async function dataUrlHasUserInk(dataUrl: string): Promise<boolean> {
  if (!dataUrl) return false;

  let img: HTMLImageElement;
  try {
    img = await loadImageFromDataUrl(dataUrl);
  } catch {
    return false;
  }

  const sample = document.createElement("canvas");
  const maxSide = 320;
  const scale = Math.min(
    1,
    maxSide /
      Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height),
  );
  sample.width = Math.max(
    1,
    Math.floor((img.naturalWidth || img.width) * scale),
  );
  sample.height = Math.max(
    1,
    Math.floor((img.naturalHeight || img.height) * scale),
  );

  const ctx = sample.getContext("2d");
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, sample.width, sample.height);

  const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
  let darkPixels = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 20) continue;
    const gray =
      0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    if (gray < 140) darkPixels++;
    if (darkPixels > 12) return true;
  }

  return false;
}

export async function pickBestStudentImage(
  dataUrls: Array<string | undefined | null>,
): Promise<string> {
  const candidates = dataUrls.filter((value): value is string => !!value);
  for (const dataUrl of candidates) {
    if (await dataUrlHasUserInk(dataUrl)) {
      return dataUrl;
    }
  }
  return candidates[0] || "";
}

export async function composeAssistantWorkImage(params: {
  teacherDataUrl?: string;
  studentDataUrl?: string;
  teacherLabel?: string;
  studentLabel?: string;
}): Promise<string> {
  if (params.teacherDataUrl && params.studentDataUrl) {
    return composeTeacherAndStudentImage(params);
  }
  return params.teacherDataUrl || params.studentDataUrl || "";
}
