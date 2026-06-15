<template>
  <div v-if="visible" class="modal-backdrop" @click.self="close">
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title">Cambiar contraseña</h2>
        <button class="modal-close" @click="close">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <form class="modal-body" @submit.prevent="submit">
        <div class="field">
          <label class="field-label">Contraseña actual</label>
          <div class="input-wrap">
            <input
              v-model="oldPassword"
              :type="showOld ? 'text' : 'password'"
              class="field-input"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            <button type="button" class="eye-btn" @click="showOld = !showOld">
              <i class="pi" :class="showOld ? 'pi-eye-slash' : 'pi-eye'"></i>
            </button>
          </div>
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
          <label class="field-label">Confirmar nueva contraseña</label>
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
          <i class="pi pi-check-circle"></i> Contraseña actualizada
          correctamente
        </div>

        <button
          type="submit"
          class="btn-gradient"
          :disabled="!canSubmit || loading"
        >
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          <span v-else>Actualizar contraseña</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from "vue";
  import { authService } from "@/services/auth/authService";
  import type {
    ChangePasswordModalEmits,
    ChangePasswordModalProps,
  } from "./ChangePasswordModal.types";

  const props = defineProps<ChangePasswordModalProps>();
  const emit = defineEmits<ChangePasswordModalEmits>();

  const oldPassword = ref("");
  const newPassword = ref("");
  const confirmPassword = ref("");
  const showOld = ref(false);
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
    () =>
      oldPassword.value.length > 0 &&
      passwordStrong.value &&
      confirmPassword.value === newPassword.value &&
      newPassword.value !== oldPassword.value,
  );

  async function submit() {
    if (!canSubmit.value) return;
    loading.value = true;
    errorMsg.value = "";
    success.value = false;
    try {
      await authService.changePassword(oldPassword.value, newPassword.value);
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
    oldPassword.value = "";
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
</style>
