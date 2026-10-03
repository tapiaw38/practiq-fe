import type { AxiosInstance } from 'axios';
import type {
    CatalogPlan,
    CheckoutConfig,
    DowngradeState,
    PlanInput,
    TeacherSubscription,
} from '@/types/subscription';

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

    private normalizeDowngrade(data: DowngradeState): DowngradeState {
        return { ...data, deactivated: Array.isArray(data?.deactivated) ? data.deactivated : [] };
    }

    async getMine(): Promise<{ data: TeacherSubscription }> {
        const { data } = await this.api.get('/teachers/me/subscription');
        return data;
    }

    async checkoutConfig(): Promise<{ data: CheckoutConfig }> {
        const { data } = await this.api.get('/teachers/me/subscription/checkout-config');
        return data;
    }

    async subscribe(planId: number, cardTokenId: string): Promise<void> {
        await this.api.post('/teachers/me/subscription', {
            plan_id: planId,
            card_token_id: cardTokenId,
        });
    }

    async startHostedCheckout(planId: number, payerEmail: string): Promise<string> {
        const { data } = await this.api.post('/teachers/me/subscription/hosted-checkout', {
            plan_id: planId,
            payer_email: payerEmail,
        });
        return data?.data?.init_point ?? '';
    }

    async changePlan(
        planId: number,
        cardTokenId?: string,
        paymentMethodId?: string,
    ): Promise<number> {
        const { data } = await this.api.post('/teachers/me/subscription/change-plan', {
            plan_id: planId,
            card_token_id: cardTokenId,
            payment_method_id: paymentMethodId,
        });
        return data?.data?.charged ?? 0;
    }

    async downgradePreview(): Promise<{ data: DowngradeState }> {
        const { data } = await this.api.get('/teachers/me/subscription/downgrade');
        return { ...data, data: this.normalizeDowngrade(data.data) };
    }

    async applyDowngrade(keep: string[]): Promise<{ data: DowngradeState }> {
        const { data } = await this.api.post('/teachers/me/subscription/downgrade', { keep });
        return { ...data, data: this.normalizeDowngrade(data.data) };
    }

    async reactivateStudent(studentId: string): Promise<void> {
        await this.api.post(`/teachers/me/students/${studentId}/reactivate`);
    }

    async listPlans(): Promise<{ data: CatalogPlan[] }> {
        const { data } = await this.api.get('/subscription-plans');
        return data;
    }

    async pause(): Promise<void> {
        await this.api.post('/teachers/me/subscription/pause');
    }

    async resume(): Promise<void> {
        await this.api.post('/teachers/me/subscription/resume');
    }

    async cancel(): Promise<void> {
        await this.api.post('/teachers/me/subscription/cancel');
    }

    async createPlan(input: PlanInput): Promise<{ data: CatalogPlan }> {
        const { data } = await this.api.post('/subscription-plans', input);
        return data;
    }

    async updatePlan(planId: number, input: PlanInput): Promise<{ data: CatalogPlan }> {
        const { data } = await this.api.put(`/subscription-plans/${planId}`, input);
        return data;
    }

    async deactivatePlan(planId: number): Promise<{ data: CatalogPlan }> {
        const { data } = await this.api.delete(`/subscription-plans/${planId}`);
        return data;
    }
}
