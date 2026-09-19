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

      <form v-else @submit.prevent="save">
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
  .page { max-width: 720px; margin: 0 auto; padding: 32px 24px; }
  .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .1em; color: var(--practiq-violet); text-transform: uppercase; }
  h1 { margin: 6px 0; color: var(--text-heading); }
  header p:last-child { color: var(--text-secondary); }
  form { display: grid; gap: 18px; margin-top: 30px; padding: 26px; border: 1px solid var(--surface-border); border-radius: 14px; background: var(--surface-card); }
  label { display: grid; gap: 7px; font-weight: 600; }
  input { padding: 12px; border: 1px solid var(--surface-border); border-radius: 8px; font: inherit; }
  .status { justify-self: start; margin: 0; padding: .3rem .7rem; border-radius: 999px; font-size: .78rem; font-weight: 700; }
  .status--on { color: var(--color-success-dark); background: var(--color-success-bg); }
  .status--off { color: var(--color-warning-dark); background: var(--color-warning-bg); }
  .hint { margin: -8px 0 0; color: var(--text-secondary); font-size: .82rem; }
  button { justify-self: start; padding: 12px 18px; border: 0; border-radius: 8px; background: var(--practiq-violet); color: #fff; font-weight: 700; cursor: pointer; }
  button:disabled { opacity: .6; }
  @media (max-width: 600px) {
    .page { padding: 20px 16px 32px; }
    h1 { font-size: 1.65rem; line-height: 1.14; }
    header p:last-child { margin-bottom: 0; font-size: .92rem; line-height: 1.5; }
    form { gap: 16px; margin-top: 22px; padding: 18px 16px; border-radius: 12px; }
    input { min-height: 44px; font-size: 16px; }
    .hint { margin-top: -5px; line-height: 1.45; }
    button { width: 100%; min-height: 44px; justify-self: stretch; }
  }
</style>
