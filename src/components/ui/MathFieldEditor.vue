<template>
  <div class="math-field-container">
    <math-field
      ref="mathFieldRef"
      class="math-field-editor"
      :virtual-keyboard-mode="virtualKeyboardMode"
      @input="onInput"
    />
    <div v-if="showLatexToggle" class="latex-toggle">
      <button type="button" class="btn-latex-toggle" @click="toggleLatexView">
        <i :class="showLatex ? 'pi pi-eye-slash' : 'pi pi-code'"></i>
        {{ showLatex ? "Ocultar LaTeX" : "Ver LaTeX" }}
      </button>
      <code v-if="showLatex" class="latex-code">{{ modelValue }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, watch, nextTick } from "vue";
  import "mathlive";
  import type { MathfieldElement } from "mathlive";
  import type {
    MathFieldEditorEmits,
    MathFieldEditorProps,
  } from "./MathFieldEditor.types";

  const props = withDefaults(defineProps<MathFieldEditorProps>(), {
    modelValue: "",
    virtualKeyboardMode: "onfocus",
    placeholder: "Escribe una ecuación...",
    showLatexToggle: true,
  });

  const emit = defineEmits<MathFieldEditorEmits>();

  const mathFieldRef = ref<MathfieldElement | null>(null);
  const showLatex = ref(false);

  function onInput(e: Event) {
    const target = e.target as MathfieldElement;
    const latex = target.value;
    emit("update:modelValue", latex);
  }

  function toggleLatexView() {
    showLatex.value = !showLatex.value;
  }

  onMounted(() => {
    nextTick(() => {
      const mf = mathFieldRef.value;
      if (mf) {
        // Set initial value
        if (props.modelValue) {
          mf.value = props.modelValue;
        }
        // Configure options
        mf.mathModeSpace = "\\,";
        mf.smartFence = true;
        mf.smartSuperscript = true;
      }
    });
  });

  watch(
    () => props.modelValue,
    (newVal) => {
      const mf = mathFieldRef.value;
      if (mf && mf.value !== newVal) {
        mf.value = newVal || "";
      }
    },
  );
</script>

<style scoped>
  .math-field-container {
    width: 100%;
  }

  .math-field-editor {
    display: block;
    width: 100%;
    min-height: 52px;
    padding: 12px 14px;
    border: 1px solid var(--border-default, #d1d5db);
    border-radius: var(--radius-md, 8px);
    background: var(--surface-card, #fff);
    font-size: var(--text-lg, 18px);
    --caret-color: var(--practiq-violet, #7c3aed);
    --selection-background-color: rgba(var(--practiq-violet-rgb), 0.2);
    --contains-highlight-background-color: rgba(var(--practiq-violet-rgb), 0.08);
  }

  .math-field-editor:focus-within {
    border-color: var(--practiq-violet, #7c3aed);
    box-shadow: 0 0 0 3px rgba(var(--practiq-violet-rgb), 0.15);
    outline: none;
  }

  .latex-toggle {
    margin-top: 8px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    flex-wrap: wrap;
  }

  .btn-latex-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border: none;
    border-radius: var(--radius-sm, 4px);
    background: var(--surface-subtle, #f5f5f5);
    color: var(--text-secondary, #64748b);
    font-size: var(--text-xs, 12px);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-latex-toggle:hover {
    background: var(--surface-hover, #e5e5e5);
    color: var(--text-primary, #1e293b);
  }

  .latex-code {
    flex: 1;
    padding: 6px 10px;
    border-radius: var(--radius-sm, 4px);
    background: var(--surface-subtle, #f5f5f5);
    font-family: "SF Mono", "Fira Code", monospace;
    font-size: var(--text-xs, 12px);
    color: var(--text-secondary, #64748b);
    word-break: break-all;
  }
</style>
