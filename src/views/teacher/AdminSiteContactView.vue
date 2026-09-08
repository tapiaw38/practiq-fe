<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useToast } from "primevue/usetoast";
import TeacherLayout from "@/layouts/TeacherLayout.vue";
import Skeleton from "@/components/ui/Skeleton.vue";
import { practiqApi } from "@/api/request/server";

const toast = useToast(); const loading = ref(true); const saving = ref(false);
const form = reactive({ email: "", phone: "", whatsapp: "" });
async function load(){ try { const { data } = await practiqApi.get("/site-contact"); Object.assign(form, data.data); } catch { toast.add({severity:"error",summary:"Error",detail:"No se pudo cargar contacto",life:3000}); } finally { loading.value=false; } }
async function save(){ if(saving.value)return; saving.value=true; try { await practiqApi.put("/site-contact",form); toast.add({severity:"success",summary:"Contacto guardado",life:2500}); } catch { toast.add({severity:"error",summary:"Error",detail:"No se pudo guardar",life:3000}); } finally { saving.value=false; } }
onMounted(load);
</script>
<template><TeacherLayout><main class="page"><header><p class="eyebrow">Landing pública</p><h1>Contacto institucional</h1><p>Estos datos aparecen en el plan para escuelas e institutos.</p></header><Skeleton v-if="loading" height="300px" /><form v-else @submit.prevent="save"><label>Email<input v-model.trim="form.email" type="email" required /></label><label>Teléfono<input v-model.trim="form.phone" type="tel" required /></label><label>WhatsApp URL<input v-model.trim="form.whatsapp" type="url" required placeholder="https://wa.me/549..." /></label><button :disabled="saving">{{ saving ? "Guardando…" : "Guardar contacto" }}</button></form></main></TeacherLayout></template>
<style scoped>.page{max-width:720px;margin:0 auto;padding:32px 24px}.eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--practiq-violet);text-transform:uppercase}h1{margin:6px 0;color:var(--text-heading)}header p:last-child{color:var(--text-secondary)}form{display:grid;gap:18px;margin-top:30px;padding:26px;border:1px solid var(--surface-border);border-radius:14px;background:var(--surface-card)}label{display:grid;gap:7px;font-weight:600}input{padding:12px;border:1px solid var(--surface-border);border-radius:8px;font:inherit}button{justify-self:start;padding:12px 18px;border:0;border-radius:8px;background:var(--practiq-violet);color:#fff;font-weight:700;cursor:pointer}button:disabled{opacity:.6}</style>
