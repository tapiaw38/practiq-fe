export type ExerciseType =
  | "multiple_choice"
  | "handwritten"
  | "open_text"
  | "equation"
  | "canvas";

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
  created_at: string;
}
