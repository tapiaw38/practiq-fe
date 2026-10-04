import type { LoginResponse } from '@/types/auth';

export interface GoogleButtonEmits {
    (e: 'code', authCode: string): void;
    (e: 'session', response: LoginResponse): void;
    (e: 'error', message: string): void;
}

export interface GoogleClient {
    requestCode: () => void;
}

export interface GoogleResponse {
    code: string;
}
