export type ProfileType = 'teacher' | 'student';
export type AcademicStatus = 'active' | 'blocked';

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    profile_type: ProfileType;
    academic_status: AcademicStatus;

    timezone?: string;

    assistant_enabled: boolean;
    ui_theme: 'primary' | 'secondary';

    avatar_seed?: string;
    created_at: string;
}
