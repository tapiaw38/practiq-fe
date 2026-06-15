export interface AIConversation {
  id: string;
  student_id: string;
  course_id: string;
  practice_sheet_id: string;
  created_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  sender: "student" | "ai";
  message_type: string;
  content: string;
  created_at: string;
}
