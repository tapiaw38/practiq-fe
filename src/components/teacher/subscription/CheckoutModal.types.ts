import type { CardToken } from '@/types/payments';
import type { CatalogPlan } from '@/types/subscription';

export interface CheckoutModalProps {
    plan: CatalogPlan;
    publicKey: string;
    serverError?: string;
    accountEmail?: string;
    changing?: boolean;
}

export interface CheckoutModalEmits {
    (event: 'confirm', token: CardToken): void;
    (event: 'hosted', payerEmail: string): void;
    (event: 'cancel'): void;
}
