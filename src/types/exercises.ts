export type ExerciseType =
  | "multiple_choice"
  | "handwritten"
  | "open_text"
  | "equation"
  | "canvas"
  | "attachment"
  | "fill_blanks";

/** File families an attachment exercise can accept. */
export type AttachmentKind = "audio" | "pdf" | "image" | "doc";

export interface Exercise {
  id: string;
  topic_id: string;
  material_id?: string;
  type: ExerciseType;
  question: string;
  correct_answer?: string;
  explanation?: string;
  difficulty: number;
  metadata?: string;
  /**
   * Short-lived signed URL for the media attached to the statement. The API
   * builds it from the canonical URL kept in `metadata.media_url`, which is
   * the one that gets written back on edit.
   */
  media_view_url?: string;
  created_at: string;
}
