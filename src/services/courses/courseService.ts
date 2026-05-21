import { practiqApi } from '@/api/request/server'
import type { Course, Student } from '@/types'

export class CourseService {
  async create(params: Partial<Course>): Promise<{ data: Course }> {
    const { data } = await practiqApi.post('/courses', params)
    return data
  }

  async list(role?: string): Promise<{ data: Course[] }> {
    const { data } = await practiqApi.get('/courses', { params: { role } })
    return data
  }

  async get(id: string): Promise<{ data: Course }> {
    const { data } = await practiqApi.get(`/courses/${id}`)
    return data
  }

  async update(id: string, params: Partial<Course>): Promise<{ data: Course }> {
    const { data } = await practiqApi.put(`/courses/${id}`, params)
    return data
  }

  async delete(id: string): Promise<void> {
    await practiqApi.delete(`/courses/${id}`)
  }

  async enroll(courseId: string): Promise<{ message: string }> {
    const { data } = await practiqApi.post(`/courses/${courseId}/enroll`)
    return data
  }

  async getStudents(courseId: string): Promise<{ data: Student[] }> {
    const { data } = await practiqApi.get(`/courses/${courseId}/students`)
    return data
  }
}

export const courseService = new CourseService()
