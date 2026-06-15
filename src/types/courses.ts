export interface Course {
  id: string;
  teacher_id: string;
  grade_id: string;
  grade_name: string;
  subject_id: string;
  subject_name: string;
  title: string;
  description: string;
  level: string;
  subject: string;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  profile_type: string;
  created_at: string;
}
