import { authApi, getToken, setToken, removeToken } from '@/api/request/server'
import type { LoginParams, LoginResponse, RegisterParams, RegisterResponse, AuthUser } from '@/types'

export interface IAuthService {
  login(params: LoginParams): Promise<LoginResponse>
  register(params: RegisterParams): Promise<RegisterResponse>
  meUser(): Promise<{ data: AuthUser }>
  requestResetPassword(email: string): Promise<{ data: { message: string } }>
  changePassword(oldPassword: string, newPassword: string): Promise<void>
  getToken(): string | null
  setToken(token: string): void
  removeToken(): void
  logout(): void
  isAuthenticated(): boolean
}

export class AuthService implements IAuthService {
  async login(params: LoginParams): Promise<LoginResponse> {
    const payload = params.ssoType
      ? {
          sso_type: params.ssoType,
          code: params.ssoCode
        }
      : {
          email: params.email,
          password: params.password
        }

    const { data } = await authApi.post('/auth/login', payload)
    return data
  }

  async register(params: RegisterParams): Promise<RegisterResponse> {
    const { data } = await authApi.post('/auth/register', {
      first_name: params.first_name,
      last_name: params.last_name,
      email: params.email,
      password: params.password
    })
    return data
  }

  async meUser(): Promise<{ data: AuthUser }> {
    const { data } = await authApi.get('/user/me')
    return data
  }

  async requestResetPassword(email: string): Promise<{ data: { message: string } }> {
    const { data } = await authApi.post('/auth/request-reset-password', { email })
    return data
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await authApi.put('/user/me/password', {
      old_password: oldPassword,
      new_password: newPassword
    })
  }

  getToken(): string | null {
    return getToken()
  }

  setToken(token: string): void {
    setToken(token)
  }

  removeToken(): void {
    removeToken()
  }

  logout(): void {
    removeToken()
  }

  isAuthenticated(): boolean {
    return !!getToken()
  }
}

export const authService = new AuthService()
