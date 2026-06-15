import type { AxiosInstance } from "axios";
import type { Topic } from "@/types";

export interface ITopicService {
  create(courseId: string, params: Partial<Topic>): Promise<{ data: Topic }>;
  list(courseId: string): Promise<{ data: Topic[] }>;
  update(id: string, params: Partial<Topic>): Promise<{ data: Topic }>;
  delete(id: string): Promise<void>;
}

export class TopicService implements ITopicService {
  constructor(private readonly api: AxiosInstance) {}

  async create(
    courseId: string,
    params: Partial<Topic>,
  ): Promise<{ data: Topic }> {
    const { data } = await this.api.post(`/courses/${courseId}/topics`, params);
    return data;
  }

  async list(courseId: string): Promise<{ data: Topic[] }> {
    const { data } = await this.api.get(`/courses/${courseId}/topics`);
    return data;
  }

  async update(id: string, params: Partial<Topic>): Promise<{ data: Topic }> {
    const { data } = await this.api.put(`/topics/${id}`, params);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/topics/${id}`);
  }
}
