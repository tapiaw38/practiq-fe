import { defineStore } from "pinia";
import { ref } from "vue";
import type { IGradeService } from "@/services/grades/gradeService";
import type { Grade, UserProfile } from "@/types";

export const useGradeStore = (service: IGradeService) =>
  defineStore("grades", () => {
    const grades = ref<Grade[]>([]);
    const members = ref<Record<string, UserProfile[]>>({});
    const userGrades = ref<Record<string, Grade[]>>({});
    const loading = ref(false);

    const fetchGrades = async () => {
      loading.value = true;
      try {
        const response = await service.list();
        grades.value = response.data || [];
        return grades.value;
      } finally {
        loading.value = false;
      }
    };

    const createGrade = async (params: {
      name: string;
      description: string;
    }) => {
      loading.value = true;
      try {
        const response = await service.create(params);
        grades.value.push(response.data);
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateGrade = async (
      id: string,
      params: { name: string; description: string },
    ) => {
      loading.value = true;
      try {
        const response = await service.update(id, params);
        const index = grades.value.findIndex((grade) => grade.id === id);
        if (index !== -1) grades.value[index] = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const deleteGrade = async (id: string) => {
      loading.value = true;
      try {
        await service.delete(id);
        grades.value = grades.value.filter((grade) => grade.id !== id);
      } finally {
        loading.value = false;
      }
    };

    const addMember = async (gradeId: string, userId: string) => {
      loading.value = true;
      try {
        return await service.addMember(gradeId, userId);
      } finally {
        loading.value = false;
      }
    };

    const removeMember = async (gradeId: string, userId: string) => {
      loading.value = true;
      try {
        return await service.removeMember(gradeId, userId);
      } finally {
        loading.value = false;
      }
    };

    const fetchMembers = async (gradeId: string) => {
      loading.value = true;
      try {
        const response = await service.listMembers(gradeId);
        members.value[gradeId] = response.data || [];
        return members.value[gradeId];
      } finally {
        loading.value = false;
      }
    };

    const fetchUserGrades = async (userId: string) => {
      loading.value = true;
      try {
        const response = await service.listUserGrades(userId);
        userGrades.value[userId] = response.data || [];
        return userGrades.value[userId];
      } finally {
        loading.value = false;
      }
    };

    return {
      grades,
      members,
      userGrades,
      loading,
      fetchGrades,
      createGrade,
      updateGrade,
      deleteGrade,
      addMember,
      removeMember,
      fetchMembers,
      fetchUserGrades,
    };
  });
