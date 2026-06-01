<template>
  <Teleport to="body">
    <div v-if="show" class="confirm-backdrop" @click.self="$emit('cancel')">
      <div class="confirm-card">
        <div class="confirm-icon" :class="danger ? 'confirm-icon--danger' : 'confirm-icon--info'">
          <i :class="danger ? 'pi pi-exclamation-triangle' : 'pi pi-info-circle'"></i>
        </div>
        <div class="confirm-body">
          <p class="confirm-message">{{ message }}</p>
          <p v-if="description" class="confirm-description">{{ description }}</p>
        </div>
        <div class="confirm-actions">
          <button class="confirm-btn confirm-btn--cancel" @click="$emit('cancel')">Cancelar</button>
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

<script setup lang="ts">
defineProps<{
  show: boolean
  message: string
  description?: string
  confirmLabel?: string
  danger?: boolean
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 200;
  backdrop-filter: blur(2px);
}

.confirm-card {
  background: #fff;
  border-radius: var(--radius-2xl);
  width: min(400px, 100%);
  padding: 28px 28px 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
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
  background: #fef2f2;
  color: var(--color-error);
}

.confirm-icon--info {
  background: #eff6ff;
  color: #2563eb;
}

.confirm-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.confirm-message {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
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
  background: #f1f5f9;
  color: #374151;
  border: 1.5px solid #e2e8f0;
}
.confirm-btn--cancel:hover {
  background: #e2e8f0;
}

.confirm-btn--danger {
  background: var(--color-error);
  color: #fff;
}
.confirm-btn--danger:hover {
  opacity: 0.88;
}

.confirm-btn--primary {
  background: var(--practiq-violet, #7c3aed);
  color: #fff;
}
.confirm-btn--primary:hover {
  opacity: 0.88;
}
</style>
