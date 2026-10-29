<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useToast } from '@/composables/useToast';
import { practiqApi } from '@/api/request/server';
import TeacherLayout from '@/layouts/TeacherLayout.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ConfirmModal from '@/components/ui/ConfirmModal.vue';
import type { CatalogPlan, PlanInput } from '@/types/subscription';
import { SubscriptionService } from '@/services/subscription/subscriptionService';

const toast = useToast();
const service = new SubscriptionService(practiqApi);

const plans = ref<CatalogPlan[]>([]);
const loading = ref(true);
const saving = ref(false);
const editingId = ref<number | null>(null);
const retiring = ref<CatalogPlan | null>(null);

const form = reactive({
    name: '',
    description: '',
    amount: 0,
    max_students: 1,
    interval: 'month',
    currency: 'ARS',
});

function resetForm() {
    editingId.value = null;
    form.name = '';
    form.description = '';
    form.amount = 0;
    form.max_students = 1;
    form.interval = 'month';
    form.currency = 'ARS';
}

function edit(plan: CatalogPlan) {
    editingId.value = plan.plan_id;
    form.name = plan.name;
    form.description = plan.description || '';
    form.amount = plan.amount;
    form.max_students = plan.max_students;
    form.interval = plan.interval || 'month';
    form.currency = plan.currency || 'ARS';
}

async function load() {
    try {
        const { data } = await service.listPlans();
        plans.value = data;
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los planes',
            life: 3000,
        });
    } finally {
        loading.value = false;
    }
}

async function save() {
    if (saving.value) return;
    if (!form.name.trim()) {
        toast.add({ severity: 'warn', summary: 'Poné un nombre al plan', life: 2500 });
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
        toast.add({ severity: 'success', summary: 'Plan guardado', life: 2500 });
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar el plan',
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
        toast.add({ severity: 'success', summary: 'Plan retirado', life: 2500 });
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo retirar el plan',
            life: 3000,
        });
    } finally {
        retiring.value = null;
    }
}

async function reactivate(plan: CatalogPlan) {
    try {
        await service.updatePlan(plan.plan_id, { active: true });
        await load();
        toast.add({ severity: 'success', summary: 'Plan reactivado', life: 2500 });
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo reactivar el plan',
            life: 3000,
        });
    }
}

function features(plan: CatalogPlan) {
    return (plan.description || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

function formatAmount(plan: CatalogPlan) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: plan.currency || 'ARS',
        maximumFractionDigits: 0,
    }).format(plan.amount);
}

onMounted(load);
</script>

<template>
    <TeacherLayout>
        <div class="plans-shell anim-stagger">
            <header class="page-header">
                <div>
                    <div class="page-kicker">Administración de plataforma</div>
                    <h1>Planes</h1>
                    <p class="page-sub">Lo que se cobra y cuántos alumnos permite cada plan.</p>
                </div>
            </header>

            <div class="plans-grid">
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
                            <div class="plan-name-row">
                                <span class="plan-name">{{ plan.name }}</span>
                                <span v-if="!plan.active" class="plan-retired">Retirado</span>
                            </div>
                            <span class="plan-meta">
                                <strong class="plan-price">{{ formatAmount(plan) }}</strong> / mes ·
                                hasta {{ plan.max_students }}
                                {{ plan.max_students === 1 ? 'alumno' : 'alumnos' }}
                            </span>
                            <ul v-if="features(plan).length" class="plan-features">
                                <li v-for="feature in features(plan)" :key="feature">
                                    ✓ {{ feature }}
                                </li>
                            </ul>
                        </div>
                        <div class="plan-row-actions">
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
                            <button
                                v-else
                                class="btn-quiet"
                                type="button"
                                @click="reactivate(plan)"
                            >
                                Reactivar
                            </button>
                        </div>
                    </li>
                </ul>

                <form class="plan-form" @submit.prevent="save">
                    <h2 class="form-title">
                        {{ editingId ? 'Editar plan' : 'Nuevo plan' }}
                    </h2>

                    <label class="field">
                        <span>Nombre</span>
                        <input v-model="form.name" type="text" placeholder="Equipo" />
                    </label>
                    <div class="field-pair">
                        <label class="field">
                            <span>Monto por mes</span>
                            <input v-model.number="form.amount" type="number" min="0" step="100" />
                        </label>
                        <label class="field">
                            <span>Máx. alumnos</span>
                            <input
                                v-model.number="form.max_students"
                                type="number"
                                min="1"
                                step="1"
                            />
                        </label>
                    </div>
                    <label class="field">
                        <span>Características</span>
                        <textarea
                            v-model="form.description"
                            rows="4"
                            placeholder="Una por línea, por ejemplo:&#10;Corrección automática con IA&#10;Casos pendientes para revisión docente&#10;Progreso e historial por alumno"
                        ></textarea>
                        <small class="field-hint">
                            Una por línea. Se listan en la landing, debajo del precio.
                        </small>
                    </label>

                    <p v-if="editingId" class="form-note">
                        Cambiar el monto afecta a quienes se suscriban desde ahora. Los actuales
                        siguen pagando lo que aceptaron.
                    </p>

                    <div class="form-actions">
                        <button class="btn-primary" type="submit" :disabled="saving">
                            {{ editingId ? 'Guardar cambios' : 'Crear plan' }}
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
            </div>

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
    max-width: 1080px;
}

.plans-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 0.9rem;
    align-items: start;
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

.field-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.82rem;
    color: var(--text-secondary);
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
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;
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
    padding: 0.6rem 0.75rem;
    border-radius: var(--radius-md);
    background: var(--color-warning-bg);
    font-size: 0.78rem;
    line-height: 1.5;
    color: var(--text-primary);
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
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;
}

.plan-row:hover {
    border-color: rgba(var(--practiq-violet-rgb), 0.3);
    box-shadow: var(--shadow-card);
}

.plan-row--retired {
    background: var(--canvas);
}

.plan-main {
    flex: 1 1 220px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.plan-name-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.plan-name {
    font-weight: 800;
    font-size: 1.02rem;
    color: var(--text-primary);
}

.plan-meta {
    font-size: 0.82rem;
    color: var(--text-secondary);
}

.plan-price {
    font-size: 0.95rem;
    color: var(--text-primary);
}

.plan-features {
    margin: 0.2rem 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.plan-row-actions {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
}

.plan-retired {
    padding: 0.1rem 0.5rem;
    border-radius: var(--radius-pill);
    background: var(--surface-sunken);
    color: var(--text-secondary);
    font-size: 0.68rem;
    font-weight: 700;
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

@media (max-width: 860px) {
    .plans-grid {
        grid-template-columns: 1fr;
    }
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
