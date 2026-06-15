export interface TopicProgress {
  topic_id: string;
  topic_title: string;
  strategy_id: string;
  mastery_score: number;
  current_level: number;
  total_attempts: number;
  correct_attempts: number;
  streak_days: number;
  last_practiced_at: string;
}

export interface ProgressResponse {
  data: TopicProgress[];
  last_practiced_sheet_id?: string;
}

export interface StudentAttempt {
  id: string;
  student_id: string;
  exercise_id: string;
  practice_sheet_id: string;
  answer_text: string;
  ai_feedback?: string;
  is_correct: boolean;
  score: number;
  time_spent_seconds: number;
  hints_used: number;
  created_at: string;
}

export interface CourseProgress {
  id?: string;
  student_id: string;
  course_id: string;
  current_level: number;
  updated_at?: string;
}
