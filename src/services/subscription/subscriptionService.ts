import type { AxiosInstance } from "axios";

export interface SubscriptionPlan {
  /** Absent on the free plan, which the payments service does not know about. */
  plan_id?: number;
  name: string;
  max_students: number;
}

export interface TeacherSubscription {
  plan: SubscriptionPlan;
  /** False while the teacher is on the free plan. */
  active: boolean;
  students_used: number;
  can_add_student: boolean;
  /** RFC 3339. When the paid period ends, or when the free month does. */
  renews_at?: string;
}

export interface ISubscriptionService {
  getMine(): Promise<{ data: TeacherSubscription }>;
}

export class SubscriptionService implements ISubscriptionService {
  constructor(private readonly api: AxiosInstance) {}

  /**
   * The asking teacher's plan, what it allows and how much is used.
   *
   * There is no id in the path on purpose: a subscription is read for whoever
   * holds the token, never for an id a caller can type.
   */
  async getMine(): Promise<{ data: TeacherSubscription }> {
    const { data } = await this.api.get("/teachers/me/subscription");
    return data;
  }
}
