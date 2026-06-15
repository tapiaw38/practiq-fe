import type { AxiosInstance } from "axios";
import type { Subject } from "@/types";

export interface ISubjectService {
  list(): Promise<{ data: Subject[] }>;
  create(params: {
    name: string;
    description: string;
  }): Promise<{ data: Subject }>;
  update(
    id: string,
    params: { name: string; description: string },
  ): Promise<{ data: Subject }>;
  delete(id: string): Promise<void>;
}

export class SubjectService implements ISubjectService {
  constructor(private readonly api: AxiosInstance) {}

  async list(): Promise<{ data: Subject[] }> {
    const { data } = await this.api.get("/subjects");
    return data;
  }

  async create(params: {
    name: string;
    description: string;
  }): Promise<{ data: Subject }> {
    const { data } = await this.api.post("/subjects", params);
    return data;
  }

  async update(
    id: string,
    params: { name: string; description: string },
  ): Promise<{ data: Subject }> {
    const { data } = await this.api.put(`/subjects/${id}`, params);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/subjects/${id}`);
  }
}
