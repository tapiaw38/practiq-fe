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
  /**
   * The gateway's word for it: authorized, paused, or absent on the free
   * plan. Pausing removes the entitlement, so `active: false` alone cannot
   * tell a teacher who paused from one who never paid.
   */
  status?: string;
  /** RFC 3339. When the paid period ends, or when the free month does. */
  renews_at?: string;
}

export interface CatalogPlan {
  plan_id: number;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: string;
  max_students: number;
  active: boolean;
}

/** What a superadmin sets. Omitted fields are left as they are. */
export interface PlanInput {
  name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  interval?: string;
  max_students?: number;
  active?: boolean;
}

export interface ISubscriptionService {
  getMine(): Promise<{ data: TeacherSubscription }>;
  listPlans(): Promise<{ data: CatalogPlan[] }>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancel(): Promise<void>;
  createPlan(input: PlanInput): Promise<{ data: CatalogPlan }>;
  updatePlan(planId: number, input: PlanInput): Promise<{ data: CatalogPlan }>;
  deactivatePlan(planId: number): Promise<{ data: CatalogPlan }>;
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

  async listPlans(): Promise<{ data: CatalogPlan[] }> {
    const { data } = await this.api.get("/subscription-plans");
    return data;
  }

  /**
   * Stops the charges without ending the agreement.
   *
   * Unlike cancelling, this can be undone: the payment authorisation stays,
   * and `resume` puts it back to work. Cancelling withdraws it, and coming
   * back then means entering card details again.
   */
  async pause(): Promise<void> {
    await this.api.post("/teachers/me/subscription/pause");
  }

  async resume(): Promise<void> {
    await this.api.post("/teachers/me/subscription/resume");
  }

  async cancel(): Promise<void> {
    await this.api.post("/teachers/me/subscription/cancel");
  }

  async createPlan(input: PlanInput): Promise<{ data: CatalogPlan }> {
    const { data } = await this.api.post("/subscription-plans", input);
    return data;
  }

  async updatePlan(planId: number, input: PlanInput): Promise<{ data: CatalogPlan }> {
    const { data } = await this.api.put(`/subscription-plans/${planId}`, input);
    return data;
  }

  /** Takes the plan off the shelf. Subscriptions to it keep working. */
  async deactivatePlan(planId: number): Promise<{ data: CatalogPlan }> {
    const { data } = await this.api.delete(`/subscription-plans/${planId}`);
    return data;
  }
}
