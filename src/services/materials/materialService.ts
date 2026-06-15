import type { AxiosInstance } from "axios";
import type { Material } from "@/types";

export interface IMaterialService {
  create(
    courseId: string,
    params: Partial<Material>,
  ): Promise<{ data: Material }>;
  list(courseId: string): Promise<{ data: Material[] }>;
  delete(id: string): Promise<void>;
}

export class MaterialService implements IMaterialService {
  constructor(private readonly api: AxiosInstance) {}

  async create(
    courseId: string,
    params: Partial<Material>,
  ): Promise<{ data: Material }> {
    const { data } = await this.api.post(
      `/courses/${courseId}/materials`,
      params,
    );
    return data;
  }

  async list(courseId: string): Promise<{ data: Material[] }> {
    const { data } = await this.api.get(`/courses/${courseId}/materials`);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/materials/${id}`);
  }
}
