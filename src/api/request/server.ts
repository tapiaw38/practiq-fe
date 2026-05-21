import axios from 'axios'

const TOKEN_KEY = 'practiq_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function createAxiosInstance(baseURL: string) {
  const instance = axios.create({
    baseURL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' }
  })

  instance.interceptors.request.use((config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        removeToken()
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )

  return instance
}

export const authApi = createAxiosInstance(
  import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8082'
)

export const practiqApi = createAxiosInstance(
  (import.meta.env.VITE_PRACTIQ_API_URL || 'http://localhost:8083') + '/api'
)
