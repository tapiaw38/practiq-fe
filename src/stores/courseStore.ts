import { defineStore } from "pinia";
import { ref } from "vue";
import type { ICourseService } from "@/services/courses/courseService";
import type { Course, Student } from "@/types";

export const useCourseStore = (service: ICourseService) =>
  defineStore("courses", () => {
    const courses = ref<Course[]>([]);
    const currentCourse = ref<Course | null>(null);
    const students = ref<Student[]>([]);
    const loading = ref(false);
    const loadingCourse = ref(false);
    const loadingStudents = ref(false);

    const fetchCourses = async (role?: string) => {
      loading.value = true;
      try {
        const response = await service.list(role);
        courses.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchCourse = async (id: string) => {
      loadingCourse.value = true;
      try {
        const response = await service.get(id);
        currentCourse.value = response.data;
        return response.data;
      } finally {
        loadingCourse.value = false;
      }
    };

    const createCourse = async (params: Partial<Course>) => {
      loading.value = true;
      try {
        const response = await service.create(params);
        courses.value.push(response.data);
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateCourse = async (id: string, params: Partial<Course>) => {
      loading.value = true;
      try {
        const response = await service.update(id, params);
        const index = courses.value.findIndex((c) => c.id === id);
        if (index !== -1) {
          courses.value[index] = response.data;
        }
        if (currentCourse.value?.id === id) {
          currentCourse.value = response.data;
        }
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const deleteCourse = async (id: string) => {
      loading.value = true;
      try {
        await service.delete(id);
        courses.value = courses.value.filter((c) => c.id !== id);
        if (currentCourse.value?.id === id) {
          currentCourse.value = null;
        }
      } finally {
        loading.value = false;
      }
    };

    const enrollCourse = async (courseId: string) => {
      loading.value = true;
      try {
        const response = await service.enroll(courseId);
        return response;
      } finally {
        loading.value = false;
      }
    };

    const fetchStudents = async (courseId: string) => {
      loadingStudents.value = true;
      try {
        const response = await service.getStudents(courseId);
        students.value = response.data;
        return response.data;
      } finally {
        loadingStudents.value = false;
      }
    };

    const reset = () => {
      courses.value = [];
      currentCourse.value = null;
      students.value = [];
    };

    return {
      courses,
      currentCourse,
      students,
      loading,
      loadingCourse,
      loadingStudents,
      fetchCourses,
      fetchCourse,
      createCourse,
      updateCourse,
      deleteCourse,
      enrollCourse,
      fetchStudents,
      reset,
    };
  });
