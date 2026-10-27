import { SocialLogin, type SocialLoginError } from '@capgo/capacitor-social-login';
import type { LoginResponse } from '@/types/auth';

const authBaseURL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8082';

class GoogleNativeLoginCancelledError extends Error {
    constructor() {
        super('Google login cancelled');
        this.name = 'GoogleNativeLoginCancelledError';
    }
}

export function isGoogleNativeLoginCancelled(error: unknown): boolean {
    return error instanceof GoogleNativeLoginCancelledError;
}

export async function loginWithGoogleNative(): Promise<LoginResponse> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('No se pudo iniciar sesión con Google.');

    try {
        await SocialLogin.initialize({ google: { webClientId: clientId } });
        const { result } = await SocialLogin.login({
            provider: 'google',
            options: {
                style: 'bottom',
            },
        });

        if (result.responseType !== 'online' || !result.idToken) {
            throw new Error('Google no devolvió una credencial válida.');
        }

        const response = await fetch(`${authBaseURL}/auth/google/native`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: result.idToken }),
        });
        const body = (await response.json()) as LoginResponse & { message?: string };

        if (!response.ok || !body.token || !body.data) {
            throw new Error(body.message || 'No se pudo iniciar sesión con Google.');
        }

        return body;
    } catch (error) {
        if ((error as SocialLoginError).code === 'USER_CANCELLED') {
            throw new GoogleNativeLoginCancelledError();
        }
        throw error;
    }
}
