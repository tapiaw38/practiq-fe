import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { practiqApi } from "@/api/request/server";
import {
  ProfileService,
  type AcademicStatusParams,
  type AssistantConfigParams,
  type SyncProfileParams,
} from "@/services/profile/profileService";
import { useProfileStore } from "@/stores/profileStore";

export const useProfile = () => {
  const toast = useToast();
  const service = new ProfileService(practiqApi);
  const store = useProfileStore(service)();
  const { currentProfile, profilesById, loading } = storeToRefs(store);

  const syncProfile = async (params: SyncProfileParams) => {
    try {
      return await store.syncProfile(params);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo sincronizar el perfil",
        life: 3000,
      });
      throw error;
    }
  };

  const loadProfile = async () => {
    try {
      return await store.fetchProfile();
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar el perfil",
        life: 3000,
      });
      throw error;
    }
  };

  const loadProfileById = async (id: string) => {
    try {
      return await store.fetchProfileById(id);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar el perfil",
        life: 3000,
      });
      throw error;
    }
  };

  const updateAssistantConfig = async (params: AssistantConfigParams) => {
    try {
      const profile = await store.updateAssistantConfig(params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Configuración guardada",
        life: 3000,
      });
      return profile;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo guardar la configuración",
        life: 3000,
      });
      throw error;
    }
  };

  const updateAssistantConfigById = async (
    id: string,
    params: AssistantConfigParams,
  ) => {
    try {
      const profile = await store.updateAssistantConfigById(id, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Configuración guardada",
        life: 3000,
      });
      return profile;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo guardar la configuración",
        life: 3000,
      });
      throw error;
    }
  };

  const updateAcademicStatusById = async (
    id: string,
    params: AcademicStatusParams,
  ) => {
    try {
      return await store.updateAcademicStatusById(id, params);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cambiar el estado académico",
        life: 3000,
      });
      throw error;
    }
  };

  return {
    currentProfile,
    profilesById,
    loading,
    syncProfile,
    loadProfile,
    loadProfileById,
    updateAssistantConfig,
    updateAssistantConfigById,
    updateAcademicStatusById,
  };
};
