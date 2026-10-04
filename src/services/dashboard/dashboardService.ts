import type { AxiosInstance } from 'axios';
import type { CourseLeaderboard, StudentDashboard } from '@/types/dashboard';

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
