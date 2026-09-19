<script setup lang="ts">
  import { onMounted, reactive, ref } from "vue";
  import { useToast } from "primevue/usetoast";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import { practiqApi } from "@/api/request/server";

  const toast = useToast();
  const loading = ref(true);
  const saving = ref(false);
  const configured = ref(false);
  // The stored key never comes back from the API: this holds its last four
  // characters, which is all anyone needs to tell one key from another.
  const storedKey = ref("");
  const updatedBy = ref("");
  const form = reactive({ base_url: "", api_key: "" });

  async function load() {
    loading.value = true;
    try {
      const { data } = await practiqApi.get("/gillie-settings");
      form.base_url = data.data.base_url || "";
      form.api_key = "";
      storedKey.value = data.data.api_key || "";
      configured.value = Boolean(data.data.configured);
      updatedBy.value = data.data.updated_by || "";
    } catch {
      toast.add({ severity: "error", summary: "Error", detail: "No se pudo cargar la configuración", life: 3000 });
    } finally {
      loading.value = false;
    }
  }

  async function save() {
    if (saving.value) return;
    saving.value = true;
    try {
      // A blank key keeps the stored one, so editing the URL alone never asks
      // for the secret again and never blanks it by omission.
      await practiqApi.put("/gillie-settings", {
        base_url: form.base_url,
        api_key: form.api_key,
      });
      toast.add({ severity: "success", summary: "Configuración guardada", life: 2500 });
      await load();
    } catch (e: unknown) {
      const response = (e as { response?: { data?: { message?: string } } })?.response;
      toast.add({
        severity: "error",
        summary: "Error",
        detail: response?.data?.message || "No se pudo guardar la configuración",
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
    <main class="page">
      <header>
        <p class="eyebrow">Plataforma</p>
        <h1>Asistente de IA</h1>
        <p>
          Una sola configuración para toda la plataforma. Las llamadas al
          asistente salen del servidor de Practiq: ni docentes ni alumnos
          reciben la clave.
        </p>
      </header>

      <Skeleton v-if="loading" height="320px" />

      <form v-else class="settings-card" @submit.prevent="save">
        <p :class="['status', configured ? 'status--on' : 'status--off']">
          {{ configured ? "Asistente activo" : "Asistente sin configurar" }}
        </p>

        <label>
          URL de Gillie
          <input v-model.trim="form.base_url" type="url" required placeholder="https://gillie.practiq.com.ar" />
        </label>

        <label>
          API key
          <input
            v-model.trim="form.api_key"
            type="password"
            autocomplete="off"
            :placeholder="storedKey ? `Guardada (${storedKey}) — dejá vacío para conservarla` : 'sk-…'"
          />
        </label>
        <p class="hint">
          La clave se guarda cifrada y no vuelve a mostrarse. Dejá el campo
          vacío para conservar la que ya está; escribí una nueva para rotarla.
        </p>

        <p v-if="updatedBy" class="hint">Última modificación: {{ updatedBy }}</p>

        <button :disabled="saving">{{ saving ? "Guardando…" : "Guardar" }}</button>
      </form>
    </main>
  </TeacherLayout>
</template>

<style scoped>
  .page { max-width: 760px; margin: 0 auto; padding: 32px 24px 48px; }
  .eyebrow { font-size: var(--font-kicker); font-weight: 800; letter-spacing: .09em; color: var(--practiq-violet); text-transform: uppercase; }
  h1 { margin: 6px 0 8px; color: var(--text-heading); }
  header p:last-child { max-width: 660px; margin: 0; color: var(--text-secondary); line-height: 1.55; }
  .settings-card { display: grid; gap: 18px; margin-top: 28px; padding: 24px; border: 1px solid var(--surface-border); border-top: 3px solid var(--practiq-violet); border-radius: var(--radius-xl); background: var(--surface-card); box-shadow: var(--shadow-card); }
  label { display: grid; gap: 8px; color: var(--text-heading); font-size: var(--text-sm); font-weight: 800; }
  input { min-height: 48px; padding: 11px 13px; border: 1px solid var(--surface-border); border-radius: var(--radius-md); background: var(--surface-ground); color: var(--text-primary); font: inherit; }
  input:focus { outline: none; border-color: var(--practiq-violet); box-shadow: 0 0 0 3px rgba(var(--practiq-violet-rgb), .12); }
  .status { justify-self: start; margin: 0 0 2px; padding: .4rem .75rem; border-radius: var(--radius-pill); font-size: var(--text-xs); font-weight: 800; }
  .status--on { color: var(--color-success-dark); background: var(--color-success-bg); }
  .status--off { color: var(--color-warning-dark); background: var(--color-warning-bg); }
  .hint { margin: -8px 0 0; color: var(--text-secondary); font-size: var(--text-xs); line-height: 1.5; }
  button { min-height: 46px; justify-self: start; padding: 10px 20px; border: 0; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--practiq-violet), var(--color-info)); box-shadow: var(--shadow-violet); color: #fff; font-weight: 800; cursor: pointer; }
  button:disabled { opacity: .6; }
  @media (max-width: 600px) {
    .page { padding: 20px 16px 36px; }
    h1 { font-size: 24px; line-height: 1.18; }
    header p:last-child { font-size: 14px; }
    .settings-card { gap: 16px; margin-top: 22px; padding: 18px 16px; }
    input { min-height: 48px; font-size: 16px; }
    .hint { margin-top: -5px; line-height: 1.45; }
    button { width: 100%; min-height: 44px; justify-self: stretch; }
  }
</style>
