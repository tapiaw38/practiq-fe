import { Browser } from '@capacitor/browser';
import { App as CapacitorApp, type URLOpenListenerEvent } from '@capacitor/app';
import type { LoginResponse } from '@/types/auth';

const authBaseURL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8082';
const pollIntervalMs = 1500;
const pollTimeoutMs = 180000;
const mobileCallbackURL = 'https://app.practiq.com.ar/auth/mobile-callback';

interface GoogleMobilePollResponse {
    status: 'pending' | 'done' | 'error';
    token?: string;
    refresh_token?: string;
    data?: LoginResponse['data'];
    message?: string;
}

let wakePoll: (() => void) | null = null;

function waitForPollInterval() {
    return new Promise<void>((resolve) => {
        wakePoll = resolve;
        setTimeout(resolve, pollIntervalMs);
    });
}

export async function loginWithGoogleNative(): Promise<LoginResponse> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('No se pudo iniciar sesión con Google.');

    const state = crypto.randomUUID();
    const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authURL.searchParams.set('client_id', clientId);
    authURL.searchParams.set('redirect_uri', mobileCallbackURL);
    authURL.searchParams.set('response_type', 'code');
    authURL.searchParams.set('scope', 'openid email profile');
    authURL.searchParams.set('state', state);
    authURL.searchParams.set('prompt', 'select_account');

    await Browser.open({ url: authURL.toString() });

    const startedAt = Date.now();
    const resumeListener = await CapacitorApp.addListener('resume', () => wakePoll?.());
    const appURLListener = await CapacitorApp.addListener(
        'appUrlOpen',
        (event: URLOpenListenerEvent) => {
            const url = new URL(event.url);
            const code = url.searchParams.get('code');
            const callbackState = url.searchParams.get('state');

            if (!code || !callbackState) return;

            void fetch(`${authBaseURL}/auth/google/mobile/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, state: callbackState }),
            })
                .catch(() => undefined)
                .finally(() => wakePoll?.());
        },
    );

    try {
        while (Date.now() - startedAt < pollTimeoutMs) {
            await waitForPollInterval();

            let body: GoogleMobilePollResponse;
            try {
                const response = await fetch(`${authBaseURL}/auth/google/mobile/poll/${state}`);
                body = (await response.json()) as GoogleMobilePollResponse;
            } catch {
                continue;
            }

            if (body.status === 'done' && body.token && body.data) {
                return {
                    token: body.token,
                    refresh_token: body.refresh_token,
                    data: body.data,
                };
            }

            if (body.status === 'error') {
                throw new Error(body.message || 'No se pudo iniciar sesión con Google.');
            }
        }

        throw new Error('El inicio de sesión con Google tardó demasiado. Probá de nuevo.');
    } finally {
        resumeListener.remove();
        appURLListener.remove();
        await Browser.close().catch(() => undefined);
    }
}
