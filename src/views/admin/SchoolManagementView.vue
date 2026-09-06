<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useSchoolStore } from "@/stores/schoolStore";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/request/server";
import { AuthAdminService } from "@/services/auth/authAdminService";

const schools = useSchoolStore();
const auth = useAuthStore();
const authAdminService = new AuthAdminService(authApi);
const isSuperAdmin = computed(() => auth.authUser?.roles.some((r) => r.name === "superadmin") ?? false);
const form = reactive({ name: "", slug: "", userId: "", membershipRole: "member" as "admin" | "member", profileType: "student" as "student" | "teacher" });
const saving = ref(false);
const message = ref("");

onMounted(() => schools.load().catch(() => undefined));

async function createSchool() {
  saving.value = true; message.value = "";
  try { await schools.create(form.name, form.slug); form.name = ""; form.slug = ""; message.value = "Escuela creada."; }
  catch { message.value = "No se pudo crear la escuela."; }
  finally { saving.value = false; }
}

async function addMember() {
  saving.value = true; message.value = "";
  try {
    await schools.addMember({ user_id: form.userId, membership_role: form.membershipRole, profile_type: form.profileType });
    // Auth role only enables teaching endpoints. School administration comes
    // from membership_role and is checked server-side per selected school.
    if (form.profileType === "teacher") {
      const authUser = await authAdminService.getByUsername(form.userId);
      await authAdminService.updateRoles(authUser.data.id, ["admin"]);
    }
    form.userId = ""; message.value = "Acceso asignado.";
  }
  catch { message.value = "No se pudo asignar el acceso."; }
  finally { saving.value = false; }
}
</script>

<template>
  <main class="school-management">
    <h1>Escuelas</h1>
    <p v-if="message" class="message">{{ message }}</p>
    <section class="school-grid">
      <button v-for="school in schools.schools" :key="school.id" class="school-card" :class="{ active: school.id === schools.activeSchoolId }" @click="schools.selectAndLoad(school.id)">
        <strong>{{ school.name }}</strong><span>{{ school.slug }}</span>
      </button>
    </section>
    <form v-if="isSuperAdmin" class="panel" @submit.prevent="createSchool">
      <h2>Nueva escuela</h2>
      <input v-model="form.name" required placeholder="Nombre" />
      <input v-model="form.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="slug-escuela" />
      <button :disabled="saving">Crear escuela</button>
    </form>
    <section v-if="schools.activeSchool" class="panel">
      <h2>Accesos: {{ schools.activeSchool.name }}</h2>
      <form @submit.prevent="addMember" class="member-form">
        <input v-model="form.userId" required placeholder="username del usuario" />
        <select v-model="form.membershipRole"><option value="member">Miembro</option><option v-if="isSuperAdmin" value="admin">Admin</option></select>
        <select v-model="form.profileType"><option value="student">Estudiante</option><option value="teacher">Profesor</option></select>
        <button :disabled="saving">Asignar</button>
      </form>
      <ul><li v-for="member in schools.members" :key="member.user_id"><span>{{ member.user_id }}</span> — {{ member.membership_role }} / {{ member.profile_type }} <button @click="schools.removeMember(member.user_id)">Quitar</button></li></ul>
    </section>
  </main>
</template>

<style scoped>
.school-management { max-width: 980px; margin: 2rem auto; padding: 1rem; }
.school-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: .75rem; }
.school-card, .panel { padding: 1rem; border: 1px solid #d7dce5; border-radius: 12px; background: white; }
.school-card { display: grid; text-align: left; gap: .35rem; cursor: pointer; } .school-card.active { border-color: #315efb; }
.school-card span { color: #687386; font-size: .85rem; } .panel { margin-top: 1rem; display: grid; gap: .75rem; }
input, select, button { min-height: 2.4rem; padding: .4rem .65rem; } .member-form { display: flex; flex-wrap: wrap; gap: .5rem; }
li { margin: .5rem 0; } .message { color: #315efb; }
</style>
