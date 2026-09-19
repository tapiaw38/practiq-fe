<script setup lang="ts">
  import { ref, watch, onMounted, onBeforeUnmount } from "vue";

  const props = withDefaults(
    defineProps<{
      visible?: boolean;
      label?: string;
      dismissable?: boolean;
    }>(),
    { visible: true, label: undefined, dismissable: true },
  );

  const emit = defineEmits<{
    (event: "update:visible", value: boolean): void;
    (event: "close"): void;
  }>();

  const el = ref<HTMLDialogElement | null>(null);

  function sync(open: boolean) {
    const dialog = el.value;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.body.classList.toggle("ui-modal-open", open);
  }

  function requestClose() {
    if (!props.dismissable || !props.visible) return;
    emit("update:visible", false);
    emit("close");
  }

  watch(() => props.visible, sync, { flush: "post" });

  onMounted(() => sync(props.visible));

  onBeforeUnmount(() => {
    el.value?.close();
    document.body.classList.remove("ui-modal-open");
  });
</script>

<template>
  <dialog
    ref="el"
    class="ui-modal"
    :aria-label="label"
    @close="requestClose"
    @cancel.prevent="requestClose"
    @click.self="requestClose"
  >
    <slot />
  </dialog>
</template>

<style>
  .ui-modal {
    max-width: 100vw;
    max-height: 100dvh;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 20px;
    border: 0;
    background: transparent;
    overflow: hidden;
  }

  .ui-modal[open] {
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ui-modal-in 0.18s ease;
  }

  .ui-modal > * {
    max-height: 100%;
    overflow-y: auto;
  }

  .ui-modal::backdrop {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
  }

  @keyframes ui-modal-in {
    from {
      opacity: 0;
    }
  }

  body.ui-modal-open {
    overflow: hidden;
  }

  @media (max-width: 820px) {
    .ui-modal {
      padding: 0;
    }

    .ui-modal[open] {
      align-items: flex-end;
    }
  }
</style>
