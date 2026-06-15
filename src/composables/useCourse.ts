import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { practiqApi } from "@/api/request/server";
import { CourseService } from "@/services/courses/courseService";
import { useCourseStore } from "@/stores/courseStore";
import type { Course } from "@/types";

export const useCourse = () => {
  const toast = useToast();

  const service = new CourseService(practiqApi);
  const store = useCourseStore(service)();
  const {
    courses,
    currentCourse,
    students,
    loading,
    loadingCourse,
    loadingStudents,
  } = storeToRefs(store);

  const loadCourses = async (role?: string) => {
    try {
      return await store.fetchCourses(role);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los cursos",
        life: 3000,
      });
      throw error;
    }
  };

  const loadCourse = async (id: string) => {
    try {
      return await store.fetchCourse(id);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar el curso",
        life: 3000,
      });
      throw error;
    }
  };

  const createCourse = async (params: Partial<Course>) => {
    try {
      const course = await store.createCourse(params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Curso creado exitosamente",
        life: 3000,
      });
      return course;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear el curso",
        life: 3000,
      });
      throw error;
    }
  };

  const updateCourse = async (id: string, params: Partial<Course>) => {
    try {
      const course = await store.updateCourse(id, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Curso actualizado exitosamente",
        life: 3000,
      });
      return course;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo actualizar el curso",
        life: 3000,
      });
      throw error;
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await store.deleteCourse(id);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Curso eliminado exitosamente",
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar el curso",
        life: 3000,
      });
      throw error;
    }
  };

  const enrollCourse = async (courseId: string) => {
    try {
      const response = await store.enrollCourse(courseId);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Inscripción exitosa al curso",
        life: 3000,
      });
      return response;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo inscribir al curso",
        life: 3000,
      });
      throw error;
    }
  };

  const loadStudents = async (courseId: string) => {
    try {
      return await store.fetchStudents(courseId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los estudiantes",
        life: 3000,
      });
      throw error;
    }
  };

  return {
    courses,
    currentCourse,
    students,
    loading,
    loadingCourse,
    loadingStudents,
    loadCourses,
    loadCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollCourse,
    loadStudents,
    reset: store.reset,
  };
};
