import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { MaterialService } from "@/services/materials/materialService";
import { useMaterialStore } from "@/stores/materialStore";
import { practiqApi } from "@/api/request/server";
import type { Material } from "@/types";

export const useMaterial = () => {
  const toast = useToast();
  const service = new MaterialService(practiqApi);
  const store = useMaterialStore(service)();

  const { materials, loading } = storeToRefs(store);

  const loadMaterials = async (courseId: string) => {
    try {
      return await store.fetchMaterials(courseId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los materiales",
        life: 3000,
      });
      throw error;
    }
  };

  const createMaterial = async (
    courseId: string,
    params: Partial<Material>,
  ) => {
    try {
      const result = await store.createMaterial(courseId, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Material creado correctamente",
        life: 3000,
      });
      return result;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear el material",
        life: 3000,
      });
      throw error;
    }
  };

  const updateMaterial = async (id: string, params: Partial<Material>) => {
    try {
      const result = await store.updateMaterial(id, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Material actualizado correctamente",
        life: 3000,
      });
      return result;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo actualizar el material",
        life: 3000,
      });
      throw error;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      await store.deleteMaterial(id);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Material eliminado correctamente",
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar el material",
        life: 3000,
      });
      throw error;
    }
  };

  return {
    materials,
    loading,
    loadMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
  };
};
