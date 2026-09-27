import type { AxiosInstance } from 'axios';
import type { TopicProgress } from '@/types';

export interface CourseSummary {
    course_id: string;

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
    name: string;

    avatar_seed?: string;
    total_xp: number;
    position: number;
    is_me?: boolean;
}

export interface CourseLeaderboard {
    data: LeaderboardEntry[];

    me?: LeaderboardEntry;
}

export interface IDashboardService {
    get(): Promise<{ data: StudentDashboard }>;
    leaderboard(courseID: string): Promise<CourseLeaderboard>;
}

export class DashboardService implements IDashboardService {
    constructor(private readonly api: AxiosInstance) {}

    async get(): Promise<{ data: StudentDashboard }> {
        const { data } = await this.api.get('/students/me/dashboard');
        return data;
    }

    async leaderboard(courseID: string): Promise<CourseLeaderboard> {
        const { data } = await this.api.get(`/students/me/courses/${courseID}/leaderboard`);
        return data;
    }
}
