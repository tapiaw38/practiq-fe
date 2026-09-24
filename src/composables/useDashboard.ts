import { practiqApi } from "@/api/request/server";
import { DashboardService } from "@/services/dashboard/dashboardService";
import { useDashboardStore } from "@/stores/dashboardStore";

export const useDashboard = () => {
  const service = new DashboardService(practiqApi);
  const store = useDashboardStore(service)();

  return {
    dashboard: store,
    /** Takes whatever is loaded; reads once if nothing is. For the sidebar. */
    loadDashboard: store.fetchDashboard,
    /** Always reads. For the home, where progress and the streak must be current. */
    refreshDashboard: store.refreshDashboard,
  };
};
