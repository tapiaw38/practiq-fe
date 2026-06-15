import type { AxiosInstance } from "axios";
import type {
  TopicProgress,
  StudentAttempt,
  CourseProgress,
  ProgressResponse,
} from "@/types";

export interface IProgressService {
  getMyProgress(): Promise<ProgressResponse>;
  getCourseProgress(courseId: string): Promise<{ data: TopicProgress[] }>;
  getStudentProgress(studentId: string): Promise<{ data: TopicProgress[] }>;
  getStudentCourseProgress(
    studentId: string,
    courseId: string,
  ): Promise<{ data: TopicProgress[] }>;
  getStudentAttempts(
    studentId: string,
    sheetId: string,
  ): Promise<{ data: StudentAttempt[] }>;
  getStudentCourseProgressNew(
    studentId: string,
    courseId: string,
  ): Promise<{ data: CourseProgress }>;
  getAllStudentProgress(studentId: string): Promise<{ data: CourseProgress[] }>;
  downloadStudentReportPDF(
    studentId: string,
    options?: { from?: string; to?: string; courseId?: string },
  ): Promise<Blob>;
}

export class ProgressService implements IProgressService {
  constructor(private readonly api: AxiosInstance) {}

  async getMyProgress(): Promise<ProgressResponse> {
    const { data } = await this.api.get("/students/me/progress");
    return data;
  }

  async getCourseProgress(
    courseId: string,
  ): Promise<{ data: TopicProgress[] }> {
    const { data } = await this.api.get(
      `/students/me/courses/${courseId}/progress`,
    );
    return data;
  }

  async getStudentProgress(
    studentId: string,
  ): Promise<{ data: TopicProgress[] }> {
    const { data } = await this.api.get(
      `/teachers/me/students/${studentId}/progress`,
    );
    return data;
  }

  async getStudentCourseProgress(
    studentId: string,
    courseId: string,
  ): Promise<{ data: TopicProgress[] }> {
    const { data } = await this.api.get(
      `/teachers/me/students/${studentId}/courses/${courseId}/progress`,
    );
    return data;
  }

  async getStudentAttempts(
    studentId: string,
    sheetId: string,
  ): Promise<{ data: StudentAttempt[] }> {
    const { data } = await this.api.get(
      `/teachers/me/students/${studentId}/attempts`,
      {
        params: { sheet_id: sheetId },
      },
    );
    return data;
  }

  async getStudentCourseProgressNew(
    studentId: string,
    courseId: string,
  ): Promise<{ data: CourseProgress }> {
    const { data } = await this.api.get(
      `/students/${studentId}/courses/${courseId}/progress`,
    );
    return data;
  }

  async getAllStudentProgress(
    studentId: string,
  ): Promise<{ data: CourseProgress[] }> {
    const { data } = await this.api.get(`/students/${studentId}/progress`);
    return data;
  }

  async downloadStudentReportPDF(
    studentId: string,
    options?: { from?: string; to?: string; courseId?: string },
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (options?.from) params.append("from", options.from);
    if (options?.to) params.append("to", options.to);
    if (options?.courseId) params.append("course_id", options.courseId);

    const queryString = params.toString();
    const url = `/teachers/me/students/${studentId}/report.pdf${queryString ? `?${queryString}` : ""}`;

    const response = await this.api.get(url, {
      responseType: "blob",
    });
    return response.data;
  }
}
