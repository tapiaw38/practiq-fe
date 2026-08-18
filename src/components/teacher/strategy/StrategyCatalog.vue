<script setup lang="ts">
  import type {
    StrategyCatalogEmits,
    StrategyCatalogProps,
  } from "./StrategyCatalog.types";
  import { formatDate } from "@/utils/formatters";

  defineProps<StrategyCatalogProps>();
  const emit = defineEmits<StrategyCatalogEmits>();
</script>

<template>
  <section class="content-section">
    <div class="section-header">
      <div>
        <h2 class="section-title">Estrategias disponibles</h2>
        <p class="section-subtitle">
          Configura como los estudiantes aprenden y progresan en cada curso.
        </p>
      </div>
    </div>

    <div v-if="strategies.length === 0" class="empty-state">
      <div class="empty-icon"><i class="pi pi-cog"></i></div>
      <h3>Sin estrategias</h3>
      <p>No hay estrategias de aprendizaje configuradas.</p>
      <button v-if="isSuperAdmin" class="btn btn-primary" @click="emit('create')">
        <i class="pi pi-plus"></i> Crear estrategia
      </button>
    </div>

    <div v-else class="strategies-grid">
      <article
        v-for="strategy in strategies"
        :key="strategy.id"
        class="strategy-card"
      >
        <div class="strategy-header">
          <h3 class="strategy-name">{{ strategy.name }}</h3>
          <div v-if="isSuperAdmin" class="strategy-actions-mini">
            <button
              class="icon-btn"
              title="Editar"
              @click="emit('edit', strategy)"
            >
              <i class="pi pi-pencil"></i>
            </button>
            <button
              class="icon-btn icon-btn--danger"
              title="Eliminar"
              @click="emit('delete', strategy)"
            >
              <i class="pi pi-trash"></i>
            </button>
          </div>
        </div>
        <p class="strategy-description">
          {{ strategy.description || "Sin descripcion" }}
        </p>
        <div class="strategy-meta">
          <span class="meta-item"
            ><i class="pi pi-hashtag"></i>{{ strategy.code }}</span
          >
          <span class="meta-item"
            ><i class="pi pi-calendar"></i>Creada
            {{ formatDate(strategy.created_at) }}</span
          >
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
  .content-section {
    margin-bottom: 28px;
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }
  .section-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text-heading);
  }
  .section-subtitle {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }
  .strategies-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }
  .strategy-card,
  .empty-state {
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card);
    padding: 16px;
  }
  .strategy-header,
  .strategy-actions-mini,
  .strategy-meta,
  .meta-item {
    display: flex;
    align-items: center;
  }
  .strategy-header {
    justify-content: space-between;
    gap: 12px;
  }
  .strategy-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
    color: var(--text-heading);
  }
  .strategy-actions-mini {
    gap: 6px;
  }
  .icon-btn {
    width: 30px;
    height: 30px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    background: var(--surface-card);
    color: var(--text-secondary);
    cursor: pointer;
  }
  .icon-btn--danger {
    color: var(--color-error-dark);
  }
  .strategy-description {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    min-height: 38px;
  }
  .strategy-meta {
    gap: 10px;
    flex-wrap: wrap;
    color: var(--text-muted);
    font-size: var(--text-xs);
  }
  .meta-item {
    gap: 4px;
  }
  .empty-state {
    text-align: center;
    color: var(--text-secondary);
  }
  .empty-icon {
    font-size: 24px;
    color: var(--practiq-violet);
    margin-bottom: 8px;
  }

  /* Tap targets >= 44px en mobile */
  @media (max-width: 600px) {
    .icon-btn {
      width: 44px;
      height: 44px;
    }
  }
</style>
