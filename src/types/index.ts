export interface AuthUser {
  id: string
  first_name: string
  last_name: string
  username: string
  email: string
  auth_method: 'password' | 'google' | 'hybrid'
  roles: { id: string; name: string }[]
}

export interface AuthApiUser {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  phone_number?: string | null
  picture?: string | null
  address?: string | null
  is_active: boolean
  verified_email: boolean
  token_version: number
  auth_method: 'password' | 'google' | 'hybrid' | string
  roles: { id: string; name: string }[]
}

export interface UserProfile {
  id: string
  name: string
  email: string
  profile_type: 'teacher' | 'student'
  academic_status: 'active' | 'blocked'
  assistant_base_url: string
  assistant_api_key: string
  created_at: string
}

export interface Course {
  id: string
  teacher_id: string
  grade_id: string
  grade_name: string
  subject_id: string
  subject_name: string
  title: string
  description: string
  level: string
  subject: string
  created_at: string
}

export interface Grade {
  id: string
  name: string
  description: string
  created_by: string
  created_at: string
}

export interface Subject {
  id: string
  name: string
  description: string
  created_by: string
  created_at: string
}

export interface AssignedUser {
  id: string
  name: string
  email: string
  profile_type: string
  academic_status: 'active' | 'blocked'
}

export interface Topic {
  id: string
  course_id: string
  title: string
  description: string
  order_index: number
  created_at: string
}

export interface Exercise {
  id: string
  topic_id: string
  material_id?: string
  type: 'multiple_choice' | 'handwritten' | 'open_text' | 'equation' | 'canvas'
  question: string
  correct_answer?: string
  explanation?: string
  difficulty: number
  metadata?: string
  created_at: string
}

export interface PracticeSheetExercise {
  id: string
  order_index: number
  exercise: Exercise
}

export interface PracticeSheet {
  id: string
  course_id: string
  topic_id: string
  strategy_id: string
  title: string
  level: number
  sheet_type: 'practice' | 'level_test'
  test_style: 'keyboard' | 'canvas'
  created_by: string
  created_at: string
  exercises: PracticeSheetExercise[]
}

export interface AttemptInput {
  exercise_id: string
  answer_text: string
  canvas_data?: string
  time_spent_seconds: number
  hints_used: number
}

export interface SubmitInput {
  attempts: AttemptInput[]
}

export interface SubmitResult {
  score: number
  correct: number
  total: number
  mastery_score: number
  recommendation: string
  ai_feedback?: string
  should_level_up: boolean
  should_repeat: boolean
  next_level: number
}

export interface SubmitJobStart {
  job_id: string
  status: 'processing'
}

export interface SubmitJobStatus {
  status: 'processing' | 'done' | 'failed'
  result?: { data: SubmitResult }
  error_code?: string
  message?: string
  created_at: string
  updated_at: string
}

export interface NotebookSubmitJobStart {
  job_id: string
  status: 'processing'
}

export interface NotebookSubmitJobStatus {
  status: 'processing' | 'done' | 'failed'
  error_code?: string
  message?: string
  created_at: string
  updated_at: string
}

export interface TopicProgress {
  topic_id: string
  topic_title: string
  strategy_id: string
  mastery_score: number
  current_level: number
  total_attempts: number
  correct_attempts: number
  streak_days: number
  last_practiced_at: string
}

export interface AIConversation {
  id: string
  student_id: string
  course_id: string
  practice_sheet_id: string
  created_at: string
}

export interface AIMessage {
  id: string
  conversation_id: string
  sender: 'student' | 'ai'
  message_type: string
  content: string
  created_at: string
}

export interface Material {
  id: string
  course_id: string
  teacher_id: string
  title: string
  type: 'pdf' | 'image' | 'video' | 'text' | 'worksheet'
  file_url?: string
  extracted_text?: string
  status: string
  created_at: string
}

export interface Student {
  id: string
  name: string
  email: string
  profile_type: string
  created_at: string
}

export interface LoginParams {
  email?: string
  password?: string
  ssoType?: 'google'
  ssoCode?: string
}

export interface RegisterParams {
  first_name: string
  last_name: string
  email: string
  password: string
  profile_type: 'teacher' | 'student'
}

export interface LoginResponse {
  token: string
  data: AuthUser
}

export interface RegisterResponse {
  data: AuthUser
}

export interface LevelSheetSummary {
  id: string
  title: string
  level: number
  sheet_type: 'practice' | 'level_test'
  test_style: 'keyboard' | 'canvas'
  exercises: number
}

export interface LevelNotebookSummary {
  id: string
  title: string
  description: string
  level: number
  pages: number
}

export interface LevelData {
  level: number
  unlocked: boolean
  practices: LevelSheetSummary[]
  level_test: LevelSheetSummary | null
  notebooks: LevelNotebookSummary[]
}

export interface CourseLevelsResponse {
  current_level: number
  levels: LevelData[]
}

export interface NotebookSubmission {
  id: string
  canvas_data: string
  answer_text: string
  ai_recognized_text?: string
  ai_is_correct?: boolean
  ai_feedback?: string
  ai_reviewed_at?: string
  teacher_is_correct?: boolean
  teacher_feedback?: string
  teacher_reviewed_at?: string
}

export interface StudentAttempt {
  id: string
  student_id: string
  exercise_id: string
  practice_sheet_id: string
  answer_text: string
  ai_feedback?: string
  is_correct: boolean
  score: number
  time_spent_seconds: number
  hints_used: number
  created_at: string
}

export interface NotebookPage {
  id: string
  notebook_id: string
  page_number: number
  title: string
  content_type: 'canvas' | 'text'
  content_data: string
  instructions: string
  submission?: NotebookSubmission
}

export interface Notebook {
  id: string
  course_id: string
  teacher_id: string
  title: string
  description: string
  level: number
  pages: NotebookPage[]
  created_at: string
}

// Course Progress types
export interface CourseProgress {
  id?: string
  student_id: string
  course_id: string
  current_level: number
  updated_at?: string
}

// Learning Strategy types
export interface LearningStrategy {
  id: string
  name: string
  code: string
  description: string
  status?: string
  created_at: string
}

export interface CourseLearningStrategy {
  id: string
  course_id: string
  strategy_id: string
  is_default?: boolean
  config?: string
  created_at?: string
  strategy_name?: string
  strategy_code?: string
  strategy_description?: string
  strategy: LearningStrategy
}

// Extended Notebook Submission for teacher review
export interface NotebookSubmissionFull {
  id: string
  page_id: string
  student_id: string
  student_name?: string
  student_email?: string
  notebook_id: string
  notebook_title?: string
  page_title?: string
  page_number: number
  canvas_data: string
  answer_text: string
  ai_recognized_text?: string
  ai_is_correct?: boolean
  ai_feedback?: string
  ai_reviewed_at?: string
  teacher_is_correct?: boolean
  teacher_feedback?: string
  teacher_reviewed_at?: string
  created_at: string
}
