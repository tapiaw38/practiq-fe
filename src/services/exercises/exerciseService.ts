import { practiqApi } from '@/api/request/server'
import type { Exercise } from '@/types'

export class ExerciseService {
  async create(topicId: string, params: Partial<Exercise>): Promise<{ data: Exercise }> {
    const { data } = await practiqApi.post(`/topics/${topicId}/exercises`, params)
    return data
  }

  async list(topicId: string): Promise<{ data: Exercise[] }> {
    const { data } = await practiqApi.get(`/topics/${topicId}/exercises`)
    return data
  }

  async update(id: string, params: Partial<Exercise>): Promise<{ data: Exercise }> {
    const { data } = await practiqApi.put(`/exercises/${id}`, params)
    return data
  }

  async delete(id: string): Promise<void> {
    await practiqApi.delete(`/exercises/${id}`)
  }
}

export const exerciseService = new ExerciseService()
