import type { AxiosInstance } from "axios";
import type { NotificationList, OperationResult } from "@/types";

export interface INotificationService {
  list(params?: {
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<{ data: NotificationList }>;
  markRead(id: string): Promise<{ data: OperationResult }>;
  markAllRead(): Promise<{ data: OperationResult }>;
}

export class NotificationService implements INotificationService {
  constructor(private readonly api: AxiosInstance) {}

  async list(params?: {
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<{ data: NotificationList }> {
    const { data } = await this.api.get("/notifications", {
      params: {
        unread_only: params?.unreadOnly ? "true" : undefined,
        limit: params?.limit,
      },
    });
    return data;
  }

  async markRead(id: string): Promise<{ data: OperationResult }> {
    const { data } = await this.api.post(`/notifications/${id}/read`);
    return data;
  }

  async markAllRead(): Promise<{ data: OperationResult }> {
    const { data } = await this.api.post("/notifications/read-all");
    return data;
  }
}
