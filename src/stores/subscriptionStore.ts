import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ISubscriptionService } from '@/services/subscription/subscriptionService';
import type {
    AdminSubscription,
    BillingHistory,
    CatalogPlan,
    PlanInput,
    TeacherSubscription,
} from '@/types/subscription';

export const useSubscriptionStore = (service: ISubscriptionService) =>
    defineStore('subscription', () => {
        const plans = ref<CatalogPlan[]>([]);
        const adminSubscriptions = ref<AdminSubscription[]>([]);
        const mySubscription = ref<TeacherSubscription | null>(null);
        const billingHistory = ref<BillingHistory | null>(null);

        const getMine = async () => {
            const response = await service.getMine();
            if (response.data?.plan) mySubscription.value = response.data;
            return response;
        };

        const clearMySubscription = () => {
            mySubscription.value = null;
        };

        const loadBillingHistory = async () => {
            const response = await service.billingHistory();
            billingHistory.value = response.data;
            return response;
        };

        const clearBillingHistory = () => {
            billingHistory.value = null;
        };

        const listPlans = async () => {
            const response = await service.listPlans();
            plans.value = response.data;
            return response;
        };

        const listAllSubscriptions = async (status?: string) => {
            const response = await service.listAllSubscriptions(status);
            adminSubscriptions.value = response.data;
            return response;
        };

        const checkoutConfig = () => service.checkoutConfig();
        const subscribe = (planId: number, cardTokenId: string) =>
            service.subscribe(planId, cardTokenId);
        const startHostedCheckout = (planId: number, payerEmail: string) =>
            service.startHostedCheckout(planId, payerEmail);
        const changePlan = (planId: number, cardTokenId?: string, paymentMethodId?: string) =>
            service.changePlan(planId, cardTokenId, paymentMethodId);
        const downgradePreview = () => service.downgradePreview();
        const applyDowngrade = (keep: string[]) => service.applyDowngrade(keep);
        const reactivateStudent = (studentId: string) => service.reactivateStudent(studentId);
        const pause = () => service.pause();
        const resume = () => service.resume();
        const cancel = () => service.cancel();
        const createPlan = (input: PlanInput) => service.createPlan(input);
        const updatePlan = (planId: number, input: PlanInput) => service.updatePlan(planId, input);
        const deactivatePlan = (planId: number) => service.deactivatePlan(planId);

        return {
            plans,
            adminSubscriptions,
            mySubscription,
            billingHistory,
            getMine,
            clearMySubscription,
            billingHistoryRequest: loadBillingHistory,
            clearBillingHistory,
            checkoutConfig,
            subscribe,
            startHostedCheckout,
            changePlan,
            downgradePreview,
            applyDowngrade,
            reactivateStudent,
            listPlans,
            pause,
            resume,
            cancel,
            createPlan,
            updatePlan,
            deactivatePlan,
            listAllSubscriptions,
        };
    });
