import type { AxiosInstance } from "axios";
import type { TopicProgress } from "@/types";

export interface CourseSummary {
  course_id: string;
  title: string;
  subject: string;
  practice_sheets: number;
  level_tests: number;
  notebooks: number;
  current_level: number;
  /** Topics the course covers, so the home can flag ones needing review. */
  topic_ids: string[];
}

export interface StudentDashboard {
  courses: CourseSummary[];
  progress: TopicProgress[];
  streak_days: number;
  last_practiced_sheet_id?: string;
}

export interface IDashboardService {
  get(): Promise<{ data: StudentDashboard }>;
}

export class DashboardService implements IDashboardService {
  constructor(private readonly api: AxiosInstance) {}

  /**
   * One call for the whole home. It used to take about eighteen requests five
   * round trips deep, and the latency of those trips — not the server work —
   * was what the student waited for.
   */
  async get(): Promise<{ data: StudentDashboard }> {
    const { data } = await this.api.get("/students/me/dashboard");
    return data;
  }
}
