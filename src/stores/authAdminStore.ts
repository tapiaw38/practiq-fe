import { defineStore } from "pinia";
import { ref } from "vue";
import type { IAuthAdminService } from "@/services/auth/authAdminService";
import type { AuthApiUser } from "@/types";

export const useAuthAdminStore = (service: IAuthAdminService) =>
  defineStore("authAdmin", () => {
    const users = ref<AuthApiUser[]>([]);
    const loading = ref(false);

    const fetchUsers = async (params?: {
      limit?: number;
      offset?: number;
      role?: string;
    }) => {
      loading.value = true;
      try {
        const response = await service.listUsers(params);
        users.value = response.data || [];
        return users.value;
      } finally {
        loading.value = false;
      }
    };

    const updateUser = async (
      id: string,
      params: Partial<
        Pick<
          AuthApiUser,
          "first_name" | "last_name" | "email" | "is_active" | "verified_email"
        >
      >,
    ) => {
      loading.value = true;
      try {
        const response = await service.updateUser(id, params);
        const index = users.value.findIndex((user) => user.id === id);
        if (index !== -1) users.value[index] = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    return {
      users,
      loading,
      fetchUsers,
      updateUser,
    };
  });
