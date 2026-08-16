export type ProfileType = "teacher" | "student";
export type AcademicStatus = "active" | "blocked";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  profile_type: ProfileType;
  academic_status: AcademicStatus;
  /** IANA zone the student's day is measured in; empty uses the API default. */
  timezone?: string;
  assistant_base_url: string;
  assistant_api_key: string;
  created_at: string;
}
