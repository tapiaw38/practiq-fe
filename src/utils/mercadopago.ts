const SDK_URL = 'https://sdk.mercadopago.com/js/v2';

export interface CardDetails {
    cardNumber: string;
    cardholderName: string;

    cardExpirationMonth: string;

    cardExpirationYear: string;
    securityCode: string;

    identificationType: string;
    identificationNumber: string;
}

type MercadoPagoSdk = {
    createCardToken(details: CardDetails): Promise<{ id: string }>;
    getPaymentMethods(options: { bin: string }): Promise<{
        results?: Array<{ id?: string }>;
    }>;
};

export interface CardToken {
    id: string;

    paymentMethodId: string;
}

declare global {
    interface Window {
        MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoSdk;
    }
}

let loading: Promise<void> | null = null;

function loadSdk(): Promise<void> {
    if (window.MercadoPago) return Promise.resolve();

    if (loading) return loading;

    loading = new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SDK_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            loading = null;
            reject(new Error('no se pudo cargar el SDK de pagos'));
        };
        document.head.appendChild(script);
    });
    return loading;
}

export async function createCardToken(publicKey: string, card: CardDetails): Promise<CardToken> {
    if (!publicKey) {
        throw new Error('falta la clave pública de pagos');
    }
    await loadSdk();
    if (!window.MercadoPago) {
        throw new Error('no se pudo cargar el SDK de pagos');
    }

    const monthDigits = card.cardExpirationMonth.replace(/\D/g, '');
    const yearDigits = card.cardExpirationYear.replace(/\D/g, '');
    const month = monthDigits.padStart(2, '0');
    if (!/^(0[1-9]|1[0-2])$/.test(month)) {
        throw new Error('Ingresá un mes de vencimiento válido (01 a 12).');
    }
    if (!/^\d{4}$/.test(yearDigits)) {
        throw new Error('Ingresá el año de vencimiento completo, por ejemplo 2031.');
    }

    const sdk = new window.MercadoPago(publicKey, { locale: 'es-AR' });
    const token = await sdk.createCardToken({
        ...card,
        cardNumber: card.cardNumber.replace(/\D/g, ''),
        cardExpirationMonth: month,
        cardExpirationYear: yearDigits,
        securityCode: card.securityCode.replace(/\D/g, ''),
        identificationNumber: card.identificationNumber.replace(/\D/g, ''),
    });
    if (!token?.id) {
        throw new Error('la tarjeta no pudo validarse');
    }

    let paymentMethodId = '';
    try {
        const bin = card.cardNumber.replace(/\D/g, '').slice(0, 8);
        const methods = await sdk.getPaymentMethods({ bin });
        paymentMethodId = methods?.results?.[0]?.id ?? '';
    } catch {
        paymentMethodId = '';
    }
    return { id: token.id, paymentMethodId };
}
