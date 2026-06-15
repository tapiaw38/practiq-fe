import { storeToRefs } from "pinia";
import { useToast } from "primevue/usetoast";
import { practiqApi } from "@/api/request/server";
import { TopicService } from "@/services/topics/topicService";
import { useTopicStore } from "@/stores/topicStore";
import type { Topic } from "@/types";

export const useTopic = () => {
  const toast = useToast();

  const service = new TopicService(practiqApi);
  const store = useTopicStore(service)();
  const { topics, currentTopic, loading } = storeToRefs(store);

  const loadTopics = async (courseId: string) => {
    try {
      return await store.fetchTopics(courseId);
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los temas",
        life: 3000,
      });
      throw error;
    }
  };

  const createTopic = async (courseId: string, params: Partial<Topic>) => {
    try {
      const topic = await store.createTopic(courseId, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Tema creado exitosamente",
        life: 3000,
      });
      return topic;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear el tema",
        life: 3000,
      });
      throw error;
    }
  };

  const updateTopic = async (id: string, params: Partial<Topic>) => {
    try {
      const topic = await store.updateTopic(id, params);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Tema actualizado exitosamente",
        life: 3000,
      });
      return topic;
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo actualizar el tema",
        life: 3000,
      });
      throw error;
    }
  };

  const deleteTopic = async (id: string) => {
    try {
      await store.deleteTopic(id);
      toast.add({
        severity: "success",
        summary: "Éxito",
        detail: "Tema eliminado exitosamente",
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar el tema",
        life: 3000,
      });
      throw error;
    }
  };

  return {
    topics,
    currentTopic,
    loading,
    loadTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    reset: store.reset,
  };
};
