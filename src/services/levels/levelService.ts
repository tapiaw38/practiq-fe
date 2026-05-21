import { practiqApi } from '@/api/request/server'
import type { CourseLevelsResponse } from '@/types'

export const levelService = {
  async getCourseLevels(courseId: string): Promise<CourseLevelsResponse> {
    const { data } = await practiqApi.get(`/courses/${courseId}/levels`)
    return data as CourseLevelsResponse
  }
}
