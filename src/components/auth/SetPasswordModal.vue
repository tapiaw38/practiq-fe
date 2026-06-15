<template>
  <div v-if="visible" class="modal-backdrop" @click.self="close">
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title">Establecer contraseña</h2>
        <button class="modal-close" @click="close">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <form class="modal-body" @submit.prevent="submit">
        <div class="google-notice">
          <i class="pi pi-google"></i>
          Tu cuenta usa Google. Establece una contraseña para poder iniciar
          sesión también con email.
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
            <li :class="{ ok: newPassword.length >= 8 }">
              Mínimo 8 caracteres
            </li>
            <li :class="{ ok: /[A-Z]/.test(newPassword) }">Una mayúscula</li>
            <li :class="{ ok: /[a-z]/.test(newPassword) }">Una minúscula</li>
            <li :class="{ ok: /[0-9]/.test(newPassword) }">Un número</li>
            <li :class="{ ok: /[^A-Za-z0-9]/.test(newPassword) }">
              Un carácter especial
            </li>
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
            <button
              type="button"
              class="eye-btn"
              @click="showConfirm = !showConfirm"
            >
              <i
                class="pi"
                :class="showConfirm ? 'pi-eye-slash' : 'pi-eye'"
              ></i>
            </button>
          </div>
          <p
            v-if="confirmPassword && confirmPassword !== newPassword"
            class="field-error"
          >
            Las contraseñas no coinciden
          </p>
        </div>

        <p v-if="errorMsg" class="form-alert form-alert--error">{{ errorMsg }}</p>

        <div v-if="success" class="form-alert form-alert--success">
          <i class="pi pi-check-circle"></i> Contraseña establecida. Ahora podés
          iniciar sesión con email.
        </div>

        <button
          type="submit"
          class="btn-gradient"
          :disabled="!canSubmit || loading"
        >
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          <span v-else>Establecer contraseña</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from "vue";
  import { authApi } from "@/api/request/server";
  import { useAuthStore } from "@/stores/authStore";
  import type {
    SetPasswordModalEmits,
    SetPasswordModalProps,
  } from "./SetPasswordModal.types";

  const props = defineProps<SetPasswordModalProps>();
  const emit = defineEmits<SetPasswordModalEmits>();

  const authStore = useAuthStore();
  const newPassword = ref("");
  const confirmPassword = ref("");
  const showNew = ref(false);
  const showConfirm = ref(false);
  const loading = ref(false);
  const errorMsg = ref("");
  const success = ref(false);

  const passwordStrong = computed(
    () =>
      newPassword.value.length >= 8 &&
      /[A-Z]/.test(newPassword.value) &&
      /[a-z]/.test(newPassword.value) &&
      /[0-9]/.test(newPassword.value) &&
      /[^A-Za-z0-9]/.test(newPassword.value),
  );

  const canSubmit = computed(
    () => passwordStrong.value && confirmPassword.value === newPassword.value,
  );

  async function submit() {
    if (!canSubmit.value) return;
    loading.value = true;
    errorMsg.value = "";
    success.value = false;
    try {
      await authApi.post("/user/me/password/set", {
        new_password: newPassword.value,
      });
      // Update stored auth_method to hybrid
      if (authStore.authUser) {
        authStore.setAuthUser({ ...authStore.authUser, auth_method: "hybrid" });
      }
      success.value = true;
      setTimeout(() => close(), 1800);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      errorMsg.value = msg || "Ocurrió un error. Intentá de nuevo.";
    } finally {
      loading.value = false;
    }
  }

  function close() {
    newPassword.value = "";
    confirmPassword.value = "";
    errorMsg.value = "";
    success.value = false;
    emit("update:visible", false);
  }
</script>

<style scoped>
  .modal-box {
    background: var(--surface-card);
    border-radius: var(--radius-2xl);
    width: min(420px, calc(100vw - 32px));
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  .modal-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--text-heading);
    margin: 0;
  }

  .google-notice {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    background: rgba(var(--practiq-indigo-rgb), 0.07);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    color: var(--text-secondary);
    line-height: 1.5;
  }
  .google-notice .pi {
    color: var(--practiq-indigo);
    flex-shrink: 0;
    margin-top: 2px;
  }
</style>
