<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useToast } from '@/composables/useToast';
import TeacherLayout from '@/layouts/TeacherLayout.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { usePlatformSettings } from '@/composables/usePlatformSettings';
import { useAuthAdmin } from '@/composables/useAuthAdmin';
import type { AuthApiUser } from '@/types';

const toast = useToast();
const { loadAssistant, saveAssistant } = usePlatformSettings();
const { loadUsers } = useAuthAdmin();

function practiqUserId(user: AuthApiUser) {
    return user.username || user.id;
}
const loading = ref(true);
const saving = ref(false);
const configured = ref(false);

const storedKey = ref('');
const updatedBy = ref('');
const form = reactive({ base_url: '', api_key: '' });

async function load() {
    loading.value = true;
    try {
        const [data, users] = await Promise.all([
            loadAssistant(),
            loadUsers({ limit: 1000, offset: 0 }).catch(() => []),
        ]);
        form.base_url = data.base_url || '';
        form.api_key = '';
        storedKey.value = data.api_key || '';
        configured.value = Boolean(data.configured);
        const author = users.find((u) => practiqUserId(u) === data.updated_by);
        updatedBy.value = author
            ? `${author.first_name} ${author.last_name}`.trim() || author.email
            : data.updated_by || '';
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la configuración',
            life: 3000,
        });
    } finally {
        loading.value = false;
    }
}

async function save() {
    if (saving.value) return;
    saving.value = true;
    try {
        await saveAssistant({
            base_url: form.base_url,
            api_key: form.api_key,
        });
        toast.add({ severity: 'success', summary: 'Configuración guardada', life: 2500 });
        await load();
    } catch (e: unknown) {
        const response = (e as { response?: { data?: { message?: string } } })?.response;
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: response?.data?.message || 'No se pudo guardar la configuración',
            life: 4000,
        });
    } finally {
        saving.value = false;
    }
}

onMounted(load);
</script>

<template>
    <TeacherLayout>
        <main class="page anim-stagger">
            <header class="page-header">
                <div>
                    <p class="eyebrow">Plataforma</p>
                    <h1>Asistente de IA</h1>
                    <p>
                        Una sola configuración para toda la plataforma. Las llamadas al asistente
                        salen del servidor de Practiq: ni docentes ni alumnos reciben la clave.
                    </p>
                </div>
            </header>

            <Skeleton v-if="loading" height="320px" />

            <form v-else class="settings-card" @submit.prevent="save">
                <p :class="['status', configured ? 'status--on' : 'status--off']">
                    {{ configured ? 'Asistente activo' : 'Asistente sin configurar' }}
                </p>

                <label>
                    URL de Gillie
                    <input
                        v-model.trim="form.base_url"
                        type="url"
                        required
                        placeholder="https://gillie.practiq.com.ar"
                    />
                </label>

                <label>
                    API key
                    <input
                        v-model.trim="form.api_key"
                        type="password"
                        autocomplete="off"
                        :placeholder="
                            storedKey
                                ? `Guardada (${storedKey}) — dejá vacío para conservarla`
                                : 'sk-…'
                        "
                    />
                </label>
                <p class="hint">
                    La clave se guarda cifrada y no vuelve a mostrarse. Dejá el campo vacío para
                    conservar la que ya está; escribí una nueva para rotarla.
                </p>

                <p v-if="updatedBy" class="hint">Última modificación: {{ updatedBy }}</p>

                <button :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
            </form>
        </main>
    </TeacherLayout>
</template>

<style scoped>
.page {
    max-width: 1120px;
    margin: 0;
}
.eyebrow {
    font: 900 11px/1.3 var(--font-ui);
    letter-spacing: 0.09em;
    color: var(--brand-700);
    text-transform: uppercase;
}
h1 {
    margin: 3px 0 0;
    color: var(--text-heading);
    font-size: clamp(1.55rem, 2.5vw, 2rem);
}
header p:last-child {
    max-width: 660px;
    margin: 0;
    color: var(--ink-muted);
    font: 400 13.5px/1.55 var(--font-body);
}
.settings-card {
    display: grid;
    max-width: 620px;
    gap: 14px;
    margin-top: 16px;
    padding: 20px;
    border: 1px solid var(--surface-border);
    border-radius: 14px;
    background: var(--surface-card);
}
label {
    display: grid;
    gap: 8px;
    color: var(--text-heading);
    font-size: var(--text-sm);
    font-weight: 800;
}
input {
    min-height: 48px;
    padding: 11px 13px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    background: var(--surface-ground);
    color: var(--text-primary);
    font: inherit;
}
input:focus {
    outline: none;
    border-color: var(--practiq-violet);
    box-shadow: 0 0 0 3px rgba(var(--practiq-violet-rgb), 0.12);
}
.status {
    justify-self: start;
    margin: 0 0 2px;
    padding: 0.4rem 0.75rem;
    border-radius: var(--radius-pill);
    font-size: var(--text-xs);
    font-weight: 800;
}
.status--on {
    color: var(--color-success-dark);
    background: var(--color-success-bg);
}
.status--off {
    color: var(--color-warning-dark);
    background: var(--color-warning-bg);
}
.hint {
    margin: -8px 0 0;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    line-height: 1.5;
}
button {
    min-height: 46px;
    justify-self: start;
    padding: 10px 20px;
    border: 0;
    border-radius: var(--radius-md);
    background: var(--brand-500);
    color: var(--on-brand);
    font: 900 13.5px/1.2 var(--font-ui);
    cursor: pointer;
}
button:disabled {
    opacity: 0.6;
}
@media (max-width: 600px) {
    .page {
        padding: 0;
    }
    h1 {
        font-size: 24px;
        line-height: 1.18;
    }
    header p:last-child {
        font-size: 14px;
    }
    .settings-card {
        gap: 16px;
        margin-top: 22px;
        padding: 18px 16px;
    }
    input {
        min-height: 48px;
        font-size: 16px;
    }
    .hint {
        margin-top: -5px;
        line-height: 1.45;
    }
    button {
        width: 100%;
        min-height: 44px;
        justify-self: stretch;
    }
}
</style>
