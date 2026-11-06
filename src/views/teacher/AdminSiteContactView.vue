<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useToast } from '@/composables/useToast';
import TeacherLayout from '@/layouts/TeacherLayout.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { usePlatformSettings } from '@/composables/usePlatformSettings';

const toast = useToast();
const { loadContact, saveContact } = usePlatformSettings();
const loading = ref(true);
const saving = ref(false);
const form = reactive({ email: '', phone: '', whatsapp: '' });
async function load() {
    try {
        Object.assign(form, await loadContact());
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar contacto',
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
        await saveContact({ ...form });
        toast.add({ severity: 'success', summary: 'Contacto guardado', life: 2500 });
    } catch {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar',
            life: 3000,
        });
    } finally {
        saving.value = false;
    }
}
onMounted(load);
</script>
<template>
    <TeacherLayout
        ><main class="page anim-stagger">
            <header class="page-header">
                <div>
                    <p class="eyebrow">Plataforma</p>
                    <h1>Contacto institucional</h1>
                    <p>Configurá los datos de contacto de toda la plataforma.</p>
                </div>
            </header>
            <Skeleton v-if="loading" height="300px" />
            <form v-else class="settings-card" @submit.prevent="save">
                <h2>Datos de contacto</h2>
                <p>Lo que ve una escuela en la landing cuando quiere hablar con ventas.</p>
                <div class="contact-pair">
                    <label>Email<input v-model.trim="form.email" type="email" required /></label>
                    <label>Teléfono<input v-model.trim="form.phone" type="tel" required /></label>
                </div>
                <label
                    >WhatsApp URL<input
                        v-model.trim="form.whatsapp"
                        type="url"
                        required
                        placeholder="https://wa.me/549..." /></label
                ><button :disabled="saving">
                    {{ saving ? 'Guardando…' : 'Guardar contacto' }}
                </button>
            </form>
        </main></TeacherLayout
    >
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
    margin: 7px 0 0;
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
.settings-card h2 {
    margin: 0;
    color: var(--text-heading);
    font: 900 17px/1.2 var(--font-ui);
}
.settings-card > p {
    margin: -8px 0 0;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.55;
}
.contact-pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
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
    .contact-pair {
        grid-template-columns: 1fr;
    }
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
    button {
        width: 100%;
        min-height: 48px;
        justify-self: stretch;
    }
}
</style>
