import { ref } from "vue";
import { practiqApi } from "@/api/request/server";
import { NotificationService } from "@/services/notifications/notificationService";
import type { AppNotification } from "@/types";

// ponytail: module-level state instead of a store — the bell is mounted once
// per layout and nothing else reads notifications.
const notifications = ref<AppNotification[]>([]);
const unreadCount = ref(0);
const loading = ref(false);

export const useNotification = () => {
  const service = new NotificationService(practiqApi);

  const loadNotifications = async () => {
    loading.value = true;
    try {
      const { data } = await service.list({ limit: 30 });
      notifications.value = data.notifications;
      unreadCount.value = data.unread_count;
    } catch {
      // Silent: the bell is ambient UI, a failure here must not interrupt the
      // student's work.
    } finally {
      loading.value = false;
    }
  };

  const markRead = async (id: string) => {
    const target = notifications.value.find((n) => n.id === id);
    if (!target || target.read) return;

    // Optimistic: the badge should react immediately.
    target.read = true;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
    try {
      await service.markRead(id);
    } catch {
      target.read = false;
      unreadCount.value += 1;
    }
  };

  const markAllRead = async () => {
    if (!unreadCount.value) return;
    const previous = notifications.value.map((n) => n.read);
    notifications.value.forEach((n) => (n.read = true));
    const previousCount = unreadCount.value;
    unreadCount.value = 0;
    try {
      await service.markAllRead();
    } catch {
      notifications.value.forEach((n, index) => (n.read = previous[index]));
      unreadCount.value = previousCount;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markRead,
    markAllRead,
  };
};
