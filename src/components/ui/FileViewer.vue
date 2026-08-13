<script setup lang="ts">
  import { computed, onBeforeUnmount, watch } from "vue";

  const props = withDefaults(
    defineProps<{
      show: boolean;
      /** Openable URL: a signed one, since the bucket is private. */
      url?: string;
      title?: string;
      /** Optional hint; the extension wins when it disagrees. */
      contentType?: string;
    }>(),
    { url: "", title: "Archivo", contentType: "" },
  );

  const emit = defineEmits<{ (e: "close"): void }>();

  const EXTENSION_KINDS: Record<string, Kind> = {
    pdf: "pdf",
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    webp: "image",
    svg: "image",
    mp4: "video",
    webm: "video",
    ogv: "video",
    mov: "video",
    mp3: "audio",
    wav: "audio",
    ogg: "audio",
    m4a: "audio",
    txt: "text",
  };

  type Kind = "pdf" | "image" | "video" | "audio" | "text" | "download";

  /** The path, minus the signature query a presigned URL carries. */
  function extensionOf(url: string): string {
    try {
      const path = new URL(url, window.location.origin).pathname;
      return path.split(".").pop()?.toLowerCase() ?? "";
    } catch {
      return "";
    }
  }

  const kind = computed<Kind>(() => {
    const byExtension = EXTENSION_KINDS[extensionOf(props.url)];
    if (byExtension) return byExtension;

    const type = props.contentType.split(";")[0].trim().toLowerCase();
    if (type === "application/pdf") return "pdf";
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    if (type === "text/plain") return "text";

    // Office documents have no native viewer; offer the download instead.
    return "download";
  });

  function close() {
    emit("close");
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") close();
  }

  watch(
    () => props.show,
    (open) => {
      if (open) window.addEventListener("keydown", onKeydown);
      else window.removeEventListener("keydown", onKeydown);
    },
  );

  onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="viewer-backdrop" @click.self="close">
        <div class="viewer-card">
          <header class="viewer-header">
            <h3 class="viewer-title">{{ title }}</h3>
            <div class="viewer-header-actions">
              <a
                v-if="url"
                class="viewer-action"
                :href="url"
                target="_blank"
                rel="noopener"
                title="Abrir en una pestaña nueva"
              >
                <i class="pi pi-external-link"></i>
              </a>
              <button class="viewer-action" title="Cerrar" @click="close">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </header>

          <div class="viewer-body" :class="`viewer-body--${kind}`">
            <p v-if="!url" class="viewer-empty">
              Este material no tiene un archivo adjunto.
            </p>

            <iframe
              v-else-if="kind === 'pdf' || kind === 'text'"
              class="viewer-frame"
              :src="url"
              :title="title"
            ></iframe>

            <img v-else-if="kind === 'image'" class="viewer-image" :src="url" :alt="title" />

            <video
              v-else-if="kind === 'video'"
              class="viewer-video"
              :src="url"
              controls
              playsinline
            ></video>

            <audio v-else-if="kind === 'audio'" class="viewer-audio" :src="url" controls></audio>

            <div v-else class="viewer-fallback">
              <i class="pi pi-file"></i>
              <p>Este formato no se puede previsualizar en el navegador.</p>
              <a class="viewer-download" :href="url" target="_blank" rel="noopener" download>
                <i class="pi pi-download"></i> Descargar
              </a>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .viewer-backdrop {
    position: fixed;
    inset: 0;
    background: var(--surface-overlay);
    display: grid;
    place-items: center;
    padding: 24px;
    z-index: 220;
    backdrop-filter: blur(2px);
  }

  .viewer-card {
    background: var(--surface-card);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-lg);
    width: min(1000px, 100%);
    height: min(88vh, 100%);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .viewer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--surface-border);
    flex: 0 0 auto;
  }

  .viewer-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--text-heading);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .viewer-header-actions {
    display: flex;
    gap: 6px;
    flex: 0 0 auto;
  }

  .viewer-action {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--surface-hover);
    color: var(--text-primary);
    cursor: pointer;
    text-decoration: none;
  }
  .viewer-action:hover {
    background: var(--surface-border);
  }

  .viewer-body {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    place-items: center;
    background: var(--surface-subtle);
    padding: 12px;
  }
  /* A PDF should use the whole panel; media stays centered. */
  .viewer-body--pdf,
  .viewer-body--text {
    padding: 0;
  }

  .viewer-frame {
    width: 100%;
    height: 100%;
    border: none;
  }

  .viewer-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: var(--radius-md);
  }

  .viewer-video {
    max-width: 100%;
    max-height: 100%;
    border-radius: var(--radius-md);
    background: #000;
  }

  .viewer-audio {
    width: min(520px, 100%);
  }

  .viewer-empty,
  .viewer-fallback {
    display: grid;
    justify-items: center;
    gap: 12px;
    color: var(--text-secondary);
    text-align: center;
  }
  .viewer-fallback i {
    font-size: 34px;
  }

  .viewer-download {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: var(--radius-lg);
    background: var(--practiq-violet);
    color: var(--color-on-primary);
    font-weight: 700;
    text-decoration: none;
  }

  @media (max-width: 760px) {
    .viewer-backdrop {
      padding: 0;
    }
    .viewer-card {
      width: 100%;
      height: 100%;
      border-radius: 0;
    }
  }
</style>
