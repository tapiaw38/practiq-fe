import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  AcademicStatusParams,
  UIThemeParams,
  IProfileService,
  ProfileTypeParams,
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

    const updateUITheme = async (params: UIThemeParams) => {
      loading.value = true;
      try {
        const response = await service.updateUITheme(params);
        currentProfile.value = response.data;
        profilesById.value[response.data.id] = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateUIThemeById = async (
      id: string,
      params: UIThemeParams,
    ) => {
      loading.value = true;
      try {
        const response = await service.updateUIThemeById(id, params);
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

    const updateProfileTypeById = async (
      id: string,
      params: ProfileTypeParams,
    ) => {
      loading.value = true;
      try {
        const response = await service.updateProfileTypeById(id, params);
        profilesById.value[id] = response.data;
        if (currentProfile.value?.id === id) currentProfile.value = response.data;
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
      updateUITheme,
      updateUIThemeById,
      updateAcademicStatusById,
      updateProfileTypeById,
    };
  });
