import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { practiqApi } from "@/api/request/server";
import { SubjectService } from "@/services/subjects/subjectService";
import { useSubjectStore } from "@/stores/subjectStore";

export const useSubject = () => {
  const toast = useToast();
  const service = new SubjectService(practiqApi);
  const store = useSubjectStore(service)();
  const { subjects, loading } = storeToRefs(store);

  const loadSubjects = async () => {
    try {
      return await store.fetchSubjects();
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar las materias",
        life: 3000,
      });
      throw error;
    }
  };

  const createSubject = async (params: {
    name: string;
    description: string;
  }) => {
    try {
      const subject = await store.createSubject(params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Materia creada correctamente",
        life: 3000,
      });
      return subject;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear la materia",
        life: 3000,
      });
      throw error;
    }
  };

  const updateSubject = async (
    id: string,
    params: { name: string; description: string },
  ) => {
    try {
      const subject = await store.updateSubject(id, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Materia actualizada correctamente",
        life: 3000,
      });
      return subject;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo actualizar la materia",
        life: 3000,
      });
      throw error;
    }
  };

  const deleteSubject = async (id: string) => {
    try {
      await store.deleteSubject(id);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Materia eliminada correctamente",
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar la materia",
        life: 3000,
      });
      throw error;
    }
  };

  return {
    subjects,
    loading,
    loadSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  };
};
