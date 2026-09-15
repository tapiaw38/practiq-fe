import type { AxiosInstance } from "axios";

export type SchoolKind = "personal" | "institution";
export type SchoolBilling = "subscription" | "direct";
export type SchoolStatus = "active" | "suspended" | "closed";
export type SchoolRole = "admin" | "teacher" | "student";

export interface School {
  id: string;
  name: string;
  kind: SchoolKind;
  /** direct means invoiced outside the product: no plan, no student limit. */
  billing: SchoolBilling;
  status: SchoolStatus;
  /** The asking user's role in it. Absent when listing as a superadmin. */
  role?: SchoolRole;
}

export interface SchoolMember {
  user_id: string;
  name: string;
  email: string;
  role: SchoolRole;
  active: boolean;
}

export interface SchoolInput {
  name?: string;
  kind?: SchoolKind;
  billing?: SchoolBilling;
}

export interface CloseSchoolInput {
  confirm_name: string;
  reason?: string;
}

export interface SchoolArchive {
  school: School;
  members: SchoolMember[];
  courses: { id: string; title: string; grade_name: string; subject_name: string }[];
}

export interface ISchoolService {
  /** What the asking user belongs to. Feeds the school selector. */
  mine(): Promise<{ data: School[] }>;
  list(): Promise<{ data: School[] }>;
  create(input: SchoolInput): Promise<{ data: School }>;
  update(id: string, input: SchoolInput): Promise<{ data: School }>;
  close(id: string, input: CloseSchoolInput): Promise<{ data: School }>;
  reopen(id: string): Promise<{ data: School }>;
  archive(id: string): Promise<{ data: SchoolArchive }>;
  members(id: string): Promise<{ data: SchoolMember[] }>;
  addMember(id: string, userId: string, role: SchoolRole): Promise<void>;
  removeMember(id: string, userId: string): Promise<void>;
}

export class SchoolService implements ISchoolService {
  constructor(private readonly api: AxiosInstance) {}

  async mine(): Promise<{ data: School[] }> {
    const { data } = await this.api.get("/schools/mine");
    return data;
  }

  /** Every school on the platform. Superadmin only. */
  async list(): Promise<{ data: School[] }> {
    const { data } = await this.api.get("/schools");
    return data;
  }

  async create(input: SchoolInput): Promise<{ data: School }> {
    const { data } = await this.api.post("/schools", input);
    return data;
  }

  async update(id: string, input: SchoolInput): Promise<{ data: School }> {
    const { data } = await this.api.put(`/schools/${id}`, input);
    return data;
  }

  async close(id: string, input: CloseSchoolInput): Promise<{ data: School }> {
    const { data } = await this.api.post(`/schools/${id}/close`, input);
    return data;
  }

  async reopen(id: string): Promise<{ data: School }> {
    const { data } = await this.api.post(`/schools/${id}/reopen`);
    return data;
  }

  async archive(id: string): Promise<{ data: SchoolArchive }> {
    const { data } = await this.api.get(`/schools/${id}/archive`);
    return data;
  }

  async members(id: string): Promise<{ data: SchoolMember[] }> {
    const { data } = await this.api.get(`/schools/${id}/members`);
    return data;
  }

  async addMember(id: string, userId: string, role: SchoolRole): Promise<void> {
    await this.api.post(`/schools/${id}/members`, { user_id: userId, role });
  }

  async removeMember(id: string, userId: string): Promise<void> {
    await this.api.delete(`/schools/${id}/members/${userId}`);
  }
}
