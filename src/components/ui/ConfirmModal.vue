<script setup lang="ts">
  import type {
    ConfirmModalEmits,
    ConfirmModalProps,
  } from "./ConfirmModal.types";

  defineProps<ConfirmModalProps>();
  defineEmits<ConfirmModalEmits>();
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="confirm-backdrop" @click.self="$emit('cancel')">
      <div class="confirm-card">
        <div
          class="confirm-icon"
          :class="danger ? 'confirm-icon--danger' : 'confirm-icon--info'"
        >
          <i
            :class="danger ? 'pi pi-exclamation-triangle' : 'pi pi-info-circle'"
          ></i>
        </div>
        <div class="confirm-body">
          <p class="confirm-message">{{ message }}</p>
          <p v-if="description" class="confirm-description">
            {{ description }}
          </p>
        </div>
        <div class="confirm-actions">
          <button
            class="confirm-btn confirm-btn--cancel"
            @click="$emit('cancel')"
          >
            Cancelar
          </button>
          <button
            class="confirm-btn"
            :class="danger ? 'confirm-btn--danger' : 'confirm-btn--primary'"
            @click="$emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
  .confirm-backdrop {
    position: fixed;
    inset: 0;
    background: var(--surface-overlay);
    display: grid;
    place-items: center;
    padding: 24px;
    z-index: 200;
    backdrop-filter: blur(2px);
  }

  .confirm-card {
    background: var(--surface-card);
    border-radius: var(--radius-2xl);
    width: min(400px, 100%);
    padding: 28px 28px 24px;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
  }

  .confirm-icon {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .confirm-icon--danger {
    background: var(--color-error-bg);
    color: var(--color-error);
  }

  .confirm-icon--info {
    background: var(--color-info-bg);
    color: var(--color-info);
  }

  .confirm-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .confirm-message {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-heading);
    margin: 0;
    line-height: 1.4;
  }

  .confirm-description {
    font-size: var(--text-base);
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    gap: 10px;
    width: 100%;
    margin-top: 4px;
  }

  .confirm-btn {
    flex: 1;
    padding: 10px 16px;
    border-radius: var(--radius-sm);
    font-size: var(--text-md);
    font-weight: 700;
    cursor: pointer;
    border: none;
    transition: opacity 0.15s;
  }

  .confirm-btn--cancel {
    background: var(--surface-hover);
    color: var(--text-primary);
    border: 1.5px solid var(--surface-border);
  }
  .confirm-btn--cancel:hover {
    background: var(--surface-border);
  }

  .confirm-btn--danger {
    background: var(--color-error);
    color: var(--color-on-primary);
  }
  .confirm-btn--danger:hover {
    opacity: 0.88;
  }

  .confirm-btn--primary {
    background: var(--practiq-violet);
    color: var(--color-on-primary);
  }
  .confirm-btn--primary:hover {
    opacity: 0.88;
  }
</style>
