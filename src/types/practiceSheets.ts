import type { Exercise } from "./exercises";

export type PracticeSheetType = "practice" | "level_test";
export type PracticeSheetTestStyle = "keyboard" | "canvas";

export interface PracticeSheetExercise {
  id: string;
  order_index: number;
  exercise: Exercise;
}

export interface PracticeSheet {
  id: string;
  course_id: string;
  topic_id: string;
  strategy_id: string;
  title: string;
  level: number;
  sheet_type: PracticeSheetType;
  test_style: PracticeSheetTestStyle;
  created_by: string;
  created_at: string;
  exercises: PracticeSheetExercise[];
}

export interface AttemptInput {
  exercise_id: string;
  answer_text: string;
  canvas_data?: string;
  time_spent_seconds: number;
  hints_used: number;
}

export interface SubmitInput {
  attempts: AttemptInput[];
}

export interface ExerciseResult {
  exercise_id: string;
  is_correct: boolean;
  student_answer: string;
  correct_answer: string;
  ai_feedback?: string;
}

export interface SubmitResult {
  score: number;
  correct: number;
  total: number;
  mastery_score: number;
  recommendation: string;
  ai_feedback?: string;
  should_level_up: boolean;
  should_repeat: boolean;
  next_level: number;
  exercise_results: ExerciseResult[];
}

export interface SubmitJobStart {
  job_id: string;
  status: "processing";
}

export interface SubmitJobStatus {
  status: "processing" | "done" | "failed";
  result?: { data: SubmitResult };
  error_code?: string;
  message?: string;
  created_at: string;
  updated_at: string;
}
