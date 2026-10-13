import type { Exercise } from './exercises';

export type PracticeSheetType = 'practice' | 'level_test';
export type PracticeSheetTestStyle = 'keyboard' | 'canvas';

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

    scheduled_at?: string;

    available_until?: string;

    max_attempts?: number | null;

    time_limit_minutes?: number | null;

    attempts_used?: number;
    attempts_allowed?: number;

    deadline?: string;
    created_by: string;
    created_at: string;

    streak_days: number;
    exercises: PracticeSheetExercise[];
}

export interface AttemptInput {
    exercise_id: string;
    answer_text: string;
    canvas_data?: string;

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

    needs_teacher_review?: boolean;

    not_graded?: boolean;
}

export interface XPBreakdownEntry {
    event_type: string;
    points: number;

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

    pending_review?: boolean;
    next_level: number;

    streak_days: number;

    xp_gained: number;

    course_xp: number;

    xp_breakdown?: XPBreakdownEntry[];
    exercise_results: ExerciseResult[];
}

export interface SubmitJobStart {
    job_id: string;
    status: 'processing';
}

export interface SubmitJobStatus {
    status: 'processing' | 'done' | 'failed';
    result?: { data: SubmitResult };
    error_code?: string;
    message?: string;
    created_at: string;
    updated_at: string;
}
