<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useToast } from '@/composables/useToast';
import { useAuthAdmin } from '@/composables/useAuthAdmin';
import { practiqApi } from '@/api/request/server';
import TeacherLayout from '@/layouts/TeacherLayout.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { SubscriptionService } from '@/services/subscription/subscriptionService';
import type { AuthApiUser } from '@/types';
import type { AdminSubscription } from '@/types/subscription';

const toast = useToast();
const service = new SubscriptionService(practiqApi);
const { loadUsers } = useAuthAdmin();

function practiqUserId(user: AuthApiUser) {
    return user.username || user.id;
}

const subscriptions = ref<AdminSubscription[]>([]);
const usersById = ref<Record<string, { name: string; email: string }>>({});
const loading = ref(true);
const filterStatus = ref('');

const statusOptions = [
    { value: '', label: 'Todas' },
    { value: 'authorized', label: 'Activas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'paused', label: 'Pausadas' },
    { value: 'cancelled', label: 'Canceladas' },
];

const subscriptionStatusLabels: Record<string, string> = {
    authorized: 'Activa',
    active: 'Activa',
    pending: 'Pendiente',
    paused: 'Pausada',
    cancelled: 'Cancelada',
};

const cycleStatusLabels: Record<string, string> = {
    approved: 'Pagado',
    accredited: 'Pagado',
    pending: 'Pendiente',
    in_process: 'Pendiente',
    scheduled: 'Programado',
    rejected: 'Falló',
    cancelled: 'Falló',
};

function subscriptionStatusLabel(status: string) {
    return subscriptionStatusLabels[status] || status;
}

function subscriptionStatusVariant(status: string) {
    if (status === 'authorized' || status === 'active') return 'status-pill--ok';
    if (status === 'paused' || status === 'pending') return 'status-pill--warn';
    return 'status-pill--blocked';
}

function cycleStatusLabel(status?: string) {
    if (!status) return 'Sin cobros aún';
    return cycleStatusLabels[status] || status;
}

function cycleStatusVariant(status?: string) {
    if (!status) return 'status-pill--neutral';
    if (status === 'approved' || status === 'accredited') return 'status-pill--ok';
    if (status === 'pending' || status === 'in_process' || status === 'scheduled')
        return 'status-pill--warn';
    return 'status-pill--blocked';
}

function teacherLabel(userId: string) {
    const user = usersById.value[userId];
    if (!user) return userId;
    return user.name || user.email || userId;
}

function teacherEmail(userId: string) {
    return usersById.value[userId]?.email || '';
}

function formatMoney(amount: number, currency = 'ARS') {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(value?: string) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

const activeCount = computed(
    () =>
        subscriptions.value.filter((s) => s.status === 'authorized' || s.status === 'active')
            .length,
);
const failedCount = computed(
    () =>
        subscriptions.value.filter((s) =>
            ['rejected', 'cancelled'].includes(s.last_cycle?.status || ''),
        ).length,
);

async function load() {
    loading.value = true;
    try {
        const [subsResult, usersResult] = await Promise.all([
            service.listAllSubscriptions(filterStatus.value || undefined),
            loadUsers({ limit: 1000, offset: 0 }).catch(() => []),
        ]);
        subscriptions.value = subsResult.data;
        usersById.value = Object.fromEntries(
            usersResult.map((u) => [
                practiqUserId(u),
                { name: `${u.first_name} ${u.last_name}`.trim(), email: u.email },
            ]),
        );
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las suscripciones',
            life: 3000,
        });
    } finally {
        loading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <TeacherLayout>
        <div class="subs-shell anim-stagger">
            <header class="page-header">
                <div>
                    <div class="page-kicker">Administración de plataforma</div>
                    <h1>Suscripciones</h1>
                    <p class="page-sub">
                        Quién está suscripto, qué plan paga y si el último cobro salió bien.
                    </p>
                </div>
                <div class="page-header__right">
                    <select v-model="filterStatus" class="status-filter" @change="load">
                        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                </div>
            </header>

            <div class="subs-summary">
                <div class="summary-tile">
                    <span class="summary-label">Suscripciones</span>
                    <strong class="summary-value">{{ subscriptions.length }}</strong>
                </div>
                <div class="summary-tile">
                    <span class="summary-label">Activas</span>
                    <strong class="summary-value">{{ activeCount }}</strong>
                </div>
                <div class="summary-tile summary-tile--danger">
                    <span class="summary-label">Último cobro fallido</span>
                    <strong class="summary-value">{{ failedCount }}</strong>
                </div>
            </div>

            <div class="card subs-card">
                <div v-if="loading" class="subs-loading">
                    <Skeleton v-for="n in 5" :key="n" width="100%" height="48px" />
                </div>

                <table v-else-if="subscriptions.length" class="data-table">
                    <thead>
                        <tr>
                            <th>Docente</th>
                            <th>Plan</th>
                            <th>Estado</th>
                            <th>Último cobro</th>
                            <th>Resultado</th>
                            <th>Próximo cobro</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="sub in subscriptions" :key="sub.id">
                            <td>
                                <div class="teacher-cell">
                                    <span class="teacher-name">{{
                                        teacherLabel(sub.user_id)
                                    }}</span>
                                    <span v-if="teacherEmail(sub.user_id)" class="teacher-email">
                                        {{ teacherEmail(sub.user_id) }}
                                    </span>
                                </div>
                            </td>
                            <td>{{ sub.plan_name }}</td>
                            <td>
                                <span
                                    class="status-pill"
                                    :class="subscriptionStatusVariant(sub.status)"
                                >
                                    {{ subscriptionStatusLabel(sub.status) }}
                                </span>
                            </td>
                            <td>
                                <template v-if="sub.last_cycle">
                                    {{
                                        formatMoney(sub.last_cycle.amount, sub.last_cycle.currency)
                                    }}
                                    <span class="cycle-date">
                                        · {{ formatDate(sub.last_cycle.period_start) }}
                                    </span>
                                </template>
                                <span v-else class="cycle-empty">Sin cobros aún</span>
                            </td>
                            <td>
                                <span
                                    class="status-pill"
                                    :class="cycleStatusVariant(sub.last_cycle?.status)"
                                >
                                    {{ cycleStatusLabel(sub.last_cycle?.status) }}
                                </span>
                            </td>
                            <td>{{ formatDate(sub.next_payment_at) || '—' }}</td>
                        </tr>
                    </tbody>
                </table>

                <p v-else class="subs-empty">No hay suscripciones para este filtro.</p>
            </div>
        </div>
    </TeacherLayout>
</template>

<style scoped>
.subs-shell {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.25rem;
}

.page-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
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

.status-filter {
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--surface-border);
    background: var(--surface-card);
    color: var(--text-primary);
    font-size: 0.88rem;
}

.subs-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
}

.summary-tile {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.85rem 1rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
}

.summary-tile--danger .summary-value {
    color: var(--color-error-dark, #b91c1c);
}

.summary-label {
    font-size: 0.76rem;
    color: var(--text-secondary);
}

.summary-value {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
}

.subs-card {
    padding: 0;
    overflow-x: auto;
}

.subs-loading {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
}

.subs-empty {
    margin: 0;
    padding: 2rem 1rem;
    text-align: center;
    color: var(--text-secondary);
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table thead th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--surface-border);
}

.data-table td {
    padding: 0.75rem 1rem;
    font-size: 0.88rem;
    color: var(--text-primary);
    border-bottom: 1px solid var(--surface-border);
    white-space: nowrap;
}

.data-table tbody tr:last-child td {
    border-bottom: none;
}

.data-table tbody tr:hover {
    background: var(--surface-sunken);
}

.teacher-cell {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.teacher-name {
    font-weight: 600;
}

.teacher-email {
    font-size: 0.76rem;
    color: var(--text-secondary);
}

.cycle-date {
    color: var(--text-secondary);
    font-size: 0.8rem;
}

.cycle-empty {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.status-pill {
    display: inline-flex;
    padding: 0.22rem 0.65rem;
    border-radius: var(--radius-pill);
    font-size: 0.76rem;
    font-weight: 600;
}

.status-pill--ok {
    background: var(--color-success-bg);
    color: var(--color-success-dark);
}

.status-pill--warn {
    background: var(--color-warning-bg);
    color: var(--color-warning-dark);
}

.status-pill--blocked {
    background: var(--color-error-bg);
    color: var(--color-error-dark);
}

.status-pill--neutral {
    background: rgba(var(--surface-border-rgb), 0.3);
    color: var(--text-secondary);
}

@media (max-width: 640px) {
    .subs-summary {
        grid-template-columns: 1fr;
    }
}
</style>
