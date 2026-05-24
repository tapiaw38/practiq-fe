import { practiqApi } from '@/api/request/server'
import type { Grade, UserProfile } from '@/types'

export class GradeService {
  async list(): Promise<{ data: Grade[] }> {
    const { data } = await practiqApi.get('/grades')
    return data
  }

  async create(params: { name: string; description: string }): Promise<{ data: Grade }> {
    const { data } = await practiqApi.post('/grades', params)
    return data
  }

  async update(id: string, params: { name: string; description: string }): Promise<{ data: Grade }> {
    const { data } = await practiqApi.put(`/grades/${id}`, params)
    return data
  }

  async delete(id: string): Promise<void> {
    await practiqApi.delete(`/grades/${id}`)
  }

  async addMember(gradeId: string, userId: string): Promise<{ message: string }> {
    const { data } = await practiqApi.post(`/grades/${gradeId}/members`, { user_id: userId })
    return data
  }

  async removeMember(gradeId: string, userId: string): Promise<{ message: string }> {
    const { data } = await practiqApi.delete(`/grades/${gradeId}/members/${userId}`)
    return data
  }

  async listMembers(gradeId: string): Promise<{ data: UserProfile[] }> {
    const { data } = await practiqApi.get(`/grades/${gradeId}/members`)
    return data
  }

  async listUserGrades(userId: string): Promise<{ data: Grade[] }> {
    const { data } = await practiqApi.get(`/users/${userId}/grades`)
    return data
  }
}

export const gradeService = new GradeService()
