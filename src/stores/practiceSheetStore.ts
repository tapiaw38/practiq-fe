import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  PracticeSheet,
  SubmitInput,
  SubmitJobStart,
  SubmitJobStatus,
  SubmitResult,
} from "@/types";
import type { IPracticeSheetService } from "@/services/practiceSheets/practiceSheetService";

export const usePracticeSheetStore = (service: IPracticeSheetService) =>
  defineStore("practiceSheets", () => {
    const practiceSheets = ref<PracticeSheet[]>([]);
    const currentPracticeSheet = ref<PracticeSheet | null>(null);
    const submitResult = ref<SubmitResult | null>(null);
    const submitJob = ref<SubmitJobStart | null>(null);
    const jobStatus = ref<SubmitJobStatus | null>(null);
    const loading = ref(false);

    const fetchPracticeSheets = async (courseId: string) => {
      loading.value = true;
      try {
        const response = await service.list(courseId);
        practiceSheets.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchPracticeSheet = async (id: string) => {
      loading.value = true;
      try {
        const response = await service.get(id);
        currentPracticeSheet.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
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
      loading.value = true;
      try {
        const response = await service.create(courseId, params);
        practiceSheets.value.push(response.data);
        return response.data;
      } finally {
        loading.value = false;
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
      loading.value = true;
      try {
        const response = await service.update(id, params);
        const index = practiceSheets.value.findIndex((ps) => ps.id === id);
        if (index !== -1) {
          practiceSheets.value[index] = response.data;
        }
        if (currentPracticeSheet.value?.id === id) {
          currentPracticeSheet.value = response.data;
        }
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const deletePracticeSheet = async (id: string) => {
      loading.value = true;
      try {
        await service.delete(id);
        practiceSheets.value = practiceSheets.value.filter(
          (ps) => ps.id !== id,
        );
        if (currentPracticeSheet.value?.id === id) {
          currentPracticeSheet.value = null;
        }
      } finally {
        loading.value = false;
      }
    };

    const submitPracticeSheet = async (id: string, input: SubmitInput) => {
      loading.value = true;
      try {
        const response = await service.submit(id, input);
        submitResult.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const submitPracticeSheetAsync = async (id: string, input: SubmitInput) => {
      loading.value = true;
      try {
        const response = await service.submitAsync(id, input);
        submitJob.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchSubmitJob = async (jobId: string) => {
      loading.value = true;
      try {
        const response = await service.getSubmitJob(jobId);
        jobStatus.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    return {
      practiceSheets,
      currentPracticeSheet,
      submitResult,
      submitJob,
      jobStatus,
      loading,
      fetchPracticeSheets,
      fetchPracticeSheet,
      createPracticeSheet,
      updatePracticeSheet,
      deletePracticeSheet,
      submitPracticeSheet,
      submitPracticeSheetAsync,
      fetchSubmitJob,
    };
  });
