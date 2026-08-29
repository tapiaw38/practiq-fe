<script setup lang="ts">
  import { computed } from "vue";

  /**
   * The numbered navigator above a sheet shown one exercise at a time.
   *
   * Purely presentational: it knows how many exercises there are, which one is
   * open and which ones are answered. The two screens that use it keep their
   * answers in very different shapes, so it takes a plain boolean list rather
   * than the exercises themselves.
   */
  const props = defineProps<{
    total: number;
    current: number;
    /** One entry per exercise, in order. */
    answered: boolean[];
  }>();

  const emit = defineEmits<{
    (e: "select", index: number): void;
  }>();

  const answeredCount = computed(
    () => props.answered.filter(Boolean).length,
  );

  function isAnswered(index: number) {
    return props.answered[index] === true;
  }
</script>

<template>
  <div class="stepper">
    <div class="stepper-head">
      <span class="stepper-position">
        Ejercicio {{ current + 1 }} de {{ total }}
      </span>
      <span class="stepper-count">
        {{ answeredCount }} de {{ total }} respondidos
      </span>
    </div>

    <div class="stepper-dots" role="tablist" aria-label="Ejercicios">
      <button
        v-for="index in total"
        :key="index"
        type="button"
        role="tab"
        class="stepper-dot"
        :class="{
          'stepper-dot--current': index - 1 === current,
          'stepper-dot--done': isAnswered(index - 1),
        }"
        :aria-selected="index - 1 === current"
        :aria-label="
          `Ejercicio ${index}${isAnswered(index - 1) ? ', respondido' : ', sin responder'}`
        "
        @click="emit('select', index - 1)"
      >
        <i
          v-if="isAnswered(index - 1) && index - 1 !== current"
          class="pi pi-check"
          aria-hidden="true"
        ></i>
        <template v-else>{{ index }}</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
  .stepper {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.85rem 1rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
  }

  .stepper-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .stepper-position {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .stepper-count {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .stepper-dots {
    display: flex;
    gap: 0.45rem;
    /* Scrolls instead of wrapping: a sheet with twenty exercises would push the
       exercise itself off the screen on a phone. The bar itself is hidden — it
       sat under the row as a second grey line and read as part of the design;
       the numbers cut off at the edge already say there are more. */
    overflow-x: auto;
    scrollbar-width: none;
  }

  .stepper-dots::-webkit-scrollbar {
    display: none;
  }

  .stepper-dot {
    flex: 0 0 auto;
    width: 2rem;
    height: 2rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--surface-border);
    background: var(--surface-card);
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.15s ease,
      color 0.15s ease,
      border-color 0.15s ease;
  }

  .stepper-dot:hover {
    border-color: var(--practiq-violet-400);
    color: var(--practiq-violet-700);
  }

  .stepper-dot--done {
    background: var(--color-success-bg);
    border-color: var(--color-success);
    color: var(--color-success-dark);
  }

  /* Current wins over answered: the student has to be able to find where they
     are among a row of green circles. */
  .stepper-dot--current,
  .stepper-dot--current.stepper-dot--done {
    background: var(--practiq-violet);
    border-color: var(--practiq-violet);
    color: #fff;
  }

  .stepper-dot:focus-visible {
    outline: 2px solid var(--practiq-violet);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    .stepper {
      padding: 0.7rem 0.8rem;
      border-radius: var(--radius-lg);
    }

    .stepper-head {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.15rem;
    }

    .stepper-dot {
      width: 1.75rem;
      height: 1.75rem;
      font-size: 0.8rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stepper-dot {
      transition: none;
    }
  }
</style>
