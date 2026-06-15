import type { AxiosInstance } from 'axios'
import type { AuthApiUser } from '@/types'

export interface IAuthAdminService {
  listUsers(params?: { limit?: number; offset?: number; role?: string }): Promise<{ data: AuthApiUser[] }>
  updateUser(id: string, params: Partial<Pick<AuthApiUser, 'first_name' | 'last_name' | 'email' | 'is_active' | 'verified_email'>>): Promise<{ data: AuthApiUser }>
}

export class AuthAdminService implements IAuthAdminService {
  constructor(private readonly api: AxiosInstance) {}

  async listUsers(params?: { limit?: number; offset?: number; role?: string }): Promise<{ data: AuthApiUser[] }> {
    const { data } = await this.api.get('/user/list', { params })
    return data
  }

  async updateUser(id: string, params: Partial<Pick<AuthApiUser, 'first_name' | 'last_name' | 'email' | 'is_active' | 'verified_email'>>): Promise<{ data: AuthApiUser }> {
    const { data } = await this.api.put(`/user/${id}`, params)
    return data
  }
}
