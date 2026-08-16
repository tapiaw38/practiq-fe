/** How a stored file should be rendered. */
export type FileKind = "pdf" | "image" | "video" | "audio" | "text" | "download";

const EXTENSION_KINDS: Record<string, FileKind> = {
  pdf: "pdf",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  mp4: "video",
  webm: "video",
  ogv: "video",
  mov: "video",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  m4a: "audio",
  txt: "text",
};

/** The path's extension, minus the signature query a presigned URL carries. */
function extensionOf(url: string): string {
  try {
    const path = new URL(url, window.location.origin).pathname;
    return path.split(".").pop()?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

/**
 * Classifies a file by URL, falling back to the content type when the
 * extension is unknown. Office documents have no native viewer, so they end up
 * as "download".
 */
export function fileKind(url: string, contentType = ""): FileKind {
  const byExtension = EXTENSION_KINDS[extensionOf(url)];
  if (byExtension) return byExtension;

  const type = contentType.split(";")[0].trim().toLowerCase();
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "text/plain") return "text";

  return "download";
}
