import { practiqApi } from '@/api/request/server';
import { DashboardService } from '@/services/dashboard/dashboardService';
import { useDashboardStore } from '@/stores/dashboardStore';

export const useDashboard = () => {
    const service = new DashboardService(practiqApi);
    const store = useDashboardStore(service)();

    return {
        dashboard: store,

        loadDashboard: store.fetchDashboard,

        refreshDashboard: store.refreshDashboard,

        loadLeaderboard: store.fetchLeaderboard,
    };
};
