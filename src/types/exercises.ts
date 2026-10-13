export type ExerciseType =
    | 'multiple_choice'
    | 'handwritten'
    | 'open_text'
    | 'equation'
    | 'canvas'
    | 'attachment'
    | 'fill_blanks';

export type AttachmentKind = 'audio' | 'pdf' | 'image' | 'doc';

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

    media_view_url?: string;

    has_teacher_image?: boolean;
    created_at: string;
}
