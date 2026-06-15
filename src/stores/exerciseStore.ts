import { defineStore } from "pinia";
import { ref } from "vue";
import type { IExerciseService } from "@/services/exercises/exerciseService";
import type { Exercise } from "@/types";

export const useExerciseStore = (service: IExerciseService) =>
  defineStore("exercises", () => {
    const exercises = ref<Exercise[]>([]);
    const loading = ref(false);

    const fetchExercises = async (topicId: string) => {
      loading.value = true;
      try {
        const response = await service.list(topicId);
        exercises.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const createExercise = async (
      topicId: string,
      params: Partial<Exercise>,
    ) => {
      loading.value = true;
      try {
        const response = await service.create(topicId, params);
        exercises.value.push(response.data);
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateExercise = async (id: string, params: Partial<Exercise>) => {
      loading.value = true;
      try {
        const response = await service.update(id, params);
        const index = exercises.value.findIndex((e) => e.id === id);
        if (index !== -1) {
          exercises.value[index] = response.data;
        }
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const deleteExercise = async (id: string) => {
      loading.value = true;
      try {
        await service.delete(id);
        exercises.value = exercises.value.filter((e) => e.id !== id);
      } finally {
        loading.value = false;
      }
    };

    const reset = () => {
      exercises.value = [];
    };

    return {
      exercises,
      loading,
      fetchExercises,
      createExercise,
      updateExercise,
      deleteExercise,
      reset,
    };
  });
