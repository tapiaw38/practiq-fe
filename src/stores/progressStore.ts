import { defineStore } from "pinia";
import { ref } from "vue";
import type { IProgressService } from "@/services/progress/progressService";
import type {
  TopicProgress,
  StudentAttempt,
  CourseProgress,
  ProgressResponse,
} from "@/types";

export const useProgressStore = (service: IProgressService) =>
  defineStore("progress", () => {
    const myProgress = ref<TopicProgress[]>([]);
    const courseProgress = ref<TopicProgress[]>([]);
    const studentProgress = ref<TopicProgress[]>([]);
    const studentAttempts = ref<StudentAttempt[]>([]);
    const loading = ref(false);

    const fetchMyProgress = async () => {
      loading.value = true;
      try {
        const response = await service.getMyProgress();
        myProgress.value = response.data;
        return response;
      } finally {
        loading.value = false;
      }
    };

    const fetchCourseProgress = async (courseId: string) => {
      loading.value = true;
      try {
        const response = await service.getCourseProgress(courseId);
        courseProgress.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchStudentProgress = async (studentId: string) => {
      loading.value = true;
      try {
        const response = await service.getStudentProgress(studentId);
        studentProgress.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchStudentCourseProgress = async (
      studentId: string,
      courseId: string,
    ) => {
      loading.value = true;
      try {
        const response = await service.getStudentCourseProgress(
          studentId,
          courseId,
        );
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchStudentAttempts = async (studentId: string, sheetId: string) => {
      loading.value = true;
      try {
        const response = await service.getStudentAttempts(studentId, sheetId);
        studentAttempts.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchStudentCourseProgressNew = async (
      studentId: string,
      courseId: string,
    ) => {
      loading.value = true;
      try {
        const response = await service.getStudentCourseProgressNew(
          studentId,
          courseId,
        );
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchAllStudentProgress = async (studentId: string) => {
      loading.value = true;
      try {
        const response = await service.getAllStudentProgress(studentId);
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const downloadReportPDF = async (
      studentId: string,
      options?: { from?: string; to?: string; courseId?: string },
    ) => {
      loading.value = true;
      try {
        return await service.downloadStudentReportPDF(studentId, options);
      } finally {
        loading.value = false;
      }
    };

    const reset = () => {
      myProgress.value = [];
      courseProgress.value = [];
      studentProgress.value = [];
      studentAttempts.value = [];
    };

    return {
      myProgress,
      courseProgress,
      studentProgress,
      studentAttempts,
      loading,
      fetchMyProgress,
      fetchCourseProgress,
      fetchStudentProgress,
      fetchStudentCourseProgress,
      fetchStudentAttempts,
      fetchStudentCourseProgressNew,
      fetchAllStudentProgress,
      downloadReportPDF,
      reset,
    };
  });
