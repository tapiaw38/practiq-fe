import type { AxiosInstance } from "axios";
import type { AIConversation, AIMessage } from "@/types";

export interface IAIService {
  createConversation(params: {
    course_id?: string;
    practice_sheet_id?: string;
  }): Promise<{ data: AIConversation }>;
  getMessages(conversationId: string): Promise<{ data: AIMessage[] }>;
  getHelp(params: {
    exercise_id?: string;
    question: string;
    help_type?: "hint" | "explanation" | "similar_example";
    conversation_id?: string;
  }): Promise<{ data: { id: string; response: string; help_type: string } }>;
}

export class AIService implements IAIService {
  constructor(private readonly api: AxiosInstance) {}

  async createConversation(params: {
    course_id?: string;
    practice_sheet_id?: string;
  }): Promise<{ data: AIConversation }> {
    const { data } = await this.api.post("/ai/conversations", params);
    return data;
  }

  async getMessages(conversationId: string): Promise<{ data: AIMessage[] }> {
    const { data } = await this.api.get(
      `/ai/conversations/${conversationId}/messages`,
    );
    return data;
  }

  async getHelp(params: {
    exercise_id?: string;
    question: string;
    help_type?: "hint" | "explanation" | "similar_example";
    conversation_id?: string;
  }): Promise<{ data: { id: string; response: string; help_type: string } }> {
    const { data } = await this.api.post("/ai/help", params);
    return data;
  }
}
