<script setup lang="ts">
  import { computed, ref, watchEffect } from "vue";
  import { avatarSvg } from "@/utils/avatar";

  const props = withDefaults(
    defineProps<{
      seed: string;
      size?: number;
      /** Read out by screen readers; decorative when empty. */
      label?: string;
    }>(),
    { size: 48, label: "" },
  );

  const svg = ref("");
  const initial = computed(() => props.label.trim().charAt(0).toUpperCase() || "?");

  watchEffect(async () => {
    const seed = props.seed;
    if (!seed) {
      svg.value = "";
      return;
    }
    const drawn = await avatarSvg(seed);
    // The seed can change while the library loads; a stale result would paint
    // the previous avatar over the current one.
    if (props.seed === seed) svg.value = drawn;
  });
</script>

<template>
  <!-- v-html is safe here: the markup comes from the local DiceBear library,
       never from the server, and the seed is validated to an opaque token. -->
  <span
    v-if="seed && svg"
    class="user-avatar"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    v-html="svg"
  ></span>

  <!-- No avatar chosen yet: an initial rather than an empty hole. -->
  <span
    v-else
    class="user-avatar user-avatar--initial"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.42)}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    >{{ initial }}</span
  >
</template>

<style scoped>
  .user-avatar {
    display: inline-grid;
    place-items: center;
    flex: none;
    overflow: hidden;
    border-radius: 50%;
    background: var(--fill-primary-soft);
  }
  .user-avatar :deep(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
  .user-avatar--initial {
    color: var(--practiq-violet-dark);
    font-weight: 800;
  }
</style>
