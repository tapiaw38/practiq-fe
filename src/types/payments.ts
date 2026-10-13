export interface CardDetails {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType: string;
    identificationNumber: string;
}

export interface CardToken {
    id: string;
    paymentMethodId: string;
}
