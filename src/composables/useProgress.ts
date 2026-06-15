import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { practiqApi } from "@/api/request/server";
import { ProgressService } from "@/services/progress/progressService";
import { useProgressStore } from "@/stores/progressStore";

export const useProgress = () => {
  const toast = useToast();

  const service = new ProgressService(practiqApi);
  const store = useProgressStore(service)();
  const {
    myProgress,
    courseProgress,
    studentProgress,
    studentAttempts,
    loading,
  } = storeToRefs(store);

  const loadMyProgress = async () => {
    try {
      return await store.fetchMyProgress();
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar el progreso",
        life: 3000,
      });
      throw error;
    }
  };

  const loadCourseProgress = async (courseId: string) => {
    try {
      return await store.fetchCourseProgress(courseId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar el progreso del curso",
        life: 3000,
      });
      throw error;
    }
  };

  const loadStudentProgress = async (studentId: string) => {
    try {
      return await store.fetchStudentProgress(studentId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar el progreso del estudiante",
        life: 3000,
      });
      throw error;
    }
  };

  const loadStudentCourseProgress = async (
    studentId: string,
    courseId: string,
  ) => {
    try {
      return await store.fetchStudentCourseProgress(studentId, courseId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar el progreso del curso",
        life: 3000,
      });
      throw error;
    }
  };

  const loadStudentAttempts = async (studentId: string, sheetId: string) => {
    try {
      return await store.fetchStudentAttempts(studentId, sheetId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los intentos",
        life: 3000,
      });
      throw error;
    }
  };

  const loadStudentCourseProgressNew = async (
    studentId: string,
    courseId: string,
  ) => {
    try {
      return await store.fetchStudentCourseProgressNew(studentId, courseId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar el progreso",
        life: 3000,
      });
      throw error;
    }
  };

  const loadAllStudentProgress = async (studentId: string) => {
    try {
      return await store.fetchAllStudentProgress(studentId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar el progreso",
        life: 3000,
      });
      throw error;
    }
  };

  const downloadReport = async (
    studentId: string,
    options?: { from?: string; to?: string; courseId?: string },
  ) => {
    try {
      const blob = await store.downloadReportPDF(studentId, options);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-${studentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Reporte descargado exitosamente",
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo descargar el reporte",
        life: 3000,
      });
      throw error;
    }
  };

  return {
    myProgress,
    courseProgress,
    studentProgress,
    studentAttempts,
    loading,
    loadMyProgress,
    loadCourseProgress,
    loadStudentProgress,
    loadStudentCourseProgress,
    loadStudentAttempts,
    loadStudentCourseProgressNew,
    loadAllStudentProgress,
    downloadReport,
    reset: store.reset,
  };
};
