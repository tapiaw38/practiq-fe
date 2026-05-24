import { practiqApi } from '@/api/request/server'
import type { AssignedUser } from '@/types'

export class AssignmentService {
  async assign(teacherId: string, studentId: string): Promise<{ message: string }> {
    const { data } = await practiqApi.post('/teacher-student-assignments', {
      teacher_id: teacherId,
      student_id: studentId
    })
    return data
  }

  async unassign(teacherId: string, studentId: string): Promise<{ message: string }> {
    const { data } = await practiqApi.delete(`/teacher-student-assignments/${teacherId}/${studentId}`)
    return data
  }

  async listStudents(teacherId: string): Promise<{ data: AssignedUser[] }> {
    const { data } = await practiqApi.get(`/teachers/${teacherId}/students`)
    return data
  }

  async listTeachers(studentId: string): Promise<{ data: AssignedUser[] }> {
    const { data } = await practiqApi.get(`/students/${studentId}/teachers`)
    return data
  }

  async listMyStudents(): Promise<{ data: AssignedUser[] }> {
    const { data } = await practiqApi.get('/teachers/me/students')
    return data
  }
}

export const assignmentService = new AssignmentService()
