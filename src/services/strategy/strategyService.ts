import type { AxiosInstance } from "axios";
import type { LearningStrategy, CourseLearningStrategy } from "@/types";

type CourseLearningStrategyApi = Omit<CourseLearningStrategy, "strategy"> & {
  strategy?: LearningStrategy;
  strategy_name?: string;
  strategy_code?: string;
  strategy_description?: string;
};

function normalizeCourseStrategy(
  item: CourseLearningStrategyApi,
): CourseLearningStrategy {
  return {
    ...item,
    strategy: item.strategy || {
      id: item.strategy_id,
      name: item.strategy_name || "Estrategia",
      code: item.strategy_code || "",
      description: item.strategy_description || "",
      status: "active",
      created_at: item.created_at || "",
    },
  };
}

export type CreateStrategyParams = {
  name: string;
  code: string;
  description: string;
};

export type UpdateStrategyParams = {
  name?: string;
  code?: string;
  description?: string;
};

export interface IStrategyService {
  list(): Promise<{ data: LearningStrategy[] }>;
  get(id: string): Promise<{ data: LearningStrategy }>;
  create(params: CreateStrategyParams): Promise<{ data: LearningStrategy }>;
  update(
    id: string,
    params: UpdateStrategyParams,
  ): Promise<{ data: LearningStrategy }>;
  delete(id: string): Promise<void>;
  assignToCourse(
    courseId: string,
    strategyId: string,
  ): Promise<{ data: CourseLearningStrategy }>;
  getCourseStrategies(
    courseId: string,
  ): Promise<{ data: CourseLearningStrategy[] }>;
  removeCourseStrategy(assignmentId: string): Promise<void>;
}

export class StrategyService implements IStrategyService {
  constructor(private readonly api: AxiosInstance) {}

  async list(): Promise<{ data: LearningStrategy[] }> {
    const { data } = await this.api.get("/learning-strategies");
    return data;
  }

  async get(id: string): Promise<{ data: LearningStrategy }> {
    const { data } = await this.api.get(`/learning-strategies/${id}`);
    return data;
  }

  async create(
    params: CreateStrategyParams,
  ): Promise<{ data: LearningStrategy }> {
    const { data } = await this.api.post("/learning-strategies", params);
    return data;
  }

  async update(
    id: string,
    params: UpdateStrategyParams,
  ): Promise<{ data: LearningStrategy }> {
    const { data } = await this.api.put(`/learning-strategies/${id}`, params);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/learning-strategies/${id}`);
  }

  async assignToCourse(
    courseId: string,
    strategyId: string,
  ): Promise<{ data: CourseLearningStrategy }> {
    const { data } = await this.api.post(`/courses/${courseId}/strategies`, {
      strategy_id: strategyId,
    });
    return { data: normalizeCourseStrategy(data.data) };
  }

  async getCourseStrategies(
    courseId: string,
  ): Promise<{ data: CourseLearningStrategy[] }> {
    const { data } = await this.api.get(`/courses/${courseId}/strategies`);
    return { data: (data.data || []).map(normalizeCourseStrategy) };
  }

  async removeCourseStrategy(assignmentId: string): Promise<void> {
    await this.api.delete(`/course-learning-strategies/${assignmentId}`);
  }
}
