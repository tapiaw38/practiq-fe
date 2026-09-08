<script setup lang="ts">
  import { computed, onMounted, ref } from "vue";
  import { useToast } from "primevue/usetoast";
  import { practiqApi } from "@/api/request/server";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import {
    SubscriptionService,
    type TeacherSubscription,
  } from "@/services/subscription/subscriptionService";

  const toast = useToast();
  const service = new SubscriptionService(practiqApi);

  const subscription = ref<TeacherSubscription | null>(null);
  const loading = ref(true);

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

  onMounted(async () => {
    try {
      const { data } = await service.getMine();
      subscription.value = data;
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
            :class="subscription.active ? 'plan-state--paid' : 'plan-state--free'"
          >
            {{ subscription.active ? "Activo" : "Gratis" }}
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

        <p v-if="renewsLabel" class="plan-renews">
          {{ subscription.active ? "Se renueva el" : "Tu prueba termina el" }}
          {{ renewsLabel }}
        </p>
      </div>
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
  }

  @media (prefers-reduced-motion: reduce) {
    .usage-fill {
      transition: none;
    }
  }
</style>
