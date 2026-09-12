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
    type SchoolArchive,
  } from "@/services/schools/schoolService";

  const toast = useToast();
  const router = useRouter();
  const { loadSchools, setActive } = useSchools();
  const service = new SchoolService(practiqApi);

  const schools = ref<School[]>([]);
  const loading = ref(true);
  const saving = ref(false);
  const showCreateForm = ref(false);
  const closeTarget = ref<School | null>(null);
  const closeConfirmation = ref("");
  const closeReason = ref("");
  const archive = ref<SchoolArchive | null>(null);
  const loadingArchive = ref(false);

  const form = reactive({ name: "", billing: "direct" as School["billing"] });

  const activeSchools = computed(() => schools.value.filter((s) => s.status === "active"));
  const institutions = computed(() => activeSchools.value.filter((s) => s.kind === "institution"));
  const personals = computed(() => activeSchools.value.filter((s) => s.kind === "personal"));
  const closedSchools = computed(() => schools.value.filter((s) => s.status === "closed"));

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

  function askToClose(school: School) {
    closeTarget.value = school;
    closeConfirmation.value = "";
    closeReason.value = "";
  }

  function cancelClose() {
    closeTarget.value = null;
    closeConfirmation.value = "";
    closeReason.value = "";
  }

  async function closeSchool() {
    const school = closeTarget.value;
    if (!school || saving.value) return;
    if (closeConfirmation.value.trim() !== school.name) {
      toast.add({ severity: "warn", summary: "El nombre no coincide", detail: "Escribí el nombre exacto de la escuela.", life: 3000 });
      return;
    }
    saving.value = true;
    try {
      await service.close(school.id, { confirm_name: closeConfirmation.value.trim(), reason: closeReason.value.trim() || undefined });
      cancelClose();
      await loadSchools(true, true);
      await load();
      toast.add({ severity: "success", summary: "Escuela cerrada", detail: "Sus datos se conservaron y el acceso fue bloqueado.", life: 3500 });
    } catch {
      fail("No se pudo cerrar la escuela");
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
      toast.add({ severity: "success", summary: "Escuela reabierta", life: 2500 });
    } catch {
      fail("No se pudo reabrir la escuela");
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
      fail("No se pudo abrir el archivo de la escuela");
    } finally {
      loadingArchive.value = false;
    }
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
            <div class="row-actions">
              <button class="btn-quiet" type="button" @click="openSchool(school)">Administrar</button>
              <button class="btn-quiet btn-quiet--danger" type="button" @click="askToClose(school)">Cerrar</button>
            </div>
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
            <div class="row-actions">
              <button class="btn-quiet" type="button" @click="openSchool(school)">Administrar</button>
              <button class="btn-quiet btn-quiet--danger" type="button" @click="askToClose(school)">Cerrar</button>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="closedSchools.length">
        <h2 class="section-title">Escuelas cerradas</h2>
        <p class="section-sub">Sin acceso para miembros. Conservan historial y solo se pueden reabrir.</p>
        <ul class="school-list">
          <li v-for="school in closedSchools" :key="school.id" class="school-row school-row--closed">
            <div class="school-main">
              <span class="school-name">{{ school.name }}</span>
              <span class="school-meta"><span class="status-pill">Cerrada</span> {{ school.kind === "institution" ? "Institución" : "Escuela personal" }}</span>
            </div>
            <div class="row-actions">
              <button class="btn-quiet" type="button" :disabled="loadingArchive" @click="openArchive(school)">Ver archivo</button>
              <button class="btn-quiet" type="button" :disabled="saving" @click="reopenSchool(school)">Reabrir</button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <div v-if="closeTarget" class="close-backdrop" role="presentation" @click.self="cancelClose">
      <form class="close-card" @submit.prevent="closeSchool">
        <p class="eyebrow">Acción administrativa</p>
        <h2>Cerrar {{ closeTarget.name }}</h2>
        <p>Se bloquea el acceso de todos los miembros. Cursos, prácticas, notas y pagos se conservan; podés reabrirla después.</p>
        <label class="field"><span>Escribí “{{ closeTarget.name }}” para confirmar</span><input v-model="closeConfirmation" type="text" autocomplete="off" /></label>
        <label class="field"><span>Motivo <em>(opcional)</em></span><textarea v-model="closeReason" rows="3" placeholder="Ej. institución dada de baja" /></label>
        <div class="form-actions"><button class="btn-quiet" type="button" @click="cancelClose">Cancelar</button><button class="btn-danger" type="submit" :disabled="saving || closeConfirmation.trim() !== closeTarget.name">Cerrar escuela</button></div>
      </form>
    </div>

    <div v-if="archive" class="close-backdrop" role="presentation" @click.self="archive = null">
      <section class="close-card archive-card">
        <p class="eyebrow">Archivo · solo lectura</p>
        <h2>{{ archive.school.name }}</h2>
        <p>{{ archive.members.length }} miembros · {{ archive.courses.length }} cursos. No se puede editar contenido desde este archivo.</p>
        <div class="archive-section"><strong>Miembros</strong><ul><li v-for="member in archive.members" :key="member.user_id">{{ member.name }} · {{ member.role }}</li></ul></div>
        <div class="archive-section"><strong>Cursos</strong><ul><li v-for="course in archive.courses" :key="course.id">{{ course.title }} <span>{{ course.grade_name }} · {{ course.subject_name }}</span></li><li v-if="!archive.courses.length">No hay cursos registrados.</li></ul></div>
        <button class="btn-quiet" type="button" @click="archive = null">Cerrar archivo</button>
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

  .school-row--closed { opacity: .78; }
  .row-actions { display: flex; align-items: center; gap: .25rem; flex: 0 0 auto; }
  .status-pill { display: inline-block; margin-right: .3rem; padding: .1rem .4rem; border-radius: 999px; background: var(--surface-subtle, #f1f5f9); color: var(--text-secondary); font-size: .7rem; font-weight: 800; text-transform: uppercase; }

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

  .btn-danger { background: var(--color-error, #dc2626); color: #fff; }

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

  .close-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 1rem; overflow-y: auto; background: rgba(15, 23, 42, .55); }
  .close-card { width: min(480px, 100%); display: flex; flex-direction: column; gap: .9rem; padding: 1.5rem; border-radius: var(--radius-xl); background: var(--surface-card); box-shadow: var(--shadow-panel); }
  .close-card h2, .close-card p { margin: 0; color: var(--text-heading); }
  .close-card p { color: var(--text-secondary); font-size: .9rem; line-height: 1.5; }
  .close-card textarea { resize: vertical; padding: .55rem .7rem; border: 1px solid var(--surface-border); border-radius: var(--radius-md); background: var(--surface-card); color: var(--text-primary); font: inherit; }
  .archive-card { max-height: min(720px, 90vh); overflow: auto; }
  .archive-section { display: flex; flex-direction: column; gap: .35rem; color: var(--text-primary); }
  .archive-section ul { margin: 0; padding-left: 1.1rem; color: var(--text-secondary); font-size: .88rem; }
  .archive-section li { margin: .25rem 0; }
  .archive-section span { color: var(--text-muted); }

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
    .btn-quiet,
    .btn-danger {
      min-height: 44px;
      width: 100%;
    }

    .row-actions { width: 100%; flex-direction: column; align-items: stretch; }
  }
</style>
