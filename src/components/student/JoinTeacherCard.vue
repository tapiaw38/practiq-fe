<script setup lang="ts">
  import { computed, ref } from "vue";
  import { useToast } from "primevue/usetoast";
  import { useInvitation } from "@/composables/useInvitation";

  const emit = defineEmits<{ (e: "joined"): void }>();

  const toast = useToast();
  const { redeeming, redeem } = useInvitation();

  const code = ref("");
  const open = ref(false);

  // El backend acepta el código con o sin guion, pero pedir 8 caracteres acá
  // evita el viaje de ida y vuelta cuando quedó a medio pegar.
  const isValid = computed(
    () => code.value.replace(/[^a-zA-Z0-9]/g, "").length === 8,
  );

  async function submit() {
    if (!isValid.value) return;

    try {
      const result = await redeem(code.value);
      code.value = "";
      open.value = false;

      toast.add({
        severity: "success",
        summary: result.already_linked ? "Ya estabas vinculado" : "¡Listo!",
        detail: result.teacher_name
          ? `Ahora sos alumno de ${result.teacher_name}.`
          : "Quedaste vinculado con tu profesor.",
        life: 4000,
      });

      emit("joined");
    } catch (error: any) {
      toast.add({
        severity: "error",
        summary: "No se pudo usar el código",
        detail:
          error?.response?.data?.message ||
          "Revisá que esté bien escrito y volvé a intentar.",
        life: 4000,
      });
    }
  }
</script>

<template>
  <section class="join-card">
    <button
      v-if="!open"
      class="join-trigger"
      type="button"
      @click="open = true"
    >
      <i class="pi pi-user-plus"></i>
      Tengo un código de invitación
    </button>

    <form v-else class="join-form" @submit.prevent="submit">
      <label class="join-label" for="invitation-code">
        Código de tu profesor
      </label>
      <div class="join-row">
        <input
          id="invitation-code"
          v-model="code"
          class="join-input"
          type="text"
          autocapitalize="characters"
          autocomplete="off"
          placeholder="7K4P-2QDX"
          maxlength="12"
          :disabled="redeeming"
        />
        <button
          class="btn btn-primary"
          type="submit"
          :disabled="!isValid || redeeming"
        >
          {{ redeeming ? "Vinculando..." : "Vincular" }}
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="redeeming"
          @click="
            open = false;
            code = '';
          "
        >
          Cancelar
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
  .join-card {
    margin-bottom: 20px;
  }

  .join-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: var(--radius-xl);
    border: 1.5px dashed rgba(var(--practiq-violet-rgb), 0.35);
    background: var(--fill-primary-faint);
    color: var(--practiq-violet);
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
  }

  .join-trigger:hover {
    background: var(--fill-primary-soft);
  }

  .join-form {
    padding: 16px;
    border-radius: var(--radius-xl);
    background: var(--surface-elevated);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  }

  .join-label {
    display: block;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .join-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .join-input {
    flex: 1;
    min-width: 160px;
    padding: 10px 14px;
    border-radius: var(--radius-lg);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
    background: var(--surface-elevated-strong);
    color: var(--text-primary);
    font-family: ui-monospace, "SFMono-Regular", "Menlo", monospace;
    font-size: 1.05rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  @media (max-width: 680px) {
    .join-row .btn {
      flex: 1;
    }
  }
</style>
