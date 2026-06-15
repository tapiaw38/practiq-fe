import type { AxiosInstance } from "axios";
import type {
  PracticeSheet,
  SubmitInput,
  SubmitJobStart,
  SubmitJobStatus,
  SubmitResult,
} from "@/types";

export interface IPracticeSheetService {
  create(
    courseId: string,
    params: {
      topic_id?: string;
      strategy_id?: string;
      title: string;
      level?: number;
      sheet_type?: string;
      test_style?: string;
      exercise_ids: string[];
    },
  ): Promise<{ data: PracticeSheet }>;
  list(courseId: string): Promise<{ data: PracticeSheet[] }>;
  get(id: string): Promise<{ data: PracticeSheet }>;
  update(
    id: string,
    params: {
      title: string;
      topic_id?: string;
      level?: number;
      sheet_type?: string;
      test_style?: string;
      exercise_ids?: string[];
    },
  ): Promise<{ data: PracticeSheet }>;
  delete(id: string): Promise<void>;
  submit(id: string, input: SubmitInput): Promise<{ data: SubmitResult }>;
  submitAsync(
    id: string,
    input: SubmitInput,
  ): Promise<{ data: SubmitJobStart }>;
  getSubmitJob(jobId: string): Promise<{ data: SubmitJobStatus }>;
}

export class PracticeSheetService implements IPracticeSheetService {
  constructor(private readonly api: AxiosInstance) {}

  async create(
    courseId: string,
    params: {
      topic_id?: string;
      strategy_id?: string;
      title: string;
      level?: number;
      sheet_type?: string;
      test_style?: string;
      exercise_ids: string[];
    },
  ): Promise<{ data: PracticeSheet }> {
    const { data } = await this.api.post(
      `/courses/${courseId}/practice-sheets`,
      params,
    );
    return data;
  }

  async list(courseId: string): Promise<{ data: PracticeSheet[] }> {
    const { data } = await this.api.get(`/courses/${courseId}/practice-sheets`);
    return data;
  }

  async get(id: string): Promise<{ data: PracticeSheet }> {
    const { data } = await this.api.get(`/practice-sheets/${id}`);
    return data;
  }

  async update(
    id: string,
    params: {
      title: string;
      topic_id?: string;
      level?: number;
      sheet_type?: string;
      test_style?: string;
      exercise_ids?: string[];
    },
  ): Promise<{ data: PracticeSheet }> {
    const { data } = await this.api.put(`/practice-sheets/${id}`, params);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/practice-sheets/${id}`);
  }

  async submit(
    id: string,
    input: SubmitInput,
  ): Promise<{ data: SubmitResult }> {
    const { data } = await this.api.post(
      `/practice-sheets/${id}/submit`,
      input,
    );
    return data;
  }

  async submitAsync(
    id: string,
    input: SubmitInput,
  ): Promise<{ data: SubmitJobStart }> {
    const { data } = await this.api.post(
      `/practice-sheets/${id}/submit-async`,
      input,
    );
    return data;
  }

  async getSubmitJob(jobId: string): Promise<{ data: SubmitJobStatus }> {
    const { data } = await this.api.get(
      `/practice-sheets/submit-jobs/${jobId}`,
    );
    return data;
  }
}
