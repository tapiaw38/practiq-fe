import type { AxiosInstance } from "axios";
import type { TopicProgress } from "@/types";

export interface CourseSummary {
  course_id: string;
  /** Present once schools exist; absent for courses that predate them. */
  school_id?: string;
  school_name?: string;
  title: string;
  subject: string;
  grade_name?: string;
  practice_sheets: number;
  level_tests: number;
  notebooks: number;
  current_level: number;
  course_xp: number;
  /** Topics the course covers, so the home can flag ones needing review. */
  topic_ids: string[];
}

export interface StudentDashboard {
  courses: CourseSummary[];
  progress: TopicProgress[];
  streak_days: number;
  last_practiced_sheet_id?: string;
  resume_practice?: {
    sheet_id: string;
    topic_id?: string;
    topic_title?: string;
    level: number;
  };
}

export interface LeaderboardEntry {
  /** First name plus a surname initial: the server never sends more. */
  name: string;
  /** Opaque token the avatar is drawn from; empty means none chosen. */
  avatar_seed?: string;
  total_xp: number;
  position: number;
  is_me?: boolean;
}

export interface CourseLeaderboard {
  data: LeaderboardEntry[];
  /** Absent until the student earns something: nowhere yet, not last. */
  me?: LeaderboardEntry;
}

export interface IDashboardService {
  get(): Promise<{ data: StudentDashboard }>;
  leaderboard(courseID: string): Promise<CourseLeaderboard>;
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

  /** Top of the course plus the student's own row when it falls outside. */
  async leaderboard(courseID: string): Promise<CourseLeaderboard> {
    const { data } = await this.api.get(`/students/me/courses/${courseID}/leaderboard`);
    return data;
  }
}
