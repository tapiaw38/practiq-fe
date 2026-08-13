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
  extracted_text?: string;
  status: string;
  created_at: string;
}
