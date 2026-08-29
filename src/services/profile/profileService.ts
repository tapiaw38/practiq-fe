import type { AxiosInstance } from "axios";
import type { UserProfile } from "@/types";

export type SyncProfileParams = {
  name: string;
  email: string;
  profile_type: "teacher" | "student";
  assistant_base_url?: string;
  assistant_api_key?: string;
};

export type AssistantConfigParams = {
  assistant_base_url: string;
  assistant_api_key: string;
  ui_theme?: "primary" | "secondary";
};

export type AcademicStatusParams = {
  academic_status: "active" | "blocked";
};

export interface IProfileService {
  sync(params: SyncProfileParams): Promise<{ data: UserProfile }>;
  get(): Promise<{ data: UserProfile }>;
  getById(id: string): Promise<{ data: UserProfile }>;
  updateAssistantConfig(
    params: AssistantConfigParams,
  ): Promise<{ data: UserProfile }>;
  updateAssistantConfigById(
    id: string,
    params: AssistantConfigParams,
  ): Promise<{ data: UserProfile }>;
  updateAcademicStatusById(
    id: string,
    params: AcademicStatusParams,
  ): Promise<{ data: UserProfile }>;
}

/** Empty when the browser cannot tell; the API falls back to its default. */
function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

export class ProfileService implements IProfileService {
  constructor(private readonly api: AxiosInstance) {}

  async sync(params: {
    name: string;
    email: string;
    profile_type: "teacher" | "student";
    assistant_base_url?: string;
    assistant_api_key?: string;
  }): Promise<{ data: UserProfile }> {
    // The browser is the only place that knows the student's zone, and the
    // streak counts calendar days in it. Reported here so the server owns the
    // value: taking it from each request would let a client pick whichever
    // zone grows their streak, and server-side reports have no browser to ask.
    const { data } = await this.api.post("/profile", {
      ...params,
      timezone: detectTimezone(),
    });
    return data;
  }

  async get(): Promise<{ data: UserProfile }> {
    const { data } = await this.api.get("/profile");
    return data;
  }

  async getById(id: string): Promise<{ data: UserProfile }> {
    const { data } = await this.api.get(`/profile/${id}`);
    return data;
  }

  async updateAssistantConfig(params: {
    assistant_base_url: string;
    assistant_api_key: string;
  }): Promise<{ data: UserProfile }> {
    const { data } = await this.api.put("/profile/assistant-config", params);
    return data;
  }

  async updateAssistantConfigById(
    id: string,
    params: {
      assistant_base_url: string;
      assistant_api_key: string;
    },
  ): Promise<{ data: UserProfile }> {
    const { data } = await this.api.put(
      `/profile/${id}/assistant-config`,
      params,
    );
    return data;
  }

  async updateAcademicStatusById(
    id: string,
    params: {
      academic_status: "active" | "blocked";
    },
  ): Promise<{ data: UserProfile }> {
    const { data } = await this.api.put(
      `/profile/${id}/academic-status`,
      params,
    );
    return data;
  }
}
