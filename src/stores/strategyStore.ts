import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  CreateStrategyParams,
  IStrategyService,
  UpdateStrategyParams,
} from "@/services/strategy/strategyService";
import type { CourseLearningStrategy, LearningStrategy } from "@/types";

export const useStrategyStore = (service: IStrategyService) =>
  defineStore("strategies", () => {
    const strategies = ref<LearningStrategy[]>([]);
    const currentStrategy = ref<LearningStrategy | null>(null);
    const courseAssignments = ref<Record<string, CourseLearningStrategy[]>>({});
    const loading = ref(false);

    const fetchStrategies = async () => {
      loading.value = true;
      try {
        const response = await service.list();
        strategies.value = response.data || [];
        return strategies.value;
      } finally {
        loading.value = false;
      }
    };

    const fetchStrategy = async (id: string) => {
      loading.value = true;
      try {
        const response = await service.get(id);
        currentStrategy.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const createStrategy = async (params: CreateStrategyParams) => {
      loading.value = true;
      try {
        const response = await service.create(params);
        strategies.value.push(response.data);
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateStrategy = async (id: string, params: UpdateStrategyParams) => {
      loading.value = true;
      try {
        const response = await service.update(id, params);
        const index = strategies.value.findIndex(
          (strategy) => strategy.id === id,
        );
        if (index !== -1) strategies.value[index] = response.data;
        if (currentStrategy.value?.id === id)
          currentStrategy.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const deleteStrategy = async (id: string) => {
      loading.value = true;
      try {
        await service.delete(id);
        strategies.value = strategies.value.filter(
          (strategy) => strategy.id !== id,
        );
        if (currentStrategy.value?.id === id) currentStrategy.value = null;
      } finally {
        loading.value = false;
      }
    };

    const assignToCourse = async (courseId: string, strategyId: string) => {
      loading.value = true;
      try {
        const response = await service.assignToCourse(courseId, strategyId);
        courseAssignments.value[courseId] = [
          ...(courseAssignments.value[courseId] || []),
          response.data,
        ];
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchCourseStrategies = async (courseId: string) => {
      loading.value = true;
      try {
        const response = await service.getCourseStrategies(courseId);
        courseAssignments.value[courseId] = response.data || [];
        return courseAssignments.value[courseId];
      } finally {
        loading.value = false;
      }
    };

    const removeCourseStrategy = async (assignmentId: string) => {
      loading.value = true;
      try {
        await service.removeCourseStrategy(assignmentId);
        Object.keys(courseAssignments.value).forEach((courseId) => {
          courseAssignments.value[courseId] = courseAssignments.value[
            courseId
          ].filter((assignment) => assignment.id !== assignmentId);
        });
      } finally {
        loading.value = false;
      }
    };

    return {
      strategies,
      currentStrategy,
      courseAssignments,
      loading,
      fetchStrategies,
      fetchStrategy,
      createStrategy,
      updateStrategy,
      deleteStrategy,
      assignToCourse,
      fetchCourseStrategies,
      removeCourseStrategy,
    };
  });
