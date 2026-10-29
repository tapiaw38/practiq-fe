<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { practiqApi } from '@/api/request/server';
import { authApi } from '@/api/request/server';
import TeacherLayout from '@/layouts/TeacherLayout.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { useSchools } from '@/composables/useSchools';
import { SchoolService, type School, type SchoolArchive } from '@/services/schools/schoolService';
import { AuthAdminService } from '@/services/auth/authAdminService';
import type { AuthApiUser } from '@/types';

const toast = useToast();
const router = useRouter();
const { loadSchools, setActive } = useSchools();
const service = new SchoolService(practiqApi);

const schools = ref<School[]>([]);
const loading = ref(true);
const saving = ref(false);
const showCreateForm = ref(false);
const closeTarget = ref<School | null>(null);
const closeConfirmation = ref('');
const closeReason = ref('');
const archive = ref<SchoolArchive | null>(null);
const loadingArchive = ref(false);
const editingSchool = ref<School | null>(null);
const adminQuery = ref('');
const adminUserId = ref('');
const adminMatches = ref<AuthApiUser[]>([]);
const authAdmin = new AuthAdminService(authApi);

const form = reactive({ name: '', billing: 'direct' as School['billing'] });
const editForm = reactive({ name: '', billing: 'direct' as School['billing'] });

const activeSchools = computed(() => schools.value.filter((s) => s.status === 'active'));
const institutions = computed(() => activeSchools.value.filter((s) => s.kind === 'institution'));
const personals = computed(() => activeSchools.value.filter((s) => s.kind === 'personal'));
const closedSchools = computed(() => schools.value.filter((s) => s.status === 'closed'));
const suspendedSchools = computed(() => schools.value.filter((s) => s.status === 'suspended'));

const tabDefs = [
    {
        label: 'Instituciones',
        hint: 'Activas. Sus miembros entran normalmente.',
    },
    {
        label: 'Suspendidas',
        hint: 'No están disponibles para sus miembros. Podés reactivarlas sin perder información.',
    },
    { label: 'Personales', hint: 'Una por docente. No se crean ni se borran desde acá.' },
    { label: 'Cerradas', hint: 'Solo lectura. Podés consultar su archivo.' },
];
const activeTab = ref(0);
const searchQuery = ref('');
const openMenuId = ref<string | null>(null);

const tabRows = computed(
    () =>
        [institutions.value, suspendedSchools.value, personals.value, closedSchools.value][
            activeTab.value
        ],
);

const tabs = computed(() =>
    tabDefs.map((def, i) => ({
        ...def,
        n: [institutions.value, suspendedSchools.value, personals.value, closedSchools.value][i]
            .length,
    })),
);

const filteredRows = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const rows = tabRows.value;
    if (!query) return rows;
    return rows.filter((school) => school.name.toLowerCase().includes(query));
});

function initialsOf(name: string) {
    const words = name.split(' ').filter((w) => /^[A-ZÁÉÍÓÚ]/.test(w));
    return (
        words
            .slice(0, 2)
            .map((w) => w[0])
            .join('') || name.slice(0, 2).toUpperCase()
    );
}

function billingLabel(school: School) {
    return school.billing === 'direct' ? 'Facturación directa' : 'Por suscripción';
}

function rowMeta(school: School) {
    if (school.kind === 'personal' && school.plan) {
        return `${school.plan.name} · hasta ${school.plan.max_students} ${school.plan.max_students === 1 ? 'alumno' : 'alumnos'}`;
    }
    if (school.status === 'closed') {
        return school.kind === 'institution' ? 'Institución' : 'Escuela personal';
    }
    return billingLabel(school);
}

function primaryLabel() {
    return ['Administrar', 'Reactivar', 'Ver', 'Ver archivo'][activeTab.value];
}

function primaryAction(school: School) {
    if (activeTab.value === 1) return reopenSchool(school);
    if (activeTab.value === 3) return openArchive(school);
    return openSchool(school);
}

function selectTab(i: number) {
    activeTab.value = i;
    openMenuId.value = null;
}

function toggleMenu(id: string) {
    openMenuId.value = openMenuId.value === id ? null : id;
}
function closeMenu() {
    openMenuId.value = null;
}

interface MenuAction {
    label: string;
    danger?: boolean;
    run: () => void;
}
function menuActions(school: School): MenuAction[] {
    if (activeTab.value === 0) {
        return [
            { label: 'Editar', run: () => openEdit(school) },
            { label: 'Suspender', run: () => suspendSchool(school) },
            { label: 'Cerrar escuela', danger: true, run: () => askToClose(school) },
        ];
    }
    if (activeTab.value === 1) {
        return [{ label: 'Editar', run: () => openEdit(school) }];
    }
    if (activeTab.value === 2) {
        return [{ label: 'Cerrar escuela', danger: true, run: () => askToClose(school) }];
    }
    return [{ label: 'Reabrir', run: () => reopenSchool(school) }];
}
function runMenuAction(action: MenuAction) {
    closeMenu();
    action.run();
}

function fail(detail: string) {
    toast.add({ severity: 'error', summary: 'Error', detail, life: 3000 });
}

async function load() {
    try {
        const { data } = await service.list();
        schools.value = data;
    } catch {
        fail('No se pudieron cargar las escuelas');
    } finally {
        loading.value = false;
    }
}

async function createSchool() {
    if (saving.value) return;
    if (!form.name.trim()) {
        toast.add({ severity: 'warn', summary: 'Poné un nombre', life: 2500 });
        return;
    }
    if (!adminUserId.value) {
        toast.add({ severity: 'warn', summary: 'Elegí administrador inicial', life: 2500 });
        return;
    }
    saving.value = true;
    try {
        await service.create({
            name: form.name.trim(),
            kind: 'institution',
            billing: form.billing,
            admin_user_id: adminUserId.value,
        });
        form.name = '';
        adminQuery.value = '';
        adminUserId.value = '';
        showCreateForm.value = false;
        await load();
        toast.add({ severity: 'success', summary: 'Institución creada', life: 2500 });
    } catch (error: any) {
        fail(error.response?.data?.message || 'No se pudo crear la institución');
    } finally {
        saving.value = false;
    }
}

function practiqUserId(user: AuthApiUser) {
    return user.username || user.id;
}

async function searchAdmins() {
    adminUserId.value = '';
    const query = adminQuery.value.trim().toLowerCase();
    if (query.length < 2) {
        adminMatches.value = [];
        return;
    }
    try {
        const { data } = await authAdmin.listUsers({ limit: 100 });
        adminMatches.value = data
            .filter((user) =>
                [user.username, user.first_name, user.last_name, user.email]
                    .join(' ')
                    .toLowerCase()
                    .includes(query),
            )
            .slice(0, 8);
    } catch {
        adminMatches.value = [];
    }
}

function selectAdmin(user: AuthApiUser) {
    adminUserId.value = practiqUserId(user);
    adminQuery.value = user.email || `${user.first_name} ${user.last_name}`.trim();
    adminMatches.value = [];
}

function clearAdminMatchesSoon() {
    window.setTimeout(() => (adminMatches.value = []), 150);
}

function openCreateForm() {
    form.name = '';
    form.billing = 'direct';
    adminQuery.value = '';
    adminUserId.value = '';
    adminMatches.value = [];
    showCreateForm.value = true;
}

function closeCreateForm() {
    showCreateForm.value = false;
    adminMatches.value = [];
}

function openEdit(school: School) {
    editingSchool.value = school;
    editForm.name = school.name;
    editForm.billing = school.billing;
}

function cancelEdit() {
    editingSchool.value = null;
}

async function saveEdit() {
    const school = editingSchool.value;
    if (!school || saving.value || !editForm.name.trim()) return;
    saving.value = true;
    try {
        await service.update(school.id, {
            name: editForm.name.trim(),
            kind: 'institution',
            billing: editForm.billing,
        });
        cancelEdit();
        await loadSchools(true, true);
        await load();
        toast.add({ severity: 'success', summary: 'Institución actualizada', life: 2500 });
    } catch {
        fail('No se pudo actualizar la institución');
    } finally {
        saving.value = false;
    }
}

async function suspendSchool(school: School) {
    if (
        saving.value ||
        !window.confirm(
            `¿Suspender ${school.name}? Sus miembros perderán acceso hasta reactivarla.`,
        )
    )
        return;
    saving.value = true;
    try {
        await service.suspend(school.id);
        await loadSchools(true, true);
        await load();
        toast.add({ severity: 'success', summary: 'Institución suspendida', life: 2500 });
    } catch {
        fail('No se pudo suspender la institución');
    } finally {
        saving.value = false;
    }
}

async function openSchool(school: School) {
    await loadSchools(true, true);
    setActive(school.id);
    router.push('/teacher/admin/school-users');
}

function askToClose(school: School) {
    closeTarget.value = school;
    closeConfirmation.value = '';
    closeReason.value = '';
}

function cancelClose() {
    closeTarget.value = null;
    closeConfirmation.value = '';
    closeReason.value = '';
}

async function closeSchool() {
    const school = closeTarget.value;
    if (!school || saving.value) return;
    if (closeConfirmation.value.trim() !== school.name) {
        toast.add({
            severity: 'warn',
            summary: 'El nombre no coincide',
            detail: 'Escribí el nombre exacto de la escuela.',
            life: 3000,
        });
        return;
    }
    saving.value = true;
    try {
        await service.close(school.id, {
            confirm_name: closeConfirmation.value.trim(),
            reason: closeReason.value.trim() || undefined,
        });
        cancelClose();
        await loadSchools(true, true);
        await load();
        toast.add({
            severity: 'success',
            summary: 'Escuela cerrada',
            detail: 'Sus datos se conservaron y el acceso fue bloqueado.',
            life: 3500,
        });
    } catch {
        fail('No se pudo cerrar la escuela');
    } finally {
        saving.value = false;
    }
}

async function reopenSchool(school: School) {
    if (saving.value) return;
    saving.value = true;
    try {
        await service.reopen(school.id);
        await loadSchools(true, true);
        await load();
        toast.add({ severity: 'success', summary: 'Escuela reabierta', life: 2500 });
    } catch {
        fail('No se pudo reabrir la escuela');
    } finally {
        saving.value = false;
    }
}

async function openArchive(school: School) {
    loadingArchive.value = true;
    try {
        const { data } = await service.archive(school.id);
        archive.value = data;
    } catch {
        fail('No se pudo abrir el archivo de la escuela');
    } finally {
        loadingArchive.value = false;
    }
}

onMounted(load);
</script>

<template>
    <TeacherLayout>
        <div class="schools-shell anim-stagger">
            <header class="page-header">
                <div>
                    <p class="eyebrow">Administración de plataforma</p>
                    <h1>Escuelas e instituciones</h1>
                    <p class="page-sub">
                        Creá instituciones, elegí cuál administrar y revisá espacios personales.
                    </p>
                </div>
                <button class="btn-primary" type="button" @click="openCreateForm">
                    <i class="pi pi-plus"></i> Nueva institución
                </button>
            </header>

            <form v-if="showCreateForm" class="school-form" @submit.prevent="createSchool">
                <h2 class="form-title">Nueva institución</h2>
                <div class="form-grid">
                    <label class="field field--wide">
                        <span>Nombre</span>
                        <input
                            v-model="form.name"
                            type="text"
                            placeholder="Escuela San Martín"
                            autofocus
                        />
                    </label>
                    <label class="field field--wide admin-picker">
                        <span>Administrador inicial</span>
                        <input
                            v-model="adminQuery"
                            type="search"
                            placeholder="Nombre o email"
                            autocomplete="off"
                            @input="searchAdmins"
                            @blur="clearAdminMatchesSoon"
                        />
                        <ul v-if="adminMatches.length" class="user-matches">
                            <li v-for="user in adminMatches" :key="user.id">
                                <button type="button" @mousedown.prevent="selectAdmin(user)">
                                    <strong>{{ user.first_name }} {{ user.last_name }}</strong
                                    ><span>{{ user.email }}</span>
                                </button>
                            </li>
                        </ul>
                        <small v-if="adminUserId"
                            >Seleccionado. Debe haber iniciado sesión en Practiq.</small
                        >
                    </label>
                    <div class="field">
                        <span>Facturación</span>
                        <div class="billing-toggle" role="tablist">
                            <button
                                type="button"
                                :data-on="form.billing === 'direct'"
                                @click="form.billing = 'direct'"
                            >
                                Directa
                            </button>
                            <button
                                type="button"
                                :data-on="form.billing === 'subscription'"
                                @click="form.billing = 'subscription'"
                            >
                                Suscripción
                            </button>
                        </div>
                    </div>
                </div>
                <p class="form-note">
                    Con facturación directa no se consulta ningún plan y no hay tope de alumnos.
                </p>
                <div class="form-actions">
                    <button class="btn-quiet" type="button" @click="closeCreateForm">
                        Cancelar</button
                    ><button class="btn-primary" type="submit" :disabled="saving">
                        Crear institución
                    </button>
                </div>
            </form>

            <div class="tabs-row">
                <div role="tablist" class="tabs">
                    <button
                        v-for="(tab, i) in tabs"
                        :key="tab.label"
                        type="button"
                        role="tab"
                        :data-on="activeTab === i"
                        @click="selectTab(i)"
                    >
                        {{ tab.label }} <span class="tab-count">{{ tab.n }}</span>
                    </button>
                </div>
                <label class="search-field">
                    <i class="pi pi-search"></i>
                    <input v-model="searchQuery" type="search" placeholder="Buscar escuela" />
                </label>
            </div>
            <p class="tab-hint">{{ tabs[activeTab].hint }}</p>

            <div class="school-list-card" @click="closeMenu">
                <div v-if="loading" class="school-row"><Skeleton width="100%" height="18px" /></div>
                <p v-else-if="!filteredRows.length" class="empty">
                    {{
                        searchQuery
                            ? 'Ninguna escuela coincide con la búsqueda.'
                            : 'Todavía no hay ninguna.'
                    }}
                </p>
                <div v-for="school in filteredRows" :key="school.id" class="school-row" @click.stop>
                    <span class="school-avatar">{{ initialsOf(school.name) }}</span>
                    <div class="school-main">
                        <span class="school-name">{{ school.name }}</span>
                        <span
                            v-if="school.kind === 'personal' && school.owner"
                            class="school-owner"
                        >
                            {{ school.owner.name }}
                            <a :href="`mailto:${school.owner.email}`" class="school-email">
                                {{ school.owner.email }}
                            </a>
                        </span>
                        <span class="school-meta">
                            <span v-if="activeTab === 1" class="status-pill">Suspendida</span>
                            <span v-if="activeTab === 3" class="status-pill">Cerrada</span>
                            {{ rowMeta(school) }}
                        </span>
                    </div>
                    <div class="row-actions">
                        <button
                            class="btn-primary-outline"
                            type="button"
                            :disabled="saving || loadingArchive"
                            @click="primaryAction(school)"
                        >
                            {{ primaryLabel() }}
                        </button>
                        <button
                            class="btn-icon"
                            type="button"
                            aria-label="Más acciones"
                            @click="toggleMenu(school.id)"
                        >
                            <i class="pi pi-ellipsis-v"></i>
                        </button>
                        <div v-if="openMenuId === school.id" class="row-menu">
                            <button
                                v-for="action in menuActions(school)"
                                :key="action.label"
                                type="button"
                                :class="{ 'row-menu__item--danger': action.danger }"
                                @click="runMenuAction(action)"
                            >
                                {{ action.label }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if="closeTarget"
            class="close-backdrop"
            role="presentation"
            @click.self="cancelClose"
        >
            <form class="close-card" @submit.prevent="closeSchool">
                <p class="eyebrow">Acción administrativa</p>
                <h2>Cerrar {{ closeTarget.name }}</h2>
                <p>
                    Se bloquea el acceso de todos los miembros. Cursos, prácticas, notas y pagos se
                    conservan; podés reabrirla después.
                </p>
                <label class="field"
                    ><span>Escribí “{{ closeTarget.name }}” para confirmar</span
                    ><input v-model="closeConfirmation" type="text" autocomplete="off"
                /></label>
                <label class="field"
                    ><span>Motivo <em>(opcional)</em></span
                    ><textarea
                        v-model="closeReason"
                        rows="3"
                        placeholder="Ej. institución dada de baja"
                    />
                </label>
                <div class="form-actions">
                    <button class="btn-quiet" type="button" @click="cancelClose">Cancelar</button
                    ><button
                        class="btn-danger"
                        type="submit"
                        :disabled="saving || closeConfirmation.trim() !== closeTarget.name"
                    >
                        Cerrar escuela
                    </button>
                </div>
            </form>
        </div>

        <div
            v-if="editingSchool"
            class="close-backdrop"
            role="presentation"
            @click.self="cancelEdit"
        >
            <form class="close-card" @submit.prevent="saveEdit">
                <p class="eyebrow">Configuración institucional</p>
                <h2>Editar institución</h2>
                <label class="field"
                    ><span>Nombre</span><input v-model="editForm.name" type="text"
                /></label>
                <label class="field"
                    ><span>Facturación</span
                    ><select v-model="editForm.billing">
                        <option value="direct">Directa (por fuera)</option>
                        <option value="subscription">Por suscripción</option>
                    </select></label
                >
                <div class="form-actions">
                    <button class="btn-quiet" type="button" @click="cancelEdit">Cancelar</button
                    ><button
                        class="btn-primary"
                        type="submit"
                        :disabled="saving || !editForm.name.trim()"
                    >
                        Guardar
                    </button>
                </div>
            </form>
        </div>

        <div v-if="archive" class="close-backdrop" role="presentation" @click.self="archive = null">
            <section class="close-card archive-card">
                <p class="eyebrow">Archivo · solo lectura</p>
                <h2>{{ archive.school.name }}</h2>
                <p>
                    {{ archive.members.length }} miembros · {{ archive.courses.length }} cursos. No
                    se puede editar contenido desde este archivo.
                </p>
                <div class="archive-section">
                    <strong>Miembros</strong>
                    <ul>
                        <li v-for="member in archive.members" :key="member.user_id">
                            {{ member.name }} · {{ member.role }}
                        </li>
                    </ul>
                </div>
                <div class="archive-section">
                    <strong>Cursos</strong>
                    <ul>
                        <li v-for="course in archive.courses" :key="course.id">
                            {{ course.title }}
                            <span>{{ course.grade_name }} · {{ course.subject_name }}</span>
                        </li>
                        <li v-if="!archive.courses.length">No hay cursos registrados.</li>
                    </ul>
                </div>
                <button class="btn-quiet" type="button" @click="archive = null">
                    Cerrar archivo
                </button>
            </section>
        </div>
    </TeacherLayout>
</template>

<style scoped>
.schools-shell {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.25rem;
    max-width: 820px;
}

.page-header h1,
.section-title {
    margin: 0;
    color: var(--text-heading);
}

.page-header h1 {
    font-size: clamp(1.55rem, 2.5vw, 2rem);
}

.page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
}
.eyebrow {
    margin: 0 0 0.35rem;
    color: var(--practiq-violet);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.section-title {
    font-size: 1.05rem;
    margin-bottom: 0.5rem;
}

.page-sub,
.section-sub,
.empty {
    margin: 0.25rem 0 0.6rem;
    color: var(--text-secondary);
    font-size: 0.88rem;
}

.school-form {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding: 1.25rem;
    background: var(--surface-sunken);
    border: 1px solid var(--brand-200);
    border-radius: var(--radius-xl);
}

.billing-toggle {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-md);
    background: var(--surface);
    border: 1px solid var(--surface-border);
}
.billing-toggle button {
    flex: 1;
    min-height: 34px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
}
.billing-toggle button[data-on='true'] {
    background: var(--surface);
    color: var(--text-heading);
    box-shadow: var(--shadow-xs);
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
.field select,
.member-form input,
.member-form select {
    padding: 0.55rem 0.7rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--surface-border);
    background: var(--surface-card);
    color: var(--text-primary);
    font-size: 0.9rem;
}

.form-note {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-secondary);
}
.admin-picker {
    position: relative;
}
.admin-picker small {
    color: var(--text-secondary);
    font-size: 0.75rem;
}
.user-matches {
    position: absolute;
    z-index: 3;
    top: calc(100% - 0.2rem);
    right: 0;
    left: 0;
    overflow: hidden;
    margin: 0;
    padding: 0.25rem;
    list-style: none;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
}
.user-matches button {
    display: grid;
    width: 100%;
    gap: 0.1rem;
    padding: 0.55rem 0.65rem;
    border: 0;
    border-radius: 0.35rem;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
}
.user-matches button:hover {
    background: var(--surface-subtle);
}
.user-matches span {
    color: var(--text-secondary);
    font-size: 0.76rem;
}
.form-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
}

.school-list,
.member-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.school-row,
.member-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    padding: 0.75rem 1rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
}

.school-row--muted {
    opacity: 0.75;
}

.school-row--closed {
    opacity: 0.78;
}
.row-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex: 0 0 auto;
    margin-left: auto;
    position: relative;
}

.tabs-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}
.tabs {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-md);
    background: var(--surface-sunken);
    overflow-x: auto;
    max-width: 100%;
}
.tabs button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex: 0 0 auto;
    min-height: 34px;
    padding: 0 0.75rem;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
}
.tabs button[data-on='true'] {
    background: var(--surface);
    color: var(--text-heading);
    box-shadow: var(--shadow-xs);
}
.tab-count {
    font-weight: 700;
    opacity: 0.75;
}
.search-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 40px;
    padding: 0 0.75rem;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    background: var(--surface);
    flex: 0 1 260px;
    color: var(--text-muted);
}
.search-field input {
    width: 100%;
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 0.85rem;
    color: var(--text-primary);
}
.tab-hint {
    margin: -0.3rem 0 0;
    font-size: 0.8rem;
    color: var(--text-secondary);
}
.school-list-card {
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
}
.school-list-card .empty {
    padding: 1rem;
}
.school-list-card .school-row {
    border: 0;
    border-top: 1px solid var(--line);
    border-radius: 0;
}
.school-list-card .school-row:first-child {
    border-top: 0;
}
.school-avatar {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    border-radius: var(--radius-sm);
    background: var(--deep-800);
    color: var(--on-brand);
    font-size: 0.78rem;
    font-weight: 800;
}
.btn-primary-outline {
    min-height: 36px;
    padding: 0 0.75rem;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--brand-700);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
}
.btn-primary-outline:hover {
    background: var(--surface-sunken);
}
.btn-primary-outline:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
.btn-icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
}
.btn-icon:hover {
    background: var(--surface-sunken);
}
.row-menu {
    position: absolute;
    right: 0;
    top: calc(100% - 4px);
    width: min(200px, 100%);
    padding: 6px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    z-index: 10;
}
.row-menu button {
    display: block;
    width: 100%;
    min-height: 40px;
    padding: 0 10px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: 0.85rem;
    text-align: left;
    cursor: pointer;
}
.row-menu button:hover {
    background: var(--canvas);
}
.row-menu__item--danger {
    color: var(--danger);
}
.status-pill {
    display: inline-block;
    margin-right: 0.3rem;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    background: var(--surface-subtle, #f1f5f9);
    color: var(--text-secondary);
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
}

.school-main,
.member-main {
    display: flex;
    flex: 1 1 200px;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}

.school-owner {
    margin-top: 0.15rem;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.school-email {
    color: var(--practiq-violet);
    text-decoration: none;
    overflow-wrap: anywhere;
}

.plan-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.5rem;
    border-radius: var(--radius-pill);
    background: var(--surface-sunken);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-secondary);
}

.plan-pill--paid {
    background: var(--color-success-bg);
    color: var(--color-success-dark);
}

.school-name,
.member-id {
    font-weight: 600;
    color: var(--text-primary);
    overflow-wrap: anywhere;
}

.school-meta,
.member-role {
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.btn-primary,
.btn-quiet,
.btn-danger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.55rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    flex: 0 0 auto;
}

.btn-primary {
    background: var(--practiq-violet);
    color: var(--on-brand);
    align-self: flex-start;
}

.btn-quiet {
    background: transparent;
    color: var(--text-secondary);
}

.btn-quiet--danger {
    color: var(--color-error-dark, #b91c1c);
}

.btn-danger {
    background: var(--color-error, #dc2626);
    color: var(--on-brand);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.members-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: grid;
    place-items: center;
    padding: 1rem;
    z-index: 1000;
    overflow-y: auto;
}

.members-card {
    width: min(520px, 100%);
    background: var(--surface-card);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.close-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 1rem;
    overflow-y: auto;
    background: rgba(15, 23, 42, 0.55);
}
.close-card {
    width: min(480px, 100%);
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 1.5rem;
    border-radius: var(--radius-xl);
    background: var(--surface-card);
    box-shadow: var(--shadow-panel);
}
.close-card h2,
.close-card p {
    margin: 0;
    color: var(--text-heading);
}
.close-card p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.5;
}
.close-card textarea {
    resize: vertical;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    background: var(--surface-card);
    color: var(--text-primary);
    font: inherit;
}
.archive-card {
    max-height: min(720px, 90vh);
    overflow: auto;
}
.archive-section {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: var(--text-primary);
}
.archive-section ul {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--text-secondary);
    font-size: 0.88rem;
}
.archive-section li {
    margin: 0.25rem 0;
}
.archive-section span {
    color: var(--text-muted);
}

.members-title {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-heading);
}

.member-form {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.5rem;
}

@media (max-width: 640px) {
    .schools-shell {
        padding: 0.9rem;
    }

    .page-header {
        flex-direction: column;
    }

    .member-form {
        grid-template-columns: 1fr;
    }

    .page-header > .btn-primary {
        min-height: 44px;
        width: 100%;
    }

    .school-row {
        padding: 0.9rem;
    }
    .school-main {
        width: 100%;
    }
    .row-actions {
        width: 100%;
        margin-left: 0;
    }
    .row-actions .btn-primary-outline {
        flex: 1;
        min-height: 40px;
    }
    .tabs-row {
        flex-direction: column;
        align-items: stretch;
    }
    .search-field {
        flex: 1 1 auto;
    }
    .close-backdrop {
        align-items: end;
        padding: 0;
    }
    .close-card {
        width: 100%;
        max-height: 92dvh;
        overflow-y: auto;
        padding: 1.25rem 1rem max(1.25rem, env(safe-area-inset-bottom));
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    }
    .school-form .form-actions {
        flex-direction: column-reverse;
        align-items: stretch;
    }
    .school-form .form-actions button {
        min-height: 44px;
        width: 100%;
    }
}
</style>
