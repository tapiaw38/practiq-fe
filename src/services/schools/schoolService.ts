import type { AxiosInstance } from "axios";

export type SchoolKind = "personal" | "institution";
export type SchoolBilling = "subscription" | "direct";
export type SchoolRole = "admin" | "teacher" | "student";

export interface School {
  id: string;
  name: string;
  kind: SchoolKind;
  /** direct means invoiced outside the product: no plan, no student limit. */
  billing: SchoolBilling;
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

export interface ISchoolService {
  /** What the asking user belongs to. Feeds the school selector. */
  mine(): Promise<{ data: School[] }>;
  list(): Promise<{ data: School[] }>;
  create(input: SchoolInput): Promise<{ data: School }>;
  update(id: string, input: SchoolInput): Promise<{ data: School }>;
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
