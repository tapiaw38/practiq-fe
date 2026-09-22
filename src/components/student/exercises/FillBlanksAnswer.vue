<script setup lang="ts">
  import { computed, ref, watch } from "vue";
  import {
    buildOptions,
    deserializeAnswer,
    parseFillBlanksConfig,
    serializeAnswer,
    shuffled,
    splitStatement,
  } from "@/utils/fillBlanks";
  import type { Exercise } from "@/types";

  const props = defineProps<{
    exercise: Pick<Exercise, "question" | "metadata">;
    /** Canonical answer: "1:value|2:value". */
    modelValue?: string;
  }>();
  const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
  }>();

  const config = computed(() => parseFillBlanksConfig(props.exercise));
  const segments = computed(() => splitStatement(props.exercise.question));

  // Which option index sits in each blank. Indexes, not values, so two equal
  // options stay independent — a repeated answer needs a bloque per blank.
  const placements = ref<Record<number, number>>({});
  const selected = ref<number | null>(null);
  const dragging = ref<number | null>(null);
  const dragOverBlank = ref<number | null>(null);

  // Shuffled once per exercise so each student gets a different order, but not
  // on every keystroke or re-render.
  const pool = ref<string[]>([]);
  watch(
    // Keyed by the exercise, not by the options array: the array is rebuilt on
    // every render and would reshuffle — and wipe — the student's work.
    () => props.exercise.metadata,
    () => {
      pool.value = shuffled(buildOptions(config.value));
      hydrateFromModel();
    },
    { immediate: true },
  );

  // Restore a saved draft: a student who navigates away and comes back, or
  // whose component remounts, must find their blanks still filled.
  function hydrateFromModel() {
    const saved = deserializeAnswer(props.modelValue);
    const taken = new Set<number>();
    const restored: Record<number, number> = {};

    for (const [blankId, answer] of Object.entries(saved)) {
      // Map each value to a free pool entry, so two blanks holding the same
      // answer take one block each.
      const index = pool.value.findIndex(
        (option, i) => !taken.has(i) && option === answer,
      );
      if (index !== -1) {
        taken.add(index);
        restored[Number(blankId)] = index;
      }
    }
    placements.value = restored;
    selected.value = null;
  }

  watch(
    () => props.modelValue,
    (value) => {
      // Only react to an external reset (the "start over" of the parent view);
      // our own emits already match what is on screen.
      if (!value && Object.keys(placements.value).length) {
        placements.value = {};
        selected.value = null;
      }
    },
  );

  const usedIndexes = computed(() => new Set(Object.values(placements.value)));

  function optionAt(blankId: number) {
    const index = placements.value[blankId];
    return index === undefined ? "" : pool.value[index];
  }

  function emitAnswer() {
    const values: Record<number, string> = {};
    for (const [blankId, index] of Object.entries(placements.value)) {
      values[Number(blankId)] = pool.value[index];
    }
    emit("update:modelValue", serializeAnswer(values));
  }

  function pickOption(index: number) {
    if (usedIndexes.value.has(index)) return;
    selected.value = selected.value === index ? null : index;
  }

  function tapBlank(blankId: number) {
    if (selected.value !== null) {
      // Replacing a filled blank automatically returns its former option to
      // the pool. This makes both tap-to-place and drag-to-place repairable
      // without a separate remove action.
      placements.value = { ...placements.value, [blankId]: selected.value };
      selected.value = null;
      emitAnswer();
      return;
    }
    // With no option selected, a filled blank returns its option to the pool.
    if (placements.value[blankId] !== undefined) {
      const next = { ...placements.value };
      delete next[blankId];
      placements.value = next;
      emitAnswer();
      return;
    }
    if (selected.value === null) return;
    placements.value = { ...placements.value, [blankId]: selected.value };
    selected.value = null;
    emitAnswer();
  }

  function startDrag(event: DragEvent, index: number) {
    if (usedIndexes.value.has(index)) return;
    dragging.value = index;
    selected.value = index;
    event.dataTransfer?.setData("text/plain", String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  }

  function endDrag() {
    dragging.value = null;
    dragOverBlank.value = null;
  }

  function dropOnBlank(event: DragEvent, blankId: number) {
    event.preventDefault();
    const rawIndex = event.dataTransfer?.getData("text/plain");
    const transferred = rawIndex ? Number(rawIndex) : NaN;
    const index = Number.isInteger(transferred) ? transferred : dragging.value;
    if (index !== null && index !== undefined && index >= 0 && !usedIndexes.value.has(index)) {
      selected.value = index;
      tapBlank(blankId);
    }
    endDrag();
  }

  function clearAll() {
    placements.value = {};
    selected.value = null;
    emitAnswer();
  }

  const remaining = computed(
    () => pool.value.length - usedIndexes.value.size,
  );
</script>

<template>
  <div class="fb-answer">
    <p
      class="fb-statement"
      :class="{ 'fb-statement--code': config.layout === 'code' }"
    >
      <template v-for="(segment, index) in segments" :key="index">
        <span v-if="segment.kind === 'text'">{{ segment.value }}</span>
        <button
          v-else
          type="button"
          class="fb-blank"
          :class="{
            'fb-blank--filled': placements[segment.id] !== undefined,
            'fb-blank--target': selected !== null && placements[segment.id] === undefined,
            'fb-blank--drag-over': dragOverBlank === segment.id,
          }"
          :aria-label="
            placements[segment.id] !== undefined
              ? `Hueco ${segment.id}: ${optionAt(segment.id)}. Tocá para quitarlo`
              : `Hueco ${segment.id} vacío`
          "
          @click="tapBlank(segment.id)"
          @dragover.prevent
          @dragenter.prevent="dragOverBlank = segment.id"
          @dragleave="dragOverBlank = null"
          @drop="dropOnBlank($event, segment.id)"
        >
          {{ optionAt(segment.id) }}
        </button>
      </template>
    </p>

    <div class="fb-pool">
      <button
        v-for="(option, index) in pool"
        :key="`${option}-${index}`"
        type="button"
        class="fb-option"
        :class="{
          'fb-option--used': usedIndexes.has(index),
          'fb-option--selected': selected === index,
        }"
        :disabled="usedIndexes.has(index)"
        :draggable="!usedIndexes.has(index)"
        @click="pickOption(index)"
        @dragstart="startDrag($event, index)"
        @dragend="endDrag"
      >
        {{ option }}
      </button>
    </div>

    <div class="fb-footer">
      <span class="fb-help">
        {{
          selected !== null
            ? "Ahora tocá el hueco donde va"
            : "Tocá una opción y después el hueco, o arrastrala"
        }}
        · quedan {{ remaining }}
      </span>
      <button
        v-if="Object.keys(placements).length"
        class="fb-reset"
        type="button"
        @click="clearAll"
      >
        <i class="pi pi-refresh"></i> Empezar de nuevo
      </button>
    </div>
  </div>
</template>

<style scoped>
  .fb-answer {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .fb-statement {
    margin: 0;
    line-height: 2.4;
    color: var(--text-primary);
    font-size: 1.05rem;
    white-space: pre-wrap;
  }

  .fb-statement--code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.95rem;
    background: var(--surface-elevated);
    border-radius: var(--radius-lg);
    padding: 14px;
  }

  .fb-blank {
    display: inline-block;
    min-width: 84px;
    padding: 6px 12px;
    margin: 0 3px;
    border-radius: 10px;
    border: 2px dashed var(--surface-border);
    background: var(--surface-card);
    color: var(--text-primary);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    /* Comfortable target for a child on a tablet. */
    min-height: 40px;
    transition: var(--transition-fast);
  }

  .fb-blank--filled {
    border-style: solid;
    border-color: var(--practiq-violet);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
  }

  .fb-blank--target {
    border-color: var(--practiq-violet);
    animation: fb-pulse 1.2s ease-in-out infinite;
  }

  .fb-blank--drag-over {
    border-color: var(--practiq-violet);
    background: var(--fill-primary-soft);
  }

  @keyframes fb-pulse {
    50% {
      background: var(--fill-primary-soft);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .fb-blank--target {
      animation: none;
      background: var(--fill-primary-soft);
    }
  }

  .fb-pool {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .fb-option {
    padding: 10px 16px;
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-card);
    color: var(--text-primary);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .fb-option:not(:disabled):active {
    cursor: grabbing;
  }

  .fb-option--selected {
    border-color: var(--practiq-violet);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    transform: translateY(-1px);
  }

  .fb-option--used {
    opacity: 0.35;
    cursor: default;
  }

  .fb-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .fb-help {
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }

  .fb-reset {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: none;
    color: var(--practiq-violet);
    font-weight: 700;
    font-size: var(--text-sm);
    cursor: pointer;
  }
</style>
