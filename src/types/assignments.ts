import type { AcademicStatus } from "./profile";

export interface AssignedUser {
  id: string;
  name: string;
  email: string;
  profile_type: string;
  academic_status: AcademicStatus;
}
