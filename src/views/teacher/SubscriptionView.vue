<script setup lang="ts">
  import { computed, onMounted, ref } from "vue";
  import { useToast } from "primevue/usetoast";
  import { practiqApi } from "@/api/request/server";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import CheckoutModal from "@/components/teacher/subscription/CheckoutModal.vue";
  import {
    SubscriptionService,
    type CatalogPlan,
    type DowngradeState,
    type TeacherSubscription,
  } from "@/services/subscription/subscriptionService";

  const toast = useToast();
  const service = new SubscriptionService(practiqApi);

  const subscription = ref<TeacherSubscription | null>(null);
  const plans = ref<CatalogPlan[]>([]);
  const loading = ref(true);
  const working = ref(false);
  /**
   * Cancelling is offered through here, never directly.
   *
   * At the gateway a cancellation withdraws the payment authorisation and
   * cannot be undone — coming back means entering card details again — while a
   * pause keeps it and resumes with one click. So the modal leads with pausing
   * and keeps cancelling available rather than hiding it.
   */
  const showLeaveModal = ref(false);

  const isPaused = computed(() => subscription.value?.status === "paused");

  /**
   * Who would lose access if the plan were enforced right now.
   *
   * Shown rather than applied: the teacher already paid for the period in
   * course, and the students who would go did not make the decision. Applying
   * is their call.
   */
  const downgrade = ref<DowngradeState | null>(null);
  const overLimit = computed(() => (downgrade.value?.deactivated.length ?? 0) > 0);

  async function applyDowngrade() {
    await run(async () => {
      await service.applyDowngrade([]);
      const { data } = await service.downgradePreview();
      downgrade.value = data;
    }, "Plan ajustado");
  }

  /** The plan being subscribed to, or null when the checkout is closed. */
  const checkoutPlan = ref<CatalogPlan | null>(null);
  const publicKey = ref("");

  async function openCheckout(plan: CatalogPlan) {
    if (!publicKey.value) {
      try {
        const { data } = await service.checkoutConfig();
        publicKey.value = data.public_key;
      } catch {
        publicKey.value = "";
      }
    }
    if (!publicKey.value) {
      toast.add({
        severity: "warn",
        summary: "Pagos no disponible",
        detail: "Todavía no está configurado el cobro con tarjeta.",
        life: 4000,
      });
      return;
    }
    checkoutPlan.value = plan;
  }

  async function confirmCheckout(cardTokenId: string) {
    const plan = checkoutPlan.value;
    if (!plan) return;
    checkoutPlan.value = null;
    await run(() => service.subscribe(plan.plan_id, cardTokenId), "Suscripción activada");
  }

  const usedPct = computed(() => {
    const s = subscription.value;
    if (!s || s.plan.max_students <= 0) return 0;
    return Math.min(100, Math.round((s.students_used / s.plan.max_students) * 100));
  });

  const renewsLabel = computed(() => {
    const renews = subscription.value?.renews_at;
    if (!renews) return "";
    return new Date(renews).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  });

  async function reload() {
    const [mine, catalog, excess] = await Promise.allSettled([
      service.getMine(),
      service.listPlans(),
      service.downgradePreview(),
    ]);
    if (mine.status === "fulfilled") subscription.value = mine.value.data;
    if (excess.status === "fulfilled") downgrade.value = excess.value.data;
    // The catalogue is secondary: failing to list plans must not hide the
    // teacher's own subscription.
    if (catalog.status === "fulfilled") plans.value = catalog.value.data;
    if (mine.status === "rejected") throw mine.reason;
  }

  async function run(action: () => Promise<void>, done: string) {
    if (working.value) return;
    working.value = true;
    try {
      await action();
      await reload();
      toast.add({ severity: "success", summary: done, life: 2500 });
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo completar la acción. Probá de nuevo.",
        life: 3000,
      });
    } finally {
      working.value = false;
      showLeaveModal.value = false;
    }
  }

  const pause = () => run(() => service.pause(), "Suscripción pausada");
  const resume = () => run(() => service.resume(), "Suscripción reanudada");
  const cancel = () => run(() => service.cancel(), "Suscripción cancelada");

  function formatAmount(plan: CatalogPlan) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: plan.currency || "ARS",
      maximumFractionDigits: 0,
    }).format(plan.amount);
  }

  onMounted(async () => {
    try {
      await reload();
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar tu suscripción",
        life: 3000,
      });
    } finally {
      loading.value = false;
    }
  });
</script>

<template>
  <TeacherLayout>
    <div class="subscription-shell">
      <header class="page-header">
        <h1>Suscripción</h1>
        <p class="page-sub">Tu plan y cuántos alumnos tenés activos.</p>
      </header>

      <div v-if="loading" class="plan-card">
        <Skeleton width="140px" height="18px" />
        <Skeleton width="100%" height="10px" />
        <Skeleton width="180px" height="14px" />
      </div>

      <div v-else-if="subscription" class="plan-card">
        <div class="plan-head">
          <div>
            <span class="plan-label">Plan actual</span>
            <h2 class="plan-name">{{ subscription.plan.name }}</h2>
          </div>
          <span
            class="plan-state"
            :class="{
              'plan-state--paid': subscription.active,
              'plan-state--paused': isPaused,
              'plan-state--free': !subscription.active && !isPaused,
            }"
          >
            {{ subscription.active ? "Activo" : isPaused ? "Pausado" : "Gratis" }}
          </span>
        </div>

        <div class="usage">
          <div class="usage-head">
            <span>Alumnos</span>
            <strong>
              {{ subscription.students_used }} de {{ subscription.plan.max_students }}
            </strong>
          </div>
          <div
            class="usage-bar"
            role="progressbar"
            :aria-valuenow="usedPct"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="usage-fill"
              :class="{ 'usage-fill--full': !subscription.can_add_student }"
              :style="{ width: `${usedPct}%` }"
            ></div>
          </div>
          <p v-if="!subscription.can_add_student" class="usage-warn">
            Alcanzaste el máximo de tu plan. Para sumar alumnos, pasá a uno más grande.
          </p>
        </div>

        <p v-if="isPaused" class="plan-renews">
          Mientras esté pausada no se te cobra, y tus alumnos quedan con el
          plan gratis. Podés reanudarla cuando quieras.
        </p>
        <p v-else-if="renewsLabel" class="plan-renews">
          {{ subscription.active ? "Se renueva el" : "Tu prueba termina el" }}
          {{ renewsLabel }}
        </p>

        <div v-if="overLimit" class="over-limit">
          <p class="over-limit-title">
            Tu plan permite {{ downgrade?.max_students }}
            {{ downgrade?.max_students === 1 ? "alumno" : "alumnos" }} y tenés
            {{ subscription.students_used }}.
          </p>
          <p class="over-limit-text">
            Cuando lo apliques, dejan de tener acceso los
            {{ downgrade?.deactivated.length }} que hace más tiempo que no
            practican. Conservan su cuenta y su historial, y podés reactivarlos
            cuando amplíes el plan.
          </p>
          <button
            class="btn-secondary"
            type="button"
            :disabled="working"
            @click="applyDowngrade"
          >
            Ajustar al plan
          </button>
        </div>

        <div v-if="subscription.active || isPaused" class="plan-actions">
          <button
            v-if="isPaused"
            class="btn-primary"
            type="button"
            :disabled="working"
            @click="resume"
          >
            <i class="pi pi-play"></i>
            Reanudar
          </button>
          <button
            v-else
            class="btn-secondary"
            type="button"
            :disabled="working"
            @click="pause"
          >
            <i class="pi pi-pause"></i>
            Pausar
          </button>
          <button
            class="btn-quiet"
            type="button"
            :disabled="working"
            @click="showLeaveModal = true"
          >
            Cancelar suscripción
          </button>
        </div>
      </div>

      <section v-if="plans.length" class="plans">
        <h2 class="plans-title">Planes</h2>
        <ul class="plan-list">
          <li
            v-for="plan in plans"
            :key="plan.plan_id"
            class="plan-item"
            :class="{ 'plan-item--current': plan.plan_id === subscription?.plan.plan_id }"
          >
            <div class="plan-item-main">
              <span class="plan-item-name">{{ plan.name }}</span>
              <span class="plan-item-limit">
                Hasta {{ plan.max_students }}
                {{ plan.max_students === 1 ? "alumno" : "alumnos" }}
              </span>
            </div>
            <div class="plan-item-side">
              <span class="plan-item-price">{{ formatAmount(plan) }}</span>
              <span
                v-if="plan.plan_id === subscription?.plan.plan_id"
                class="plan-item-current"
              >
                Tu plan
              </span>
              <button
                v-else-if="plan.active"
                class="btn-plan"
                type="button"
                :disabled="working"
                @click="openCheckout(plan)"
              >
                {{ subscription?.active ? "Cambiar a este" : "Suscribirme" }}
              </button>
            </div>
          </li>
        </ul>
        <p class="plans-note">
          Al cambiar de plan se cobra el nuevo desde el próximo período.
        </p>
      </section>

      <CheckoutModal
        v-if="checkoutPlan"
        :plan="checkoutPlan"
        :public-key="publicKey"
        @confirm="confirmCheckout"
        @cancel="checkoutPlan = null"
      />

      <Teleport to="body">
        <div
          v-if="showLeaveModal"
          class="leave-backdrop"
          @click.self="showLeaveModal = false"
        >
          <div
            class="leave-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
          >
            <h3 id="leave-title" class="leave-title">
              ¿Preferís pausarla en vez de cancelar?
            </h3>
            <p class="leave-text">
              Si la pausás dejamos de cobrarte y la reactivás con un clic cuando
              quieras. Si la cancelás tenés que volver a cargar los datos de tu
              tarjeta para retomar.
            </p>
            <div class="leave-actions">
              <button
                class="btn-primary"
                type="button"
                :disabled="working"
                @click="pause"
              >
                Pausar
              </button>
              <button
                class="btn-quiet btn-quiet--danger"
                type="button"
                :disabled="working"
                @click="cancel"
              >
                Cancelar igual
              </button>
              <button
                class="btn-quiet"
                type="button"
                :disabled="working"
                @click="showLeaveModal = false"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </TeacherLayout>
</template>

<style scoped>
  .subscription-shell {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.25rem;
    max-width: 720px;
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

  .plan-card {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    padding: 1.25rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card);
  }

  .plan-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .plan-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
  }

  .plan-name {
    margin: 0.2rem 0 0;
    font-size: 1.25rem;
    color: var(--text-heading);
  }

  .plan-state {
    flex: 0 0 auto;
    padding: 0.25rem 0.7rem;
    border-radius: var(--radius-pill);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .plan-state--paid {
    background: var(--color-success-bg);
    color: var(--color-success-dark);
  }

  .plan-state--free {
    background: rgba(var(--practiq-violet-rgb), 0.1);
    color: var(--practiq-violet-dark);
  }

  .plan-state--paused {
    background: var(--color-warning-bg);
    color: var(--color-warning-dark);
  }

  /* Information, not an error: the teacher chose a smaller plan and nothing
     has happened yet. */
  .over-limit {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.85rem 1rem;
    border-radius: var(--radius-lg);
    background: var(--color-warning-bg);
  }

  .over-limit-title {
    margin: 0;
    font-weight: 600;
    font-size: 0.92rem;
    color: var(--color-warning-dark);
  }

  .over-limit-text {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .over-limit .btn-secondary {
    align-self: flex-start;
    margin-top: 0.25rem;
  }

  .plan-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    padding-top: 0.25rem;
    border-top: 1px solid var(--surface-border);
    margin-top: 0.25rem;
  }

  .btn-primary,
  .btn-secondary,
  .btn-quiet {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .btn-primary {
    background: var(--practiq-violet);
    color: #fff;
  }

  .btn-secondary {
    background: var(--surface-card);
    border-color: rgba(var(--practiq-violet-rgb), 0.3);
    color: var(--practiq-violet);
  }

  /* Cancelling stays reachable and stays quiet. Hiding it would be a dark
     pattern; giving it the weight of the primary action would invite the
     irreversible choice. */
  .btn-quiet {
    background: transparent;
    color: var(--text-secondary);
  }

  .btn-quiet--danger {
    color: var(--color-error-dark, #b91c1c);
  }

  .btn-primary:disabled,
  .btn-secondary:disabled,
  .btn-quiet:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .plans {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .plans-title {
    margin: 0;
    font-size: 1.05rem;
    color: var(--text-heading);
  }

  .plan-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .plan-item {
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

  .plan-item:hover {
    border-color: rgba(var(--practiq-violet-rgb), 0.3);
    box-shadow: var(--shadow-card);
  }

  .plan-item--current {
    border-color: var(--practiq-violet);
  }

  .plan-item-main {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .plan-item-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .plan-item-limit {
    font-size: 0.82rem;
    color: var(--text-secondary);
  }

  .plan-item-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
  }

  .plan-item-price {
    font-weight: 600;
    color: var(--text-primary);
  }

  .plan-item-current {
    font-size: 0.75rem;
    color: var(--practiq-violet);
  }

  .btn-plan {
    padding: 0.4rem 0.85rem;
    border-radius: var(--radius-md);
    border: 1px solid rgba(var(--practiq-violet-rgb), 0.3);
    background: var(--surface-card);
    color: var(--practiq-violet);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-plan:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary:focus-visible,
  .btn-secondary:focus-visible,
  .btn-quiet:focus-visible,
  .btn-plan:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring-primary);
  }

  .plans-note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--text-secondary);
  }

  .leave-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: grid;
    place-items: center;
    padding: 1rem;
    z-index: 1000;
  }

  .leave-card {
    width: min(440px, 100%);
    background: var(--surface-card);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .leave-title {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-heading);
  }

  .leave-text {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.55;
    color: var(--text-secondary);
  }

  .leave-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }

  .usage {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .usage-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .usage-head strong {
    color: var(--text-primary);
  }

  .usage-bar {
    height: 8px;
    border-radius: var(--radius-pill);
    background: rgba(var(--surface-border-rgb), 0.25);
    overflow: hidden;
  }

  .usage-fill {
    height: 100%;
    background: var(--practiq-violet);
    transition: width 0.25s ease;
  }

  /* A full plan is information, not an error: the teacher has not done
     anything wrong, they have simply used what they bought. */
  .usage-fill--full {
    background: var(--color-warning);
  }

  .usage-warn {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-warning-dark);
  }

  .plan-renews {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  @media (max-width: 640px) {
    .subscription-shell {
      padding: 0.9rem;
    }

    .plan-head {
      flex-direction: column;
      gap: 0.5rem;
    }

    .plan-actions,
    .leave-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .btn-primary,
    .btn-secondary,
    .btn-quiet {
      justify-content: center;
      min-height: 44px;
    }

    .plan-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
    }

    .plan-item-side {
      align-items: flex-start;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .usage-fill {
      transition: none;
    }
  }
</style>
