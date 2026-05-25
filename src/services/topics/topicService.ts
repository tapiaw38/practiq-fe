import { practiqApi } from '@/api/request/server'
import type { Topic } from '@/types'

export class TopicService {
  async create(courseId: string, params: Partial<Topic>): Promise<{ data: Topic }> {
    const { data } = await practiqApi.post(`/courses/${courseId}/topics`, params)
    return data
  }

  async list(courseId: string): Promise<{ data: Topic[] }> {
    const { data } = await practiqApi.get(`/courses/${courseId}/topics`)
    return data
  }

  async update(id: string, params: Partial<Topic>): Promise<{ data: Topic }> {
    const { data } = await practiqApi.put(`/topics/${id}`, params)
    return data
  }

  async delete(id: string): Promise<void> {
    await practiqApi.delete(`/topics/${id}`)
  }
}

export const topicService = new TopicService()
