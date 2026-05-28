import { practiqApi } from '@/api/request/server'
import type { PracticeSheet, SubmitInput, SubmitJobStart, SubmitJobStatus, SubmitResult } from '@/types'

export class PracticeSheetService {
  async create(courseId: string, params: {
    topic_id?: string
    strategy_id?: string
    title: string
    level?: number
    sheet_type?: string
    test_style?: string
    exercise_ids: string[]
  }): Promise<{ data: PracticeSheet }> {
    const { data } = await practiqApi.post(`/courses/${courseId}/practice-sheets`, params)
    return data
  }

  async list(courseId: string): Promise<{ data: PracticeSheet[] }> {
    const { data } = await practiqApi.get(`/courses/${courseId}/practice-sheets`)
    return data
  }

  async get(id: string): Promise<{ data: PracticeSheet }> {
    const { data } = await practiqApi.get(`/practice-sheets/${id}`)
    return data
  }

  async update(id: string, params: {
    title: string
    topic_id?: string
    level?: number
    sheet_type?: string
    test_style?: string
    exercise_ids?: string[]
  }): Promise<{ data: PracticeSheet }> {
    const { data } = await practiqApi.put(`/practice-sheets/${id}`, params)
    return data
  }

  async delete(id: string): Promise<void> {
    await practiqApi.delete(`/practice-sheets/${id}`)
  }

  async submit(id: string, input: SubmitInput): Promise<{ data: SubmitResult }> {
    const { data } = await practiqApi.post(`/practice-sheets/${id}/submit`, input)
    return data
  }

  async submitAsync(id: string, input: SubmitInput): Promise<{ data: SubmitJobStart }> {
    const { data } = await practiqApi.post(`/practice-sheets/${id}/submit-async`, input)
    return data
  }

  async getSubmitJob(jobId: string): Promise<{ data: SubmitJobStatus }> {
    const { data } = await practiqApi.get(`/practice-sheets/submit-jobs/${jobId}`)
    return data
  }
}

export const practiceSheetService = new PracticeSheetService()
