import type { AxiosInstance } from "axios";
import type { Material } from "@/types";

export interface IMaterialService {
  create(
    courseId: string,
    params: Partial<Material>,
  ): Promise<{ data: Material }>;
  list(courseId: string): Promise<{ data: Material[] }>;
  update(id: string, params: Partial<Material>): Promise<{ data: Material }>;
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

  /**
   * One material with its whole extracted text.
   *
   * The listing carries a preview of that text; a material holds the full
   * extracted document, which is far more than the two clamped lines a list
   * shows. Read this before displaying or re-saving the text.
   */
  async get(id: string): Promise<{ data: Material }> {
    const { data } = await this.api.get(`/materials/${id}`);
    return data;
  }

  async list(courseId: string): Promise<{ data: Material[] }> {
    const { data } = await this.api.get(`/courses/${courseId}/materials`);
    return data;
  }

  // The endpoint replaces every field, so callers send the whole material.
  async update(
    id: string,
    params: Partial<Material>,
  ): Promise<{ data: Material }> {
    const { data } = await this.api.put(`/materials/${id}`, params);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/materials/${id}`);
  }
}
