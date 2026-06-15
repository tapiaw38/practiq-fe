export interface AssistantStudentCourseContext {
  title: string
  subject: string
  grade: string
  currentLevel: number
}

export interface AssistantStudentTopicProgress {
  topic: string
  mastery: number
  level: number
  streak: number
}

export interface AssistantStudentContext {
  studentName?: string
  courses?: AssistantStudentCourseContext[]
  topicProgress?: AssistantStudentTopicProgress[]
}

export interface AssistantChatModalProps {
  show: boolean
  studentContext?: AssistantStudentContext
}

export interface AssistantChatModalEmits {
  (e: 'close'): void
}
