import { ref } from 'vue';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface ToastMessage {
    severity?: ToastSeverity;
    summary?: string;
    detail?: string;
    life?: number;
}

export interface Toast extends ToastMessage {
    id: number;
}

const DEFAULT_LIFE = 3000;

const toasts = ref<Toast[]>([]);
let nextId = 0;

function remove(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

function add(message: ToastMessage) {
    const id = ++nextId;
    toasts.value = [...toasts.value, { ...message, id }];
    window.setTimeout(() => remove(id), message.life ?? DEFAULT_LIFE);
}

export function useToast() {
    return { add };
}

export function useToastQueue() {
    return { toasts, remove };
}
