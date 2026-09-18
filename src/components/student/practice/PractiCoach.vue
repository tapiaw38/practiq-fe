<script setup lang="ts">
  import { onMounted, onUnmounted, ref, watch } from "vue";

  const props = defineProps<{
    /** Empty hides the bubble. */
    message: string;
    /** Changing this replays the same message. */
    beat?: number;
    tone?: "neutral" | "good" | "retry";
  }>();

  const QUICK_ASKS = [
    { label: "Ayuda", icon: "pi-question-circle", prompt: "Ayudame con el ejercicio actual. Dame una pista sin resolverlo." },
    { label: "Explicar", icon: "pi-lightbulb", prompt: "Explicame el tema de este ejercicio con un ejemplo simple." },
    { label: "Revisar", icon: "pi-eye", prompt: "Mirá mi respuesta al ejercicio actual y decime si voy bien." },
  ];

  function ask(prompt: string) {
    window.dispatchEvent(
      new CustomEvent("practiq:assistant:prompt", { detail: { prompt } }),
    );
  }

  /**
   * Where the assistant launcher is right now.
   *
   * Read from the element rather than recomputed: the launcher is mounted by
   * the assistant library and moves on its own — it clears the screen's sticky
   * footer, and that footer grows a row whenever the draft indicator shows.
   * Null means there is no launcher on screen, and then there is nothing to
   * attach to and nothing to draw.
   */
  const anchor = ref<{
    bubbleRight: number;
    bubbleBottom: number;
    asksRight: number;
    asksBottom: number;
  } | null>(null);

  const visible = ref(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let frame = 0;

  function measure() {
    const fab = document.querySelector<HTMLElement>(".floating-button");
    if (!fab || fab.classList.contains("practiq-assistant-drawer-hidden")) {
      anchor.value = null;
      return;
    }
    const rect = fab.getBoundingClientRect();
    if (!rect.width) {
      anchor.value = null;
      return;
    }
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    anchor.value = {
      bubbleRight: Math.max(viewportWidth - rect.right, 8),
      bubbleBottom: viewportHeight - rect.top + 10,
      asksRight: viewportWidth - rect.left + 10,
      asksBottom: viewportHeight - rect.bottom,
    };
  }

  // The launcher mounts on its own schedule, after this view is already up.
  let attempts = 0;
  function poll() {
    measure();
    if (anchor.value || ++attempts > 60) return;
    frame = requestAnimationFrame(poll);
  }

  onMounted(() => {
    poll();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    window.visualViewport?.addEventListener("resize", measure);
  });

  onUnmounted(() => {
    cancelAnimationFrame(frame);
    if (hideTimer) clearTimeout(hideTimer);
    window.removeEventListener("resize", measure);
    window.removeEventListener("scroll", measure);
    window.visualViewport?.removeEventListener("resize", measure);
  });

  watch(
    () => [props.message, props.beat],
    () => {
      if (hideTimer) clearTimeout(hideTimer);
      if (!props.message) {
        visible.value = false;
        return;
      }
      measure();
      visible.value = true;
      hideTimer = setTimeout(() => {
        visible.value = false;
      }, 4200);
    },
    { immediate: true },
  );
</script>

<template>
  <template v-if="anchor">
    <Transition name="coach">
      <div
        v-if="visible"
        class="coach-bubble"
        :class="`coach-bubble--${tone ?? 'neutral'}`"
        :style="{
          right: `${anchor.bubbleRight}px`,
          bottom: `${anchor.bubbleBottom}px`,
        }"
        role="status"
        aria-live="polite"
      >
        {{ message }}
      </div>
    </Transition>

    <div
      class="coach-asks"
      :style="{
        right: `${anchor.asksRight}px`,
        bottom: `${anchor.asksBottom}px`,
      }"
    >
      <button
        v-for="quick in QUICK_ASKS"
        :key="quick.label"
        type="button"
        class="coach-ask"
        @click="ask(quick.prompt)"
      >
        <i class="pi" :class="quick.icon"></i>
        {{ quick.label }}
      </button>
    </div>
  </template>
</template>

<style scoped>
  .coach-bubble {
    position: fixed;
    z-index: 1000;
    max-width: min(72vw, 300px);
    padding: 9px 14px;
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    border: 2px solid var(--fill-primary-soft);
    box-shadow: var(--elevation-tint-shadow);
    color: var(--text-heading);
    font-size: var(--text-sm);
    font-weight: 800;
    line-height: 1.25;
    pointer-events: none;
  }
  /* The tail points down at the launcher, which is what makes the text read as
     something Practi said rather than a notification that happened to land. */
  .coach-bubble::after {
    content: "";
    position: absolute;
    right: 18px;
    bottom: -9px;
    width: 14px;
    height: 14px;
    background: inherit;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: inherit;
    transform: rotate(45deg);
    border-radius: 0 0 3px 0;
  }
  .coach-bubble--good {
    border-color: var(--color-success);
  }
  .coach-bubble--retry {
    border-color: var(--color-warning);
  }

  /* Beside the launcher, not under it: the launcher already sits just above the
     screen's sticky footer, so anything below it lands on the footer's buttons. */
  .coach-asks {
    position: fixed;
    z-index: 999;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .coach-ask {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 11px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-pill);
    background: var(--surface-card);
    box-shadow: var(--elevation-tint-shadow);
    color: var(--practiq-violet);
    font-size: var(--text-xs);
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
    transition: var(--transition-fast);
  }
  .coach-ask:hover {
    background: var(--fill-primary-faint);
    transform: translateY(-1px);
  }
  .coach-ask:active {
    transform: none;
  }

  .coach-enter-active,
  .coach-leave-active {
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }
  .coach-enter-from,
  .coach-leave-to {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }

  @media (max-width: 380px) {
    .coach-ask {
      padding: 6px 8px;
    }
    .coach-ask i {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .coach-enter-active,
    .coach-leave-active {
      transition: none;
    }
    .coach-ask:hover {
      transform: none;
    }
  }
</style>
