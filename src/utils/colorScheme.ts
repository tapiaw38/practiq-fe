export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'color-scheme';

export function getStoredColorScheme(): ColorScheme | null {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
}

export function applyColorScheme(scheme: ColorScheme): void {
    const root = document.documentElement;
    if (scheme === 'dark') root.dataset.colorScheme = 'dark';
    else delete root.dataset.colorScheme;
    localStorage.setItem(STORAGE_KEY, scheme);
}

export function initColorScheme(): void {
    const stored = getStoredColorScheme();
    if (stored) {
        applyColorScheme(stored);
        return;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    applyColorScheme(prefersDark ? 'dark' : 'light');
}
