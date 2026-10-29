import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import type { IDashboardService } from '@/services/dashboard/dashboardService';
import type { CourseLeaderboard, StudentDashboard } from '@/types/dashboard';

export const useDashboardStore = (service: IDashboardService) =>
    defineStore('dashboard', () => {
        const data = ref<StudentDashboard | null>(null);
        const loading = ref(false);
        const leaderboards = ref<Record<string, CourseLeaderboard>>({});
        const leaderboardLoading = ref<Record<string, boolean>>({});

        let inFlight: {
            ownerId: string | null;
            promise: Promise<StudentDashboard>;
        } | null = null;
        let ownerId: string | null = null;

        const currentOwnerId = () => {
            const auth = useAuthStore();
            return auth.authUser?.id ?? auth.profile?.id ?? null;
        };

        const isolateForCurrentUser = () => {
            const currentId = currentOwnerId();
            if (ownerId !== currentId) {
                data.value = null;
                leaderboards.value = {};
                leaderboardLoading.value = {};
                ownerId = currentId;
            }
        };

        const refreshDashboard = (): Promise<StudentDashboard> => {
            isolateForCurrentUser();
            const requestOwnerId = ownerId;
            if (inFlight?.ownerId === requestOwnerId) return inFlight.promise;

            loading.value = true;
            const promise = service
                .get()
                .then((response) => {
                    if (ownerId === requestOwnerId && currentOwnerId() === requestOwnerId) {
                        data.value = response.data;
                    }
                    return response.data;
                })
                .finally(() => {
                    if (inFlight?.promise === promise) {
                        inFlight = null;
                        loading.value = false;
                    }
                });
            inFlight = { ownerId: requestOwnerId, promise };
            return promise;
        };

        const fetchDashboard = (): Promise<StudentDashboard> => {
            isolateForCurrentUser();
            return data.value ? Promise.resolve(data.value) : refreshDashboard();
        };

        const fetchLeaderboard = async (courseID: string) => {
            if (leaderboards.value[courseID]) return leaderboards.value[courseID];
            leaderboardLoading.value[courseID] = true;
            try {
                const leaderboard = await service.leaderboard(courseID);
                leaderboards.value[courseID] = leaderboard;
                return leaderboard;
            } finally {
                leaderboardLoading.value[courseID] = false;
            }
        };

        return {
            data,
            loading,
            leaderboards,
            leaderboardLoading,
            fetchDashboard,
            refreshDashboard,
            fetchLeaderboard,
        };
    });
