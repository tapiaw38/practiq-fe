import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  Notebook,
  NotebookPage,
  NotebookSubmitJobStart,
  NotebookSubmitJobStatus,
  NotebookSubmissionFull,
} from "@/types";
import type { INotebookService } from "@/services/notebooks/notebookService";

export const useNotebookStore = (service: INotebookService) =>
  defineStore("notebooks", () => {
    const notebooks = ref<Notebook[]>([]);
    const currentNotebook = ref<Notebook | null>(null);
    const submissions = ref<NotebookSubmissionFull[]>([]);
    const submitJob = ref<NotebookSubmitJobStart | null>(null);
    const jobStatus = ref<NotebookSubmitJobStatus | null>(null);
    const loading = ref(false);
    const submissionsPage = ref(1);
    const submissionsPageSize = ref(20);
    const submissionsHasMore = ref(true);

    const fetchNotebooks = async (courseId: string) => {
      loading.value = true;
      try {
        const result = await service.list(courseId);
        notebooks.value = result;
        return result;
      } finally {
        loading.value = false;
      }
    };

    const fetchNotebook = async (id: string, studentId?: string) => {
      loading.value = true;
      try {
        const response = await service.get(id, studentId);
        currentNotebook.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const createNotebook = async (
      courseId: string,
      params: { title: string; description?: string; level?: number },
    ) => {
      loading.value = true;
      try {
        const response = await service.create(courseId, params);
        notebooks.value.push(response.data);
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateNotebook = async (
      id: string,
      params: { title: string; description?: string },
    ) => {
      loading.value = true;
      try {
        const response = await service.update(id, params);
        const index = notebooks.value.findIndex((nb) => nb.id === id);
        if (index !== -1) {
          notebooks.value[index] = response.data;
        }
        if (currentNotebook.value?.id === id) {
          currentNotebook.value = response.data;
        }
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const deleteNotebook = async (id: string) => {
      loading.value = true;
      try {
        await service.delete(id);
        notebooks.value = notebooks.value.filter((nb) => nb.id !== id);
        if (currentNotebook.value?.id === id) {
          currentNotebook.value = null;
        }
      } finally {
        loading.value = false;
      }
    };

    const addNotebookPage = async (
      notebookId: string,
      params: {
        page_number: number;
        title: string;
        content_type: "canvas" | "text";
        content_data: string;
        instructions: string;
      },
    ) => {
      loading.value = true;
      try {
        const response = await service.addPage(notebookId, params);
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateNotebookPage = async (
      pageId: string,
      params: {
        title: string;
        content_type: "canvas" | "text";
        content_data: string;
        instructions: string;
      },
    ) => {
      loading.value = true;
      try {
        await service.updatePage(pageId, params);
      } finally {
        loading.value = false;
      }
    };

    const savePageSubmission = async (
      pageId: string,
      params: { canvas_data?: string; answer_text?: string },
    ) => {
      loading.value = true;
      try {
        await service.saveSubmission(pageId, params);
      } finally {
        loading.value = false;
      }
    };

    const savePageSubmissionAsync = async (
      pageId: string,
      params: { canvas_data?: string; answer_text?: string },
    ) => {
      loading.value = true;
      try {
        const response = await service.saveSubmissionAsync(pageId, params);
        submitJob.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchSubmissionJob = async (jobId: string) => {
      loading.value = true;
      try {
        const response = await service.getSubmissionJob(jobId);
        jobStatus.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchSubmissions = async (params?: {
      notebook_id?: string;
      student_id?: string;
      reviewed?: boolean;
      course_id?: string;
      limit?: number;
      offset?: number;
    }) => {
      loading.value = true;
      // No limit means "the whole scoped set" — the review search relies on it
      // to filter across pages; only a paged call gets the probe row.
      const limit = params?.limit;
      try {
        const response = await service.getSubmissions(
          limit ? { ...params, limit: limit + 1 } : params,
        );
        if (!limit) {
          submissions.value = response.data;
          submissionsHasMore.value = false;
          return response.data;
        }
        // One row past the page: a full page is not proof there is a next one,
        // and `length >= limit` lit up "Siguiente" on an exact multiple.
        const page = response.data.slice(0, limit);
        submissions.value = page;
        submissionsHasMore.value = response.data.length > limit;
        return page;
      } finally {
        loading.value = false;
      }
    };

    const loadSubmissionsPage = async (
      page: number,
      filters?: {
        notebook_id?: string;
        student_id?: string;
        reviewed?: boolean;
        course_id?: string;
      },
    ) => {
      const offset = (page - 1) * submissionsPageSize.value;
      const data = await fetchSubmissions({
        ...filters,
        limit: submissionsPageSize.value,
        offset,
      });
      // Only after the fetch resolves: advancing first left the counter on a
      // page whose rows never loaded when the request failed.
      submissionsPage.value = page;
      return data;
    };

    const nextSubmissionsPage = async (filters?: {
      notebook_id?: string;
      student_id?: string;
      reviewed?: boolean;
      course_id?: string;
    }) => {
      if (submissionsHasMore.value) {
        return loadSubmissionsPage(submissionsPage.value + 1, filters);
      }
    };

    const prevSubmissionsPage = async (filters?: {
      notebook_id?: string;
      student_id?: string;
      reviewed?: boolean;
      course_id?: string;
    }) => {
      if (submissionsPage.value > 1) {
        return loadSubmissionsPage(submissionsPage.value - 1, filters);
      }
    };

    const triggerAIReviewForSubmission = async (submissionId: string) => {
      loading.value = true;
      try {
        const response = await service.triggerAIReview(submissionId);
        const index = submissions.value.findIndex((s) => s.id === submissionId);
        if (index !== -1) {
          submissions.value[index] = response.data;
        }
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateManualReviewForSubmission = async (
      submissionId: string,
      params: {
        teacher_is_correct: boolean;
        teacher_feedback: string;
      },
    ) => {
      loading.value = true;
      try {
        const response = await service.updateManualReview(submissionId, params);
        const index = submissions.value.findIndex((s) => s.id === submissionId);
        if (index !== -1) {
          submissions.value[index] = response.data;
        }
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    return {
      notebooks,
      currentNotebook,
      submissions,
      submitJob,
      jobStatus,
      loading,
      submissionsPage,
      submissionsPageSize,
      submissionsHasMore,
      fetchNotebooks,
      fetchNotebook,
      createNotebook,
      updateNotebook,
      deleteNotebook,
      addNotebookPage,
      updateNotebookPage,
      savePageSubmission,
      savePageSubmissionAsync,
      fetchSubmissionJob,
      fetchSubmissions,
      loadSubmissionsPage,
      nextSubmissionsPage,
      prevSubmissionsPage,
      triggerAIReviewForSubmission,
      updateManualReviewForSubmission,
    };
  });
