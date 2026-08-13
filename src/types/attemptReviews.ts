export interface AttemptReview {
  attempt_id: string;
  student_id: string;
  student_name?: string;
  exercise_id: string;
  question: string;
  exercise_type: string;
  practice_sheet_id?: string;
  practice_sheet_title?: string;
  sheet_type?: string;
  course_id: string;
  course_title: string;
  attachment_url?: string;
  /** Short-lived signed URL; the bucket is private, so attachment_url 403s. */
  attachment_view_url?: string;
  attachment_name?: string;
  attachment_content_type?: string;
  answer_text?: string;
  ai_feedback?: string;
  /** The assistant's suggestion. Never the grade — the teacher decides. */
  ai_is_correct?: boolean;
  teacher_is_correct?: boolean;
  teacher_feedback?: string;
  teacher_reviewed_at?: string;
  created_at: string;
}
