import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { authApi } from "@/api/request/server";
import { AuthAdminService } from "@/services/auth/authAdminService";
import { useAuthAdminStore } from "@/stores/authAdminStore";
import type { AuthApiUser } from "@/types";

export const useAuthAdmin = () => {
  const toast = useToast();
  const service = new AuthAdminService(authApi);
  const store = useAuthAdminStore(service)();
  const { users, loading } = storeToRefs(store);

  const loadUsers = async (params?: {
    limit?: number;
    offset?: number;
    role?: string;
  }) => {
    try {
      return await store.fetchUsers(params);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los usuarios",
        life: 3000,
      });
      throw error;
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
    try {
      return await store.updateUser(id, params);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo actualizar el usuario",
        life: 3000,
      });
      throw error;
    }
  };

  const updateRoles = async (id: string, roles: string[]) => {
    try {
      return await store.updateRoles(id, roles);
    } catch (error: any) {
      toast.add({
        severity: "error",
        summary: "No se pudo cambiar el rol",
        detail:
          error?.response?.data?.message ||
          "Revisá los permisos y volvé a intentar.",
        life: 4000,
      });
      throw error;
    }
  };

  return {
    users,
    loading,
    loadUsers,
    updateUser,
    updateRoles,
  };
};
