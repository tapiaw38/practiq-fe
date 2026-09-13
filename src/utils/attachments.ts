import type { AttachmentKind, Exercise } from "@/types";

export const ATTACHMENT_KINDS: { value: AttachmentKind; label: string }[] = [
  { value: "audio", label: "Audio" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Imagen" },
  { value: "doc", label: "Documento" },
];

/** MIME types the backend whitelist accepts, per family. */
const ACCEPT_BY_KIND: Record<AttachmentKind, string[]> = {
  audio: ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav"],
  pdf: ["application/pdf"],
  image: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  doc: [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.oasis.opendocument.text",
    "text/plain",
  ],
};

/** Reads the accepted families out of an exercise's metadata. */
export function acceptedKinds(exercise?: Pick<Exercise, "metadata"> | null): AttachmentKind[] {
  if (!exercise?.metadata) return [];
  try {
    const parsed = JSON.parse(exercise.metadata);
    const accept = parsed?.accept;
    if (!Array.isArray(accept)) return [];
    return accept.filter((kind: unknown): kind is AttachmentKind =>
      ATTACHMENT_KINDS.some((option) => option.value === kind),
    );
  } catch {
    return [];
  }
}

/** Builds the `accept` attribute for a file input. Empty means anything the API allows. */
export function acceptAttribute(kinds: AttachmentKind[]): string {
  if (!kinds.length) {
    return Object.values(ACCEPT_BY_KIND).flat().join(",");
  }
  return kinds.flatMap((kind) => ACCEPT_BY_KIND[kind]).join(",");
}

export function kindLabel(kind: AttachmentKind): string {
  return ATTACHMENT_KINDS.find((option) => option.value === kind)?.label ?? kind;
}
