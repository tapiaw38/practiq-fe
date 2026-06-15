export type ProfileType = "teacher" | "student";
export type AcademicStatus = "active" | "blocked";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  profile_type: ProfileType;
  academic_status: AcademicStatus;
  assistant_base_url: string;
  assistant_api_key: string;
  created_at: string;
}
