export type NotificationType = "level_test_scheduled";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  resource_type?: string;
  resource_id?: string;
  /** UTC ISO string of when the referenced event happens. */
  scheduled_at?: string;
  read: boolean;
  created_at: string;
}

export interface NotificationList {
  notifications: AppNotification[];
  unread_count: number;
}
