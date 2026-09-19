export interface AssistantStudentCourseContext {
  id: string;
  title: string;
  subject: string;
  grade: string;
  currentLevel: number;
}

export interface AssistantStudentTopicProgress {
  topic: string;
  mastery: number;
  level: number;
  streak: number;
}

export interface AssistantStudentContext {
  studentName?: string;
  courses?: AssistantStudentCourseContext[];
  topicProgress?: AssistantStudentTopicProgress[];
}

export interface AssistantChatModalProps {
  show: boolean;
  studentContext?: AssistantStudentContext;
  /** Dashboard practice starts only after the student chooses a course/topic. */
  requirePracticeContext?: boolean;
}

export interface AssistantChatModalEmits {
  (e: "close"): void;
}
