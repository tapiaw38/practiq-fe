import { authApi } from '@/api/request/server'
import type { AuthApiUser } from '@/types'

export class AuthAdminService {
  async listUsers(params?: { limit?: number; offset?: number; role?: string }): Promise<{ data: AuthApiUser[] }> {
    const { data } = await authApi.get('/user/list', { params })
    return data
  }

  async updateUser(id: string, params: Partial<Pick<AuthApiUser, 'first_name' | 'last_name' | 'email' | 'is_active' | 'verified_email'>>): Promise<{ data: AuthApiUser }> {
    const { data } = await authApi.put(`/user/${id}`, params)
    return data
  }
}

export const authAdminService = new AuthAdminService()
