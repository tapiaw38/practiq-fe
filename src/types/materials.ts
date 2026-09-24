export type MaterialType = "pdf" | "image" | "video" | "text" | "worksheet";

export interface Material {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string;
  type: MaterialType;
  file_url?: string;
  /** Short-lived signed URL. The bucket is private, so file_url alone 404s. */
  view_url?: string;
  /**
   * In a listing this is only the beginning of the text; the whole of it is
   * read from `GET /materials/:id`. Materials hold the full extracted document,
   * which is far more than the two clamped lines a list shows.
   */
  extracted_text?: string;
  /** The text above was cut and the rest has to be fetched. */
  extracted_text_truncated?: boolean;
  status: string;
  created_at: string;
}
