<template>
  <div v-if="visible" class="modal-backdrop" @click.self="close">
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title">Establecer contraseña</h2>
        <button class="modal-close" @click="close"><i class="pi pi-times"></i></button>
      </div>

      <form class="modal-body" @submit.prevent="submit">
        <div class="google-notice">
          <i class="pi pi-google"></i>
          Tu cuenta usa Google. Establece una contraseña para poder iniciar sesión también con email.
        </div>

        <div class="field">
          <label class="field-label">Nueva contraseña</label>
          <div class="input-wrap">
            <input
              v-model="newPassword"
              :type="showNew ? 'text' : 'password'"
              class="field-input"
              placeholder="••••••••"
              autocomplete="new-password"
            />
            <button type="button" class="eye-btn" @click="showNew = !showNew">
              <i class="pi" :class="showNew ? 'pi-eye-slash' : 'pi-eye'"></i>
            </button>
          </div>
          <ul class="strength-hints" v-if="newPassword">
            <li :class="{ ok: newPassword.length >= 8 }">Mínimo 8 caracteres</li>
            <li :class="{ ok: /[A-Z]/.test(newPassword) }">Una mayúscula</li>
            <li :class="{ ok: /[a-z]/.test(newPassword) }">Una minúscula</li>
            <li :class="{ ok: /[0-9]/.test(newPassword) }">Un número</li>
            <li :class="{ ok: /[^A-Za-z0-9]/.test(newPassword) }">Un carácter especial</li>
          </ul>
        </div>

        <div class="field">
          <label class="field-label">Confirmar contraseña</label>
          <div class="input-wrap">
            <input
              v-model="confirmPassword"
              :type="showConfirm ? 'text' : 'password'"
              class="field-input"
              placeholder="••••••••"
              autocomplete="new-password"
            />
            <button type="button" class="eye-btn" @click="showConfirm = !showConfirm">
              <i class="pi" :class="showConfirm ? 'pi-eye-slash' : 'pi-eye'"></i>
            </button>
          </div>
          <p v-if="confirmPassword && confirmPassword !== newPassword" class="field-error">
            Las contraseñas no coinciden
          </p>
        </div>

        <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>

        <div v-if="success" class="form-success">
          <i class="pi pi-check-circle"></i> Contraseña establecida. Ahora podés iniciar sesión con email.
        </div>

        <button type="submit" class="btn-submit" :disabled="!canSubmit || loading">
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          <span v-else>Establecer contraseña</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { authApi } from '@/api/request/server'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void }>()

const authStore = useAuthStore()
const newPassword = ref('')
const confirmPassword = ref('')
const showNew = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const success = ref(false)

const passwordStrong = computed(() =>
  newPassword.value.length >= 8 &&
  /[A-Z]/.test(newPassword.value) &&
  /[a-z]/.test(newPassword.value) &&
  /[0-9]/.test(newPassword.value) &&
  /[^A-Za-z0-9]/.test(newPassword.value)
)

const canSubmit = computed(() =>
  passwordStrong.value && confirmPassword.value === newPassword.value
)

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  errorMsg.value = ''
  success.value = false
  try {
    await authApi.post('/user/me/password/set', { new_password: newPassword.value })
    // Update stored auth_method to hybrid
    if (authStore.authUser) {
      authStore.setAuthUser({ ...authStore.authUser, auth_method: 'hybrid' })
    }
    success.value = true
    setTimeout(() => close(), 1800)
  } catch (err: any) {
    const msg = err?.response?.data?.message
    errorMsg.value = msg || 'Ocurrió un error. Intentá de nuevo.'
  } finally {
    loading.value = false
  }
}

function close() {
  newPassword.value = ''
  confirmPassword.value = ''
  errorMsg.value = ''
  success.value = false
  emit('update:visible', false)
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-box {
  background: #fff;
  border-radius: var(--radius-2xl);
  width: min(420px, calc(100vw - 32px));
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.modal-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-heading);
  margin: 0;
}

.modal-close {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  border: none;
  background: rgba(248, 250, 252, 0.9);
  color: var(--text-secondary);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 0.15s;
}
.modal-close:hover { background: rgba(239, 68, 68, 0.08); color: var(--color-error); }

.modal-body {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.google-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(99, 102, 241, 0.07);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: 1.5;
}
.google-notice .pi { color: #6366f1; flex-shrink: 0; margin-top: 2px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); }

.input-wrap { position: relative; }

.field-input {
  width: 100%;
  padding: 11px 40px 11px 14px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(148, 163, 184, 0.25);
  font-size: var(--text-md);
  background: rgba(248, 250, 252, 0.8);
  color: var(--text-primary);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.field-input:focus { border-color: rgba(124, 58, 237, 0.4); background: #fff; }

.eye-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  font-size: var(--text-md);
}

.strength-hints {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}
.strength-hints li {
  font-size: var(--text-xs);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
.strength-hints li::before { content: '✗'; font-size: 10px; }
.strength-hints li.ok { color: var(--color-success-dark); }
.strength-hints li.ok::before { content: '✓'; }

.field-error { font-size: var(--text-sm); color: var(--color-error); margin: 0; }

.form-error {
  font-size: var(--text-base);
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.06);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  margin: 0;
}

.form-success {
  font-size: var(--text-base);
  color: var(--color-success-dark);
  background: rgba(5, 150, 105, 0.08);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-submit {
  padding: 12px;
  border-radius: var(--radius-md);
  border: none;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
  font-size: var(--text-md);
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-submit:not(:disabled):hover { opacity: 0.9; }
</style>
