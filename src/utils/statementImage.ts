import type { Exercise } from "@/types";
import { practiqApi } from "@/api/request/server";

/**
 * The handwritten statement of an exercise, as a data URL.
 *
 * The drawing does not travel in exercise payloads: a single canvas outweighed
 * the sheet it belonged to, and a course listing came to 46 KB of which 93% was
 * base64. Whatever needs to display it reads it from here instead.
 *
 * The bytes come through the API rather than from a bucket URL on purpose. Both
 * callers draw the image into a canvas and export it afterwards — the editor to
 * let a teacher change the drawing, the practice screen to compose the page it
 * sends for grading — and a cross-origin image taints a canvas so it can no
 * longer be exported.
 */
const cache = new Map<string, Promise<string>>();

export function statementImageDataURL(
  exercise?: Pick<Exercise, "id" | "has_teacher_image"> | null,
): Promise<string> {
  if (!exercise?.id || !exercise.has_teacher_image) return Promise.resolve("");

  const cached = cache.get(exercise.id);
  if (cached) return cached;

  const pending = fetchStatementImage(exercise.id);
  cache.set(exercise.id, pending);
  return pending;
}

/**
 * Forget an exercise's drawing, so the next read sees the current one.
 *
 * Needed after saving: the cache is keyed by exercise id, and a teacher who
 * redraws a statement expects to see what they just drew.
 */
export function forgetStatementImage(exerciseId?: string) {
  if (exerciseId) cache.delete(exerciseId);
  else cache.clear();
}

async function fetchStatementImage(exerciseId: string): Promise<string> {
  try {
    const response = await practiqApi.get<Blob>(
      `/exercises/${exerciseId}/statement-image`,
      { responseType: "blob" },
    );
    if (!response.data?.size) return "";
    return await blobToDataURL(response.data);
  } catch {
    // A missing statement is not worth breaking the screen over; the exercise
    // still has its text, and the flag may simply be stale.
    cache.delete(exerciseId);
    return "";
  }
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
