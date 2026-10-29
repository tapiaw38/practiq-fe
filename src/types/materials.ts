export type MaterialType = 'pdf' | 'image' | 'video' | 'text' | 'worksheet';

export interface Material {
    id: string;
    course_id: string;
    teacher_id: string;
    title: string;
    type: MaterialType;
    file_url?: string;

    view_url?: string;

    extracted_text?: string;

    extracted_text_truncated?: boolean;
    status: string;
    created_at: string;
}
