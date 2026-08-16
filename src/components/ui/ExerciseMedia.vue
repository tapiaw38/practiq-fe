<script setup lang="ts">
  import { computed } from "vue";
  import { fileKind } from "@/utils/fileKind";

  const props = withDefaults(
    defineProps<{
      /** Signed URL from `exercise.media_view_url`; empty renders nothing. */
      url?: string;
    }>(),
    { url: "" },
  );

  const kind = computed(() => fileKind(props.url));
</script>

<template>
  <div v-if="url" class="exercise-media">
    <img
      v-if="kind === 'image'"
      class="exercise-media__image"
      :src="url"
      alt="Material del enunciado"
    />
    <video
      v-else-if="kind === 'video'"
      class="exercise-media__video"
      :src="url"
      controls
      playsinline
      preload="metadata"
    ></video>
    <audio
      v-else-if="kind === 'audio'"
      class="exercise-media__audio"
      :src="url"
      controls
      preload="metadata"
    ></audio>
    <!-- PDFs and documents have no inline player worth the space here. -->
    <a v-else class="exercise-media__link" :href="url" target="_blank" rel="noopener">
      <i class="pi pi-paperclip"></i> Abrir material del enunciado
    </a>
  </div>
</template>

<style scoped>
  .exercise-media {
    margin: 12px 0;
  }

  .exercise-media__image,
  .exercise-media__video {
    display: block;
    width: 100%;
    max-height: 340px;
    /* contain: a diagram cropped to fill is a diagram the student can't read. */
    object-fit: contain;
    border-radius: var(--radius-lg, 12px);
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
  }

  .exercise-media__audio {
    width: 100%;
    /* Native controls collapse below this and stop being tappable on mobile. */
    min-height: 44px;
  }

  .exercise-media__link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 14px;
    border-radius: var(--radius-lg, 12px);
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-elevated);
    color: var(--practiq-violet);
    font-weight: 700;
    text-decoration: none;
  }
</style>
