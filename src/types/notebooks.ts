export type NotebookPageContentType = "canvas" | "text";

export interface NotebookSubmitJobStart {
  job_id: string;
  status: "processing";
}

export interface NotebookSubmitJobStatus {
  status: "processing" | "done" | "failed";
  error_code?: string;
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface NotebookSubmission {
  id: string;
  canvas_data: string;
  answer_text: string;
  ai_recognized_text?: string;
  ai_is_correct?: boolean;
  ai_feedback?: string;
  ai_reviewed_at?: string;
  teacher_is_correct?: boolean;
  teacher_feedback?: string;
  teacher_reviewed_at?: string;
}

export interface NotebookPage {
  id: string;
  notebook_id: string;
  page_number: number;
  title: string;
  content_type: NotebookPageContentType;
  content_data: string;
  instructions: string;
  submission?: NotebookSubmission;
}

export interface Notebook {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string;
  description: string;
  level: number;
  pages: NotebookPage[];
  created_at: string;
}

export interface NotebookSubmissionFull {
  id: string;
  page_id: string;
  student_id: string;
  student_name?: string;
  student_email?: string;
  notebook_id: string;
  notebook_title?: string;
  page_title?: string;
  page_number: number;
  canvas_data: string;
  answer_text: string;
  ai_recognized_text?: string;
  ai_is_correct?: boolean;
  ai_feedback?: string;
  ai_reviewed_at?: string;
  teacher_is_correct?: boolean;
  teacher_feedback?: string;
  teacher_reviewed_at?: string;
  created_at: string;
}
