import { practiqApi } from '@/api/request/server'
import type { TopicProgress, StudentAttempt, CourseProgress } from '@/types'

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

  // New course progress endpoints
  async getStudentCourseProgressNew(studentId: string, courseId: string): Promise<{ data: CourseProgress }> {
    const { data } = await practiqApi.get(`/students/${studentId}/courses/${courseId}/progress`)
    return data
  }

  async getAllStudentProgress(studentId: string): Promise<{ data: CourseProgress[] }> {
    const { data } = await practiqApi.get(`/students/${studentId}/progress`)
    return data
  }

  async downloadStudentReportPDF(
    studentId: string,
    options?: { from?: string; to?: string; courseId?: string }
  ): Promise<Blob> {
    const params = new URLSearchParams()
    if (options?.from) params.append('from', options.from)
    if (options?.to) params.append('to', options.to)
    if (options?.courseId) params.append('course_id', options.courseId)

    const queryString = params.toString()
    const url = `/teachers/me/students/${studentId}/report.pdf${queryString ? `?${queryString}` : ''}`

    const response = await practiqApi.get(url, {
      responseType: 'blob'
    })
    return response.data
  }
}

export const progressService = new ProgressService()
