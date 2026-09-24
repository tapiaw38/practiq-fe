import { defineStore } from "pinia";
import { ref } from "vue";
import { useAuthStore } from "@/stores/authStore";
import type {
  IDashboardService,
  StudentDashboard,
} from "@/services/dashboard/dashboardService";

/**
 * The student's home data, shared between the home and the sidebar.
 *
 * Both want the same thing: the student's courses with the level they are on.
 * The sidebar used to ask for them again through `/courses?role=student` — a
 * second round trip for data already in memory, answering with grade ids,
 * subject ids and descriptions in order to render a title and a level badge.
 *
 * Two readers with different needs, so two entry points. The home shows
 * progress and a streak that practising changes, and always reads fresh.
 * The sidebar shows titles and a level, and takes whatever is loaded. That
 * split is deliberate: a single cached read would have meant invalidating
 * after every submit, and one forgotten call site shows a student the streak
 * they had before they practised.
 */
export const useDashboardStore = (service: IDashboardService) =>
  defineStore("dashboard", () => {
    const data = ref<StudentDashboard | null>(null);
    const loading = ref(false);
    // Shared so two screens mounting together make one request rather than
    // racing to make the same one.
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
          // A logout/login can happen while request is in flight. Never put
          // previous user's response into current user's cache.
          if (
            ownerId === requestOwnerId &&
            currentOwnerId() === requestOwnerId
          ) {
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

    /** What is loaded, or one read if nothing is. */
    const fetchDashboard = (): Promise<StudentDashboard> => {
      isolateForCurrentUser();
      return data.value ? Promise.resolve(data.value) : refreshDashboard();
    };

    return { data, loading, fetchDashboard, refreshDashboard };
  });
