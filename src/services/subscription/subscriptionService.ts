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
  /**
   * A teacher no student limit applies to: one who teaches at an institution,
   * or whose school is invoiced outside the product. There is no plan to show
   * them and no usage to measure.
   */
  uncapped?: boolean;
  /**
   * The free month has run out. The allowance is already zero; this is what
   * says why, so the screen does not just read "0 de 0".
   */
  trial_expired?: boolean;
  /** Set while a lapsed plan is still honoured. After this, students over the
   *  cap go read-only — and if the trial is spent, all of them do. */
  grace_ends_at?: string;
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

export interface CheckoutConfig {
  /**
   * The gateway's public key. Public by design: it can only create card
   * tokens, never charge them, and the secret half never leaves the payments
   * service.
   */
  public_key: string;
}

/** One candidate, named and dated: a list of ids is not a choice. */
export interface DowngradeStudent {
  id: string;
  name: string;
  /** Empty for somebody who never practised — why they are first in line. */
  last_practiced_at?: string;
  /** What the automatic order would do, so the form starts from it. */
  keeps: boolean;
}

export interface DowngradeState {
  max_students: number;
  /** Who loses access, or would if applied now. */
  deactivated: string[];
  /** Everyone the cap applies to, in the order it applies them. */
  students?: DowngradeStudent[];
}

export interface ISubscriptionService {
  getMine(): Promise<{ data: TeacherSubscription }>;
  checkoutConfig(): Promise<{ data: CheckoutConfig }>;
  subscribe(planId: number, cardTokenId: string): Promise<void>;
  startHostedCheckout(planId: number, payerEmail: string): Promise<string>;
  changePlan(planId: number, cardTokenId?: string, paymentMethodId?: string): Promise<number>;
  downgradePreview(): Promise<{ data: DowngradeState }>;
  applyDowngrade(keep: string[]): Promise<{ data: DowngradeState }>;
  reactivateStudent(studentId: string): Promise<void>;
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

  /** Backend versions before the empty-array contract encoded `[]` as null.
   * Normalize at the boundary so an empty downgrade preview can never crash a
   * payment screen while an older API instance is draining during deploy. */
  private normalizeDowngrade(data: DowngradeState): DowngradeState {
    return { ...data, deactivated: Array.isArray(data?.deactivated) ? data.deactivated : [] };
  }

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

  async checkoutConfig(): Promise<{ data: CheckoutConfig }> {
    const { data } = await this.api.get("/teachers/me/subscription/checkout-config");
    return data;
  }

  /**
   * Starts a subscription with a card token the browser produced.
   *
   * Only the token travels. The card number never reaches Practiq, which is
   * what keeps it out of our logs, our database and our compliance scope.
   */
  async subscribe(planId: number, cardTokenId: string): Promise<void> {
    await this.api.post("/teachers/me/subscription", {
      plan_id: planId,
      card_token_id: cardTokenId,
    });
  }

  /**
   * Starts a subscription the teacher authorises at Mercado Pago.
   *
   * For whoever has no card to give us: Mercado Pago's own checkout accepts
   * the balance in their account, which a card form cannot. Returns the
   * address to send the browser to; nothing is charged before they get there.
   */
  async startHostedCheckout(planId: number, payerEmail: string): Promise<string> {
    const { data } = await this.api.post("/teachers/me/subscription/hosted-checkout", {
      plan_id: planId,
      payer_email: payerEmail,
    });
    return data?.data?.init_point ?? "";
  }

  /**
   * Moves an existing subscription to another plan.
   *
   * Not the same as subscribing again: the agreement is restated at the
   * gateway, so only the difference for the rest of the current period is
   * charged instead of a whole new month. Returns what was charged.
   */
  async changePlan(
    planId: number,
    cardTokenId?: string,
    paymentMethodId?: string,
  ): Promise<number> {
    const { data } = await this.api.post("/teachers/me/subscription/change-plan", {
      plan_id: planId,
      card_token_id: cardTokenId,
      payment_method_id: paymentMethodId,
    });
    return data?.data?.charged ?? 0;
  }

  /** Who would lose access if the current plan were enforced right now. */
  async downgradePreview(): Promise<{ data: DowngradeState }> {
    const { data } = await this.api.get("/teachers/me/subscription/downgrade");
    return { ...data, data: this.normalizeDowngrade(data.data) };
  }

  /** `keep` is the teacher's choice; empty takes the automatic order. */
  async applyDowngrade(keep: string[]): Promise<{ data: DowngradeState }> {
    const { data } = await this.api.post("/teachers/me/subscription/downgrade", { keep });
    return { ...data, data: this.normalizeDowngrade(data.data) };
  }

  async reactivateStudent(studentId: string): Promise<void> {
    await this.api.post(`/teachers/me/students/${studentId}/reactivate`);
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
