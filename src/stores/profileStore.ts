import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  AcademicStatusParams,
  AssistantConfigParams,
  IProfileService,
  SyncProfileParams,
} from "@/services/profile/profileService";
import type { UserProfile } from "@/types";

export const useProfileStore = (service: IProfileService) =>
  defineStore("profiles", () => {
    const currentProfile = ref<UserProfile | null>(null);
    const profilesById = ref<Record<string, UserProfile>>({});
    const loading = ref(false);

    const syncProfile = async (params: SyncProfileParams) => {
      loading.value = true;
      try {
        const response = await service.sync(params);
        currentProfile.value = response.data;
        profilesById.value[response.data.id] = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchProfile = async () => {
      loading.value = true;
      try {
        const response = await service.get();
        currentProfile.value = response.data;
        profilesById.value[response.data.id] = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchProfileById = async (id: string) => {
      loading.value = true;
      try {
        const response = await service.getById(id);
        profilesById.value[id] = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateAssistantConfig = async (params: AssistantConfigParams) => {
      loading.value = true;
      try {
        const response = await service.updateAssistantConfig(params);
        currentProfile.value = response.data;
        profilesById.value[response.data.id] = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateAssistantConfigById = async (
      id: string,
      params: AssistantConfigParams,
    ) => {
      loading.value = true;
      try {
        const response = await service.updateAssistantConfigById(id, params);
        profilesById.value[id] = response.data;
        if (currentProfile.value?.id === id)
          currentProfile.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateAcademicStatusById = async (
      id: string,
      params: AcademicStatusParams,
    ) => {
      loading.value = true;
      try {
        const response = await service.updateAcademicStatusById(id, params);
        profilesById.value[id] = response.data;
        if (currentProfile.value?.id === id)
          currentProfile.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    return {
      currentProfile,
      profilesById,
      loading,
      syncProfile,
      fetchProfile,
      fetchProfileById,
      updateAssistantConfig,
      updateAssistantConfigById,
      updateAcademicStatusById,
    };
  });
