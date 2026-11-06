<script setup lang="ts">
import type { TopicsListEmits, TopicsListProps } from './TopicsList.types';

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
                    <button class="btn btn-ghost btn-sm" @click="emit('delete', topic.id)">
                        <i class="pi pi-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tab-content {
    display: grid;
    gap: 12px;
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
    font: 900 17px/1.2 var(--font-ui);
    letter-spacing: -0.02em;
    color: var(--ink);
}
.empty-inline {
    padding: 18px;
    border: 1px dashed var(--brand-200);
    border-radius: var(--radius-md);
    color: var(--ink-muted);
    text-align: center;
}
.items-list {
    display: grid;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
    overflow: hidden;
}
.items-list:empty {
    display: none;
}
.list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-top: 1px solid var(--line);
    background: var(--surface);
    color: inherit;
    text-decoration: none;
}
.list-item:first-child {
    border-top: 0;
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
    font-size: 13.5px;
    font-weight: 600;
    color: var(--ink);
}
.item-subtitle {
    margin-top: 2px;
    font-size: 12px;
    color: var(--ink-muted);
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
    .section-header {
        flex-direction: column;
        align-items: stretch;
    }
    .list-item {
        padding: 12px;
    }
    .item-info {
        flex: 1;
    }
    .item-info > div:not(.inline-edit-row) {
        min-width: 0;
    }
    .item-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .item-subtitle {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 1;
    }
    .item-actions {
        justify-content: flex-end;
        gap: 2px;
    }
    .item-actions .btn {
        width: 36px;
        min-width: 36px;
        min-height: 36px;
        height: 36px;
        padding: 0;
        justify-content: center;
    }
}
</style>
