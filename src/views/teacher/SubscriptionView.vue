<script setup lang="ts">
  import { computed, onMounted, ref, watch } from "vue";
  import { useToast } from "primevue/usetoast";
  import { ensureFreshAccessToken, practiqApi } from "@/api/request/server";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import UiModal from "@/components/ui/UiModal.vue";
  import CheckoutModal from "@/components/teacher/subscription/CheckoutModal.vue";
  import { authService } from "@/services/auth/authService";
  import type { CardToken } from "@/utils/mercadopago";
  import {
    SubscriptionService,
    type CatalogPlan,
    type DowngradeState,
    type DowngradeStudent,
    type TeacherSubscription,
  } from "@/services/subscription/subscriptionService";

  const toast = useToast();
  const service = new SubscriptionService(practiqApi);

  const subscription = ref<TeacherSubscription | null>(null);
  const plans = ref<CatalogPlan[]>([]);
  const loading = ref(true);
  const loadError = ref(false);
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
  const showPauseModal = ref(false);

  const isPaused = computed(() => subscription.value?.status === "paused");
  /** Authorised at the gateway, not confirmed here yet: the webhook decides. */
  const isPending = computed(() => subscription.value?.status === "pending");

  /** Lapsed but still honoured, for a few days. */
  const graceEndsLabel = computed(() => {
    const ends = subscription.value?.grace_ends_at;
    if (!ends) return "";
    return new Date(ends).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  });

  /**
   * Who would lose access if the plan were enforced right now.
   *
   * Shown rather than applied: the teacher already paid for the period in
   * course, and the students who would go did not make the decision. Applying
   * is their call.
   */
  const downgrade = ref<DowngradeState | null>(null);
  const overLimit = computed(() => (downgrade.value?.deactivated.length ?? 0) > 0);

  /** Who the teacher wants to keep. Starts from the automatic order. */
  const keep = ref<string[]>([]);

  watch(downgrade, (state) => {
    keep.value = (state?.students ?? []).filter((s) => s.keeps).map((s) => s.id);
  });

  const keepIsFull = computed(
    () => keep.value.length >= (downgrade.value?.max_students ?? 0),
  );

  function toggleKeep(id: string) {
    const at = keep.value.indexOf(id);
    if (at >= 0) {
      keep.value.splice(at, 1);
      return;
    }
    // Choosing more than the plan allows is not a choice the gateway can
    // honour, so the form does not let them make it.
    if (!keepIsFull.value) keep.value.push(id);
  }

  function lastPracticedLabel(student: DowngradeStudent) {
    if (!student.last_practiced_at) return "Nunca practicó";
    return `Última práctica: ${new Date(student.last_practiced_at).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }

  async function applyDowngrade() {
    await run(async () => {
      await service.applyDowngrade(keep.value);
      const { data } = await service.downgradePreview();
      downgrade.value = data;
    }, "Plan ajustado");
  }

  /** The plan being subscribed to, or null when the checkout is closed. */
  const checkoutPlan = ref<CatalogPlan | null>(null);
  const publicKey = ref("");
  /** Prefilled into the Mercado Pago field; they can correct it there. */
  const accountEmail = ref("");
  const checkoutError = ref("");

  function paymentErrorMessage(error: unknown) {
    const data = (error as {
      response?: { data?: { message?: string; detail?: string | { message?: string } } };
      message?: string;
    })?.response?.data;
    if (typeof data?.message === "string" && data.message) return data.message;
    if (typeof data?.detail === "string" && data.detail) return data.detail;
    if (
      data?.detail &&
      typeof data.detail !== "string" &&
      typeof data.detail.message === "string" &&
      data.detail.message
    ) return data.detail.message;
    return "No se pudo autorizar la tarjeta. Revisá los datos o probá otra tarjeta.";
  }

  /**
   * Payments may still be warming up immediately after a deploy. Retrying
   * once keeps a transient first request from turning this route into an
   * empty screen, without masking a persistent configuration error.
   */
  async function onceMore<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      return request();
    }
  }

  async function openCheckout(plan: CatalogPlan) {
    checkoutError.value = "";
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

  async function confirmCheckout(token: CardToken) {
    const plan = checkoutPlan.value;
    if (!plan) return;
    checkoutError.value = "";
    working.value = true;
    try {
      // Already paying means moving plan, not subscribing again. Subscribing
      // again opens a second agreement and charges a whole new month on top of
      // the one already bought.
      if (subscription.value?.active) {
        const charged = await service.changePlan(
          plan.plan_id,
          token.id,
          token.paymentMethodId,
        );
        checkoutPlan.value = null;
        await reload();
        toast.add({
          severity: "success",
          summary: "Plan actualizado",
          detail:
            charged > 0
              ? `Cobramos ${formatMoney(charged, plan.currency || "ARS")} por lo que queda del mes.`
              : "El nuevo precio empieza en la próxima renovación.",
          life: 4000,
        });
        return;
      }
      await service.subscribe(plan.plan_id, token.id);
      checkoutPlan.value = null;
      await reload();
      toast.add({ severity: "success", summary: "Suscripción activada", life: 2500 });
    } catch (error: unknown) {
      checkoutError.value = paymentErrorMessage(error);
    } finally {
      working.value = false;
    }
  }

  /**
   * Hands the teacher over to Mercado Pago to authorise the charge there.
   *
   * A full page redirect, not a popup: the gateway asks them to log in, and
   * they come back through back_url. The subscription is left pending until
   * the webhook says it was authorised, so the screen is not reloaded here —
   * there is nothing new to show yet.
   */
  async function payWithWallet(payerEmail: string) {
    const plan = checkoutPlan.value;
    if (!plan) return;
    checkoutError.value = "";
    working.value = true;
    try {
      // Already paying means moving plan, and the agreement at Mercado Pago
      // already knows how to charge them — there is nothing to authorise and
      // nowhere to send them. Without a card the difference is not taken; the
      // new price starts at the next renewal.
      if (subscription.value?.active) {
        await service.changePlan(plan.plan_id);
        checkoutPlan.value = null;
        await reload();
        toast.add({
          severity: "success",
          summary: "Plan actualizado",
          detail: "El nuevo precio se cobra en la próxima renovación.",
          life: 4000,
        });
        return;
      }

      const initPoint = await service.startHostedCheckout(plan.plan_id, payerEmail);
      if (!initPoint) {
        checkoutError.value = "No pudimos abrir el pago en Mercado Pago. Probá de nuevo.";
        return;
      }
      window.location.assign(initPoint);
    } catch (error: unknown) {
      checkoutError.value = paymentErrorMessage(error);
    } finally {
      working.value = false;
    }
  }

  const usedPct = computed(() => {
    const s = subscription.value;
    if (!s || s.plan.max_students <= 0) return 0;
    return Math.min(100, Math.round((s.students_used / s.plan.max_students) * 100));
  });

  const planStateLabel = computed(() => {
    const s = subscription.value;
    if (!s) return "";
    if (s.uncapped) return "Sin límite";
    // Before `active`, not after: keeping the month already paid for means a
    // paused subscription is now entitled, so "active" no longer means "being
    // charged" and answering "Activo" would tell somebody who just paused that
    // nothing happened.
    if (graceEndsLabel.value) return "Por vencer";
    if (isPaused.value) return "Pausado";
    if (isPending.value) return "Confirmando pago";
    if (s.active) return "Activo";
    if (s.trial_expired) return "Prueba terminada";
    return "Gratis";
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
      onceMore(() => service.getMine()),
      onceMore(() => service.listPlans()),
      onceMore(() => service.downgradePreview()),
    ]);
    if (mine.status === "fulfilled" && mine.value.data?.plan) {
      subscription.value = mine.value.data;
    }
    if (excess.status === "fulfilled") downgrade.value = excess.value.data;
    // The catalogue is secondary: failing to list plans must not hide the
    // teacher's own subscription.
    if (catalog.status === "fulfilled") plans.value = catalog.value.data;
    if (mine.status === "rejected" || !subscription.value) {
      throw mine.status === "rejected"
        ? mine.reason
        : new Error("subscription response is missing plan");
    }
  }

  async function loadSubscription() {
    loading.value = true;
    loadError.value = false;
    try {
      // This screen starts three protected calls together. Renew an expiring
      // session first so all three start with the same valid bearer token.
      // Without it, mobile deep links briefly get three 401s and the view can
      // appear blank until a manual reload wins the refresh race.
      if (!await ensureFreshAccessToken()) {
        window.location.assign("/login");
        return;
      }
      await reload();
    } catch {
      loadError.value = true;
      toast.add({
        severity: "error",
        summary: "No se pudo cargar tu suscripción",
        detail: "Revisá tu conexión y probá de nuevo.",
        life: 3500,
      });
    } finally {
      loading.value = false;
    }
  }

  async function run(action: () => Promise<void>, done: string) {
    if (working.value) return;
    working.value = true;
    try {
      await action();
      await reload();
      toast.add({ severity: "success", summary: done, life: 2500 });
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: paymentErrorMessage(error),
        life: 3000,
      });
    } finally {
      working.value = false;
      showLeaveModal.value = false;
    }
  }

  const pause = () =>
    run(() => service.pause(), "Suscripción pausada").finally(() => {
      showPauseModal.value = false;
      showLeaveModal.value = false;
    });
  const resume = () => run(() => service.resume(), "Suscripción reanudada");
  const cancel = () => run(() => service.cancel(), "Suscripción cancelada");

  function formatMoney(amount: number, currency = "ARS") {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatAmount(plan: CatalogPlan) {
    return formatMoney(plan.amount, plan.currency || "ARS");
  }

  /** Best effort: a missing prefill costs a teacher some typing, nothing more. */
  async function loadAccountEmail() {
    try {
      const { data } = await authService.meUser();
      accountEmail.value = data?.email ?? "";
    } catch {
      accountEmail.value = "";
    }
  }

  onMounted(() => {
    loadSubscription();
    loadAccountEmail();
  });
</script>

<template>
  <TeacherLayout>
    <div class="subscription-shell">
      <header class="page-header">
        <div>
          <div class="page-kicker">Facturación</div>
          <h1>Tu suscripción</h1>
          <p class="page-sub">Administrá tu plan, tus alumnos y la renovación mensual.</p>
        </div>
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
              'plan-state--paid':
                (subscription.active && !isPaused && !isPending) ||
                subscription.uncapped,
              'plan-state--paused': isPaused,
              'plan-state--pending': isPending,
              'plan-state--expired':
                Boolean(graceEndsLabel) || subscription.trial_expired,
              'plan-state--free':
                !subscription.active &&
                !isPaused &&
                !isPending &&
                !subscription.uncapped &&
                !subscription.trial_expired,
            }"
          >
            {{ planStateLabel }}
          </span>
        </div>

        <p v-if="isPending" class="plan-pending">
          <i class="pi pi-clock" aria-hidden="true"></i>
          Autorizaste el pago en Mercado Pago y estamos esperando la
          confirmación. Puede tardar unos minutos; no hace falta pagar de nuevo.
        </p>

        <div v-if="!subscription.uncapped" class="plan-summary">
          <div class="plan-summary__item">
            <i class="pi pi-users" aria-hidden="true"></i>
            <span>Capacidad</span>
            <strong>Hasta {{ subscription.plan.max_students }} alumnos</strong>
          </div>
          <div class="plan-summary__item">
            <i class="pi pi-credit-card" aria-hidden="true"></i>
            <span>Cobro</span>
            <strong>Tarjeta · mensual</strong>
          </div>
        </div>

        <p v-if="subscription.uncapped" class="plan-renews">
          Tus alumnos los administra la institución, así que no tenés tope ni
          nada que pagar por acá.
        </p>

        <div v-else class="usage">
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
          <p v-if="subscription.trial_expired" class="usage-warn">
            Tu mes de prueba terminó. Elegí un plan para volver a sumar alumnos.
          </p>
          <p v-else-if="!subscription.can_add_student" class="usage-warn">
            Alcanzaste el máximo de tu plan. Para sumar alumnos, pasá a uno más grande.
          </p>
        </div>

        <p v-if="graceEndsLabel" class="plan-warn">
          <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
          Tu plan dejó de pagarse. Lo mantenemos hasta el
          {{ graceEndsLabel }}; después, los alumnos que excedan el plan pasan
          a solo lectura. Podés elegir cuáles se quedan activos.
        </p>
        <p v-else-if="isPaused" class="plan-renews">
          Pausada: no se te cobra nada.
          <template v-if="renewsLabel">
            Conservás este plan y tus alumnos hasta el {{ renewsLabel }}, porque
            ese mes ya está pago.
          </template>
          Podés reanudarla cuando quieras.
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
            Cuando lo apliques, los
            {{ downgrade?.deactivated.length }} que hace más tiempo que no
            practican pasan a solo lectura: siguen viendo sus cuadernos, sus
            notas y todo lo que hicieron, pero no pueden entregar ni practicar.
            Podés reactivarlos cuando amplíes el plan.
          </p>
          <ul v-if="downgrade?.students?.length" class="keep-list">
            <li v-for="student in downgrade.students" :key="student.id">
              <label
                class="keep-item"
                :class="{ 'keep-item--out': !keep.includes(student.id) }"
              >
                <input
                  type="checkbox"
                  :checked="keep.includes(student.id)"
                  :disabled="working || (keepIsFull && !keep.includes(student.id))"
                  @change="toggleKeep(student.id)"
                />
                <span class="keep-name">{{ student.name }}</span>
                <span class="keep-activity">{{ lastPracticedLabel(student) }}</span>
              </label>
            </li>
          </ul>
          <p v-if="downgrade?.students?.length" class="keep-count">
            {{ keep.length }} de {{ downgrade.max_students }} elegidos.
            Los demás pasan a solo lectura.
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
            class="btn-danger"
            type="button"
            :disabled="working"
            @click="showPauseModal = true"
          >
            <i class="pi pi-pause"></i>
            Pausar
          </button>
          <button
            class="btn-secondary"
            type="button"
            :disabled="working"
            @click="showLeaveModal = true"
          >
            Cancelar suscripción
          </button>
        </div>
      </div>

      <div v-else-if="loadError" class="plan-card load-error" role="alert">
        <i class="pi pi-refresh load-error__icon" aria-hidden="true"></i>
        <div>
          <h2>No pudimos cargar tu suscripción</h2>
          <p>Tu plan no cambió. Intentá cargar esta pantalla otra vez.</p>
        </div>
        <button class="btn-primary" type="button" @click="loadSubscription">
          Reintentar
        </button>
      </div>

      <section v-if="plans.length" class="plans">
        <div class="plans-heading">
          <div>
            <span class="plans-eyebrow">Elegí según tu escuela</span>
            <h2 class="plans-title">Planes disponibles</h2>
          </div>
          <span class="plans-payment"><i class="pi pi-shield"></i> Pago seguro</span>
        </div>
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
              <span class="plan-item-price">{{ formatAmount(plan) }}<small>/mes</small></span>
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
          Pagás con tarjeta de forma segura a través de Mercado Pago. Podés pausar o cancelar cuando quieras.
        </p>
      </section>

      <CheckoutModal
        v-if="checkoutPlan"
        :plan="checkoutPlan"
        :public-key="publicKey"
        :server-error="checkoutError"
        :account-email="accountEmail"
        :changing="Boolean(subscription?.active)"
        @confirm="confirmCheckout"
        @hosted="payWithWallet"
        @cancel="checkoutPlan = null; checkoutError = ''"
      />

      <UiModal
        v-if="showPauseModal"
        label="Pausar suscripción"
        @close="showPauseModal = false"
      >
        <div class="leave-card">
          <h3 class="leave-title">¿Pausar tu suscripción?</h3>
          <p class="leave-text">
            Dejamos de cobrarte desde el próximo vencimiento. Conservás tu plan
            <strong>{{ subscription?.plan.name }}</strong> y tus alumnos hasta el
            <strong>{{ renewsLabel || "final del período que ya pagaste" }}</strong>,
            porque ese mes ya está pago. La reactivás con un clic cuando quieras.
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
              class="btn-secondary"
              type="button"
              :disabled="working"
              @click="showPauseModal = false"
            >
              Volver
            </button>
          </div>
        </div>
      </UiModal>

      <UiModal
        v-if="showLeaveModal"
        label="Cancelar suscripción"
        @close="showLeaveModal = false"
      >
        <div class="leave-card">
          <h3 class="leave-title">¿Preferís pausarla en vez de cancelar?</h3>
          <p class="leave-text">
            Si la pausás dejamos de cobrarte y la reactivás con un clic cuando
            quieras, conservando tu plan y tu precio.
          </p>
          <p class="leave-warn">
            <i class="pi pi-info-circle" aria-hidden="true"></i>
            Si cancelás perdés este plan y este precio. Quien ya está suscripto
            conserva su plan aunque dejemos de ofrecerlo, pero al volver te
            suscribís al plan y al precio que estén vigentes en ese momento, y
            tenés que cargar los datos de tu tarjeta otra vez.
          </p>
          <div class="leave-actions">
            <button
              class="btn-primary"
              type="button"
              :disabled="working"
              @click="pause"
            >
              Pausar y conservar mi plan
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
      </UiModal>
    </div>
  </TeacherLayout>
</template>

<style scoped>
  .subscription-shell {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.25rem;
    max-width: 720px;
  }

  .page-header h1 {
    margin: 0;
    font-size: clamp(1.55rem, 2.5vw, 2rem);
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

  .plan-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
    padding: 0.7rem;
    border-radius: var(--radius-lg);
    background: rgba(var(--practiq-violet-rgb), 0.045);
  }

  .plan-summary__item {
    display: grid;
    grid-template-columns: 1.75rem minmax(0, 1fr);
    column-gap: 0.45rem;
    align-items: center;
    min-width: 0;
  }

  .plan-summary__item i {
    grid-row: span 2;
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: var(--radius-md);
    background: var(--surface-card);
    color: var(--practiq-violet);
    font-size: 0.78rem;
  }

  .plan-summary__item span {
    overflow: hidden;
    color: var(--text-secondary);
    font-size: 0.7rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .plan-summary__item strong {
    overflow: hidden;
    color: var(--text-primary);
    font-size: 0.8rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .load-error {
    align-items: flex-start;
  }

  .load-error__icon {
    color: var(--practiq-violet);
    font-size: 1.15rem;
  }

  .load-error h2,
  .load-error p {
    margin: 0;
  }

  .load-error h2 {
    color: var(--text-heading);
    font-size: 1.05rem;
  }

  .load-error p {
    color: var(--text-secondary);
    font-size: 0.88rem;
    margin-top: 0.25rem;
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

  .plan-pending {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin: 0 0 1rem;
    padding: 0.7rem 0.85rem;
    border-radius: var(--radius-md);
    background: rgba(var(--practiq-violet-rgb), 0.07);
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .plan-pending i {
    margin-top: 0.15rem;
    color: var(--practiq-violet);
  }

  .keep-list {
    list-style: none;
    margin: 0.75rem 0 0.5rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    max-height: 16rem;
    overflow-y: auto;
  }

  .keep-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  .keep-item--out {
    opacity: 0.6;
  }

  .keep-name {
    font-size: 0.88rem;
    color: var(--text-primary);
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .keep-activity {
    font-size: 0.74rem;
    color: var(--text-secondary);
    text-align: right;
  }

  .keep-count {
    margin: 0 0 0.6rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  @media (max-width: 560px) {
    .keep-item {
      grid-template-columns: auto 1fr;
    }

    .keep-activity {
      grid-column: 2;
      text-align: left;
    }
  }

  .plan-warn {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin: 0 0 1rem;
    padding: 0.7rem 0.85rem;
    border-radius: var(--radius-md);
    background: var(--fill-warning-subtle);
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .plan-warn i {
    margin-top: 0.15rem;
    color: var(--color-warning-dark);
  }

  .plan-state--pending {
    background: rgba(var(--practiq-violet-rgb), 0.12);
    color: var(--practiq-violet);
  }

  .plan-state--paused {
    background: var(--color-warning-bg);
    color: var(--color-warning-dark);
  }

  /* The trial ending is not a failure, but it does stop the teacher until they
     choose a plan, so it reads stronger than the free state it replaces. */
  .plan-state--expired {
    background: var(--color-error-bg);
    color: var(--color-error-dark);
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
  .btn-danger,
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

  .btn-danger {
    background: var(--color-error-dark, #b91c1c);
    border-color: var(--color-error-dark, #b91c1c);
    color: #fff;
  }

  .btn-primary:disabled,
  .btn-secondary:disabled,
  .btn-danger:disabled,
  .btn-quiet:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .plans {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .plans-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }

  .plans-eyebrow {
    display: block;
    margin-bottom: 0.18rem;
    color: var(--practiq-violet);
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .plans-title {
    margin: 0;
    font-size: 1.05rem;
    color: var(--text-heading);
  }

  .plans-payment {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex: 0 0 auto;
    color: var(--text-secondary);
    font-size: 0.76rem;
  }

  .plans-payment i { color: var(--color-success-dark); }

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
    padding: 0.9rem 1rem;
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
    background: rgba(var(--practiq-violet-rgb), 0.035);
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

  .plan-item-price small {
    margin-left: 0.12rem;
    color: var(--text-secondary);
    font-size: 0.72em;
    font-weight: 500;
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


  .leave-card {
    width: min(440px, calc(100vw - 32px));
    background: var(--surface-card);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .leave-warn {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin: 0 0 1rem;
    padding: 0.7rem 0.85rem;
    border-radius: var(--radius-md);
    background: var(--fill-warning-subtle);
    font-size: 0.85rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .leave-warn i {
    margin-top: 0.15rem;
    color: var(--color-warning-dark);
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
      gap: 0.9rem;
    }

    .page-header {
      padding: 0.2rem 0;
    }

    .page-kicker {
      font-size: 0.7rem;
      letter-spacing: 0.08em;
    }

    .page-header h1 {
      font-size: 1.65rem;
      line-height: 1.12;
    }

    .page-sub {
      max-width: 30ch;
      font-size: 0.88rem;
      line-height: 1.4;
    }

    .plan-card {
      gap: 0.9rem;
      padding: 1rem;
      border-radius: var(--radius-lg);
    }

    .plan-summary { grid-template-columns: 1fr; gap: 0.45rem; }

    .plan-head {
      align-items: center;
      gap: 0.75rem;
    }

    .plan-name { font-size: 1.15rem; }
    .plan-state { padding: 0.24rem 0.55rem; font-size: 0.72rem; }

    .usage-head { font-size: 0.84rem; }
    .plan-renews,
    .usage-warn { font-size: 0.82rem; line-height: 1.4; }

    .plan-actions {
      display: grid;
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    .leave-actions {
      display: grid;
      grid-template-columns: 1fr;
      align-items: stretch;
      gap: 0.45rem;
    }

    .leave-card {
      width: 100%;
      max-height: calc(100dvh - 1rem);
      overflow-y: auto;
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      padding: 1.1rem 1rem calc(1rem + env(safe-area-inset-bottom));
    }

    .leave-title {
      font-size: 1.05rem;
      line-height: 1.25;
    }

    .leave-text,
    .leave-warn {
      font-size: 0.85rem;
      line-height: 1.45;
    }

    .btn-primary,
    .btn-secondary,
    .btn-danger,
    .btn-quiet {
      justify-content: center;
      min-height: 44px;
    }

    .plan-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.75rem;
      padding: 0.9rem;
    }

    .plans-heading { align-items: flex-start; }
    .plans-payment { margin-top: 0.15rem; font-size: 0.7rem; }

    .plan-item-side {
      align-items: flex-end;
      text-align: right;
    }

    .plan-item-price { font-size: 0.92rem; }
    .btn-plan { min-height: 36px; padding: 0.4rem 0.65rem; }
    .plans-note { font-size: 0.78rem; line-height: 1.4; }

    .load-error { align-items: stretch; }
  }

  @media (prefers-reduced-motion: reduce) {
    .usage-fill {
      transition: none;
    }
  }
</style>
