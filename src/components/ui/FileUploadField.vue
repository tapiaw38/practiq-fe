<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from '@/composables/useToast';
import { practiqApi } from '@/api/request/server';
import { UploadService } from '@/services/uploads/uploadService';
import FileViewer from '@/components/ui/FileViewer.vue';
import type { FileUploadFieldEmits, FileUploadFieldProps } from './FileUploadField.types';

const props = withDefaults(defineProps<FileUploadFieldProps>(), {
    modelValue: '',
    folder: 'attachments',
    accept: '',
    label: 'Elegir archivo',
});
const emit = defineEmits<FileUploadFieldEmits>();

const toast = useToast();
const service = new UploadService(practiqApi);

const input = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

let uploadGeneration = 0;

function cancelUpload() {
    uploadGeneration += 1;
    uploading.value = false;
    uploadedName.value = '';
    previewUrl.value = '';
}

defineExpose({ uploading, cancelUpload });
const uploadedName = ref('');

const previewUrl = ref('');
const showViewer = ref(false);

async function onPicked(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    uploading.value = true;
    const generation = ++uploadGeneration;
    try {
        const uploaded = await service.upload(file, file.name, props.folder);

        if (generation !== uploadGeneration) return;
        uploadedName.value = uploaded.filename;
        previewUrl.value = uploaded.preview_url ?? '';
        emit('update:modelValue', uploaded.url);
    } catch (error) {
        if (generation !== uploadGeneration) return;
        const message =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'No se pudo subir el archivo';
        toast.add({ severity: 'error', summary: 'Error', detail: message, life: 4000 });
    } finally {
        if (generation === uploadGeneration) uploading.value = false;

        target.value = '';
    }
}

function clear() {
    uploadedName.value = '';
    previewUrl.value = '';
    emit('update:modelValue', '');
}

function displayName() {
    if (uploadedName.value) return uploadedName.value;
    try {
        return decodeURIComponent(new URL(props.modelValue).pathname.split('/').pop() || 'archivo');
    } catch {
        return 'archivo';
    }
}
</script>

<template>
    <div class="upload-field">
        <div v-if="modelValue" class="upload-current">
            <i class="pi pi-paperclip"></i>
            <button v-if="previewUrl" type="button" class="upload-link" @click="showViewer = true">
                {{ displayName() }}
            </button>
            <span v-else class="upload-link upload-link--plain">{{ displayName() }}</span>
            <button class="upload-remove" type="button" title="Quitar" @click="clear">
                <i class="pi pi-times"></i>
            </button>
        </div>

        <button
            v-else
            class="upload-btn"
            type="button"
            :disabled="uploading"
            @click="input?.click()"
        >
            <i class="pi pi-upload"></i>
            {{ uploading ? 'Subiendo…' : label }}
        </button>

        <input
            ref="input"
            class="upload-input"
            type="file"
            :accept="accept || undefined"
            @change="onPicked"
        />

        <FileViewer
            :show="showViewer"
            :url="previewUrl"
            :title="displayName()"
            @close="showViewer = false"
        />
    </div>
</template>

<style scoped>
.upload-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.upload-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: var(--radius-lg, 12px);
    border: 1px dashed var(--surface-elevated-strong);
    background: var(--surface-card);
    color: var(--text-primary);
    font-weight: 600;
    cursor: pointer;
}

.upload-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.upload-current {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--radius-lg, 12px);
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
}

.upload-link {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--practiq-violet);
    font-weight: 600;
    text-decoration: none;
    text-align: left;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
}

.upload-link--plain {
    color: var(--text-primary);
    cursor: default;
}

.upload-remove {
    border: none;
    background: none;
    color: var(--text-secondary);
    cursor: pointer;
}

.upload-input {
    display: none;
}
</style>
