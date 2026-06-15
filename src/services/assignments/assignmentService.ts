import type { AxiosInstance } from "axios";
import type { AssignedUser } from "@/types";

export interface IAssignmentService {
  assign(teacherId: string, studentId: string): Promise<{ message: string }>;
  unassign(teacherId: string, studentId: string): Promise<{ message: string }>;
  listStudents(teacherId: string): Promise<{ data: AssignedUser[] }>;
  listTeachers(studentId: string): Promise<{ data: AssignedUser[] }>;
  listMyStudents(): Promise<{ data: AssignedUser[] }>;
}

export class AssignmentService implements IAssignmentService {
  constructor(private readonly api: AxiosInstance) {}

  async assign(
    teacherId: string,
    studentId: string,
  ): Promise<{ message: string }> {
    const { data } = await this.api.post("/teacher-student-assignments", {
      teacher_id: teacherId,
      student_id: studentId,
    });
    return data;
  }

  async unassign(
    teacherId: string,
    studentId: string,
  ): Promise<{ message: string }> {
    const { data } = await this.api.delete(
      `/teacher-student-assignments/${teacherId}/${studentId}`,
    );
    return data;
  }

  async listStudents(teacherId: string): Promise<{ data: AssignedUser[] }> {
    const { data } = await this.api.get(`/teachers/${teacherId}/students`);
    return data;
  }

  async listTeachers(studentId: string): Promise<{ data: AssignedUser[] }> {
    const { data } = await this.api.get(`/students/${studentId}/teachers`);
    return data;
  }

  async listMyStudents(): Promise<{ data: AssignedUser[] }> {
    const { data } = await this.api.get("/teachers/me/students");
    return data;
  }
}
