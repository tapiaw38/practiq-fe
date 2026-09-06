import { practiqApi } from "@/api/request/server";
import type { School, SchoolMembership } from "@/types/schools";

export class SchoolService {
  async list(): Promise<School[]> {
    const { data } = await practiqApi.get<{ data: School[] }>("/schools");
    return data.data;
  }

  async create(name: string, slug: string): Promise<School> {
    const { data } = await practiqApi.post<{ data: School }>("/schools", { name, slug });
    return data.data;
  }

  async members(schoolId: string): Promise<SchoolMembership[]> {
    const { data } = await practiqApi.get<{ data: SchoolMembership[] }>(`/schools/${schoolId}/members`);
    return data.data;
  }

  async addMember(schoolId: string, input: { user_id: string; membership_role: "admin" | "member"; profile_type: "teacher" | "student" }): Promise<SchoolMembership> {
    const { data } = await practiqApi.post<{ data: SchoolMembership }>(`/schools/${schoolId}/members`, input);
    return data.data;
  }

  async removeMember(schoolId: string, userId: string): Promise<void> {
    await practiqApi.delete(`/schools/${schoolId}/members/${encodeURIComponent(userId)}`);
  }
}

export const schoolService = new SchoolService();
