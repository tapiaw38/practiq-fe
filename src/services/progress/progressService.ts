import { practiqApi } from '@/api/request/server'
import type { TopicProgress } from '@/types'

export class ProgressService {
  async getMyProgress(): Promise<{ data: TopicProgress[] }> {
    const { data } = await practiqApi.get('/students/me/progress')
    return data
  }

  async getCourseProgress(courseId: string): Promise<{ data: TopicProgress[] }> {
    const { data } = await practiqApi.get(`/students/me/courses/${courseId}/progress`)
    return data
  }
}

export const progressService = new ProgressService()
