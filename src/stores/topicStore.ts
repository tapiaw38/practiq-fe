import { defineStore } from "pinia";
import { ref } from "vue";
import type { ITopicService } from "@/services/topics/topicService";
import type { Topic } from "@/types";

export const useTopicStore = (service: ITopicService) =>
  defineStore("topics", () => {
    const topics = ref<Topic[]>([]);
    const currentTopic = ref<Topic | null>(null);
    const loading = ref(false);

    const fetchTopics = async (courseId: string) => {
      loading.value = true;
      try {
        const response = await service.list(courseId);
        topics.value = response.data;
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const createTopic = async (courseId: string, params: Partial<Topic>) => {
      loading.value = true;
      try {
        const response = await service.create(courseId, params);
        topics.value.push(response.data);
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const updateTopic = async (id: string, params: Partial<Topic>) => {
      loading.value = true;
      try {
        const response = await service.update(id, params);
        const index = topics.value.findIndex((t) => t.id === id);
        if (index !== -1) {
          topics.value[index] = response.data;
        }
        if (currentTopic.value?.id === id) {
          currentTopic.value = response.data;
        }
        return response.data;
      } finally {
        loading.value = false;
      }
    };

    const deleteTopic = async (id: string) => {
      loading.value = true;
      try {
        await service.delete(id);
        topics.value = topics.value.filter((t) => t.id !== id);
        if (currentTopic.value?.id === id) {
          currentTopic.value = null;
        }
      } finally {
        loading.value = false;
      }
    };

    const reset = () => {
      topics.value = [];
      currentTopic.value = null;
    };

    return {
      topics,
      currentTopic,
      loading,
      fetchTopics,
      createTopic,
      updateTopic,
      deleteTopic,
      reset,
    };
  });
