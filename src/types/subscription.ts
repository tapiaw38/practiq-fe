export interface SubscriptionPlan {
    plan_id?: number;
    name: string;
    max_students: number;
}

export interface TeacherSubscription {
    plan: SubscriptionPlan;
    active: boolean;
    students_used: number;
    can_add_student: boolean;
    status?: string;
    renews_at?: string;
    uncapped?: boolean;
    trial_expired?: boolean;
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
    public_key: string;
}

export interface DowngradeStudent {
    id: string;
    name: string;
    last_practiced_at?: string;
    keeps: boolean;
}

export interface DowngradeState {
    max_students: number;
    deactivated: string[];
    students?: DowngradeStudent[];
}
