import type { AxiosInstance } from "axios";
import type { Grade, OperationResult, UserProfile } from "@/types";

export interface IGradeService {
  list(): Promise<{ data: Grade[] }>;
  create(params: {
    name: string;
    description: string;
  }): Promise<{ data: Grade }>;
  update(
    id: string,
    params: { name: string; description: string },
  ): Promise<{ data: Grade }>;
  delete(id: string): Promise<void>;
  addMember(
    gradeId: string,
    userId: string,
  ): Promise<{ data: OperationResult }>;
  removeMember(
    gradeId: string,
    userId: string,
  ): Promise<{ data: OperationResult }>;
  listMembers(gradeId: string): Promise<{ data: UserProfile[] }>;
  listUserGrades(userId: string): Promise<{ data: Grade[] }>;
}

export class GradeService implements IGradeService {
  constructor(private readonly api: AxiosInstance) {}

  async list(): Promise<{ data: Grade[] }> {
    const { data } = await this.api.get("/grades");
    return data;
  }

  async create(params: {
    name: string;
    description: string;
  }): Promise<{ data: Grade }> {
    const { data } = await this.api.post("/grades", params);
    return data;
  }

  async update(
    id: string,
    params: { name: string; description: string },
  ): Promise<{ data: Grade }> {
    const { data } = await this.api.put(`/grades/${id}`, params);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/grades/${id}`);
  }

  async addMember(
    gradeId: string,
    userId: string,
  ): Promise<{ data: OperationResult }> {
    const { data } = await this.api.post(`/grades/${gradeId}/members`, {
      user_id: userId,
    });
    return data;
  }

  async removeMember(
    gradeId: string,
    userId: string,
  ): Promise<{ data: OperationResult }> {
    const { data } = await this.api.delete(
      `/grades/${gradeId}/members/${userId}`,
    );
    return data;
  }

  async listMembers(gradeId: string): Promise<{ data: UserProfile[] }> {
    const { data } = await this.api.get(`/grades/${gradeId}/members`);
    return data;
  }

  async listUserGrades(userId: string): Promise<{ data: Grade[] }> {
    const { data } = await this.api.get(`/users/${userId}/grades`);
    return data;
  }
}
