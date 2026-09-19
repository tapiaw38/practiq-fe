<script setup lang="ts">
  import { reactive, ref } from "vue";
  import { createCardToken } from "@/utils/mercadopago";
  import type { CatalogPlan } from "@/services/subscription/subscriptionService";

  const props = defineProps<{
    plan: CatalogPlan;
    publicKey: string;
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
  <Teleport to="body">
    <div class="checkout-backdrop" @click.self="emit('cancel')">
      <div
        class="checkout-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
      >
        <h3 id="checkout-title" class="checkout-title">
          Suscribirte a {{ plan.name }}
        </h3>
        <p class="checkout-sub">
          {{ formatAmount(plan) }} por mes · hasta {{ plan.max_students }}
          {{ plan.max_students === 1 ? "alumno" : "alumnos" }}
        </p>

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

          <label class="field">
            <span>Mes</span>
            <input
              v-model="card.cardExpirationMonth"
              type="text"
              inputmode="numeric"
              autocomplete="cc-exp-month"
              placeholder="11"
              maxlength="2"
              required
            />
          </label>

          <label class="field">
            <span>Año</span>
            <input
              v-model="card.cardExpirationYear"
              type="text"
              inputmode="numeric"
              autocomplete="cc-exp-year"
              placeholder="2030"
              maxlength="4"
              required
            />
          </label>

          <label class="field">
            <span>Código</span>
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

          <label class="field">
            <span>Tipo de documento</span>
            <select v-model="card.identificationType">
              <option value="DNI">DNI</option>
              <option value="CUIT">CUIT</option>
              <option value="CUIL">CUIL</option>
            </select>
          </label>

          <label class="field">
            <span>Número de documento</span>
            <input
              v-model="card.identificationNumber"
              type="text"
              inputmode="numeric"
              required
            />
          </label>

          <p v-if="error" class="checkout-error">{{ error }}</p>

          <p class="checkout-note">
            Los datos de tu tarjeta viajan directo a Mercado Pago. Practiq no
            los recibe ni los guarda.
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
    </div>
  </Teleport>
</template>

<style scoped>
  .checkout-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: grid;
    place-items: center;
    padding: 1rem;
    z-index: 1000;
    overflow-y: auto;
  }

  .checkout-card {
    width: min(520px, 100%);
    background: var(--surface-card);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
  }

  .checkout-title {
    margin: 0;
    font-size: 1.15rem;
    color: var(--text-heading);
  }

  .checkout-sub {
    margin: 0.25rem 0 1rem;
    font-size: 0.88rem;
    color: var(--text-secondary);
  }

  .checkout-form {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
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

  .field input,
  .field select {
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
    font-size: 0.78rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

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
    .checkout-form {
      grid-template-columns: repeat(2, 1fr);
    }

    .checkout-actions {
      flex-direction: column;
    }

    .btn-primary,
    .btn-quiet {
      min-height: 44px;
    }
  }
</style>
