<script setup lang="ts">
  import type {
    NotebooksListEmits,
    NotebooksListProps,
  } from "./NotebooksList.types";

  defineProps<NotebooksListProps>();
  const emit = defineEmits<NotebooksListEmits>();
</script>

<template>
  <div class="tab-content">
    <div class="section-header">
      <h2>Cuadernos de Tareas</h2>
      <button class="btn btn-primary btn-sm" @click="emit('create')">
        <i class="pi pi-plus"></i> Nuevo Cuaderno
      </button>
    </div>
    <div v-if="notebooks.length === 0" class="empty-inline">
      No hay cuadernos aún.
    </div>
    <div class="items-list">
      <div
        v-for="notebook in notebooks"
        :key="notebook.id"
        class="list-item"
        @click="emit('open', notebook.id)"
      >
        <div class="item-info">
          <i class="pi pi-book item-leading-icon"></i>
          <div>
            <div class="item-title">{{ notebook.title }}</div>
            <div class="item-subtitle">
              {{ notebook.description || "Sin descripción" }} ·
              {{ notebook.pages?.length || 0 }} páginas
            </div>
          </div>
        </div>
        <div class="item-actions" @click.stop>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            aria-label="Editar páginas"
            @click="emit('open', notebook.id)"
          >
            <i class="pi pi-pencil"></i><span>Editar</span>
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            aria-label="Ajustes del cuaderno"
            @click="emit('edit', notebook)"
          >
            <i class="pi pi-cog"></i><span>Ajustes</span>
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            aria-label="Eliminar cuaderno"
            @click="emit('delete', notebook.id)"
          >
            <i class="pi pi-trash"></i><span>Eliminar</span>
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
  .item-actions {
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
  .item-title {
    font-weight: 800;
    color: var(--text-primary);
  }
  .item-subtitle {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    margin-top: 3px;
  }
  .item-leading-icon {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-md);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    flex: 0 0 auto;
  }
  .item-actions {
    gap: 8px;
    flex: 0 0 auto;
  }
  .item-actions span {
    display: none;
  }
  @media (max-width: 760px) {
    .section-header {
      flex-direction: column;
      align-items: stretch;
    }
    .list-item {
      align-items: center;
      gap: 10px;
      padding: 12px;
    }
    .item-info { flex: 1; }
    .item-info > div { min-width: 0; }
    .item-title,
    .item-subtitle {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .item-actions {
      justify-content: flex-end;
      display: flex;
      gap: 2px;
    }
    :global(:root[data-ui-theme="teacher"]) .item-actions .btn {
      width: 36px;
      min-width: 36px;
      min-height: 36px;
      height: 36px;
      padding: 0;
      justify-content: center;
    }
    .item-actions span {
      display: none;
    }
  }
</style>
