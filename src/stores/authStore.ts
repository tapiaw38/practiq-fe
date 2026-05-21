import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile, AuthUser } from '@/types'
import { getToken, setToken, removeToken } from '@/api/request/server'

const PROFILE_KEY = 'practiq_profile'
const AUTH_USER_KEY = 'practiq_auth_user'

function getStoredProfile(): UserProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    localStorage.removeItem(PROFILE_KEY)
    return null
  }
}

function getStoredAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const profile = ref<UserProfile | null>(getStoredProfile())
  const authUser = ref<AuthUser | null>(getStoredAuthUser())

  const isAuthenticated = computed(() => !!token.value)
  const isTeacher = computed(() => profile.value?.profile_type === 'teacher')
  const isStudent = computed(() => profile.value?.profile_type === 'student')
  const authMethod = computed(() => authUser.value?.auth_method ?? 'password')

  function storeToken(t: string) {
    token.value = t
    setToken(t)
  }

  function setProfile(p: UserProfile) {
    profile.value = p
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
  }

  function setAuthUser(u: AuthUser) {
    authUser.value = u
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u))
  }

  function clearAuth() {
    token.value = null
    profile.value = null
    authUser.value = null
    removeToken()
    localStorage.removeItem(PROFILE_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
  }

  return {
    token,
    profile,
    authUser,
    authMethod,
    isAuthenticated,
    isTeacher,
    isStudent,
    storeToken,
    setProfile,
    setAuthUser,
    clearAuth
  }
})
