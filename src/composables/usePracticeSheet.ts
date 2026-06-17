import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { PracticeSheetService } from "@/services/practiceSheets/practiceSheetService";
import { usePracticeSheetStore } from "@/stores/practiceSheetStore";
import { practiqApi } from "@/api/request/server";
import type { SubmitInput } from "@/types";

export const usePracticeSheet = () => {
  const toast = useToast();
  const service = new PracticeSheetService(practiqApi);
  const store = usePracticeSheetStore(service)();

  const {
    practiceSheets,
    currentPracticeSheet,
    submitResult,
    submitJob,
    jobStatus,
    loading,
    currentPage,
    pageSize,
    hasMore,
  } = storeToRefs(store);

  const loadPracticeSheets = async (courseId: string) => {
    try {
      return await store.fetchPracticeSheets(courseId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar las hojas de práctica",
        life: 3000,
      });
      throw error;
    }
  };

  const loadPracticeSheet = async (id: string) => {
    try {
      return await store.fetchPracticeSheet(id);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar la hoja de práctica",
        life: 3000,
      });
      throw error;
    }
  };

  const createPracticeSheet = async (
    courseId: string,
    params: {
      topic_id?: string;
      strategy_id?: string;
      title: string;
      level?: number;
      sheet_type?: string;
      test_style?: string;
      exercise_ids: string[];
    },
  ) => {
    try {
      const result = await store.createPracticeSheet(courseId, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Hoja de práctica creada correctamente",
        life: 3000,
      });
      return result;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear la hoja de práctica",
        life: 3000,
      });
      throw error;
    }
  };

  const updatePracticeSheet = async (
    id: string,
    params: {
      title: string;
      topic_id?: string;
      level?: number;
      sheet_type?: string;
      test_style?: string;
      exercise_ids?: string[];
    },
  ) => {
    try {
      const result = await store.updatePracticeSheet(id, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Hoja de práctica actualizada correctamente",
        life: 3000,
      });
      return result;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo actualizar la hoja de práctica",
        life: 3000,
      });
      throw error;
    }
  };

  const deletePracticeSheet = async (id: string) => {
    try {
      await store.deletePracticeSheet(id);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Hoja de práctica eliminada correctamente",
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar la hoja de práctica",
        life: 3000,
      });
      throw error;
    }
  };

  const submitPracticeSheet = async (id: string, input: SubmitInput) => {
    try {
      const result = await store.submitPracticeSheet(id, input);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Hoja de práctica enviada correctamente",
        life: 3000,
      });
      return result;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo enviar la hoja de práctica",
        life: 3000,
      });
      throw error;
    }
  };

  const submitPracticeSheetAsync = async (id: string, input: SubmitInput) => {
    try {
      const result = await store.submitPracticeSheetAsync(id, input);
      toast.add({
        severity: "info",
        summary: "Procesando",
        detail: "La hoja de práctica se está procesando",
        life: 3000,
      });
      return result;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo enviar la hoja de práctica",
        life: 3000,
      });
      throw error;
    }
  };

  const loadSubmitJob = async (jobId: string) => {
    try {
      return await store.fetchSubmitJob(jobId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo obtener el estado del trabajo",
        life: 3000,
      });
      throw error;
    }
  };

  const loadPage = async (courseId: string, page: number) => {
    try {
      return await store.loadPage(courseId, page);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar la página",
        life: 3000,
      });
      throw error;
    }
  };

  const nextPage = async (courseId: string) => {
    try {
      return await store.nextPage(courseId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar la siguiente página",
        life: 3000,
      });
      throw error;
    }
  };

  const prevPage = async (courseId: string) => {
    try {
      return await store.prevPage(courseId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar la página anterior",
        life: 3000,
      });
      throw error;
    }
  };

  return {
    practiceSheets,
    currentPracticeSheet,
    submitResult,
    submitJob,
    jobStatus,
    loading,
    currentPage,
    pageSize,
    hasMore,
    loadPracticeSheets,
    loadPracticeSheet,
    createPracticeSheet,
    updatePracticeSheet,
    deletePracticeSheet,
    submitPracticeSheet,
    submitPracticeSheetAsync,
    loadSubmitJob,
    loadPage,
    nextPage,
    prevPage,
  };
};
