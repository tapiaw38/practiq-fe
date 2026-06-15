<script setup lang="ts">
  import type {
    PracticeSheetsListEmits,
    PracticeSheetsListProps,
  } from "./PracticeSheetsList.types";

  defineProps<PracticeSheetsListProps>();
  const emit = defineEmits<PracticeSheetsListEmits>();
</script>

<template>
  <div class="tab-content">
    <div class="section-header">
      <h2>Hojas de Práctica</h2>
      <button class="btn btn-primary btn-sm" @click="emit('create')">
        <i class="pi pi-plus"></i> Nueva Hoja
      </button>
    </div>
    <div v-if="sheets.length === 0" class="empty-inline">
      No hay hojas de práctica.
    </div>
    <div class="items-list">
      <div v-for="sheet in sheets" :key="sheet.id" class="list-item">
        <div class="item-info">
          <div class="level-badge">Nivel {{ sheet.level }}</div>
          <div>
            <div class="item-title item-title--with-badge">
              <span>{{ sheet.title }}</span>
              <span
                class="sheet-type-pill"
                :class="
                  sheet.sheet_type === 'level_test'
                    ? 'sheet-type-pill--test'
                    : 'sheet-type-pill--practice'
                "
              >
                {{
                  sheet.sheet_type === "level_test"
                    ? "Prueba de nivel"
                    : "Práctica"
                }}
              </span>
            </div>
            <div class="item-subtitle">
              {{ sheet.exercises?.length || 0 }} ejercicios ·
              {{ sheet.created_by }}
            </div>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" @click="emit('edit', sheet)">
            <i class="pi pi-pencil"></i>
          </button>
          <button
            class="btn btn-ghost btn-sm"
            @click="emit('delete', sheet.id)"
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
  .item-title--with-badge {
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
  .item-title--with-badge {
    gap: 8px;
    flex-wrap: wrap;
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
  .level-badge {
    border-radius: var(--radius-pill);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    font-size: var(--text-xs);
    font-weight: 800;
    padding: 6px 10px;
    white-space: nowrap;
  }
  .sheet-type-pill {
    border-radius: var(--radius-pill);
    padding: 4px 8px;
    font-size: var(--text-xs);
    font-weight: 800;
  }
  .sheet-type-pill--practice {
    background: var(--color-info-bg);
    color: var(--color-info-dark);
  }
  .sheet-type-pill--test {
    background: var(--color-warning-bg);
    color: var(--color-warning-dark);
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
