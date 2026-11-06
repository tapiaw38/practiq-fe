import { storeToRefs } from 'pinia';
import { practiqApi } from '@/api/request/server';
import { SubscriptionService } from '@/services/subscription/subscriptionService';
import { useSubscriptionStore } from '@/stores/subscriptionStore';

export const useSubscription = () => {
    const service = new SubscriptionService(practiqApi);
    const store = useSubscriptionStore(service)();
    const { plans, adminSubscriptions, mySubscription, billingHistory } = storeToRefs(store);

    return {
        plans,
        adminSubscriptions,
        mySubscription,
        billingHistory,
        getMine: store.getMine,
        clearMySubscription: store.clearMySubscription,
        billingHistoryRequest: store.billingHistoryRequest,
        clearBillingHistory: store.clearBillingHistory,
        checkoutConfig: store.checkoutConfig,
        subscribe: store.subscribe,
        startHostedCheckout: store.startHostedCheckout,
        changePlan: store.changePlan,
        downgradePreview: store.downgradePreview,
        applyDowngrade: store.applyDowngrade,
        reactivateStudent: store.reactivateStudent,
        listPlans: store.listPlans,
        pause: store.pause,
        resume: store.resume,
        cancel: store.cancel,
        createPlan: store.createPlan,
        updatePlan: store.updatePlan,
        deactivatePlan: store.deactivatePlan,
        listAllSubscriptions: store.listAllSubscriptions,
    };
};
