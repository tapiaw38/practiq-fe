import { practiqApi } from '@/api/request/server'
import type { Subject } from '@/types'

export class SubjectService {
  async list(): Promise<{ data: Subject[] }> {
    const { data } = await practiqApi.get('/subjects')
    return data
  }

  async create(params: { name: string; description: string }): Promise<{ data: Subject }> {
    const { data } = await practiqApi.post('/subjects', params)
    return data
  }

  async update(id: string, params: { name: string; description: string }): Promise<{ data: Subject }> {
    const { data } = await practiqApi.put(`/subjects/${id}`, params)
    return data
  }

  async delete(id: string): Promise<void> {
    await practiqApi.delete(`/subjects/${id}`)
  }
}

export const subjectService = new SubjectService()
