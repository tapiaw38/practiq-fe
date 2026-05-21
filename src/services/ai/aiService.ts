import { practiqApi } from '@/api/request/server'
import type { AIConversation, AIMessage } from '@/types'

export class AIService {
  async createConversation(params: {
    course_id?: string
    practice_sheet_id?: string
  }): Promise<{ data: AIConversation }> {
    const { data } = await practiqApi.post('/ai/conversations', params)
    return data
  }

  async getMessages(conversationId: string): Promise<{ data: AIMessage[] }> {
    const { data } = await practiqApi.get(`/ai/conversations/${conversationId}/messages`)
    return data
  }

  async getHelp(params: {
    exercise_id?: string
    question: string
    help_type?: 'hint' | 'explanation' | 'similar_example'
  }): Promise<{ data: { id: string; response: string; help_type: string } }> {
    const { data } = await practiqApi.post('/ai/help', params)
    return data
  }
}

export const aiService = new AIService()
