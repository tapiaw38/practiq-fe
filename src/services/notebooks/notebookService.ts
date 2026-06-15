import type { AxiosInstance } from "axios";
import type {
  Notebook,
  NotebookPage,
  NotebookSubmitJobStart,
  NotebookSubmitJobStatus,
  NotebookSubmissionFull,
} from "@/types";

export interface INotebookService {
  create(
    courseId: string,
    params: { title: string; description?: string; level?: number },
  ): Promise<{ data: Notebook }>;
  list(courseId: string): Promise<Notebook[]>;
  get(id: string, studentId?: string): Promise<{ data: Notebook }>;
  addPage(
    notebookId: string,
    params: {
      page_number: number;
      title: string;
      content_type: "canvas" | "text";
      content_data: string;
      instructions: string;
    },
  ): Promise<{ data: NotebookPage }>;
  updatePage(
    pageId: string,
    params: {
      title: string;
      content_type: "canvas" | "text";
      content_data: string;
      instructions: string;
    },
  ): Promise<void>;
  update(
    id: string,
    params: { title: string; description?: string },
  ): Promise<{ data: Notebook }>;
  delete(id: string): Promise<void>;
  saveSubmission(
    pageId: string,
    params: { canvas_data?: string; answer_text?: string },
  ): Promise<void>;
  saveSubmissionAsync(
    pageId: string,
    params: { canvas_data?: string; answer_text?: string },
  ): Promise<{ data: NotebookSubmitJobStart }>;
  getSubmissionJob(jobId: string): Promise<{ data: NotebookSubmitJobStatus }>;
  getSubmissions(params?: {
    notebook_id?: string;
    student_id?: string;
    reviewed?: boolean;
    course_id?: string;
  }): Promise<{ data: NotebookSubmissionFull[] }>;
  triggerAIReview(
    submissionId: string,
  ): Promise<{ data: NotebookSubmissionFull }>;
  updateManualReview(
    submissionId: string,
    params: {
      teacher_is_correct: boolean;
      teacher_feedback: string;
    },
  ): Promise<{ data: NotebookSubmissionFull }>;
}

export class NotebookService implements INotebookService {
  constructor(private readonly api: AxiosInstance) {}
  async create(
    courseId: string,
    params: { title: string; description?: string; level?: number },
  ): Promise<{ data: Notebook }> {
    const { data } = await this.api.post(
      `/courses/${courseId}/notebooks`,
      params,
    );
    return data;
  }

  async list(courseId: string): Promise<Notebook[]> {
    const { data } = await this.api.get(`/courses/${courseId}/notebooks`);
    // backend returns [{data: Notebook}, ...] — unwrap each item
    return (data as Array<{ data: Notebook }>).map((item) => item.data);
  }

  async get(id: string, studentId?: string): Promise<{ data: Notebook }> {
    const params = studentId ? { student_id: studentId } : {};
    const { data } = await this.api.get(`/notebooks/${id}`, { params });
    return data;
  }

  async addPage(
    notebookId: string,
    params: {
      page_number: number;
      title: string;
      content_type: "canvas" | "text";
      content_data: string;
      instructions: string;
    },
  ): Promise<{ data: NotebookPage }> {
    const { data } = await this.api.post(
      `/notebooks/${notebookId}/pages`,
      params,
    );
    return data;
  }

  async updatePage(
    pageId: string,
    params: {
      title: string;
      content_type: "canvas" | "text";
      content_data: string;
      instructions: string;
    },
  ): Promise<void> {
    await this.api.put(`/notebook-pages/${pageId}`, params);
  }

  async update(
    id: string,
    params: { title: string; description?: string },
  ): Promise<{ data: Notebook }> {
    const { data } = await this.api.put(`/notebooks/${id}`, params);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/notebooks/${id}`);
  }

  async saveSubmission(
    pageId: string,
    params: { canvas_data?: string; answer_text?: string },
  ): Promise<void> {
    await this.api.post(`/notebook-pages/${pageId}/submit`, params);
  }

  async saveSubmissionAsync(
    pageId: string,
    params: { canvas_data?: string; answer_text?: string },
  ): Promise<{ data: NotebookSubmitJobStart }> {
    const { data } = await this.api.post(
      `/notebook-pages/${pageId}/submit-async`,
      params,
    );
    return data;
  }

  async getSubmissionJob(
    jobId: string,
  ): Promise<{ data: NotebookSubmitJobStatus }> {
    const { data } = await this.api.get(`/notebook-pages/submit-jobs/${jobId}`);
    return data;
  }

  // Teacher review methods
  async getSubmissions(params?: {
    notebook_id?: string;
    student_id?: string;
    reviewed?: boolean;
    course_id?: string;
  }): Promise<{ data: NotebookSubmissionFull[] }> {
    const { data } = await this.api.get("/notebook-submissions", { params });
    return data;
  }

  async triggerAIReview(
    submissionId: string,
  ): Promise<{ data: NotebookSubmissionFull }> {
    const { data } = await this.api.post(
      `/notebook-submissions/${submissionId}/review`,
    );
    return data;
  }

  async updateManualReview(
    submissionId: string,
    params: {
      teacher_is_correct: boolean;
      teacher_feedback: string;
    },
  ): Promise<{ data: NotebookSubmissionFull }> {
    const { data } = await this.api.put(
      `/notebook-submissions/${submissionId}/teacher-review`,
      params,
    );
    return data;
  }
}
