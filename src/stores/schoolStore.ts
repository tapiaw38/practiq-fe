import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { School, SchoolMembership } from "@/types/schools";
import { schoolService } from "@/services/schools/schoolService";

const ACTIVE_SCHOOL_KEY = "practiq_active_school";

export const useSchoolStore = defineStore("schools", () => {
  const schools = ref<School[]>([]);
  const members = ref<SchoolMembership[]>([]);
  const activeSchoolId = ref<string | null>(localStorage.getItem(ACTIVE_SCHOOL_KEY));
  const loading = ref(false);
  const error = ref("");
  const activeSchool = computed(() => schools.value.find((s) => s.id === activeSchoolId.value) ?? null);

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      schools.value = await schoolService.list();
      if (!activeSchoolId.value || !schools.value.some((s) => s.id === activeSchoolId.value)) select(schools.value[0]?.id ?? null);
      if (activeSchoolId.value) members.value = await schoolService.members(activeSchoolId.value);
    } catch (e) { error.value = "No se pudieron cargar las escuelas."; throw e; }
    finally { loading.value = false; }
  }

  function select(id: string | null) {
    activeSchoolId.value = id;
    if (id) localStorage.setItem(ACTIVE_SCHOOL_KEY, id); else localStorage.removeItem(ACTIVE_SCHOOL_KEY);
  }

  async function selectAndLoad(id: string) { select(id); members.value = await schoolService.members(id); }
  async function create(name: string, slug: string) { const school = await schoolService.create(name, slug); schools.value.push(school); await selectAndLoad(school.id); return school; }
  async function addMember(input: { user_id: string; membership_role: "admin" | "member"; profile_type: "teacher" | "student" }) {
    if (!activeSchoolId.value) throw new Error("No active school");
    const member = await schoolService.addMember(activeSchoolId.value, input);
    members.value = [...members.value.filter((m) => m.user_id !== member.user_id), member];
    return member;
  }
  async function removeMember(userId: string) {
    if (!activeSchoolId.value) throw new Error("No active school");
    await schoolService.removeMember(activeSchoolId.value, userId);
    members.value = members.value.filter((m) => m.user_id !== userId);
  }

  return { schools, members, activeSchoolId, activeSchool, loading, error, load, select, selectAndLoad, create, addMember, removeMember };
});
