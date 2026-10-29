<script setup lang="ts">
import type { StrategyCatalogEmits, StrategyCatalogProps } from './StrategyCatalog.types';

defineProps<StrategyCatalogProps>();
const emit = defineEmits<StrategyCatalogEmits>();
</script>

<template>
    <section class="content-section">
        <div class="section-header">
            <div>
                <h2 class="section-title">Estrategias disponibles</h2>
                <p class="section-subtitle">
                    Cómo la IA acompaña a cada alumno. Los docentes eligen una por curso.
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
            <article v-for="strategy in strategies" :key="strategy.id" class="strategy-card">
                <div class="strategy-header">
                    <h3 class="strategy-name">{{ strategy.name }}</h3>
                    <code class="strategy-code">{{ strategy.code }}</code>
                </div>
                <p class="strategy-description">
                    {{ strategy.description || 'Sin descripción' }}
                </p>
                <div class="strategy-footer">
                    <span class="strategy-usage">{{
                        (usageCounts?.[strategy.id] ?? 0) === 1
                            ? 'Usada en 1 curso'
                            : `Usada en ${usageCounts?.[strategy.id] ?? 0} cursos`
                    }}</span>
                    <div v-if="isSuperAdmin" class="strategy-actions-mini">
                        <button class="icon-btn" title="Editar" @click="emit('edit', strategy)">
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
.strategy-footer {
    display: flex;
    align-items: center;
}
.strategy-header {
    justify-content: space-between;
    gap: 12px;
}
.strategy-name {
    margin: 0;
    flex: 1;
    font-size: 1rem;
    font-weight: 800;
    color: var(--text-heading);
}
.strategy-code {
    padding: 2px 7px;
    border-radius: var(--radius-xs);
    background: var(--surface-sunken);
    color: var(--text-secondary);
    font-size: var(--text-xs);
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
.strategy-footer {
    justify-content: space-between;
    gap: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--line);
    color: var(--text-muted);
    font-size: var(--text-xs);
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

@media (max-width: 600px) {
    .icon-btn {
        width: 44px;
        height: 44px;
    }
}
</style>
