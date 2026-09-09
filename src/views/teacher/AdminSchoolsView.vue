<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from "vue";
  import { useRouter } from "vue-router";
  import { useToast } from "primevue/usetoast";
  import { practiqApi } from "@/api/request/server";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import { useSchools } from "@/composables/useSchools";
  import {
    SchoolService,
    type School,
  } from "@/services/schools/schoolService";

  const toast = useToast();
  const router = useRouter();
  const { loadSchools, setActive } = useSchools();
  const service = new SchoolService(practiqApi);

  const schools = ref<School[]>([]);
  const loading = ref(true);
  const saving = ref(false);
  const showCreateForm = ref(false);

  const form = reactive({ name: "", billing: "direct" as School["billing"] });

  const institutions = computed(() => schools.value.filter((s) => s.kind === "institution"));
  const personals = computed(() => schools.value.filter((s) => s.kind === "personal"));

  function fail(detail: string) {
    toast.add({ severity: "error", summary: "Error", detail, life: 3000 });
  }

  async function load() {
    try {
      const { data } = await service.list();
      schools.value = data;
    } catch {
      fail("No se pudieron cargar las escuelas");
    } finally {
      loading.value = false;
    }
  }

  async function createSchool() {
    if (saving.value) return;
    if (!form.name.trim()) {
      toast.add({ severity: "warn", summary: "Poné un nombre", life: 2500 });
      return;
    }
    saving.value = true;
    try {
      await service.create({
        name: form.name.trim(),
        kind: "institution",
        billing: form.billing,
      });
      form.name = "";
      showCreateForm.value = false;
      await load();
      toast.add({ severity: "success", summary: "Institución creada", life: 2500 });
    } catch {
      fail("No se pudo crear la institución");
    } finally {
      saving.value = false;
    }
  }

  async function openSchool(school: School) {
    await loadSchools(true, true);
    setActive(school.id);
    router.push("/teacher/admin/school-users");
  }

  onMounted(load);
</script>

<template>
  <TeacherLayout>
    <div class="schools-shell">
      <header class="page-header">
        <div>
          <p class="eyebrow">Administración de plataforma</p>
          <h1>Escuelas e instituciones</h1>
          <p class="page-sub">Creá instituciones, elegí cuál administrar y revisá espacios personales.</p>
        </div>
        <button class="btn-primary" type="button" @click="showCreateForm = !showCreateForm">
          <i class="pi pi-plus"></i> Nueva institución
        </button>
      </header>

      <form v-if="showCreateForm" class="school-form" @submit.prevent="createSchool">
        <h2 class="form-title">Nueva institución</h2>
        <div class="form-grid">
          <label class="field field--wide">
            <span>Nombre</span>
            <input v-model="form.name" type="text" placeholder="Escuela San Martín" />
          </label>
          <label class="field">
            <span>Facturación</span>
            <select v-model="form.billing">
              <option value="direct">Directa (por fuera)</option>
              <option value="subscription">Por suscripción</option>
            </select>
          </label>
        </div>
        <p class="form-note">
          Con facturación directa no se consulta ningún plan y no hay tope de
          alumnos.
        </p>
        <div class="form-actions"><button class="btn-quiet" type="button" @click="showCreateForm = false">Cancelar</button><button class="btn-primary" type="submit" :disabled="saving">Crear institución</button></div>
      </form>

      <section>
        <h2 class="section-title">Instituciones</h2>
        <div v-if="loading" class="school-row"><Skeleton width="100%" height="18px" /></div>
        <p v-else-if="!institutions.length" class="empty">
          Todavía no hay ninguna.
        </p>
        <ul v-else class="school-list">
          <li v-for="school in institutions" :key="school.id" class="school-row">
            <div class="school-main">
              <span class="school-name">{{ school.name }}</span>
              <span class="school-meta">
                {{ school.billing === "direct" ? "Facturación directa" : "Por suscripción" }}
              </span>
            </div>
            <button class="btn-quiet" type="button" @click="openSchool(school)">
              Administrar
            </button>
          </li>
        </ul>
      </section>

      <section>
        <h2 class="section-title">Escuelas personales</h2>
        <p class="section-sub">
          Una por docente. No se crean ni se borran desde acá.
        </p>
        <ul v-if="personals.length" class="school-list">
          <li v-for="school in personals" :key="school.id" class="school-row school-row--muted">
            <div class="school-main">
              <span class="school-name">{{ school.name }}</span>
            </div>
            <button class="btn-quiet" type="button" @click="openSchool(school)">
              Administrar
            </button>
          </li>
        </ul>
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
    font-size: 1.5rem;
  }

  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .eyebrow { margin: 0 0 .35rem; color: var(--practiq-violet); font-size: .72rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }

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
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
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
  .form-actions { display: flex; align-items: center; justify-content: flex-end; gap: .5rem; }

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
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
  }

  /* Personal schools are listed but not managed here: seeing them explains
     where every teacher's catalogue lives. */
  .school-row--muted {
    opacity: 0.75;
  }

  .school-main,
  .member-main {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
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
  .btn-quiet {
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
    color: #fff;
    align-self: flex-start;
  }

  .btn-quiet {
    background: transparent;
    color: var(--text-secondary);
  }

  .btn-quiet--danger {
    color: var(--color-error-dark, #b91c1c);
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

    .school-row,
    .member-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .page-header { flex-direction: column; }

    .member-form {
      grid-template-columns: 1fr;
    }

    .btn-primary,
    .btn-quiet {
      min-height: 44px;
      width: 100%;
    }
  }
</style>
