<script setup lang="ts">
  import { reactive, ref } from "vue";
  import UiModal from "@/components/ui/UiModal.vue";
  import { createCardToken } from "@/utils/mercadopago";
  import type { CatalogPlan } from "@/services/subscription/subscriptionService";

  const props = defineProps<{
    plan: CatalogPlan;
    publicKey: string;
    /** Safe message returned by Practiq after the gateway rejects a token. */
    serverError?: string;
  }>();

  const emit = defineEmits<{
    /** Carries the card token, never the card. */
    (e: "confirm", cardTokenId: string): void;
    (e: "cancel"): void;
  }>();

  const working = ref(false);
  const error = ref("");

  const card = reactive({
    cardNumber: "",
    cardholderName: "",
    cardExpirationMonth: "",
    cardExpirationYear: "",
    securityCode: "",
    identificationType: "DNI",
    identificationNumber: "",
  });

  function formatAmount(plan: CatalogPlan) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: plan.currency || "ARS",
      maximumFractionDigits: 0,
    }).format(plan.amount);
  }

  async function submit() {
    if (working.value) return;
    error.value = "";
    working.value = true;
    try {
      // The card goes from this form to the gateway and no further. What comes
      // back is a token, and the token is all that leaves this component.
      const tokenId = await createCardToken(props.publicKey, { ...card });
      emit("confirm", tokenId);
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "No pudimos validar la tarjeta. Revisá los datos.";
    } finally {
      working.value = false;
    }
  }
</script>

<template>
  <UiModal label="Suscripción" @close="emit('cancel')">
    <div class="checkout-card" aria-labelledby="checkout-title">
      <div class="checkout-head">
        <div class="checkout-icon"><i class="pi pi-credit-card" aria-hidden="true"></i></div>
        <div>
          <span class="checkout-kicker">Pago mensual</span>
          <h3 id="checkout-title" class="checkout-title">
            Suscribirte a {{ plan.name }}
          </h3>
          <p class="checkout-sub">
            {{ formatAmount(plan) }} por mes · hasta {{ plan.max_students }}
            {{ plan.max_students === 1 ? "alumno" : "alumnos" }}
          </p>
        </div>
        <button class="checkout-close" type="button" aria-label="Cerrar" @click="emit('cancel')">
          <i class="pi pi-times" aria-hidden="true"></i>
        </button>
      </div>

      <form class="checkout-form" @submit.prevent="submit">
        <label class="field field--wide">
          <span>Número de tarjeta</span>
          <input
            v-model="card.cardNumber"
            type="text"
            inputmode="numeric"
            autocomplete="cc-number"
            placeholder="4509 9535 6623 3704"
            required
          />
        </label>

        <label class="field field--wide">
          <span>Nombre como figura en la tarjeta</span>
          <input
            v-model="card.cardholderName"
            type="text"
            autocomplete="cc-name"
            required
          />
        </label>

        <label class="field field--half">
          <span>Mes</span>
          <input
            v-model="card.cardExpirationMonth"
            type="text"
            inputmode="numeric"
            autocomplete="cc-exp-month"
            placeholder="MM"
            maxlength="2"
            required
          />
        </label>

        <label class="field field--half">
          <span>Año</span>
          <input
            v-model="card.cardExpirationYear"
            type="text"
            inputmode="numeric"
            autocomplete="cc-exp-year"
            placeholder="AAAA"
            minlength="4"
            maxlength="4"
            required
          />
        </label>

        <label class="field field--wide">
          <span>Código de seguridad</span>
          <input
            v-model="card.securityCode"
            type="text"
            inputmode="numeric"
            autocomplete="cc-csc"
            placeholder="123"
            maxlength="4"
            required
          />
        </label>

        <label class="field field--half">
          <span>Tipo de documento</span>
          <select v-model="card.identificationType">
            <option value="DNI">DNI</option>
            <option value="CUIT">CUIT</option>
            <option value="CUIL">CUIL</option>
          </select>
        </label>

        <label class="field field--wide">
          <span>Número de documento</span>
          <input
            v-model="card.identificationNumber"
            type="text"
            inputmode="numeric"
            required
          />
        </label>

        <p v-if="error || serverError" class="checkout-error" role="alert">
          {{ error || serverError }}
        </p>

        <p class="checkout-note">
          <i class="pi pi-shield" aria-hidden="true"></i>
          Tus datos viajan directo a Mercado Pago. Practiq no los recibe ni los guarda.
        </p>

        <div class="checkout-actions">
          <button class="btn-primary" type="submit" :disabled="working">
            {{ working ? "Validando…" : "Suscribirme" }}
          </button>
          <button
            class="btn-quiet"
            type="button"
            :disabled="working"
            @click="emit('cancel')"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </UiModal>
</template>

<style scoped>
  .checkout-card {
    width: min(520px, calc(100vw - 32px));
    background: var(--surface-card);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-lg);
    padding: 1.5rem;
  }

  .checkout-head {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1.1rem;
  }

  .checkout-head > div:nth-child(2) { min-width: 0; }

  .checkout-close {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 2.25rem;
    height: 2.25rem;
    margin-left: auto;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: rgba(var(--practiq-violet-rgb), 0.08);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .checkout-icon {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: var(--radius-md);
    background: rgba(var(--practiq-violet-rgb), 0.1);
    color: var(--practiq-violet);
  }

  .checkout-kicker {
    display: block;
    color: var(--practiq-violet);
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .checkout-title {
    margin: 0;
    font-size: 1.15rem;
    color: var(--text-heading);
  }

  .checkout-sub {
    margin: 0.2rem 0 0;
    font-size: 0.88rem;
    color: var(--text-secondary);
  }

  .checkout-form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .field--wide {
    grid-column: 1 / -1;
  }

  .field--half { grid-column: span 1; }

  .field input,
  .field select {
    width: 100%;
    box-sizing: border-box;
    min-height: 2.75rem;
    padding: 0.55rem 0.7rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--surface-border);
    background: var(--surface-card);
    color: var(--text-primary);
    font-size: 0.92rem;
  }

  .checkout-error,
  .checkout-note,
  .checkout-actions {
    grid-column: 1 / -1;
  }

  .checkout-error {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-error-dark, #b91c1c);
  }

  .checkout-note {
    margin: 0;
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    padding: 0.65rem 0.75rem;
    border-radius: var(--radius-md);
    background: rgba(var(--practiq-violet-rgb), 0.055);
    font-size: 0.78rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .checkout-note i { margin-top: 0.12rem; color: var(--practiq-violet); }

  .checkout-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .btn-primary,
  .btn-quiet {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem 1.1rem;
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

  .btn-quiet {
    background: transparent;
    color: var(--text-secondary);
  }

  .btn-primary:disabled,
  .btn-quiet:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 560px) {
    .checkout-card {
      width: 100%;
      border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
      padding: 1rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
    }

    .checkout-head { gap: 0.6rem; margin-bottom: 0.85rem; }
    .checkout-icon { width: 2.1rem; height: 2.1rem; }
    .checkout-title { font-size: 1.05rem; line-height: 1.2; }
    .checkout-sub { font-size: 0.8rem; line-height: 1.35; }
    .checkout-kicker { font-size: 0.64rem; }
    .checkout-close { width: 2rem; height: 2rem; }

    .checkout-form { gap: 0.65rem; }
    .field { gap: 0.25rem; font-size: 0.74rem; }
    .field input, .field select { min-height: 2.65rem; font-size: 16px; }
    .checkout-note { padding: 0.55rem 0.6rem; font-size: 0.72rem; line-height: 1.35; }

    .checkout-actions {
      position: sticky;
      bottom: -0.1rem;
      z-index: 1;
      display: grid;
      grid-template-columns: 1fr auto;
      margin: 0 -0.15rem -0.75rem;
      padding: 0.75rem 0.15rem calc(0.75rem + env(safe-area-inset-bottom));
      background: var(--surface-card);
      box-shadow: 0 -8px 18px rgba(15, 23, 42, 0.06);
    }

    .btn-primary,
    .btn-quiet {
      min-height: 44px;
    }

    .btn-quiet { padding-inline: 0.8rem; }
  }
</style>
