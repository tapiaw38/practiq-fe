<script setup lang="ts">
  const model = defineModel<string>({ required: true });

  /**
   * Literal hex, not theme tokens: these are ink colours the drawing is saved
   * with, so they must not shift when the theme does.
   */
  const COLORS = [
    { value: "#1e1e2e", label: "Negro" },
    { value: "#7c3aed", label: "Violeta" },
    { value: "#2563eb", label: "Azul" },
    { value: "#16a34a", label: "Verde" },
    { value: "#f59e0b", label: "Naranja" },
    { value: "#dc2626", label: "Rojo" },
  ];

  /** Case-insensitive: the native picker returns lowercase, presets may not. */
  function isActive(value: string) {
    return model.value.toLowerCase() === value.toLowerCase();
  }
</script>

<template>
  <div class="color-palette" role="group" aria-label="Color del lápiz">
    <button
      v-for="color in COLORS"
      :key="color.value"
      type="button"
      class="swatch"
      :class="{ 'swatch--active': isActive(color.value) }"
      :style="{ background: color.value }"
      :title="color.label"
      :aria-label="color.label"
      :aria-pressed="isActive(color.value)"
      @click="model = color.value"
    ></button>
    <!-- Kept so any colour is still reachable, just no longer the only way. -->
    <input
      v-model="model"
      type="color"
      class="swatch swatch--custom"
      title="Otro color"
      aria-label="Elegir otro color"
    />
  </div>
</template>

<style scoped>
  .color-palette {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .swatch {
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 50%;
    border: 2px solid var(--surface-elevated-strong);
    cursor: pointer;
    transition: var(--transition);
  }

  .swatch:hover {
    transform: scale(1.1);
  }

  .swatch--active {
    /* Ring instead of a border swap so the swatch keeps its size when picked. */
    box-shadow: 0 0 0 2px var(--surface-card), 0 0 0 4px var(--practiq-violet);
  }

  .swatch--custom {
    /* The native swatch paints its own colour; the padding hides its chrome. */
    padding: 2px;
    background: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .swatch--custom::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  .swatch--custom::-webkit-color-swatch {
    border: none;
    border-radius: 50%;
  }

  .swatch--custom::-moz-color-swatch {
    border: none;
    border-radius: 50%;
  }

  @media (max-width: 640px) {
    .swatch {
      width: 40px;
      height: 40px;
    }
  }
</style>
