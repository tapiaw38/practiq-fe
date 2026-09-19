<script setup lang="ts">
  import { onMounted, reactive, ref } from "vue";
  import { useToast } from "primevue/usetoast";
  import { practiqApi } from "@/api/request/server";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import ConfirmModal from "@/components/ui/ConfirmModal.vue";
  import {
    SubscriptionService,
    type CatalogPlan,
    type PlanInput,
  } from "@/services/subscription/subscriptionService";

  const toast = useToast();
  const service = new SubscriptionService(practiqApi);

  const plans = ref<CatalogPlan[]>([]);
  const loading = ref(true);
  const saving = ref(false);
  const editingId = ref<number | null>(null);
  const retiring = ref<CatalogPlan | null>(null);

  const form = reactive({
    name: "",
    description: "",
    amount: 0,
    max_students: 1,
    interval: "month",
    currency: "ARS",
  });

  function resetForm() {
    editingId.value = null;
    form.name = "";
    form.description = "";
    form.amount = 0;
    form.max_students = 1;
    form.interval = "month";
    form.currency = "ARS";
  }

  function edit(plan: CatalogPlan) {
    editingId.value = plan.plan_id;
    form.name = plan.name;
    form.description = plan.description || "";
    form.amount = plan.amount;
    form.max_students = plan.max_students;
    form.interval = plan.interval || "month";
    form.currency = plan.currency || "ARS";
  }

  async function load() {
    try {
      const { data } = await service.listPlans();
      plans.value = data;
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los planes",
        life: 3000,
      });
    } finally {
      loading.value = false;
    }
  }

  async function save() {
    if (saving.value) return;
    if (!form.name.trim()) {
      toast.add({ severity: "warn", summary: "Poné un nombre al plan", life: 2500 });
      return;
    }
    saving.value = true;
    const input: PlanInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      amount: Number(form.amount),
      currency: form.currency,
      interval: form.interval,
      max_students: Number(form.max_students),
    };
    try {
      if (editingId.value) await service.updatePlan(editingId.value, input);
      else await service.createPlan(input);
      await load();
      resetForm();
      toast.add({ severity: "success", summary: "Plan guardado", life: 2500 });
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo guardar el plan",
        life: 3000,
      });
    } finally {
      saving.value = false;
    }
  }

  async function retire() {
    const plan = retiring.value;
    if (!plan) return;
    try {
      await service.deactivatePlan(plan.plan_id);
      await load();
      toast.add({ severity: "success", summary: "Plan retirado", life: 2500 });
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo retirar el plan",
        life: 3000,
      });
    } finally {
      retiring.value = null;
    }
  }

  function formatAmount(plan: CatalogPlan) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: plan.currency || "ARS",
      maximumFractionDigits: 0,
    }).format(plan.amount);
  }

  onMounted(load);
</script>

<template>
  <TeacherLayout>
    <div class="plans-shell">
      <header class="page-header">
        <h1>Planes</h1>
        <p class="page-sub">
          Lo que se cobra y cuántos alumnos permite cada plan.
        </p>
      </header>

      <form class="plan-form" @submit.prevent="save">
        <h2 class="form-title">
          {{ editingId ? "Editar plan" : "Nuevo plan" }}
        </h2>

        <div class="form-grid">
          <label class="field">
            <span>Nombre</span>
            <input v-model="form.name" type="text" placeholder="Equipo" />
          </label>
          <label class="field">
            <span>Monto por mes</span>
            <input v-model.number="form.amount" type="number" min="0" step="100" />
          </label>
          <label class="field">
            <span>Máximo de alumnos</span>
            <input v-model.number="form.max_students" type="number" min="1" step="1" />
          </label>
          <label class="field field--wide">
            <span>Características</span>
            <textarea
              v-model="form.description"
              rows="4"
              placeholder="Una por línea, por ejemplo:&#10;Corrección automática con IA&#10;Casos pendientes para revisión docente&#10;Progreso e historial por alumno"
            ></textarea>
            <small class="field-hint">
              Una característica por línea. Así se listan en la landing, debajo
              del precio de este plan.
            </small>
          </label>
        </div>

        <p v-if="editingId" class="form-note">
          Cambiar el monto afecta a quienes se suscriban desde ahora. Los que ya
          están siguen pagando lo que aceptaron.
        </p>

        <div class="form-actions">
          <button class="btn-primary" type="submit" :disabled="saving">
            {{ editingId ? "Guardar cambios" : "Crear plan" }}
          </button>
          <button
            v-if="editingId"
            class="btn-quiet"
            type="button"
            :disabled="saving"
            @click="resetForm"
          >
            Cancelar
          </button>
        </div>
      </form>

      <div v-if="loading" class="plan-row">
        <Skeleton width="100%" height="18px" />
      </div>

      <ul v-else class="plan-list">
        <li
          v-for="plan in plans"
          :key="plan.plan_id"
          class="plan-row"
          :class="{ 'plan-row--retired': !plan.active }"
        >
          <div class="plan-main">
            <span class="plan-name">{{ plan.name }}</span>
            <span class="plan-meta">
              Hasta {{ plan.max_students }}
              {{ plan.max_students === 1 ? "alumno" : "alumnos" }}
              · {{ formatAmount(plan) }}
            </span>
            <span v-if="plan.description" class="plan-description">
              {{ plan.description }}
            </span>
          </div>
          <div class="plan-row-actions">
            <span v-if="!plan.active" class="plan-retired">Retirado</span>
            <button class="btn-quiet" type="button" @click="edit(plan)">
              Editar
            </button>
            <button
              v-if="plan.active"
              class="btn-quiet btn-quiet--danger"
              type="button"
              @click="retiring = plan"
            >
              Retirar
            </button>
          </div>
        </li>
      </ul>

      <ConfirmModal
        :show="!!retiring"
        message="¿Retirar este plan?"
        description="Deja de ofrecerse a quien no lo tenga. Los docentes que ya están suscriptos siguen igual."
        confirm-label="Retirar"
        danger
        @confirm="retire"
        @cancel="retiring = null"
      />
    </div>
  </TeacherLayout>
</template>

<style scoped>
  .plans-shell {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.25rem;
    max-width: 820px;
  }

  .page-header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-heading);
  }

  .page-sub {
    margin: 0.25rem 0 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .plan-form {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 1.25rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
  }

  .form-title {
    margin: 0;
    font-size: 1.05rem;
    color: var(--text-heading);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.82rem;
    color: var(--text-secondary);
  }

  .field--wide {
    grid-column: 1 / -1;
  }

  .field input,
  .field textarea {
    padding: 0.55rem 0.7rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--surface-border);
    background: var(--surface-card);
    color: var(--text-primary);
    font-size: 0.9rem;
    font-family: inherit;
    resize: vertical;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .field input:hover,
  .field textarea:hover {
    border-color: rgba(var(--practiq-violet-rgb), 0.35);
  }

  .field input:focus,
  .field textarea:focus {
    outline: none;
    border-color: var(--practiq-violet);
    box-shadow: var(--focus-ring-primary);
  }

  .field-hint {
    color: var(--text-muted);
    font-size: 0.76rem;
  }

  .form-note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--color-warning-dark);
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
  }

  .plan-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .plan-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.8rem 1rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .plan-row:hover {
    border-color: rgba(var(--practiq-violet-rgb), 0.3);
    box-shadow: var(--shadow-card);
  }

  /* Retired plans stay listed: subscriptions point at them, and a plan that
     vanished from the screen is one nobody can explain a charge for. */
  .plan-row--retired {
    opacity: 0.65;
  }

  .plan-main {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .plan-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .plan-meta {
    font-size: 0.82rem;
    color: var(--text-secondary);
  }

  .plan-description {
    max-width: 52ch;
    font-size: 0.8rem;
    line-height: 1.4;
    color: var(--text-muted);
    white-space: pre-line;
  }

  .plan-row-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .plan-retired {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .btn-primary,
  .btn-quiet {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .btn-primary {
    background: var(--practiq-violet);
    color: #fff;
  }

  .btn-quiet {
    background: transparent;
    color: var(--text-secondary);
  }

  .btn-quiet--danger {
    color: var(--color-error-dark, #b91c1c);
  }

  .btn-primary:focus-visible,
  .btn-quiet:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring-primary);
  }

  .btn-primary:disabled,
  .btn-quiet:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .plans-shell {
      padding: 0.9rem;
    }

    .plan-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .plan-row-actions {
      width: 100%;
    }

    .btn-primary,
    .btn-quiet {
      min-height: 44px;
      justify-content: center;
    }
  }
</style>
