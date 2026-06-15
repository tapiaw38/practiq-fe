import { defineStore } from "pinia";
import { ref } from "vue";
import type { ISubjectService } from "@/services/subjects/subjectService";
import type { Subject } from "@/types";

export const useSubjectStore = (service: ISubjectService) =>
  defineStore("subjects", () => {
    const subjects = ref<Subject[]>([]);
    const loading = ref(false);

    const fetchSubjects = async () => {
      loading.value = true;
      try {
        const response = await service.list();
        subjects.value = response.data || [];
        return subjects.value;
      } finally {
        loading.value = false;
      }
    };

    const createSubject = async (params: {
      name: string;
      description: string;
    }) => {
      loading.value = true;
      try {
        const response = await service.create(params);
        subjects.value.push(response.data);
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateSubject = async (
      id: string,
      params: { name: string; description: string },
    ) => {
      loading.value = true;
      try {
        const response = await service.update(id, params);
        const index = subjects.value.findIndex((subject) => subject.id === id);
        if (index !== -1) subjects.value[index] = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const deleteSubject = async (id: string) => {
      loading.value = true;
      try {
        await service.delete(id);
        subjects.value = subjects.value.filter((subject) => subject.id !== id);
      } finally {
        loading.value = false;
      }
    };

    return {
      subjects,
      loading,
      fetchSubjects,
      createSubject,
      updateSubject,
      deleteSubject,
    };
  });
