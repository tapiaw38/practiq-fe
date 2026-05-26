import { practiqApi } from '@/api/request/server'
import type { TopicProgress, StudentAttempt } from '@/types'

export class ProgressService {
  async getMyProgress(): Promise<{ data: TopicProgress[] }> {
    const { data } = await practiqApi.get('/students/me/progress')
    return data
  }

  async getCourseProgress(courseId: string): Promise<{ data: TopicProgress[] }> {
    const { data } = await practiqApi.get(`/students/me/courses/${courseId}/progress`)
    return data
  }

  async getStudentProgress(studentId: string): Promise<{ data: TopicProgress[] }> {
    const { data } = await practiqApi.get(`/teachers/me/students/${studentId}/progress`)
    return data
  }

  async getStudentCourseProgress(studentId: string, courseId: string): Promise<{ data: TopicProgress[] }> {
    const { data } = await practiqApi.get(`/teachers/me/students/${studentId}/courses/${courseId}/progress`)
    return data
  }

  async getStudentAttempts(studentId: string, sheetId: string): Promise<{ data: StudentAttempt[] }> {
    const { data } = await practiqApi.get(`/teachers/me/students/${studentId}/attempts`, {
      params: { sheet_id: sheetId }
    })
    return data
  }
}

export const progressService = new ProgressService()
