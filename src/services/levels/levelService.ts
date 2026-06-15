import type { AxiosInstance } from "axios";
import type { CourseLevelsResponse } from "@/types";

export interface ILevelService {
  getCourseLevels(courseId: string): Promise<CourseLevelsResponse>;
}

export class LevelService implements ILevelService {
  constructor(private readonly api: AxiosInstance) {}

  async getCourseLevels(courseId: string): Promise<CourseLevelsResponse> {
    const { data } = await this.api.get(`/courses/${courseId}/levels`);
    return data as CourseLevelsResponse;
  }
}
