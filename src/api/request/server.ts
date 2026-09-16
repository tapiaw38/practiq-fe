import axios from 'axios'

const TOKEN_KEY = 'practiq_token'
const REFRESH_TOKEN_KEY = 'practiq_refresh_token'
const ACTIVE_SCHOOL_KEY = 'practiq.activeSchool'
const IMPERSONATION_KEY = 'practiq.impersonation'

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8082'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function removeRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function isReadOnlyImpersonation(): boolean {
  return sessionStorage.getItem(IMPERSONATION_KEY) !== null
}

/**
 * Swaps the refresh token for a new pair. Sessions created before refresh
 * tokens existed have none stored, so they simply end at the next 401 and
 * the person signs in again.
 *
 * Concurrent 401s share one in-flight call: a screen that fires five
 * requests at once would otherwise spend five refresh tokens, and rotation
 * means four of them come back already used.
 */
let refreshing: Promise<string | null> | null = null

async function refreshSession(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null

  try {
    const { data } = await axios.post(`${AUTH_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken
    })
    setToken(data.token)
    setRefreshToken(data.refresh_token)
    return data.token as string
  } catch {
    return null
  }
}

function refreshOnce(): Promise<string | null> {
  if (!refreshing) {
    refreshing = refreshSession()
    void refreshing.finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

// Raw fetch clients (assistant package) do not pass through Axios interceptors.
// Export same single-flight refresh so they never keep using expired JWTs.
export function refreshAssistantToken(): Promise<string | null> {
  return refreshOnce()
}

function createAxiosInstance(baseURL: string) {
  const instance = axios.create({
    baseURL,
    timeout: 300000,
    headers: { 'Content-Type': 'application/json' }
  })

  instance.interceptors.request.use((config) => {
    const method = (config.method || 'get').toLowerCase()
    if (isReadOnlyImpersonation() && !['get', 'head', 'options'].includes(method)) {
      return Promise.reject(new Error('Esta vista es de solo lectura. Salí de la impersonación para realizar cambios.'))
    }
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (baseURL.includes('/api')) {
      const schoolId = localStorage.getItem(ACTIVE_SCHOOL_KEY)
      if (schoolId) config.headers['X-School-ID'] = schoolId
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config
      const isRefreshCall = original?.url?.includes('/auth/refresh')

      if (error.response?.status === 401 && original && !original._retried && !isRefreshCall) {
        original._retried = true

        const token = await refreshOnce()
        if (token) {
          original.headers = original.headers ?? {}
          original.headers.Authorization = `Bearer ${token}`
          return instance(original)
        }

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
