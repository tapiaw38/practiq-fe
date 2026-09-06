export type SchoolMembershipRole = "admin" | "member";
export type SchoolProfileType = "teacher" | "student";

export interface School {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SchoolMembership {
  school_id: string;
  user_id: string;
  membership_role: SchoolMembershipRole;
  profile_type: SchoolProfileType;
  created_at: string;
  updated_at: string;
}
