<script setup lang="ts">
  import { computed, onUnmounted, ref } from "vue";
  import { useToast } from "primevue/usetoast";
  import { practiqApi } from "@/api/request/server";
  import { UploadService } from "@/services/uploads/uploadService";
  import type { UploadedFile } from "@/services/uploads/uploadService";
  import { acceptAttribute, acceptedKinds, kindLabel } from "@/utils/attachments";
  import type { Exercise } from "@/types";

  const props = defineProps<{
    exercise: Pick<Exercise, "metadata">;
    modelValue?: UploadedFile | null;
  }>();
  const emit = defineEmits<{
    (e: "update:modelValue", value: UploadedFile | null): void;
  }>();

  const toast = useToast();
  const service = new UploadService(practiqApi);

  const fileInput = ref<HTMLInputElement | null>(null);
  const uploading = ref(false);
  const recording = ref(false);
  const recordedSeconds = ref(0);

  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let stream: MediaStream | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const kinds = computed(() => acceptedKinds(props.exercise));
  const accept = computed(() => acceptAttribute(kinds.value));
  // No declared kinds means anything goes, recording included.
  const allowsAudio = computed(
    () => !kinds.value.length || kinds.value.includes("audio"),
  );
  const kindsLabel = computed(() =>
    kinds.value.length
      ? kinds.value.map(kindLabel).join(", ")
      : "cualquier formato soportado",
  );

  onUnmounted(stopTracks);

  function stopTracks() {
    if (timer) clearInterval(timer);
    timer = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  async function onFilePicked(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await upload(file, file.name);
    // Allow picking the same file again after removing it.
    input.value = "";
  }

  async function upload(file: File | Blob, filename: string) {
    uploading.value = true;
    try {
      const uploaded = await service.upload(file, filename);
      emit("update:modelValue", uploaded);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "No se pudo subir el archivo";
      toast.add({
        severity: "error",
        summary: "Error",
        detail: message,
        life: 4000,
      });
    } finally {
      uploading.value = false;
    }
  }

  async function toggleRecording() {
    if (recording.value) {
      mediaRecorder?.stop();
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.add({
        severity: "warn",
        summary: "Sin micrófono",
        detail: "No pudimos acceder al micrófono. Revisá los permisos.",
        life: 4000,
      });
      return;
    }

    chunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    mediaRecorder.onstop = async () => {
      recording.value = false;
      stopTracks();
      const type = mediaRecorder?.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type });
      if (blob.size) await upload(blob, "grabacion.webm");
    };

    mediaRecorder.start();
    recording.value = true;
    recordedSeconds.value = 0;
    timer = setInterval(() => (recordedSeconds.value += 1), 1000);
  }

  function clearFile() {
    emit("update:modelValue", null);
  }

  function formatSeconds(total: number) {
    const minutes = String(Math.floor(total / 60)).padStart(2, "0");
    const seconds = String(total % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }
</script>

<template>
  <div class="attachment-answer">
    <div v-if="modelValue" class="attachment-file">
      <i class="pi pi-paperclip"></i>
      <span class="attachment-name">{{ modelValue.filename }}</span>
      <button
        class="attachment-remove"
        type="button"
        title="Quitar archivo"
        @click="clearFile"
      >
        <i class="pi pi-times"></i>
      </button>
    </div>

    <div v-else class="attachment-actions">
      <button
        class="attachment-btn"
        type="button"
        :disabled="uploading || recording"
        @click="fileInput?.click()"
      >
        <i class="pi pi-upload"></i>
        {{ uploading ? "Subiendo…" : "Elegir archivo" }}
      </button>

      <button
        v-if="allowsAudio"
        class="attachment-btn"
        :class="{ 'attachment-btn--recording': recording }"
        type="button"
        :disabled="uploading"
        @click="toggleRecording"
      >
        <i :class="recording ? 'pi pi-stop-circle' : 'pi pi-microphone'"></i>
        {{ recording ? `Detener ${formatSeconds(recordedSeconds)}` : "Grabar audio" }}
      </button>

      <input
        ref="fileInput"
        class="attachment-input"
        type="file"
        :accept="accept"
        @change="onFilePicked"
      />
    </div>

    <small class="attachment-hint">Podés entregar: {{ kindsLabel }}</small>
  </div>
</template>

<style scoped>
  .attachment-answer {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .attachment-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .attachment-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 18px;
    border-radius: var(--radius-lg, 14px);
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-card);
    color: var(--text-primary);
    font-weight: 700;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .attachment-btn:hover:not(:disabled) {
    box-shadow: var(--shadow-card);
  }

  .attachment-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .attachment-btn--recording {
    border-color: var(--red-500, #dc2626);
    color: var(--red-500, #dc2626);
  }

  .attachment-input {
    display: none;
  }

  .attachment-file {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: var(--radius-lg, 14px);
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    color: var(--text-primary);
  }

  .attachment-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }

  .attachment-remove {
    border: none;
    background: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
  }

  .attachment-hint {
    color: var(--text-secondary);
    font-size: var(--text-xs);
  }
</style>
