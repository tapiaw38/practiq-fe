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
    const currentPage = ref(1);
    const pageSize = ref(20);
    const hasMore = ref(true);

    const fetchPracticeSheets = async (
      courseId: string,
      params?: { limit?: number; offset?: number },
    ) => {
      loading.value = true;
      // No limit means "everything for this course" (the dashboard and the
      // progress view rely on it); only a paged call gets the probe row.
      const limit = params?.limit;
      try {
        const response = await service.list(
          courseId,
          limit ? { ...params, limit: limit + 1 } : params,
        );
        if (!limit) {
          practiceSheets.value = response.data;
          hasMore.value = false;
          return response.data;
        }
        // One row past the page: a full page is not proof there is a next one,
        // and `length >= limit` lit up "Siguiente" on an exact multiple,
        // sending the user to an empty page.
        const page = response.data.slice(0, limit);
        practiceSheets.value = page;
        hasMore.value = response.data.length > limit;
        return page;
      } finally {
        loading.value = false;
      }
    };

    const loadPage = async (courseId: string, page: number) => {
      const offset = (page - 1) * pageSize.value;
      const data = await fetchPracticeSheets(courseId, {
        limit: pageSize.value,
        offset,
      });
      // Only after the fetch resolves: advancing first left the counter on a
      // page whose rows never loaded when the request failed.
      currentPage.value = page;
      return data;
    };

    const nextPage = async (courseId: string) => {
      if (hasMore.value) {
        return loadPage(courseId, currentPage.value + 1);
      }
    };

    const prevPage = async (courseId: string) => {
      if (currentPage.value > 1) {
        return loadPage(courseId, currentPage.value - 1);
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
        /** RFC 3339 UTC string; empty clears the schedule. */
        scheduled_at?: string;
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
        /** RFC 3339 UTC string; empty clears the schedule. */
        scheduled_at?: string;
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
      currentPage,
      pageSize,
      hasMore,
      fetchPracticeSheets,
      loadPage,
      nextPage,
      prevPage,
      fetchPracticeSheet,
      createPracticeSheet,
      updatePracticeSheet,
      deletePracticeSheet,
      submitPracticeSheet,
      submitPracticeSheetAsync,
      fetchSubmitJob,
    };
  });
