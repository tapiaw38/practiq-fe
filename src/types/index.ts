export interface AuthUser {
  id: string
  first_name: string
  last_name: string
  username: string
  email: string
  roles: { id: string; name: string }[]
}

export interface UserProfile {
  id: string
  name: string
  email: string
  profile_type: 'teacher' | 'student'
  created_at: string
}

export interface Course {
  id: string
  teacher_id: string
  title: string
  description: string
  level: string
  subject: string
  created_at: string
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
  should_level_up: boolean
  should_repeat: boolean
  next_level: number
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
  pages: NotebookPage[]
  created_at: string
}
