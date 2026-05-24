import { practiqApi } from '@/api/request/server'
import type { Notebook, NotebookPage } from '@/types'

export class NotebookService {
  async create(courseId: string, params: { title: string; description?: string; level?: number }): Promise<{ data: Notebook }> {
    const { data } = await practiqApi.post(`/courses/${courseId}/notebooks`, params)
    return data
  }

  async list(courseId: string): Promise<Notebook[]> {
    const { data } = await practiqApi.get(`/courses/${courseId}/notebooks`)
    // backend returns [{data: Notebook}, ...] — unwrap each item
    return (data as Array<{ data: Notebook }>).map(item => item.data)
  }

  async get(id: string, studentId?: string): Promise<{ data: Notebook }> {
    const params = studentId ? { student_id: studentId } : {}
    const { data } = await practiqApi.get(`/notebooks/${id}`, { params })
    return data
  }

  async addPage(notebookId: string, params: {
    page_number: number
    title: string
    content_type: 'canvas' | 'text'
    content_data: string
    instructions: string
  }): Promise<{ data: NotebookPage }> {
    const { data } = await practiqApi.post(`/notebooks/${notebookId}/pages`, params)
    return data
  }

  async updatePage(pageId: string, params: {
    title: string
    content_type: 'canvas' | 'text'
    content_data: string
    instructions: string
  }): Promise<void> {
    await practiqApi.put(`/notebook-pages/${pageId}`, params)
  }

  async saveSubmission(pageId: string, params: { canvas_data?: string; answer_text?: string }): Promise<void> {
    await practiqApi.post(`/notebook-pages/${pageId}/submit`, params)
  }
}

export const notebookService = new NotebookService()
