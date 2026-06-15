import { defineStore } from "pinia";
import { ref } from "vue";
import type { CourseLevelsResponse } from "@/types";
import type { ILevelService } from "@/services/levels/levelService";

export const useLevelStore = (service: ILevelService) =>
  defineStore("levels", () => {
    const courseLevels = ref<Record<string, CourseLevelsResponse>>({});
    const loading = ref(false);

    const fetchCourseLevels = async (courseId: string) => {
      loading.value = true;
      try {
        const result = await service.getCourseLevels(courseId);
        courseLevels.value[courseId] = result;
        return result;
      } finally {
        loading.value = false;
      }
    };

    return {
      courseLevels,
      loading,
      fetchCourseLevels,
    };
  });
