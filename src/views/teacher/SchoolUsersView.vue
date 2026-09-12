<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from "vue";
  import { useToast } from "primevue/usetoast";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import { useSchools } from "@/composables/useSchools";
  import { useAssignment } from "@/composables/useAssignment";
  import { useGrade } from "@/composables/useGrade";
  import { useProfile } from "@/composables/useProfile";
  import type { SchoolMember, SchoolRole } from "@/services/schools/schoolService";
  import { authApi } from "@/api/request/server";
  import { AuthAdminService } from "@/services/auth/authAdminService";
  import { useAuthStore } from "@/stores/authStore";
  import type { AssignedUser, AuthApiUser, Grade } from "@/types";

  const toast = useToast();
  const authStore = useAuthStore();
  const { active, activeId, loadSchools, service } = useSchools();
  const {
    loadStudentTeachers,
    assignTeacher: assignTeacherService,
    unassignTeacher: unassignTeacherService,
  } = useAssignment();
  const { loadGrades, loadUserGrades, addGradeMember, removeGradeMember } =
    useGrade();
  const { loadProfileById, updateAssistantConfigById } = useProfile();
  const members = ref<SchoolMember[]>([]);
  const loading = ref(true);
  const saving = ref(false);
  const grades = ref<Grade[]>([]);
  const assigningMember = ref<SchoolMember | null>(null);
  const assignedTeachers = ref<AssignedUser[]>([]);
  const assignedGrades = ref<Grade[]>([]);
  const assignLoading = ref(false);
  const teacherToAssign = ref("");
  const gradeToAssign = ref("");
  const assistantForm = reactive({
    assistant_base_url: "",
    assistant_api_key: "",
    ui_theme: "primary" as "primary" | "secondary",
  });
  const savingAssistant = ref(false);
  const assistantSaveSuccess = ref(false);
  // School memberships store Auth's stable user ID. A superadmin should never
  // need to know it, so their visible field is a lookup and this remains the
  // resolved value sent to Practiq API.
  const form = reactive({ userId: "", userQuery: "", role: "student" as SchoolRole });
  const matches = ref<AuthApiUser[]>([]);
  const authAdmin = new AuthAdminService(authApi);
  const isSuperAdmin = computed(() => authStore.authUser?.roles?.some((role) => role.name === "superadmin") ?? false);

  const isInstitution = computed(() => active.value?.kind === "institution");
  const roleLabel: Record<SchoolRole, string> = {
    admin: "Administrador",
    teacher: "Docente",
    student: "Alumno",
  };

  // Only members of this school, matching what the backend now allows a
  // school admin to touch (school.EnsureCanLinkTeacherStudent). Feeding it
  // anyone outside this list would 403 anyway.
  const schoolTeachers = computed(() =>
    members.value.filter((m) => m.role === "teacher" || m.role === "admin"),
  );

  async function openAssign(member: SchoolMember) {
    assigningMember.value = member;
    teacherToAssign.value = "";
    gradeToAssign.value = "";
    assistantSaveSuccess.value = false;
    assignLoading.value = true;
    try {
      if (!grades.value.length) grades.value = await loadGrades();
      const [teachers, memberGrades, profile] = await Promise.all([
        loadStudentTeachers(member.user_id),
        loadUserGrades(member.user_id),
        loadProfileById(member.user_id),
      ]);
      assignedTeachers.value = teachers || [];
      assignedGrades.value = memberGrades || [];
      assistantForm.assistant_base_url = profile?.assistant_base_url || "";
      assistantForm.assistant_api_key = profile?.assistant_api_key || "";
      assistantForm.ui_theme = profile?.ui_theme || "primary";
    } finally {
      assignLoading.value = false;
    }
  }

  function closeAssign() {
    assigningMember.value = null;
  }

  async function saveAssistantConfig() {
    if (!assigningMember.value || savingAssistant.value) return;
    savingAssistant.value = true;
    assistantSaveSuccess.value = false;
    try {
      await updateAssistantConfigById(assigningMember.value.user_id, { ...assistantForm });
      assistantSaveSuccess.value = true;
      window.setTimeout(() => (assistantSaveSuccess.value = false), 3000);
    } finally {
      savingAssistant.value = false;
    }
  }

  async function refreshAssignments() {
    if (!assigningMember.value) return;
    const userId = assigningMember.value.user_id;
    const [teachers, memberGrades] = await Promise.all([
      loadStudentTeachers(userId),
      loadUserGrades(userId),
    ]);
    assignedTeachers.value = teachers || [];
    assignedGrades.value = memberGrades || [];
  }

  async function assignTeacher() {
    if (!assigningMember.value || !teacherToAssign.value) return;
    await assignTeacherService(teacherToAssign.value, assigningMember.value.user_id);
    teacherToAssign.value = "";
    await refreshAssignments();
  }

  async function unassignTeacher(teacherId: string) {
    if (!assigningMember.value) return;
    await unassignTeacherService(teacherId, assigningMember.value.user_id);
    await refreshAssignments();
  }

  async function assignGrade() {
    if (!assigningMember.value || !gradeToAssign.value) return;
    await addGradeMember(gradeToAssign.value, assigningMember.value.user_id);
    gradeToAssign.value = "";
    await refreshAssignments();
  }

  async function unassignGrade(gradeId: string) {
    if (!assigningMember.value) return;
    await removeGradeMember(gradeId, assigningMember.value.user_id);
    await refreshAssignments();
  }

  async function searchUsers() {
    form.userId = "";
    const query = form.userQuery.trim().toLowerCase();
    if (!isSuperAdmin.value || query.length < 2) { matches.value = []; return; }
    try {
      const { data } = await authAdmin.listUsers({ limit: 100 });
      matches.value = data.filter((user) =>
        [user.id, user.first_name, user.last_name, user.email].join(" ").toLowerCase().includes(query),
      ).slice(0, 8);
    } catch { matches.value = []; }
  }

  /**
   * Practiq identifies a person by their username, not by Auth's uuid: that is
   * what `user_profiles.id` holds, and school membership points at it.
   *
   * Picking somebody from the search used to submit Auth's id, which belongs to
   * no profile here, so the insert failed on a foreign key the moment a
   * superadmin tried to add anyone.
   */
  function practiqUserId(user: AuthApiUser) {
    return user.username || user.id;
  }

  function selectUser(user: AuthApiUser) {
    form.userId = practiqUserId(user);
    form.userQuery = user.email || `${user.first_name} ${user.last_name}`.trim();
    matches.value = [];
  }
  function clearMatchesSoon() { window.setTimeout(() => { matches.value = []; }, 150); }

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
      form.userQuery = "";
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
    if (!window.confirm(`¿Quitar a ${member.name} de ${active.value.name}?`)) return;
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
        <p class="eyebrow">Escuelas / {{ active?.kind === "personal" ? "Mi escuela" : "Institución" }}</p>
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
            <span>{{ isSuperAdmin ? "Buscar usuario" : "Usuario" }}</span>
            <input v-if="isSuperAdmin" v-model="form.userQuery" type="search" placeholder="Email o nombre" autocomplete="off" @input="searchUsers" @blur="clearMatchesSoon" />
            <input v-else v-model="form.userId" placeholder="Username exacto" autocomplete="off" />
            <div v-if="matches.length" class="user-suggestions">
              <button v-for="user in matches" :key="user.id" type="button" @mousedown.prevent="selectUser(user)">
                <strong>{{ user.first_name }} {{ user.last_name }}</strong><span>{{ user.email }}</span>
              </button>
            </div>
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
          <template v-if="isSuperAdmin">Buscá por email o nombre y elegí la persona sugerida. Podés sumar administradores, docentes y alumnos.</template>
          <template v-else-if="isInstitution">Ingresá el username exacto. Podés sumar administradores, docentes y alumnos.</template>
          <template v-else>Ingresá el username exacto del alumno. Los docentes gestionan su propio espacio.</template>
        </p>

        <div v-if="loading" class="loading-list"><Skeleton width="100%" height="50px" /><Skeleton width="100%" height="50px" /></div>
        <ul v-else-if="members.length" class="member-list">
          <li v-for="member in members" :key="member.user_id" class="member-row">
            <div class="member-avatar">{{ member.name[0]?.toUpperCase() || "U" }}</div>
            <div class="member-data">
              <strong>{{ member.name }}</strong>
              <span class="member-username" :title="member.user_id">Username: {{ member.user_id }}</span>
              <span :class="['role-badge', `role-badge--${member.role}`]">{{ roleLabel[member.role] }}</span>
            </div>
            <span v-if="!member.active" class="inactive">Sin acceso</span>
            <button
              v-if="member.role === 'student'"
              class="assign-button"
              type="button"
              @click="openAssign(member)"
            >
              Asignar
            </button>
            <button class="remove-button" type="button" @click="removeMember(member)">Quitar</button>
          </li>
        </ul>
        <div v-else class="empty-state"><i class="pi pi-users"></i><p>Todavía no hay usuarios en esta escuela.</p><span>Sumá primero a la persona responsable o a tu primer alumno.</span></div>
      </section>

      <Teleport to="body">
        <div v-if="assigningMember" class="assign-backdrop" @click.self="closeAssign">
          <div class="assign-card" role="dialog" aria-modal="true" aria-label="Asignar alumno">
            <div class="assign-head">
              <div>
                <p class="eyebrow">Alumno</p>
                <h3>{{ assigningMember.name }}</h3>
              </div>
              <button class="assign-close" type="button" @click="closeAssign">×</button>
            </div>

            <div v-if="assignLoading" class="loading-list">
              <Skeleton width="100%" height="40px" />
              <Skeleton width="100%" height="40px" />
            </div>
            <template v-else>
              <div class="assign-block">
                <span class="assign-label">Docentes asignados</span>
                <div class="chip-row">
                  <span v-for="teacher in assignedTeachers" :key="teacher.id" class="chip chip--teacher">
                    {{ teacher.name }}
                    <button type="button" @click="unassignTeacher(teacher.id)">×</button>
                  </span>
                  <span v-if="!assignedTeachers.length" class="chip-empty">Sin docente asignado</span>
                </div>
                <div class="assign-row">
                  <select v-model="teacherToAssign">
                    <option value="">Asignar docente</option>
                    <option v-for="teacher in schoolTeachers" :key="teacher.user_id" :value="teacher.user_id">
                      {{ teacher.name }}
                    </option>
                  </select>
                  <button type="button" :disabled="!teacherToAssign" @click="assignTeacher">Asignar</button>
                </div>
              </div>

              <div class="assign-block">
                <span class="assign-label">Grados</span>
                <div class="chip-row">
                  <span v-for="grade in assignedGrades" :key="grade.id" class="chip chip--grade">
                    {{ grade.name }}
                    <button type="button" @click="unassignGrade(grade.id)">×</button>
                  </span>
                  <span v-if="!assignedGrades.length" class="chip-empty">Sin grado</span>
                </div>
                <div class="assign-row">
                  <select v-model="gradeToAssign">
                    <option value="">Agregar a grado</option>
                    <option v-for="grade in grades" :key="grade.id" :value="grade.id">
                      {{ grade.name }}
                    </option>
                  </select>
                  <button type="button" :disabled="!gradeToAssign" @click="assignGrade">Vincular</button>
                </div>
              </div>

              <div class="assign-block">
                <span class="assign-label">Asistente</span>
                <div class="assistant-fields">
                  <select v-model="assistantForm.ui_theme">
                    <option value="primary">Primaria</option>
                    <option value="secondary">Secundaria</option>
                  </select>
                  <input v-model="assistantForm.assistant_base_url" placeholder="Assistant Base URL" />
                  <input v-model="assistantForm.assistant_api_key" placeholder="Assistant API Key" />
                </div>
                <div class="assign-row">
                  <button
                    type="button"
                    class="assistant-save"
                    :class="{ 'assistant-save--ok': assistantSaveSuccess }"
                    :disabled="savingAssistant"
                    @click="saveAssistantConfig"
                  >
                    {{ savingAssistant ? "Guardando..." : assistantSaveSuccess ? "Guardado" : "Guardar asistente" }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Teleport>
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
  .member-form label:first-child { position: relative; }.user-suggestions { position: absolute; z-index: 4; top: calc(100% + 4px); width: 100%; overflow: hidden; border: 1px solid var(--surface-border); border-radius: var(--radius-md); background: var(--surface-card); box-shadow: var(--shadow-card); }.user-suggestions button { display: grid; width: 100%; min-height: 0; padding: .55rem .7rem; border-radius: 0; color: var(--text-primary); background: transparent; text-align: left; }.user-suggestions button:hover { background: var(--surface-subtle); }.user-suggestions span { overflow: hidden; color: var(--text-secondary); font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }
  .member-list,.loading-list { display: grid; gap: .55rem; margin: 1.4rem 0 0; padding: 0; list-style: none; }.member-row { display: flex; align-items: center; gap: .75rem; padding: .75rem; border: 1px solid var(--surface-border); border-radius: var(--radius-lg); }.member-avatar { display: grid; flex: 0 0 36px; width: 36px; height: 36px; place-items: center; border-radius: var(--radius-md); color: var(--practiq-violet-dark); background: var(--fill-primary-soft); font-size: .82rem; font-weight: 800; }.member-data { display: grid; min-width: 0; gap: .25rem; }.member-data strong { overflow: hidden; color: var(--text-primary); font-size: .9rem; text-overflow: ellipsis; white-space: nowrap; }.member-username { overflow: hidden; color: var(--text-secondary); font-size: .76rem; text-overflow: ellipsis; white-space: nowrap; }.role-badge { width: fit-content; padding: .15rem .45rem; border-radius: var(--radius-pill); background: var(--surface-subtle); color: var(--text-secondary); font-size: .7rem; font-weight: 700; }.role-badge--admin { color: #197563; background: #dff6ee; }.role-badge--teacher { color: var(--practiq-violet-dark); background: var(--fill-primary-soft); }.inactive { margin-left: auto; color: var(--color-error-dark, #b91c1c); font-size: .75rem; font-weight: 700; }.assign-button { margin-left: auto; padding: .4rem .65rem; border: 0; border-radius: var(--radius-md); color: var(--practiq-violet-dark); background: var(--fill-primary-soft); cursor: pointer; font-weight: 700; }.remove-button { padding: .4rem .65rem; border: 0; border-radius: var(--radius-md); color: var(--color-error-dark, #b91c1c); background: var(--color-error-bg, #fef2f2); cursor: pointer; font-weight: 700; }.empty-state { display: grid; min-height: 170px; margin-top: 1.4rem; place-items: center; align-content: center; gap: .6rem; border: 1px dashed var(--surface-border); border-radius: var(--radius-lg); color: var(--text-secondary); text-align: center; }.empty-state i { color: var(--practiq-violet); font-size: 1.5rem; }.empty-state p { margin: 0; }.empty-state span { font-size: .82rem; }
  .assign-backdrop { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 1.2rem; background: var(--surface-scrim); }
  .assign-card { width: min(560px, 100%); max-height: calc(100vh - 48px); overflow: auto; padding: 1.3rem; border-radius: var(--radius-xl); background: var(--surface-card); box-shadow: var(--shadow-panel); }
  .assign-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  .assign-head h3 { margin: .2rem 0 0; color: var(--text-heading); }
  .assign-close { width: 36px; height: 36px; border: 0; border-radius: var(--radius-pill); background: var(--surface-subtle); color: var(--text-primary); font-size: 20px; cursor: pointer; }
  .assign-block { padding: .8rem; margin-bottom: .9rem; border-radius: var(--radius-lg); background: var(--surface-subtle); border: 1px solid var(--surface-border); }
  .assign-label { display: block; margin-bottom: .4rem; color: var(--text-secondary); font-size: .75rem; font-weight: 700; text-transform: uppercase; }
  .chip-row { display: flex; flex-wrap: wrap; gap: .4rem; }
  .chip { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .55rem; border-radius: var(--radius-pill); font-size: .78rem; font-weight: 700; }
  .chip--teacher { color: var(--color-info-dark); background: var(--color-info-bg); }
  .chip--grade { color: var(--color-success-dark); background: var(--color-success-bg); }
  .chip button { border: 0; background: transparent; color: inherit; cursor: pointer; font-weight: 800; padding: 0; }
  .chip-empty { color: var(--text-muted); font-size: .82rem; }
  .assign-row { display: flex; gap: .5rem; margin-top: .6rem; }
  .assign-row select { flex: 1; min-height: 38px; padding: .4rem .6rem; border: 1px solid var(--surface-border); border-radius: var(--radius-md); background: var(--surface-card); color: var(--text-primary); font: inherit; }
  .assign-row button { padding: 0 .8rem; border: 0; border-radius: var(--radius-md); background: var(--practiq-violet); color: #fff; font-weight: 700; cursor: pointer; }
  .assign-row button:disabled { opacity: .5; cursor: not-allowed; }
  .assistant-fields { display: grid; gap: .5rem; }
  .assistant-fields select, .assistant-fields input { min-height: 38px; padding: .4rem .6rem; border: 1px solid var(--surface-border); border-radius: var(--radius-md); background: var(--surface-card); color: var(--text-primary); font: inherit; }
  .assistant-save { padding: 0 .9rem; min-height: 38px; border: 0; border-radius: var(--radius-md); background: var(--practiq-violet); color: #fff; font-weight: 700; cursor: pointer; }
  .assistant-save--ok { background: var(--color-success); }
  .assistant-save:disabled { opacity: .6; cursor: not-allowed; }
  @media (max-width: 640px) { .school-users { padding: 1rem; }.card-heading,.member-row { align-items: flex-start; flex-direction: column; }.member-form { grid-template-columns: 1fr; }.member-form button { width: 100%; }.inactive { margin-left: 0; }.assign-button,.remove-button { width: 100%; min-height: 40px; }.school-kind { white-space: normal; }.assign-row { flex-direction: column; } }
</style>
