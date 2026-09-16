import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { UserProfile, AuthUser } from "@/types";
import { getRefreshToken, getToken, removeRefreshToken, removeToken, setRefreshToken, setToken } from "@/api/request/server";

const PROFILE_KEY = "practiq_profile";
const AUTH_USER_KEY = "practiq_auth_user";
const IMPERSONATION_KEY = "practiq.impersonation";

type ImpersonationBackup = {
  token: string;
  refreshToken: string | null;
  profile: UserProfile | null;
  authUser: AuthUser | null;
};

function getStoredProfile(): UserProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

function getStoredAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(getToken());
  const profile = ref<UserProfile | null>(getStoredProfile());
  const authUser = ref<AuthUser | null>(getStoredAuthUser());

  const isAuthenticated = computed(() => !!token.value);
  const isTeacher = computed(() => profile.value?.profile_type === "teacher");
  const isStudent = computed(() => profile.value?.profile_type === "student");
  const authMethod = computed(() => authUser.value?.auth_method ?? "password");
  const isImpersonating = computed(() => sessionStorage.getItem(IMPERSONATION_KEY) !== null);

  function storeToken(t: string) {
    token.value = t;
    setToken(t);
  }

  function setProfile(p: UserProfile) {
    profile.value = p;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  }

  function setAuthUser(u: AuthUser) {
    authUser.value = u;
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
  }

  function clearAuth() {
    token.value = null;
    profile.value = null;
    authUser.value = null;
    removeToken();
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(IMPERSONATION_KEY);
  }

  function beginReadOnlyImpersonation(tokenValue: string, target: AuthUser) {
    const currentToken = getToken();
    if (!currentToken) throw new Error("missing operator session");
    const backup: ImpersonationBackup = {
      token: currentToken,
      refreshToken: getRefreshToken(),
      profile: profile.value,
      authUser: authUser.value,
    };
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(backup));
    storeToken(tokenValue);
    removeRefreshToken();
    setAuthUser({ ...target, roles: [] });
    profile.value = null;
    localStorage.removeItem(PROFILE_KEY);
  }

  function endImpersonation(): boolean {
    const raw = sessionStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return false;
    try {
      const backup = JSON.parse(raw) as ImpersonationBackup;
      storeToken(backup.token);
      if (backup.refreshToken) setRefreshToken(backup.refreshToken); else removeRefreshToken();
      if (backup.profile) setProfile(backup.profile); else { profile.value = null; localStorage.removeItem(PROFILE_KEY); }
      if (backup.authUser) setAuthUser(backup.authUser); else { authUser.value = null; localStorage.removeItem(AUTH_USER_KEY); }
      return true;
    } finally {
      sessionStorage.removeItem(IMPERSONATION_KEY);
    }
  }

  return {
    token,
    profile,
    authUser,
    authMethod,
    isImpersonating,
    isAuthenticated,
    isTeacher,
    isStudent,
    storeToken,
    setProfile,
    setAuthUser,
    clearAuth,
    beginReadOnlyImpersonation,
    endImpersonation,
  };
});
