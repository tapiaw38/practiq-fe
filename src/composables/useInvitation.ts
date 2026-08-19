import { ref } from "vue";
import { practiqApi } from "@/api/request/server";
import { InvitationService } from "@/services/invitations/invitationService";
import type { InvitationRedemption, StudentInvitation } from "@/types";

// Sin store de Pinia a propósito: el código de invitación lo usan dos
// pantallas que no comparten estado entre sí, así que un ref local alcanza.
export const useInvitation = () => {
  const service = new InvitationService(practiqApi);

  const invitation = ref<StudentInvitation | null>(null);
  const loading = ref(false);
  const generating = ref(false);
  const redeeming = ref(false);

  const loadActive = async () => {
    loading.value = true;
    try {
      const { data } = await service.getActive();
      invitation.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  };

  const generate = async () => {
    generating.value = true;
    try {
      const { data } = await service.create();
      invitation.value = data;
      return data;
    } finally {
      generating.value = false;
    }
  };

  const revoke = async (id: string) => {
    await service.revoke(id);
    invitation.value = null;
  };

  const redeem = async (code: string): Promise<InvitationRedemption> => {
    redeeming.value = true;
    try {
      const { data } = await service.redeem(code);
      return data;
    } finally {
      redeeming.value = false;
    }
  };

  return {
    invitation,
    loading,
    generating,
    redeeming,
    loadActive,
    generate,
    revoke,
    redeem,
  };
};
