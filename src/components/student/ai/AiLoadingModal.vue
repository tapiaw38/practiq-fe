<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="ai-loading-overlay">
        <div class="ai-loading-modal" role="dialog" :aria-label="title">
          <div class="ai-loading-badge">
            <i class="pi pi-sparkles"></i>
            <span>{{ badgeLabel }}</span>
          </div>
          <img :src="aiLoadingGif" alt="" class="ai-loading-illustration" />
          <h3 class="ai-loading-title">{{ title }}</h3>
          <p class="ai-loading-message">
            {{ message }}
          </p>
          <p v-if="footnote" class="ai-loading-footnote">
            {{ footnote }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
  import aiLoadingGif from "@/assets/ai-loading.gif";

  withDefaults(
    defineProps<{
      show: boolean;
      title: string;
      message: string;
      badgeLabel?: string;
      footnote?: string;
    }>(),
    {
      badgeLabel: "IA analizando",
      footnote: "No cierres esta ventana",
    },
  );
</script>

<style scoped>
  .ai-loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.34);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 2200;
  }

  .ai-loading-modal {
    width: min(92vw, 520px);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid rgba(var(--practiq-violet-rgb), 0.08);
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
    padding: 28px 28px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  .ai-loading-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    border-radius: 999px;
    background: rgba(var(--practiq-violet-rgb), 0.08);
    color: var(--practiq-violet);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .ai-loading-illustration {
    width: min(52vw, 180px);
    max-height: 160px;
    object-fit: contain;
    display: block;
    margin: 6px 0 4px;
  }

  .ai-loading-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1.15;
    color: var(--text-primary);
  }

  .ai-loading-message {
    margin: 0;
    max-width: 38ch;
    font-size: 1rem;
    line-height: 1.55;
    color: var(--text-secondary);
  }

  .ai-loading-footnote {
    margin: 2px 0 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }
</style>
