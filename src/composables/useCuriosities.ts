import { storeToRefs } from "pinia";
import { practiqApi } from "@/api/request/server";
import { AIService } from "@/services/ai/aiService";
import { useAIStore } from "@/stores/aiStore";

export function useCuriosities() {
  const service = new AIService(practiqApi);
  const store = useAIStore(service)();
  const { curiosities, loading } = storeToRefs(store);

  const fetchCuriosities = async (courseId: string) => {
    try {
      return await store.fetchCuriosities(courseId);
    } catch (err) {
      console.error("[useCuriosities] fetch failed", err);
      curiosities.value = [];
      return [];
    }
  };

  return { curiosities, loading, fetchCuriosities };
}
