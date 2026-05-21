import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile } from '@/types'
import { getToken, setToken, removeToken } from '@/api/request/server'

const PROFILE_KEY = 'practiq_profile'

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

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getToken())
  const profile = ref<UserProfile | null>(getStoredProfile())

  const isAuthenticated = computed(() => !!token.value)
  const isTeacher = computed(() => profile.value?.profile_type === 'teacher')
  const isStudent = computed(() => profile.value?.profile_type === 'student')

  function storeToken(t: string) {
    token.value = t
    setToken(t)
  }

  function setProfile(p: UserProfile) {
    profile.value = p
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
  }

  function clearAuth() {
    token.value = null
    profile.value = null
    removeToken()
    localStorage.removeItem(PROFILE_KEY)
  }

  return {
    token,
    profile,
    isAuthenticated,
    isTeacher,
    isStudent,
    storeToken,
    setProfile,
    clearAuth
  }
})
