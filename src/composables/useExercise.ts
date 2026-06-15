import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { practiqApi } from "@/api/request/server";
import { ExerciseService } from "@/services/exercises/exerciseService";
import { useExerciseStore } from "@/stores/exerciseStore";
import type { Exercise } from "@/types";

export const useExercise = () => {
  const toast = useToast();

  const service = new ExerciseService(practiqApi);
  const store = useExerciseStore(service)();
  const { exercises, loading } = storeToRefs(store);

  const loadExercises = async (topicId: string) => {
    try {
      return await store.fetchExercises(topicId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los ejercicios",
        life: 3000,
      });
      throw error;
    }
  };

  const createExercise = async (topicId: string, params: Partial<Exercise>) => {
    try {
      const exercise = await store.createExercise(topicId, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Ejercicio creado exitosamente",
        life: 3000,
      });
      return exercise;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear el ejercicio",
        life: 3000,
      });
      throw error;
    }
  };

  const updateExercise = async (id: string, params: Partial<Exercise>) => {
    try {
      const exercise = await store.updateExercise(id, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Ejercicio actualizado exitosamente",
        life: 3000,
      });
      return exercise;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo actualizar el ejercicio",
        life: 3000,
      });
      throw error;
    }
  };

  const deleteExercise = async (id: string) => {
    try {
      await store.deleteExercise(id);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Ejercicio eliminado exitosamente",
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar el ejercicio",
        life: 3000,
      });
      throw error;
    }
  };

  return {
    exercises,
    loading,
    loadExercises,
    createExercise,
    updateExercise,
    deleteExercise,
    reset: store.reset,
  };
};
