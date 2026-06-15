import { defineStore } from "pinia";
import { ref } from "vue";
import type { IAssignmentService } from "@/services/assignments/assignmentService";
import type { AssignedUser } from "@/types";

export const useAssignmentStore = (service: IAssignmentService) =>
  defineStore("assignments", () => {
    const teacherStudents = ref<Record<string, AssignedUser[]>>({});
    const studentTeachers = ref<Record<string, AssignedUser[]>>({});
    const myStudents = ref<AssignedUser[]>([]);
    const loading = ref(false);

    const assign = async (teacherId: string, studentId: string) => {
      loading.value = true;
      try {
        return await service.assign(teacherId, studentId);
      } finally {
        loading.value = false;
      }
    };

    const unassign = async (teacherId: string, studentId: string) => {
      loading.value = true;
      try {
        return await service.unassign(teacherId, studentId);
      } finally {
        loading.value = false;
      }
    };

    const fetchStudents = async (teacherId: string) => {
      loading.value = true;
      try {
        const response = await service.listStudents(teacherId);
        teacherStudents.value[teacherId] = response.data || [];
        return teacherStudents.value[teacherId];
      } finally {
        loading.value = false;
      }
    };

    const fetchTeachers = async (studentId: string) => {
      loading.value = true;
      try {
        const response = await service.listTeachers(studentId);
        studentTeachers.value[studentId] = response.data || [];
        return studentTeachers.value[studentId];
      } finally {
        loading.value = false;
      }
    };

    const fetchMyStudents = async () => {
      loading.value = true;
      try {
        const response = await service.listMyStudents();
        myStudents.value = response.data || [];
        return myStudents.value;
      } finally {
        loading.value = false;
      }
    };

    return {
      teacherStudents,
      studentTeachers,
      myStudents,
      loading,
      assign,
      unassign,
      fetchStudents,
      fetchTeachers,
      fetchMyStudents,
    };
  });
