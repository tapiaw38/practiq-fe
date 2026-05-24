import { practiqApi } from '@/api/request/server'
import type { UserProfile } from '@/types'

export class ProfileService {
  async sync(params: {
    name: string
    email: string
    profile_type: 'teacher' | 'student'
    assistant_base_url?: string
    assistant_api_key?: string
  }): Promise<{ data: UserProfile }> {
    const { data } = await practiqApi.post('/profile', params)
    return data
  }

  async get(): Promise<{ data: UserProfile }> {
    const { data } = await practiqApi.get('/profile')
    return data
  }

  async getById(id: string): Promise<{ data: UserProfile }> {
    const { data } = await practiqApi.get(`/profile/${id}`)
    return data
  }

  async updateAssistantConfig(params: {
    assistant_base_url: string
    assistant_api_key: string
  }): Promise<{ data: UserProfile }> {
    const { data } = await practiqApi.put('/profile/assistant-config', params)
    return data
  }

  async updateAssistantConfigById(id: string, params: {
    assistant_base_url: string
    assistant_api_key: string
  }): Promise<{ data: UserProfile }> {
    const { data } = await practiqApi.put(`/profile/${id}/assistant-config`, params)
    return data
  }

  async updateAcademicStatusById(id: string, params: {
    academic_status: 'active' | 'blocked'
  }): Promise<{ data: UserProfile }> {
    const { data } = await practiqApi.put(`/profile/${id}/academic-status`, params)
    return data
  }
}

export const profileService = new ProfileService()
