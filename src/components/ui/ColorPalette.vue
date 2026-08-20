<script setup lang="ts">
  import { onBeforeUnmount, ref, watch } from "vue";
  import { BASE_COLORS, EXTENDED_COLORS } from "@/utils/palette";

  withDefaults(
    defineProps<{
      /** Small swatches, for dense toolbars sitting next to other controls. */
      compact?: boolean;
    }>(),
    { compact: false },
  );

  const model = defineModel<string>({ required: true });

  const open = ref(false);
  const root = ref<HTMLElement | null>(null);
  const allColors = [...BASE_COLORS, ...EXTENDED_COLORS];

  /** Case-insensitive: the native picker returns lowercase, presets may not. */
  function isActive(value: string) {
    return model.value.toLowerCase() === value.toLowerCase();
  }

  function pick(value: string) {
    model.value = value;
    open.value = false;
  }

  // Without this the popover covers the canvas and there is no way to dismiss
  // it except by choosing a colour.
  function onDocumentClick(event: MouseEvent) {
    if (!root.value?.contains(event.target as Node)) open.value = false;
  }

  watch(open, (isOpen) => {
    if (isOpen) document.addEventListener("click", onDocumentClick);
    else document.removeEventListener("click", onDocumentClick);
  });

  onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));
</script>

<template>
  <div
    ref="root"
    class="color-palette"
    :class="{ 'color-palette--compact': compact }"
    role="group"
    aria-label="Color del lápiz"
  >
    <button
      v-for="color in BASE_COLORS"
      :key="color.value"
      type="button"
      class="swatch"
      :class="{ 'swatch--active': isActive(color.value) }"
      :style="{ background: color.value }"
      :title="color.label"
      :aria-label="color.label"
      :aria-pressed="isActive(color.value)"
      @click="pick(color.value)"
    ></button>

    <div class="more">
      <button
        type="button"
        class="more-btn"
        :class="{ 'more-btn--open': open }"
        :aria-expanded="open"
        title="Más colores"
        aria-label="Ver más colores"
        @click="open = !open"
      >
        <i class="pi pi-palette"></i>
      </button>

      <div v-if="open" class="pop" role="group" aria-label="Más colores">
        <button
          v-for="color in allColors"
          :key="color.value"
          type="button"
          class="pop-swatch"
          :class="{ 'pop-swatch--active': isActive(color.value) }"
          :style="{ background: color.value }"
          :title="color.label"
          :aria-label="color.label"
          @click="pick(color.value)"
        ></button>

        <!-- Kept so any colour is still reachable, just no longer the only way. -->
        <label class="pop-custom" title="Otro color">
          <i class="pi pi-plus"></i>
          <input
            type="color"
            :value="model"
            aria-label="Elegir cualquier otro color"
            @input="pick(($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>
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

  .more {
    position: relative;
    display: flex;
  }

  .more-btn {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm, 8px);
    border: 1px solid var(--surface-border);
    background: var(--surface-card);
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .more-btn:hover,
  .more-btn--open {
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
  }

  .pop {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 5;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    padding: 10px;
    width: max-content;
    max-width: min(300px, 78vw);
    border-radius: var(--radius-lg);
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-card);
    box-shadow: var(--shadow-card-lg, 0 12px 28px rgba(0, 0, 0, 0.18));
  }

  .pop-swatch,
  .pop-custom {
    width: 26px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--surface-border);
    border-radius: 50%;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .pop-swatch:hover,
  .pop-custom:hover {
    transform: scale(1.15);
  }

  .pop-swatch--active {
    box-shadow: 0 0 0 2px var(--practiq-violet), 0 0 0 3px var(--surface-card);
  }

  .pop-custom {
    display: grid;
    place-items: center;
    position: relative;
    overflow: hidden;
    background: var(--surface-elevated);
    color: var(--text-secondary);
    font-size: 11px;
  }

  /* The native input is the whole target; the icon is what the student sees. */
  .pop-custom input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  /* Compact: dense toolbars where the palette shares a row with tool buttons. */
  .color-palette--compact {
    gap: 4px;
  }

  .color-palette--compact .swatch {
    width: 18px;
    height: 18px;
    border-width: 2px;
    border-color: var(--surface-card);
    box-shadow: 0 0 0 1px var(--surface-border);
  }

  .color-palette--compact .swatch--active {
    box-shadow: 0 0 0 2px var(--practiq-violet), 0 0 0 3px var(--surface-card);
  }

  .color-palette--compact .more-btn {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-xs, 6px);
  }

  @media (max-width: 640px) {
    .color-palette {
      flex-wrap: nowrap;
      flex-shrink: 0;
    }

    .more-btn {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    /* Mobile toolbar has one entry point. Base and extended colors live in
       the palette sheet, rather than consuming the exercise toolbar row. */
    .swatch { display: none; }

    .pop-swatch,
    .pop-custom {
      width: 34px;
      height: 34px;
    }

    /* Anchoring to the trigger (right: 0) pushed the panel off the left edge
       whenever the toolbar sits near the side of the screen, so it opened
       half out of view. On a phone it becomes a sheet pinned to both edges:
       it cannot be clipped wherever the trigger happens to be. */
    .pop {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 12px;
      top: auto;
      width: auto;
      max-width: none;
      grid-template-columns: repeat(auto-fit, minmax(34px, 1fr));
      justify-items: center;
      padding: 14px;
      z-index: 60;
    }

    /* Compact belongs to a dense canvas toolbar. Use the real visible button
       as its hit area: expanding pseudo-elements overlap adjacent swatches
       and makes a tap select the wrong colour. */
    .color-palette--compact .swatch {
      width: 26px;
      height: 26px;
    }

    .color-palette--compact .more-btn {
      width: 34px;
      height: 34px;
    }
  }
</style>
