<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from "vue";
  import type { XPBreakdownEntry } from "@/types/practiceSheets";

  const props = defineProps<{
    entries: XPBreakdownEntry[];
    total: number;
    /** Omit where the course total already has its own place on screen. */
    courseTotal?: number;
  }>();

  /**
   * The server owns the numbers and the order; the UI owns the wording. An
   * unknown reason still shows its points instead of disappearing, so adding a
   * reason on the server never silently loses XP on screen.
   */
  const COPY: Record<string, { icon: string; label: string }> = {
    exercise_attempt: { icon: "pi-pencil", label: "ejercicio resuelto" },
    exercise_correct: { icon: "pi-check-circle", label: "acierto" },
    practice_complete: { icon: "pi-flag-fill", label: "práctica completa" },
    level_test_pass: { icon: "pi-unlock", label: "prueba aprobada" },
  };

  const STEP_MS = 420;

  const copyFor = (eventType: string) => COPY[eventType] ?? { icon: "pi-bolt", label: "bonus" };

  const revealed = ref(0);
  const timers: number[] = [];

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  const showsTotal = computed(() => props.entries.length > 1);

  onMounted(() => {
    // Staggering is decoration. Someone who asked for less motion gets the
    // whole breakdown at once rather than a slower version of the same thing.
    if (reducedMotion()) {
      revealed.value = props.entries.length + 1;
      return;
    }
    const steps = props.entries.length + (showsTotal.value ? 1 : 0);
    for (let step = 1; step <= steps; step++) {
      timers.push(window.setTimeout(() => (revealed.value = step), step * STEP_MS));
    }
  });

  onBeforeUnmount(() => timers.forEach(window.clearTimeout));
</script>

<template>
  <div class="xp-bubbles" role="status" aria-live="polite">
    <p class="xp-bubbles__sr">
      Ganaste {{ total }} puntos de experiencia.<template v-if="courseTotal !== undefined">
        Total del curso: {{ courseTotal }}.</template>
    </p>

    <div class="xp-bubbles__row" aria-hidden="true">
      <span
        v-for="(entry, index) in entries"
        :key="entry.event_type"
        class="xp-bubble"
        :class="{ 'xp-bubble--in': revealed > index }"
      >
        <i class="pi" :class="copyFor(entry.event_type).icon"></i>
        <b>+{{ entry.points }}</b>
        <small>
          {{ copyFor(entry.event_type).label
          }}<template v-if="entry.count > 1"> ×{{ entry.count }}</template>
        </small>
      </span>
    </div>

    <div
      v-if="showsTotal"
      class="xp-bubbles__total"
      :class="{ 'xp-bubbles__total--in': revealed > entries.length }"
      aria-hidden="true"
    >
      <i class="pi pi-bolt"></i>
      <b>+{{ total }} XP</b>
      <small v-if="courseTotal !== undefined">{{ courseTotal }} en el curso</small>
    </div>
  </div>
</template>

<style scoped>
  .xp-bubbles {
    display: grid;
    gap: 10px;
    justify-items: center;
  }
  .xp-bubbles__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .xp-bubbles__row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .xp-bubble {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 8px 14px;
    border-radius: var(--radius-pill);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet-dark);
    font-weight: 700;
    /* Held off-screen until its turn so the row does not reflow as each
       bubble lands. */
    opacity: 0;
    transform: translateY(8px) scale(0.92);
    transition:
      opacity 0.24s ease-out,
      transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .xp-bubble--in {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  .xp-bubble i {
    color: var(--practiq-violet);
    font-size: 0.85rem;
  }
  .xp-bubble b {
    font-size: 1.05rem;
  }
  .xp-bubble small {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: 600;
  }
  .xp-bubbles__total {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    padding: 10px 20px;
    border-radius: var(--radius-pill);
    background: var(--gradient-brand);
    color: var(--color-on-primary);
    font-weight: 800;
    opacity: 0;
    transform: scale(0.9);
    transition:
      opacity 0.26s ease-out,
      transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .xp-bubbles__total--in {
    opacity: 1;
    transform: scale(1);
  }
  .xp-bubbles__total b {
    font-size: 1.15rem;
  }
  .xp-bubbles__total small {
    font-size: var(--text-xs);
    font-weight: 600;
    opacity: 0.9;
  }

  /* The global reduce rule collapses the durations; without this the bubbles
     would stay at opacity 0 because they never get their transition. */
  @media (prefers-reduced-motion: reduce) {
    .xp-bubble,
    .xp-bubbles__total {
      opacity: 1;
      transform: none;
    }
  }
</style>
