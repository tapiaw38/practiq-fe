<script setup lang="ts">
  import { ref, watch } from "vue";
  import robot from "@/assets/robot.png";

  const props = defineProps<{
    /** Empty hides the bubble. */
    message: string;
    /** Changing this replays the same message. */
    beat?: number;
    tone?: "neutral" | "good" | "retry";
  }>();

  const visible = ref(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    () => [props.message, props.beat],
    () => {
      if (hideTimer) clearTimeout(hideTimer);
      if (!props.message) {
        visible.value = false;
        return;
      }
      visible.value = true;
      hideTimer = setTimeout(() => {
        visible.value = false;
      }, 4200);
    },
    { immediate: true },
  );
</script>

<template>
  <Transition name="coach">
    <div
      v-if="visible"
      class="coach"
      :class="`coach--${tone ?? 'neutral'}`"
      role="status"
      aria-live="polite"
    >
      <img :src="robot" alt="" class="coach-avatar" />
      <span class="coach-text">{{ message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
  /* One shelf above the assistant launcher. Centred and launcher-width apart is
     not enough on a narrow phone: an 88vw bubble reaches the corner the
     launcher occupies, and they would overlap. */
  .coach {
    position: fixed;
    left: 50%;
    bottom: calc(var(--practiq-footer-h, 140px) + 78px);
    transform: translateX(-50%);
    z-index: 900;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: min(88vw, 420px);
    padding: 8px 16px 8px 8px;
    border-radius: var(--radius-pill);
    background: var(--surface-card);
    box-shadow: var(--elevation-tint-shadow);
    border: 2px solid var(--fill-primary-soft);
    pointer-events: none;
  }
  .coach--good {
    border-color: var(--color-success);
  }
  .coach--retry {
    border-color: var(--color-warning);
  }
  .coach-avatar {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    object-fit: contain;
  }
  .coach-text {
    color: var(--text-heading);
    font-size: var(--text-sm);
    font-weight: 800;
    line-height: 1.25;
  }
  .coach-enter-active,
  .coach-leave-active {
    transition:
      opacity 0.22s ease,
      transform 0.22s ease;
  }
  .coach-enter-from,
  .coach-leave-to {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  .coach-enter-to,
  .coach-leave-from {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  @media (prefers-reduced-motion: reduce) {
    .coach-enter-active,
    .coach-leave-active {
      transition: none;
    }
  }
</style>
