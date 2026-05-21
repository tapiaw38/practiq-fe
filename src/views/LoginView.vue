<template>
  <div class="auth-page">
    <!-- ─── LEFT PANEL ─── -->
    <section class="auth-left" aria-hidden="true">
      <div class="glow glow--top"></div>
      <div class="glow glow--bottom"></div>

      <div class="left-brand">
        <div class="brand-mark">P</div>
        <div>
          <div class="brand-name">Practiq</div>
          <div class="brand-tag">Aprender con práctica guiada</div>
        </div>
      </div>

      <div class="left-copy">
        <div class="eyebrow">Plataforma educativa</div>
        <h1>
          Practica a tu ritmo,<br />
          <span>avanza con confianza.</span>
        </h1>
        <p>
          Ejercicios paso a paso, retroalimentación al instante y un asistente que te acompaña en cada tema.
        </p>
      </div>

      <div class="feature-list">
        <div class="feature-pill">
          <i class="pi pi-check-circle"></i>
          <span>Hojas de práctica por nivel</span>
        </div>
        <div class="feature-pill">
          <i class="pi pi-check-circle"></i>
          <span>Asistente con pistas y ejemplos</span>
        </div>
        <div class="feature-pill">
          <i class="pi pi-check-circle"></i>
          <span>Progreso visible para docente y estudiante</span>
        </div>
      </div>

      <div class="left-preview">
        <div class="preview-card">
          <div class="preview-chip">Fracciones · Nivel 3</div>
          <div class="preview-equation">3/4 + 1/8 = ?</div>
          <div class="preview-progress">
            <div class="preview-progress__fill"></div>
          </div>
        </div>
        <div class="preview-bot">🤖</div>
      </div>
    </section>

    <!-- ─── RIGHT PANEL ─── -->
    <section class="auth-right">
      <div class="auth-mobile-brand">
        <div class="brand-mark brand-mark--mobile">P</div>
        <div>
          <div class="brand-name">Practiq</div>
          <div class="brand-tag" style="color: var(--text-secondary)">Aprender con práctica guiada</div>
        </div>
      </div>

      <div class="auth-card">
        <!-- ── HEADER ── -->
        <div class="card-header">
          <h2 class="card-title">
            {{ currentView === 'login' ? 'Iniciar sesión'
             : currentView === 'register' ? 'Crear cuenta'
             : currentView === 'forgot' ? 'Recuperar contraseña'
             : 'Completar perfil' }}
          </h2>
          <p class="card-subtitle">
            {{ currentView === 'login' ? 'Entra para continuar con tus prácticas.'
             : currentView === 'register' ? 'Crea tu cuenta y elige tu tipo de perfil.'
             : currentView === 'forgot' ? 'Te enviaremos un enlace para recuperar el acceso.'
             : 'Antes de continuar, elige tu tipo de perfil.' }}
          </p>
        </div>

        <!-- ── LOGIN FORM ── -->
        <form v-if="currentView === 'login'" class="auth-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label class="form-label" for="login-email">Email</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              class="form-input"
              :class="{ 'form-input--error': emailError }"
              placeholder="tu@email.com"
              autocomplete="email"
              required
            />
            <small v-if="emailError" class="form-error">{{ emailError }}</small>
          </div>

          <div class="form-group">
            <div class="label-row">
              <label class="form-label" for="login-password">Contraseña</label>
              <button type="button" class="text-link" @click="goForgot">¿La olvidaste?</button>
            </div>
            <input
              id="login-password"
              v-model="password"
              type="password"
              class="form-input"
              :class="{ 'form-input--error': passwordError }"
              placeholder="Tu contraseña"
              autocomplete="current-password"
              required
            />
            <small v-if="passwordError" class="form-error">{{ passwordError }}</small>
          </div>

          <div v-if="errorMsg" class="alert alert--error">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ errorMsg }}</span>
          </div>

          <button type="submit" class="submit-btn" :disabled="loading || !isLoginValid">
            <span v-if="loading" class="spinner"></span>
            <span>{{ loading ? 'Ingresando...' : 'Entrar' }}</span>
          </button>
        </form>

        <!-- ── REGISTER FORM ── -->
        <form v-else-if="currentView === 'register'" class="auth-form" @submit.prevent="handleRegister">
          <div class="two-col">
            <div class="form-group">
              <label class="form-label" for="first-name">Nombre</label>
              <input id="first-name" v-model="firstName" type="text" class="form-input" placeholder="Juan" autocomplete="given-name" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="last-name">Apellido</label>
              <input id="last-name" v-model="lastName" type="text" class="form-input" placeholder="Pérez" autocomplete="family-name" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Tipo de perfil</label>
            <div class="profile-grid">
              <button type="button" class="profile-option" :class="{ active: profileType === 'student' }" @click="profileType = 'student'">
                <span class="profile-option__emoji">🎒</span>
                <span class="profile-option__name">Estudiante</span>
                <span class="profile-option__desc">Practicar y avanzar por temas.</span>
              </button>
              <button type="button" class="profile-option" :class="{ active: profileType === 'teacher' }" @click="profileType = 'teacher'">
                <span class="profile-option__emoji">🧑‍🏫</span>
                <span class="profile-option__name">Docente</span>
                <span class="profile-option__desc">Crear cursos y acompañar estudiantes.</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="register-email">Email</label>
            <input id="register-email" v-model="email" type="email" class="form-input" :class="{ 'form-input--error': emailError }" placeholder="tu@email.com" autocomplete="email" required />
            <small v-if="emailError" class="form-error">{{ emailError }}</small>
          </div>

          <div class="two-col">
            <div class="form-group">
              <label class="form-label" for="register-password">Contraseña</label>
              <input id="register-password" v-model="password" type="password" class="form-input" :class="{ 'form-input--error': registerPasswordError }" placeholder="Mín. 8 caracteres" autocomplete="new-password" required />
              <small v-if="registerPasswordError" class="form-error">{{ registerPasswordError }}</small>
            </div>
            <div class="form-group">
              <label class="form-label" for="confirm-password">Confirmar</label>
              <input id="confirm-password" v-model="confirmPassword" type="password" class="form-input" :class="{ 'form-input--error': confirmPasswordError }" placeholder="Repite tu contraseña" autocomplete="new-password" required />
              <small v-if="confirmPasswordError" class="form-error">{{ confirmPasswordError }}</small>
            </div>
          </div>

          <div v-if="errorMsg" class="alert alert--error">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ errorMsg }}</span>
          </div>

          <button type="submit" class="submit-btn" :disabled="loading || !isRegisterValid">
            <span v-if="loading" class="spinner"></span>
            <span>{{ loading ? 'Creando cuenta...' : 'Crear cuenta' }}</span>
          </button>
        </form>

        <!-- ── FORGOT PASSWORD FORM ── -->
        <form v-else-if="currentView === 'forgot'" class="auth-form" @submit.prevent="handleForgotPassword">
          <div class="form-group">
            <label class="form-label" for="forgot-email">Email</label>
            <input id="forgot-email" v-model="forgotEmail" type="email" class="form-input" placeholder="tu@email.com" required />
          </div>

          <div v-if="forgotSent" class="alert alert--success">
            <i class="pi pi-check-circle"></i>
            <span>Si el email existe, recibirás un enlace de recuperación.</span>
          </div>

          <div v-else-if="errorMsg" class="alert alert--error">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ errorMsg }}</span>
          </div>

          <button type="submit" class="submit-btn" :disabled="loading || !forgotEmail">
            <span v-if="loading" class="spinner"></span>
            <span>{{ loading ? 'Enviando...' : 'Enviar enlace' }}</span>
          </button>

          <button type="button" class="ghost-btn" @click="goLogin">Volver a login</button>
        </form>

        <!-- ── COMPLETE PROFILE FORM ── -->
        <form v-else class="auth-form" @submit.prevent="completePendingProfile">
          <div class="identity-box">
            <div class="identity-avatar">{{ pendingInitial }}</div>
            <div>
              <div class="identity-name">{{ pendingFullName }}</div>
              <div class="identity-email">{{ pendingProfile.email }}</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Tipo de perfil</label>
            <div class="profile-grid">
              <button type="button" class="profile-option" :class="{ active: pendingProfile.profile_type === 'student' }" @click="pendingProfile.profile_type = 'student'">
                <span class="profile-option__emoji">🎒</span>
                <span class="profile-option__name">Estudiante</span>
                <span class="profile-option__desc">Entrar a prácticas y progreso.</span>
              </button>
              <button type="button" class="profile-option" :class="{ active: pendingProfile.profile_type === 'teacher' }" @click="pendingProfile.profile_type = 'teacher'">
                <span class="profile-option__emoji">🧑‍🏫</span>
                <span class="profile-option__name">Docente</span>
                <span class="profile-option__desc">Entrar a cursos y gestión de contenido.</span>
              </button>
            </div>
          </div>

          <div v-if="errorMsg" class="alert alert--error">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ errorMsg }}</span>
          </div>

          <button type="submit" class="submit-btn" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span>{{ loading ? 'Guardando...' : 'Completar acceso' }}</span>
          </button>
        </form>

        <!-- ── GOOGLE + FOOTER ── -->
        <template v-if="currentView !== 'forgot' && currentView !== 'complete'">
          <div class="auth-divider"><span>o continúa con</span></div>
          <GoogleButton @code="handleGoogleLogin" />
        </template>

        <div v-if="currentView === 'login'" class="card-footer">
          <span>¿No tienes cuenta?</span>
          <button type="button" class="text-link" @click="goRegister">Crear cuenta</button>
        </div>

        <div v-else-if="currentView === 'register'" class="card-footer">
          <span>¿Ya tienes cuenta?</span>
          <button type="button" class="text-link" @click="goLogin">Inicia sesión</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GoogleButton from '@/components/GoogleButton.vue'
import { authService } from '@/services/auth/authService'
import { profileService } from '@/services/profile/profileService'
import { useAuthStore } from '@/stores/authStore'
import type { LoginResponse, UserProfile } from '@/types'

type ViewMode = 'login' | 'register' | 'forgot' | 'complete'
type ProfileType = 'teacher' | 'student'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const currentView = ref<ViewMode>('login')
const loading = ref(false)
const errorMsg = ref('')
const forgotSent = ref(false)

const email = ref('')
const password = ref('')
const firstName = ref('')
const lastName = ref('')
const confirmPassword = ref('')
const forgotEmail = ref('')
const profileType = ref<ProfileType>('student')

const pendingProfile = reactive({
  token: '',
  name: '',
  email: '',
  profile_type: 'student' as ProfileType
})

const redirectUrl = computed(() => (route.query.redirect as string) || '')
const pendingFullName = computed(() => pendingProfile.name || 'Usuario')
const pendingInitial = computed(() => pendingFullName.value.charAt(0).toUpperCase() || 'U')

const emailError = computed(() => {
  if (!email.value) return ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? '' : 'Ingresa un email válido.'
})

const passwordError = computed(() => {
  if (!password.value) return ''
  return password.value.length >= 6 ? '' : 'La contraseña debe tener al menos 6 caracteres.'
})

const registerPasswordError = computed(() => {
  const p = password.value
  if (!p) return ''
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (!/[A-Z]/.test(p)) return 'Debe contener una mayúscula.'
  if (!/[a-z]/.test(p)) return 'Debe contener una minúscula.'
  if (!/[0-9]/.test(p)) return 'Debe contener un número.'
  if (!/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(p)) return 'Debe contener un carácter especial.'
  return ''
})

const confirmPasswordError = computed(() => {
  if (!confirmPassword.value) return ''
  return confirmPassword.value === password.value ? '' : 'Las contraseñas no coinciden.'
})

const isLoginValid = computed(() =>
  !!email.value && !!password.value && !emailError.value && !passwordError.value
)

const isRegisterValid = computed(() =>
  !!firstName.value &&
  !!lastName.value &&
  !!email.value &&
  !!password.value &&
  !!confirmPassword.value &&
  !emailError.value &&
  !registerPasswordError.value &&
  !confirmPasswordError.value
)

function resetMessages() {
  errorMsg.value = ''
  forgotSent.value = false
}

function goLogin() {
  currentView.value = 'login'
  resetMessages()
}

function goRegister() {
  currentView.value = 'register'
  resetMessages()
}

function goForgot() {
  currentView.value = 'forgot'
  resetMessages()
}

function routeAfterProfile(profile: UserProfile) {
  if (redirectUrl.value) {
    router.push(redirectUrl.value)
    return
  }
  router.push(profile.profile_type === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
}

async function finalizeSession(response: LoginResponse, fallbackProfileType?: ProfileType) {
  authService.setToken(response.token)
  authStore.storeToken(response.token)

  try {
    const profileRes = await profileService.get()
    authStore.setProfile(profileRes.data)
    routeAfterProfile(profileRes.data)
  } catch (err: any) {
    if (err.response?.status !== 404) throw err

    pendingProfile.token = response.token
    pendingProfile.name = `${response.data.first_name} ${response.data.last_name}`.trim()
    pendingProfile.email = response.data.email
    pendingProfile.profile_type = fallbackProfileType || 'student'
    currentView.value = 'complete'
  }
}

async function handleLogin() {
  if (!isLoginValid.value) return
  resetMessages()
  loading.value = true
  try {
    const response = await authService.login({
      email: email.value,
      password: password.value
    })
    await finalizeSession(response)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'No se pudo iniciar sesión.'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!isRegisterValid.value) return
  resetMessages()
  loading.value = true
  try {
    await authService.register({
      first_name: firstName.value,
      last_name: lastName.value,
      email: email.value,
      password: password.value,
      profile_type: profileType.value
    })
    const loginRes = await authService.login({
      email: email.value,
      password: password.value
    })
    authService.setToken(loginRes.token)
    authStore.storeToken(loginRes.token)
    const profileRes = await profileService.sync({
      name: `${firstName.value} ${lastName.value}`.trim(),
      email: email.value,
      profile_type: profileType.value
    })
    authStore.setProfile(profileRes.data)
    routeAfterProfile(profileRes.data)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'No se pudo crear la cuenta.'
  } finally {
    loading.value = false
  }
}

async function handleForgotPassword() {
  if (!forgotEmail.value) return
  resetMessages()
  loading.value = true
  try {
    await authService.requestResetPassword(forgotEmail.value)
    forgotSent.value = true
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'No se pudo enviar el enlace de recuperación.'
  } finally {
    loading.value = false
  }
}

async function handleGoogleLogin(code: string) {
  resetMessages()
  loading.value = true
  try {
    const response = await authService.login({
      ssoType: 'google',
      ssoCode: code
    })
    await finalizeSession(response, profileType.value)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'No se pudo iniciar con Google.'
  } finally {
    loading.value = false
  }
}

async function completePendingProfile() {
  resetMessages()
  loading.value = true
  try {
    authService.setToken(pendingProfile.token)
    authStore.storeToken(pendingProfile.token)
    const profileRes = await profileService.sync({
      name: pendingProfile.name,
      email: pendingProfile.email,
      profile_type: pendingProfile.profile_type
    })
    authStore.setProfile(profileRes.data)
    routeAfterProfile(profileRes.data)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || 'No se pudo completar el perfil.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ───────── PAGE GRID ───────── */
.auth-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background:
    radial-gradient(ellipse at 90% 10%, rgba(124, 58, 237, 0.06), transparent 50%),
    radial-gradient(ellipse at 10% 90%, rgba(96, 165, 250, 0.06), transparent 50%),
    #f8fafc;
}

/* ───────── LEFT PANEL ───────── */
.auth-left {
  position: relative;
  overflow: hidden;
  color: white;
  padding: 40px 48px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(155deg, #312e81 0%, #4338ca 40%, #6366f1 100%);
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.glow--top   { top: -120px; right: -60px; width: 320px; height: 320px; background: rgba(167, 139, 250, 0.35); }
.glow--bottom { bottom: -100px; left: -80px; width: 280px; height: 280px; background: rgba(96, 165, 250, 0.25); }

.left-brand { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }

.brand-mark {
  width: 44px; height: 44px; border-radius: 14px;
  display: grid; place-items: center;
  font-weight: 800; font-size: 20px;
  color: #312e81;
  background: rgba(255,255,255,0.95);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.brand-mark--mobile {
  color: white;
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  box-shadow: 0 8px 24px rgba(124,58,237,0.3);
}
.brand-name { font-size: 20px; font-weight: 800; line-height: 1.2; }
.brand-tag  { font-size: 12px; opacity: 0.75; }

.left-copy {
  position: relative; z-index: 1;
  margin-top: auto; padding-top: 60px;
  max-width: 520px;
}
.eyebrow {
  font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.18em; font-weight: 700;
  opacity: 0.7; margin-bottom: 16px;
}
.left-copy h1 { font-size: clamp(1.8rem, 3.5vw, 2.6rem); line-height: 1.15; font-weight: 800; }
.left-copy h1 span { color: #c7d2fe; }
.left-copy p { margin-top: 16px; max-width: 440px; font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.8); }

.feature-list {
  position: relative; z-index: 1;
  margin-top: 28px;
  display: flex; flex-direction: column; gap: 10px;
  max-width: 380px;
}
.feature-pill {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 14px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.12);
  font-size: 13px; font-weight: 500;
}
.feature-pill .pi { color: #a5b4fc; font-size: 15px; }

.left-preview {
  position: absolute; right: 36px; bottom: 36px;
  width: min(340px, 38vw); z-index: 1;
}
.preview-card {
  padding: 22px; border-radius: 22px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.15);
  backdrop-filter: blur(12px);
}
.preview-chip {
  display: inline-flex; padding: 5px 12px;
  border-radius: 999px; background: rgba(255,255,255,0.15);
  font-size: 11px; font-weight: 700;
}
.preview-equation { margin-top: 18px; font-size: 2rem; font-weight: 800; }
.preview-progress {
  margin-top: 20px; height: 10px; border-radius: 999px;
  background: rgba(255,255,255,0.15); overflow: hidden;
}
.preview-progress__fill {
  width: 62%; height: 100%;
  background: linear-gradient(90deg, #c4b5fd, #fff);
  border-radius: inherit;
}
.preview-bot {
  position: absolute; right: -10px; bottom: -14px;
  width: 88px; height: 88px; border-radius: 24px;
  display: grid; place-items: center; font-size: 44px;
  background: rgba(255,255,255,0.95);
  box-shadow: 0 16px 40px rgba(0,0,0,0.18);
}

/* ───────── RIGHT PANEL ───────── */
.auth-right {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 40px 32px;
}
.auth-mobile-brand { display: none; }

.auth-card {
  width: 100%; max-width: 440px;
  padding: 36px 32px; border-radius: 24px;
  background: #fff;
  border: 1px solid #e8ecf1;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(100,116,139,0.08);
}
.card-header { margin-bottom: 28px; }
.card-title {
  font-size: 1.5rem; font-weight: 700;
  color: var(--text-primary); line-height: 1.2; margin-bottom: 6px;
}
.card-subtitle { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }

/* ───────── FORM ───────── */
.auth-form { display: flex; flex-direction: column; gap: 18px; }
.auth-form .form-group { margin-bottom: 0; }
.auth-form .form-input { padding: 12px 16px; border-radius: 12px; font-size: 14px; }

.form-input--error { border-color: var(--color-error) !important; }
.form-input--error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.12) !important; }

.label-row {
  display: flex; align-items: center;
  justify-content: space-between; gap: 8px; margin-bottom: 6px;
}
.label-row .form-label { margin-bottom: 0; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

/* Profile picker */
.profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.profile-option {
  padding: 16px 14px; border-radius: 16px;
  border: 1.5px solid var(--surface-border);
  background: var(--surface-card);
  text-align: left; cursor: pointer;
  transition: all 0.2s ease;
}
.profile-option:hover { border-color: var(--practiq-violet-light); background: var(--practiq-violet-bg); }
.profile-option.active {
  border-color: var(--practiq-violet);
  background: var(--practiq-violet-bg);
  box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
}
.profile-option__emoji { display: block; font-size: 22px; margin-bottom: 8px; }
.profile-option__name { display: block; font-weight: 700; font-size: 14px; color: var(--text-primary); }
.profile-option__desc { display: block; margin-top: 2px; font-size: 12px; color: var(--text-secondary); line-height: 1.4; }

/* Buttons */
.submit-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; min-height: 48px;
  border: none; border-radius: 12px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  background: var(--practiq-violet); color: white;
  box-shadow: 0 4px 14px rgba(124,58,237,0.25);
  transition: all 0.2s ease;
}
.submit-btn:hover:not(:disabled) {
  background: var(--practiq-violet-dark);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124,58,237,0.3);
}
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ghost-btn {
  width: 100%; min-height: 44px;
  border: 1px solid var(--surface-border); border-radius: 12px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  background: var(--surface-card); color: var(--text-primary);
  transition: all 0.2s ease;
}
.ghost-btn:hover { background: var(--surface-hover); }

.text-link {
  border: none; background: none; padding: 0;
  color: var(--practiq-violet); font-weight: 600;
  font-size: 13px; cursor: pointer;
}
.text-link:hover { color: var(--practiq-violet-dark); }

/* Alerts */
.alert {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: 12px;
  font-size: 13px; line-height: 1.5;
}
.alert--error { background: var(--color-error-bg); color: #b91c1c; border: 1px solid rgba(239,68,68,0.12); }
.alert--success { background: var(--color-success-bg); color: #047857; border: 1px solid rgba(16,185,129,0.12); }

/* Divider */
.auth-divider {
  position: relative; margin: 22px 0 18px;
  text-align: center; color: var(--text-muted); font-size: 13px;
}
.auth-divider::before {
  content: ''; position: absolute; left: 0; right: 0; top: 50%;
  height: 1px; background: var(--surface-border);
}
.auth-divider span { position: relative; z-index: 1; padding: 0 14px; background: #fff; }

/* Footer */
.card-footer {
  margin-top: 20px; display: flex;
  align-items: center; justify-content: center;
  gap: 6px; font-size: 14px; color: var(--text-secondary);
}

/* Identity box */
.identity-box {
  display: flex; align-items: center; gap: 14px;
  padding: 16px; border-radius: 16px;
  background: var(--surface-hover); border: 1px solid var(--surface-border);
}
.identity-avatar {
  width: 48px; height: 48px; border-radius: 14px;
  display: grid; place-items: center;
  background: var(--practiq-violet); color: white;
  font-weight: 800; font-size: 18px; flex-shrink: 0;
}
.identity-name { font-weight: 700; font-size: 15px; color: var(--text-primary); }
.identity-email { margin-top: 2px; font-size: 13px; color: var(--text-secondary); }

/* ───────── RESPONSIVE ───────── */
@media (max-width: 1024px) {
  .auth-page { grid-template-columns: 1fr; }
  .auth-left { display: none; }
  .auth-mobile-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .auth-right { min-height: 100vh; }
}
@media (max-width: 480px) {
  .auth-right { padding: 24px 16px; }
  .auth-card { padding: 28px 20px; border-radius: 20px; }
  .two-col, .profile-grid { grid-template-columns: 1fr; }
  .card-title { font-size: 1.3rem; }
}
</style>
