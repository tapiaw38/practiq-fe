import type { AxiosInstance } from "axios";
import type { InvitationRedemption, StudentInvitation } from "@/types";

export interface IInvitationService {
  getActive(): Promise<{ data: StudentInvitation | null }>;
  create(): Promise<{ data: StudentInvitation }>;
  revoke(id: string): Promise<void>;
  redeem(code: string): Promise<{ data: InvitationRedemption }>;
}

export class InvitationService implements IInvitationService {
  constructor(private readonly api: AxiosInstance) {}

  async getActive(): Promise<{ data: StudentInvitation | null }> {
    const { data } = await this.api.get("/invitations/active");
    return data;
  }

  async create(): Promise<{ data: StudentInvitation }> {
    const { data } = await this.api.post("/invitations");
    return data;
  }

  async revoke(id: string): Promise<void> {
    await this.api.delete(`/invitations/${id}`);
  }

  async redeem(code: string): Promise<{ data: InvitationRedemption }> {
    const { data } = await this.api.post("/invitations/redeem", { code });
    return data;
  }
}
