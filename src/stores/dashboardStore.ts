import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import type { IDashboardService, StudentDashboard } from '@/services/dashboard/dashboardService';

export const useDashboardStore = (service: IDashboardService) =>
    defineStore('dashboard', () => {
        const data = ref<StudentDashboard | null>(null);
        const loading = ref(false);

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

        return { data, loading, fetchDashboard, refreshDashboard };
    });
