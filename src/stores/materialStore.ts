import { defineStore } from "pinia";
import { ref } from "vue";
import type { Material } from "@/types";
import type { IMaterialService } from "@/services/materials/materialService";

export const useMaterialStore = (service: IMaterialService) =>
  defineStore("materials", () => {
    const materials = ref<Material[]>([]);
    const loading = ref(false);

    const fetchMaterials = async (courseId: string) => {
      loading.value = true;
      try {
        const response = await service.list(courseId);
        materials.value = response.data || [];
        return response.data || [];
      } finally {
        loading.value = false;
      }
    };

    const createMaterial = async (
      courseId: string,
      params: Partial<Material>,
    ) => {
      loading.value = true;
      try {
        const response = await service.create(courseId, params);
        materials.value.push(response.data);
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const deleteMaterial = async (id: string) => {
      loading.value = true;
      try {
        await service.delete(id);
        materials.value = materials.value.filter((m) => m.id !== id);
      } finally {
        loading.value = false;
      }
    };

    return {
      materials,
      loading,
      fetchMaterials,
      createMaterial,
      deleteMaterial,
    };
  });
