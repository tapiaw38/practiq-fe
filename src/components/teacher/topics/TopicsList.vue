<script setup lang="ts">
  import type { TopicsListEmits, TopicsListProps } from "./TopicsList.types";

  defineProps<TopicsListProps>();
  const emit = defineEmits<TopicsListEmits>();
</script>

<template>
  <div class="tab-content">
    <div class="section-header">
      <h2>Temas del curso</h2>
      <button class="btn btn-primary btn-sm" @click="emit('create')">
        <i class="pi pi-plus"></i> Nuevo Tema
      </button>
    </div>
    <div v-if="topics.length === 0" class="empty-inline">
      Aún no hay temas. Crea el primero.
    </div>
    <div class="items-list">
      <div v-for="topic in topics" :key="topic.id" class="list-item">
        <div class="item-info">
          <span class="item-order">{{ topic.order_index + 1 }}</span>
          <div v-if="editingTopicId !== topic.id">
            <div class="item-title">{{ topic.title }}</div>
            <div class="item-subtitle">{{ topic.description }}</div>
          </div>
          <div v-else class="inline-edit-row">
            <input
              :value="editTopicTitle"
              class="form-input inline-edit-input"
              @input="
                emit(
                  'update:editTopicTitle',
                  ($event.target as HTMLInputElement).value,
                )
              "
              @keyup.enter="emit('save', topic)"
              @keyup.esc="emit('cancelEdit')"
            />
            <button class="btn btn-primary btn-sm" @click="emit('save', topic)">
              Guardar
            </button>
            <button class="btn btn-ghost btn-sm" @click="emit('cancelEdit')">
              Cancelar
            </button>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" @click="emit('edit', topic)">
            <i class="pi pi-pencil"></i>
          </button>
          <button
            class="btn btn-ghost btn-sm"
            @click="emit('delete', topic.id)"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .tab-content {
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-card);
    padding: 20px;
  }
  .section-header,
  .list-item,
  .item-info,
  .item-actions,
  .inline-edit-row {
    display: flex;
    align-items: center;
  }
  .section-header {
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }
  .section-header h2 {
    margin: 0;
    color: var(--text-heading);
    font-size: 1.25rem;
    font-weight: 800;
  }
  .empty-inline {
    padding: 18px;
    border: 1px dashed var(--surface-border);
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    text-align: center;
  }
  .items-list {
    display: grid;
    gap: 10px;
  }
  .list-item {
    justify-content: space-between;
    gap: 14px;
    padding: 14px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    transition: var(--transition-fast);
  }
  .list-item:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }
  .item-info {
    gap: 12px;
    min-width: 0;
  }
  .item-order {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: grid;
    place-items: center;
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    font-weight: 800;
    flex: 0 0 auto;
  }
  .item-title {
    font-weight: 800;
    color: var(--text-primary);
  }
  .item-subtitle {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    margin-top: 3px;
  }
  .item-actions {
    gap: 8px;
    flex: 0 0 auto;
  }
  .inline-edit-row {
    gap: 8px;
    flex-wrap: wrap;
  }
  .inline-edit-input {
    min-width: 220px;
  }
  @media (max-width: 760px) {
    .section-header,
    .list-item {
      flex-direction: column;
      align-items: stretch;
    }
    .item-actions {
      justify-content: flex-end;
    }
  }
</style>
