export interface AttemptReview {
    attempt_id: string;
    student_id: string;
    student_name?: string;
    exercise_id: string;
    question: string;
    exercise_type: string;

    statement_media_view_url?: string;
    practice_sheet_id?: string;
    practice_sheet_title?: string;
    sheet_type?: string;
    course_id: string;
    course_title: string;

    has_teacher_image?: boolean;

    image_view_url?: string;
    attachment_url?: string;

    attachment_view_url?: string;
    attachment_name?: string;
    attachment_content_type?: string;
    answer_text?: string;
    ai_feedback?: string;

    ai_is_correct?: boolean;
    teacher_is_correct?: boolean;
    teacher_feedback?: string;
    teacher_reviewed_at?: string;
    created_at: string;
}
