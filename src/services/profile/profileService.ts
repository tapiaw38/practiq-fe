import { practiqApi } from '@/api/request/server'
import type { UserProfile } from '@/types'

export class ProfileService {
  async sync(params: { name: string; email: string; profile_type: 'teacher' | 'student' }): Promise<{ data: UserProfile }> {
    const { data } = await practiqApi.post('/profile', params)
    return data
  }

  async get(): Promise<{ data: UserProfile }> {
    const { data } = await practiqApi.get('/profile')
    return data
  }
}

export const profileService = new ProfileService()
