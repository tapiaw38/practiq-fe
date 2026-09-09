<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from "vue";
  import { useToast } from "primevue/usetoast";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import { useSchools } from "@/composables/useSchools";
  import type { SchoolMember, SchoolRole } from "@/services/schools/schoolService";

  const toast = useToast();
  const { active, activeId, loadSchools, service } = useSchools();
  const members = ref<SchoolMember[]>([]);
  const loading = ref(true);
  const saving = ref(false);
  const form = reactive({ userId: "", role: "student" as SchoolRole });

  const isInstitution = computed(() => active.value?.kind === "institution");
  const roleLabel: Record<SchoolRole, string> = {
    admin: "Administrador",
    teacher: "Docente",
    student: "Alumno",
  };

  async function loadMembers() {
    if (!active.value) {
      members.value = [];
      loading.value = false;
      return;
    }
    loading.value = true;
    try {
      const { data } = await service.members(active.value.id);
      members.value = data;
    } catch {
      toast.add({ severity: "error", summary: "Error", detail: "No se pudieron cargar los usuarios de esta escuela", life: 3000 });
    } finally {
      loading.value = false;
    }
  }

  async function addMember() {
    if (!active.value || !form.userId.trim() || saving.value) return;
    saving.value = true;
    try {
      await service.addMember(active.value.id, form.userId.trim(), form.role);
      form.userId = "";
      await loadMembers();
      toast.add({ severity: "success", summary: "Usuario agregado", life: 2500 });
    } catch {
      toast.add({ severity: "error", summary: "Error", detail: "No se pudo agregar el usuario", life: 3000 });
    } finally {
      saving.value = false;
    }
  }

  async function removeMember(member: SchoolMember) {
    if (!active.value) return;
    try {
      await service.removeMember(active.value.id, member.user_id);
      await loadMembers();
    } catch {
      toast.add({ severity: "error", summary: "Error", detail: "No se pudo quitar el usuario", life: 3000 });
    }
  }

  watch(activeId, loadMembers);
  onMounted(async () => {
    await loadSchools();
    await loadMembers();
  });
</script>

<template>
  <TeacherLayout>
    <main class="school-users">
      <header class="page-header">
        <p class="eyebrow">{{ active?.kind === "personal" ? "Mi escuela" : "Escuela activa" }}</p>
        <h1>{{ active?.name || "Elegí una escuela" }}</h1>
        <p>Administrá quiénes participan y qué rol cumplen dentro de este espacio.</p>
      </header>

      <section v-if="active" class="users-card">
        <div class="card-heading">
          <div>
            <h2>Usuarios</h2>
            <p>{{ members.length }} {{ members.length === 1 ? "usuario" : "usuarios" }} en esta escuela</p>
          </div>
          <span class="school-kind">{{ isInstitution ? "Institución" : "Escuela personal" }}</span>
        </div>

        <form class="member-form" @submit.prevent="addMember">
          <label>
            <span>Usuario</span>
            <input v-model="form.userId" placeholder="Nombre de usuario" autocomplete="off" />
          </label>
          <label>
            <span>Rol</span>
            <select v-model="form.role">
              <option v-if="isInstitution" value="admin">Administrador</option>
              <option v-if="isInstitution" value="teacher">Docente</option>
              <option value="student">Alumno</option>
            </select>
          </label>
          <button type="submit" :disabled="saving || !form.userId.trim()">
            <i class="pi pi-user-plus"></i> Agregar
          </button>
        </form>
        <p class="form-note">
          <template v-if="isInstitution">Podés sumar administradores, docentes y alumnos.</template>
          <template v-else>Tu escuela personal admite alumnos; los docentes gestionan su propio espacio.</template>
        </p>

        <div v-if="loading" class="loading-list"><Skeleton width="100%" height="50px" /><Skeleton width="100%" height="50px" /></div>
        <ul v-else-if="members.length" class="member-list">
          <li v-for="member in members" :key="member.user_id" class="member-row">
            <div class="member-avatar">{{ member.user_id[0]?.toUpperCase() || "U" }}</div>
            <div class="member-data">
              <strong>{{ member.user_id }}</strong>
              <span :class="['role-badge', `role-badge--${member.role}`]">{{ roleLabel[member.role] }}</span>
            </div>
            <span v-if="!member.active" class="inactive">Sin acceso</span>
            <button class="remove-button" type="button" @click="removeMember(member)">Quitar</button>
          </li>
        </ul>
        <div v-else class="empty-state"><i class="pi pi-users"></i><p>Todavía no hay usuarios en esta escuela.</p></div>
      </section>
    </main>
  </TeacherLayout>
</template>

<style scoped>
  .school-users { max-width: 900px; padding: 2rem; }
  .page-header { margin-bottom: 1.5rem; }
  .eyebrow { margin: 0 0 .45rem; color: var(--practiq-violet); font-size: .72rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
  h1,h2,p { margin-top: 0; }.page-header h1 { margin-bottom: .5rem; color: var(--text-heading); font-size: 1.8rem; }.page-header p:not(.eyebrow) { color: var(--text-secondary); }
  .users-card { padding: 1.4rem; border: 1px solid var(--surface-border); border-radius: var(--radius-xl); background: var(--surface-card); }
  .card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }.card-heading h2 { margin-bottom: .25rem; color: var(--text-heading); font-size: 1.1rem; }.card-heading p,.form-note { margin-bottom: 0; color: var(--text-secondary); font-size: .86rem; }
  .school-kind { padding: .35rem .65rem; border-radius: var(--radius-pill); color: var(--practiq-violet-dark); background: var(--fill-primary-soft); font-size: .75rem; font-weight: 700; white-space: nowrap; }
  .member-form { display: grid; grid-template-columns: minmax(0,1fr) 150px auto; gap: .7rem; align-items: end; margin-top: 1.4rem; }.member-form label { display: grid; gap: .3rem; color: var(--text-secondary); font-size: .77rem; font-weight: 700; }.member-form input,.member-form select { min-height: 42px; padding: .55rem .7rem; border: 1px solid var(--surface-border); border-radius: var(--radius-md); color: var(--text-primary); background: var(--surface-subtle); font: inherit; }.member-form button { min-height: 42px; padding: 0 1rem; border: 0; border-radius: var(--radius-md); color: #fff; background: var(--practiq-violet); font-weight: 700; cursor: pointer; }.member-form button:disabled { opacity: .55; cursor: not-allowed; }.form-note { margin-top: .7rem; }
  .member-list,.loading-list { display: grid; gap: .55rem; margin: 1.4rem 0 0; padding: 0; list-style: none; }.member-row { display: flex; align-items: center; gap: .75rem; padding: .75rem; border: 1px solid var(--surface-border); border-radius: var(--radius-lg); }.member-avatar { display: grid; flex: 0 0 36px; width: 36px; height: 36px; place-items: center; border-radius: var(--radius-md); color: var(--practiq-violet-dark); background: var(--fill-primary-soft); font-size: .82rem; font-weight: 800; }.member-data { display: grid; min-width: 0; gap: .25rem; }.member-data strong { overflow: hidden; color: var(--text-primary); font-size: .9rem; text-overflow: ellipsis; white-space: nowrap; }.role-badge { width: fit-content; padding: .15rem .45rem; border-radius: var(--radius-pill); background: var(--surface-subtle); color: var(--text-secondary); font-size: .7rem; font-weight: 700; }.role-badge--admin { color: #197563; background: #dff6ee; }.role-badge--teacher { color: var(--practiq-violet-dark); background: var(--fill-primary-soft); }.inactive { margin-left: auto; color: var(--color-error-dark, #b91c1c); font-size: .75rem; font-weight: 700; }.remove-button { margin-left: auto; padding: .4rem .65rem; border: 0; border-radius: var(--radius-md); color: var(--color-error-dark, #b91c1c); background: var(--color-error-bg, #fef2f2); cursor: pointer; font-weight: 700; }.empty-state { display: grid; min-height: 170px; margin-top: 1.4rem; place-items: center; align-content: center; gap: .6rem; border: 1px dashed var(--surface-border); border-radius: var(--radius-lg); color: var(--text-secondary); }.empty-state i { color: var(--practiq-violet); font-size: 1.5rem; }.empty-state p { margin: 0; }
  @media (max-width: 640px) { .school-users { padding: 1rem; }.card-heading,.member-row { align-items: flex-start; flex-direction: column; }.member-form { grid-template-columns: 1fr; }.member-form button { width: 100%; }.inactive,.remove-button { margin-left: 0; }.remove-button { width: 100%; min-height: 40px; }.school-kind { white-space: normal; } }
</style>
