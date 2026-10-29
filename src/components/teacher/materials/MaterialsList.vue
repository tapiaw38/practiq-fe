<script setup lang="ts">
import { ref } from 'vue';
import FileViewer from '@/components/ui/FileViewer.vue';
import type { Material } from '@/types';
import type { MaterialsListEmits, MaterialsListProps } from './MaterialsList.types';

defineProps<MaterialsListProps>();
const emit = defineEmits<MaterialsListEmits>();

const viewing = ref<Material | null>(null);

const materialIcon = (type: string) =>
    ({
        pdf: 'pi pi-file-pdf',
        image: 'pi pi-image',
        video: 'pi pi-video',
        text: 'pi pi-align-left',
        worksheet: 'pi pi-copy',
    })[type] || 'pi pi-file';
</script>

<template>
    <div class="tab-content">
        <div class="section-header">
            <h2>Materiales</h2>
            <button class="btn btn-primary btn-sm" @click="emit('create')">
                <i class="pi pi-plus"></i> Agregar Material
            </button>
        </div>
        <div v-if="materials.length === 0" class="empty-inline">No hay materiales aún.</div>
        <div class="items-list">
            <div v-for="material in materials" :key="material.id" class="list-item">
                <div class="item-info">
                    <i :class="materialIcon(material.type)" class="item-leading-icon"></i>
                    <div>
                        <div class="item-title">{{ material.title }}</div>
                        <div class="item-subtitle">{{ material.type }} · {{ material.status }}</div>
                    </div>
                </div>
                <div class="item-actions">
                    <button
                        v-if="material.file_url"
                        class="btn btn-ghost btn-sm"
                        title="Ver"
                        @click="viewing = material"
                    >
                        <i class="pi pi-eye"></i>
                    </button>
                    <button
                        class="btn btn-ghost btn-sm"
                        title="Editar"
                        @click="emit('edit', material)"
                    >
                        <i class="pi pi-pencil"></i>
                    </button>
                    <button
                        class="btn btn-ghost btn-sm"
                        title="Eliminar"
                        @click="emit('delete', material.id)"
                    >
                        <i class="pi pi-trash"></i>
                    </button>
                </div>
            </div>
        </div>

        <FileViewer
            :show="!!viewing"
            :url="viewing?.view_url || viewing?.file_url || ''"
            :title="viewing?.title || 'Material'"
            @close="viewing = null"
        />
    </div>
</template>

<style scoped>
.tab-content {
    display: grid;
    gap: 12px;
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
.item-actions {
    display: flex;
    align-items: center;
    gap: 6px;
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

@media (max-width: 600px) {
    .tab-content {
        padding: 14px;
    }
    .section-header {
        align-items: stretch;
        flex-direction: column;
        gap: 10px;
    }
    .section-header .btn {
        width: 100%;
        min-height: 44px;
        justify-content: center;
    }
    .list-item {
        align-items: center;
        gap: 10px;
        padding: 12px;
    }
    .item-info {
        flex: 1;
        width: auto;
    }
    .item-info > div {
        min-width: 0;
    }
    .item-title,
    .item-subtitle {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .item-actions {
        width: auto;
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
