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
  /** UTC ISO string. Absent when the sheet can be taken at any time. */
  scheduled_at?: string;
  /** UTC ISO string. Absent means the sheet stays open once it opens. */
  available_until?: string;
  /** How many times a student may submit. null means the sheet sets no limit:
   *  a level test still allows one, a practice is not counted. */
  max_attempts?: number | null;
  /** Minutes from when the student opens the test. null means no limit. */
  time_limit_minutes?: number | null;
  /** The asking student's own standing, absent for a teacher. */
  attempts_used?: number;
  attempts_allowed?: number;
  /** UTC ISO string: when this student runs out of time. */
  deadline?: string;
  created_by: string;
  created_at: string;
  /** Global student streak at time this practice opened. */
  streak_days: number;
  exercises: PracticeSheetExercise[];
}

export interface AttemptInput {
  exercise_id: string;
  answer_text: string;
  canvas_data?: string;
  /** Uploaded answer file. The backend verifies it belongs to this student. */
  attachment_url?: string;
  attachment_name?: string;
  attachment_content_type?: string;
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
  /**
   * The answer was handed to the teacher. Only a level test does that; on a
   * practice it is never set.
   */
  needs_teacher_review?: boolean;
  /**
   * Nobody could put a verdict on this answer, so it is out of the score
   * instead of counted as wrong. On a practice nobody will correct it later
   * either, so it must not be shown as an error.
   */
  not_graded?: boolean;
}

/** Why XP was paid and how much, grouped by reason. Built by the server. */
export interface XPBreakdownEntry {
  event_type: string;
  points: number;
  /** How many awards of this kind: three solved exercises are one entry. */
  count: number;
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
  /**
   * Every answer is awaiting the teacher, so there is no score to act on.
   * Only a level test can set it: a practice always comes back with a result.
   */
  pending_review?: boolean;
  next_level: number;
  /** Global student streak after submission. */
  streak_days: number;
  /** XP earned by this submission. Resubmitting the same sheet earns nothing. */
  xp_gained: number;
  /** Total XP in the course after this submission. */
  course_xp: number;
  /**
   * One entry per reason that paid, in the order it was earned. Absent when
   * the submission earned nothing.
   */
  xp_breakdown?: XPBreakdownEntry[];
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
