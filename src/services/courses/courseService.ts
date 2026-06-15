import type { AxiosInstance } from "axios";
import type { Course, Student } from "@/types";

export interface ICourseService {
  create(params: Partial<Course>): Promise<{ data: Course }>;
  list(role?: string): Promise<{ data: Course[] }>;
  get(id: string): Promise<{ data: Course }>;
  update(id: string, params: Partial<Course>): Promise<{ data: Course }>;
  delete(id: string): Promise<void>;
  enroll(courseId: string): Promise<{ message: string }>;
  getStudents(courseId: string): Promise<{ data: Student[] }>;
}

export class CourseService implements ICourseService {
  constructor(private readonly api: AxiosInstance) {}

  async create(params: Partial<Course>): Promise<{ data: Course }> {
    const { data } = await this.api.post("/courses", params);
    return data;
  }

  async list(role?: string): Promise<{ data: Course[] }> {
    const { data } = await this.api.get("/courses", { params: { role } });
    return data;
  }

  async get(id: string): Promise<{ data: Course }> {
    const { data } = await this.api.get(`/courses/${id}`);
    return data;
  }

  async update(id: string, params: Partial<Course>): Promise<{ data: Course }> {
    const { data } = await this.api.put(`/courses/${id}`, params);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.api.delete(`/courses/${id}`);
  }

  async enroll(courseId: string): Promise<{ message: string }> {
    const { data } = await this.api.post(`/courses/${courseId}/enroll`);
    return data;
  }

  async getStudents(courseId: string): Promise<{ data: Student[] }> {
    const { data } = await this.api.get(`/courses/${courseId}/students`);
    return data;
  }
}
