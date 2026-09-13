import { defineStore } from "pinia";
import { ref } from "vue";
import type { IAIService } from "@/services/ai/aiService";
import type { AIConversation, AIMessage } from "@/types";

export const useAIStore = (service: IAIService) =>
  defineStore("ai", () => {
    const currentConversation = ref<AIConversation | null>(null);
    const messages = ref<Record<string, AIMessage[]>>({});
    const curiosities = ref<string[]>([]);
    const curiositiesByCourse = ref<Record<string, string[]>>({});
    const loading = ref(false);

    const createConversation = async (params: {
      course_id?: string;
      practice_sheet_id?: string;
    }) => {
      loading.value = true;
      try {
        const response = await service.createConversation(params);
        currentConversation.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const fetchMessages = async (conversationId: string) => {
      loading.value = true;
      try {
        const response = await service.getMessages(conversationId);
        messages.value[conversationId] = response.data || [];
        return messages.value[conversationId];
      } finally {
        loading.value = false;
      }
    };

    const getHelp = async (params: {
      exercise_id?: string;
      question: string;
      help_type?: "hint" | "explanation" | "similar_example";
      conversation_id?: string;
    }) => {
      loading.value = true;
      try {
        return await service.getHelp(params);
      } finally {
        loading.value = false;
      }
    };

    const fetchCuriosities = async (courseId: string) => {
      const cached = curiositiesByCourse.value[courseId];
      if (cached) {
        curiosities.value = cached;
        return cached;
      }

      loading.value = true;
      try {
        const response = await service.getCuriosities(courseId);
        const data = response.data.curiosities || [];
        curiositiesByCourse.value[courseId] = data;
        curiosities.value = data;
        return data;
      } finally {
        loading.value = false;
      }
    };

    return {
      currentConversation,
      messages,
      curiosities,
      loading,
      createConversation,
      fetchMessages,
      getHelp,
      fetchCuriosities,
    };
  });
