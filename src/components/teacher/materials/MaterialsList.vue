<script setup lang="ts">
  import type {
    MaterialsListEmits,
    MaterialsListProps,
  } from "./MaterialsList.types";

  defineProps<MaterialsListProps>();
  const emit = defineEmits<MaterialsListEmits>();

  const materialIcon = (type: string) =>
    ({
      pdf: "pi pi-file-pdf",
      image: "pi pi-image",
      video: "pi pi-video",
      text: "pi pi-align-left",
      worksheet: "pi pi-copy",
    })[type] || "pi pi-file";
</script>

<template>
  <div class="tab-content">
    <div class="section-header">
      <h2>Materiales</h2>
      <button class="btn btn-primary btn-sm" @click="emit('create')">
        <i class="pi pi-plus"></i> Agregar Material
      </button>
    </div>
    <div v-if="materials.length === 0" class="empty-inline">
      No hay materiales aún.
    </div>
    <div class="items-list">
      <div v-for="material in materials" :key="material.id" class="list-item">
        <div class="item-info">
          <i :class="materialIcon(material.type)" class="item-leading-icon"></i>
          <div>
            <div class="item-title">{{ material.title }}</div>
            <div class="item-subtitle">
              {{ material.type }} · {{ material.status }}
            </div>
          </div>
        </div>
        <button
          class="btn btn-ghost btn-sm"
          @click="emit('delete', material.id)"
        >
          <i class="pi pi-trash"></i>
        </button>
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
  .item-info {
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
</style>
