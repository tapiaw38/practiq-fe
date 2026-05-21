import { practiqApi } from '@/api/request/server'
import type { Material } from '@/types'

export class MaterialService {
  async create(courseId: string, params: Partial<Material>): Promise<{ data: Material }> {
    const { data } = await practiqApi.post(`/courses/${courseId}/materials`, params)
    return data
  }

  async list(courseId: string): Promise<{ data: Material[] }> {
    const { data } = await practiqApi.get(`/courses/${courseId}/materials`)
    return data
  }
}

export const materialService = new MaterialService()
