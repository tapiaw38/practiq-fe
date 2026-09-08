/**
 * Turns card details into a single-use token, in the browser.
 *
 * The card number, its expiry and its security code go straight from the form
 * to the gateway and never touch Practiq — not the API, not the logs, not the
 * database. What comes back is a token that expires quickly and cannot be
 * charged on its own, and that is the only thing the rest of the app ever
 * sees.
 *
 * The SDK is loaded on demand rather than in the app bundle: almost nobody
 * subscribes, and everybody else should not pay for the download.
 */

const SDK_URL = "https://sdk.mercadopago.com/js/v2";

export interface CardDetails {
  cardNumber: string;
  cardholderName: string;
  /** Two digits. */
  cardExpirationMonth: string;
  /** Four digits. */
  cardExpirationYear: string;
  securityCode: string;
  /** DNI, CUIT and the like, as the gateway expects for Argentina. */
  identificationType: string;
  identificationNumber: string;
}

type MercadoPagoSdk = {
  createCardToken(details: CardDetails): Promise<{ id: string }>;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoSdk;
  }
}

let loading: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  // Shared so two clicks do not add two script tags.
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("no se pudo cargar el SDK de pagos"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function createCardToken(
  publicKey: string,
  card: CardDetails,
): Promise<string> {
  if (!publicKey) {
    throw new Error("falta la clave pública de pagos");
  }
  await loadSdk();
  if (!window.MercadoPago) {
    throw new Error("no se pudo cargar el SDK de pagos");
  }

  const sdk = new window.MercadoPago(publicKey, { locale: "es-AR" });
  const token = await sdk.createCardToken({
    ...card,
    cardNumber: card.cardNumber.replace(/\s+/g, ""),
  });
  if (!token?.id) {
    throw new Error("la tarjeta no pudo validarse");
  }
  return token.id;
}
