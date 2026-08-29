<script setup lang="ts">
  import { computed } from "vue";
  import {
    blankIdsIn,
    repeatedBlankIdsIn,
    buildOptions,
    splitStatement,
    type FillBlanksConfig,
  } from "@/utils/fillBlanks";

  const props = defineProps<{
    /** The statement being edited, with {{n}} markers. */
    statement: string;
    modelValue: FillBlanksConfig;
  }>();
  const emit = defineEmits<{
    (e: "update:modelValue", value: FillBlanksConfig): void;
    (e: "insert-blank", marker: string): void;
  }>();

  // Blanks come from the statement itself, so the two can never disagree.
  const ids = computed(() => blankIdsIn(props.statement));
  const repeatedIds = computed(() => repeatedBlankIdsIn(props.statement));
  const segments = computed(() => splitStatement(props.statement));

  const answerById = computed<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const blank of props.modelValue.blanks) map[blank.id] = blank.answer;
    return map;
  });

  // The pool is derived, never stored on its own: one block per blank plus the
  // wrong options. Deduping here would collapse two blanks that share the same
  // answer into a single block the student could only use once.
  const pool = computed(() => buildOptions(props.modelValue));

  function emitConfig(patch: Partial<FillBlanksConfig>) {
    emit("update:modelValue", { ...props.modelValue, ...patch });
  }

  function setAnswer(id: number, answer: string) {
    const blanks = ids.value.map((blankId) => ({
      id: blankId,
      answer: blankId === id ? answer : (answerById.value[blankId] ?? ""),
    }));
    emitConfig({ blanks });
  }

  function setDistractors(raw: string) {
    emitConfig({ distractors: raw.split("\n") });
  }

  function setLayout(layout: "text" | "code") {
    emitConfig({ layout });
  }

  function insertBlank() {
    const next = ids.value.length ? Math.max(...ids.value) + 1 : 1;
    emit("insert-blank", `{{${next}}}`);
  }

  // Kept as data: writing the marker literally in the template would nest
  // interpolation braces and break the SFC compiler.
  const markerExamples = ["{{1}}", "{{2}}"];

  const missingAnswers = computed(() =>
    ids.value.filter((id) => !(answerById.value[id] ?? "").trim()),
  );
</script>

<template>
  <div class="fb-editor">
    <div class="fb-row">
      <button class="btn btn-ghost btn-sm" type="button" @click="insertBlank">
        <i class="pi pi-plus"></i> Agregar hueco
      </button>
      <label class="fb-layout">
        <input
          type="checkbox"
          :checked="modelValue.layout === 'code'"
          @change="setLayout(($event.target as HTMLInputElement).checked ? 'code' : 'text')"
        />
        Mostrar como código
      </label>
    </div>
    <small class="fb-hint">
      Escribí el enunciado arriba y marcá los huecos con
      <code v-for="marker in markerExamples" :key="marker">{{ marker }}</code>
      … Sirve para cualquier materia: completar una oración, una fórmula, una
      fecha o código.
    </small>
    <small v-if="repeatedIds.length" class="fb-warning">
      El número {{ repeatedIds.join(", ") }} está repetido en el enunciado. Cada
      hueco necesita un número distinto.
    </small>

    <template v-if="ids.length">
      <div class="fb-blanks">
        <div v-for="id in ids" :key="id" class="fb-blank">
          <span class="fb-blank-num">{{ id }}</span>
          <input
            class="form-input"
            :value="answerById[id] ?? ''"
            placeholder="Respuesta correcta de este hueco"
            @input="setAnswer(id, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Opciones incorrectas (una por línea)</label>
        <textarea
          class="form-input"
          rows="3"
          :value="modelValue.distractors.join('\n')"
          placeholder="Opciones que aparecen en el listado pero no van en ningún hueco"
          @input="setDistractors(($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <small class="fb-hint">
          Si la misma respuesta va en dos huecos, escribila en los dos: el
          alumno ve dos bloques iguales y usa uno en cada lugar.
        </small>
      </div>

      <div class="fb-preview">
        <div class="fb-preview-label">Vista previa</div>
        <p class="fb-statement" :class="{ 'fb-statement--code': modelValue.layout === 'code' }">
          <template v-for="(segment, index) in segments" :key="index">
            <span v-if="segment.kind === 'text'">{{ segment.value }}</span>
            <span v-else class="fb-slot">{{ answerById[segment.id] || "?" }}</span>
          </template>
        </p>
        <div class="fb-pool">
          <span
            v-for="(option, index) in pool"
            :key="`${option}-${index}`"
            class="fb-chip"
          >
            {{ option }}
          </span>
        </div>
      </div>

      <p v-if="missingAnswers.length" class="fb-warning">
        <i class="pi pi-exclamation-triangle"></i>
        Falta la respuesta del hueco {{ missingAnswers.join(", ") }}.
      </p>
    </template>

    <p v-else class="fb-empty">
      Todavía no hay huecos en el enunciado.
    </p>
  </div>
</template>

<style scoped>
  .fb-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .fb-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .fb-layout {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .fb-hint {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    line-height: 1.5;
  }

  .fb-warning {
    color: var(--danger, #dc2626);
    font-size: var(--text-xs);
    line-height: 1.5;
  }

  .fb-blanks {
    display: grid;
    gap: 8px;
  }

  .fb-blank {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fb-blank-num {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    flex: 0 0 auto;
    border-radius: 8px;
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    font-weight: 800;
    font-size: var(--text-sm);
  }

  .fb-preview {
    padding: 12px;
    border-radius: 12px;
    border: 1px dashed var(--surface-elevated-strong);
    background: var(--surface-elevated);
  }

  .fb-preview-label {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .fb-statement {
    margin: 0 0 10px;
    color: var(--text-primary);
    line-height: 2;
    white-space: pre-wrap;
  }

  .fb-statement--code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: var(--text-sm);
  }

  .fb-slot {
    display: inline-block;
    min-width: 60px;
    padding: 2px 10px;
    margin: 0 2px;
    border-radius: 8px;
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    font-weight: 700;
    text-align: center;
  }

  .fb-pool {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .fb-chip {
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--surface-card);
    border: 1px solid var(--surface-elevated-strong);
    font-size: var(--text-sm);
  }

  .fb-warning {
    margin: 0;
    color: var(--color-warning-dark, #92400e);
    font-size: var(--text-sm);
  }

  .fb-empty {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }

  @media (max-width: 600px) {
    .fb-row { align-items: stretch; flex-direction: column; }
    .fb-row .btn { width: 100%; min-height: 44px; justify-content: center; }
    .fb-layout { min-height: 44px; }
    .fb-blank { align-items: stretch; }
    .fb-blank .form-input { min-width: 0; }
    .fb-statement { overflow-wrap: anywhere; }
  }
</style>
