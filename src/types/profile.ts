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
  /** Whether the platform assistant is configured. The credentials behind
   *  it stay on the server and never reach the browser. */
  assistant_enabled: boolean;
  ui_theme: "primary" | "secondary";
  /** Opaque token the avatar is drawn from. Empty means none chosen. */
  avatar_seed?: string;
  created_at: string;
}
