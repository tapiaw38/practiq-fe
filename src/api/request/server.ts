import axios from 'axios';

const TOKEN_KEY = 'practiq_token';
const REFRESH_TOKEN_KEY = 'practiq_refresh_token';
const ACTIVE_SCHOOL_KEY = 'practiq.activeSchool';

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8082';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

let refreshing: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    try {
        const { data } = await axios.post(`${AUTH_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
        });
        setToken(data.token);
        setRefreshToken(data.refresh_token);
        return data.token as string;
    } catch {
        return null;
    }
}

function refreshOnce(): Promise<string | null> {
    if (!refreshing) {
        refreshing = refreshSession();
        void refreshing.finally(() => {
            refreshing = null;
        });
    }
    return refreshing;
}

export function refreshAssistantToken(): Promise<string | null> {
    return refreshOnce();
}

export async function ensureFreshAccessToken(): Promise<string | null> {
    const token = getToken();
    if (!token) return null;

    try {
        const payload = token.split('.')[1];
        if (!payload) return token;
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        const expiresAt = Number(decoded.exp ?? 0);

        if (expiresAt > Date.now() / 1000 + 60) return token;
        return refreshOnce();
    } catch {
        return token;
    }
}

function createAxiosInstance(baseURL: string) {
    const instance = axios.create({
        baseURL,
        timeout: 300000,
        headers: { 'Content-Type': 'application/json' },
    });

    instance.interceptors.request.use((config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (baseURL.includes('/api')) {
            const schoolId = localStorage.getItem(ACTIVE_SCHOOL_KEY);
            if (schoolId) config.headers['X-School-ID'] = schoolId;
        }
        return config;
    });

    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const original = error.config;
            const isRefreshCall = original?.url?.includes('/auth/refresh');

            if (
                error.response?.status === 401 &&
                original &&
                !original._retried &&
                !isRefreshCall
            ) {
                original._retried = true;

                const token = await refreshOnce();
                if (token) {
                    original.headers = original.headers ?? {};
                    original.headers.Authorization = `Bearer ${token}`;
                    return instance(original);
                }

                removeToken();
                window.location.href = '/login';
            }

            return Promise.reject(error);
        },
    );

    return instance;
}

export const authApi = createAxiosInstance(
    import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8082',
);

export const practiqApi = createAxiosInstance(
    (import.meta.env.VITE_PRACTIQ_API_URL || 'http://localhost:8083') + '/api',
);
