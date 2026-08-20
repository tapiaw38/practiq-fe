import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { practiqApi } from "@/api/request/server";
import { GradeService } from "@/services/grades/gradeService";
import { useGradeStore } from "@/stores/gradeStore";

export const useGrade = () => {
  const toast = useToast();
  const service = new GradeService(practiqApi);
  const store = useGradeStore(service)();
  const { grades, members, userGrades, loading } = storeToRefs(store);

  const loadGrades = async () => {
    try {
      return await store.fetchGrades();
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los grados",
        life: 3000,
      });
      throw error;
    }
  };

  const createGrade = async (params: { name: string; description: string }) => {
    try {
      const grade = await store.createGrade(params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Grado creado correctamente",
        life: 3000,
      });
      return grade;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear el grado",
        life: 3000,
      });
      throw error;
    }
  };

  const updateGrade = async (
    id: string,
    params: { name: string; description: string },
  ) => {
    try {
      const grade = await store.updateGrade(id, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Grado actualizado correctamente",
        life: 3000,
      });
      return grade;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo actualizar el grado",
        life: 3000,
      });
      throw error;
    }
  };

  const deleteGrade = async (id: string) => {
    try {
      await store.deleteGrade(id);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Grado eliminado correctamente",
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar el grado",
        life: 3000,
      });
      throw error;
    }
  };

  const addGradeMember = async (gradeId: string, userId: string) => {
    try {
      return await store.addMember(gradeId, userId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo asignar el grado",
        life: 3000,
      });
      throw error;
    }
  };

  const removeGradeMember = async (gradeId: string, userId: string) => {
    try {
      return await store.removeMember(gradeId, userId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo quitar el grado",
        life: 3000,
      });
      throw error;
    }
  };

  const loadGradeMembers = async (gradeId: string) => {
    try {
      return await store.fetchMembers(gradeId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los miembros",
        life: 3000,
      });
      throw error;
    }
  };

  const loadUserGrades = async (userId: string) => {
    try {
      return await store.fetchUserGrades(userId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los grados del usuario",
        life: 3000,
      });
      throw error;
    }
  };

  const loadGradesByUsers = async (userIds: string[]) => {
    try {
      return await store.fetchGradesByUsers(userIds);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los grados de los alumnos",
        life: 3000,
      });
      throw error;
    }
  };

  return {
    grades,
    members,
    userGrades,
    loading,
    loadGrades,
    createGrade,
    updateGrade,
    deleteGrade,
    addGradeMember,
    removeGradeMember,
    loadGradeMembers,
    loadUserGrades,
    loadGradesByUsers,
  };
};
