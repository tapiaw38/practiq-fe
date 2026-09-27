<script setup lang="ts">
    import { useToastQueue, type ToastSeverity } from '@/composables/useToast';

    const { toasts, remove } = useToastQueue();

    const ICONS: Record<ToastSeverity, string> = {
        success: 'pi-check-circle',
        info: 'pi-info-circle',
        warn: 'pi-exclamation-triangle',
        error: 'pi-times-circle',
    };

    function icon(severity?: ToastSeverity) {
        return ICONS[severity ?? 'info'];
    }
</script>

<template>
    <Teleport to="body">
        <div class="toast-host" role="status" aria-live="polite">
            <TransitionGroup name="toast">
                <div
                    v-for="toast in toasts"
                    :key="toast.id"
                    class="toast"
                    :class="`toast--${toast.severity ?? 'info'}`"
                >
                    <i class="pi toast-icon" :class="icon(toast.severity)" aria-hidden="true"></i>
                    <div class="toast-body">
                        <p v-if="toast.summary" class="toast-summary">{{ toast.summary }}</p>
                        <p v-if="toast.detail" class="toast-detail">{{ toast.detail }}</p>
                    </div>
                    <button
                        type="button"
                        class="toast-close"
                        aria-label="Cerrar aviso"
                        @click="remove(toast.id)"
                    >
                        <i class="pi pi-times" aria-hidden="true"></i>
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<style>
    .toast-host {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: min(380px, calc(100vw - 32px));
        pointer-events: none;
    }

    .toast {
        pointer-events: auto;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: start;
        gap: 10px;
        padding: 12px 14px;
        border-radius: var(--radius-lg, 12px);
        border-left: 4px solid var(--toast-accent);
        background: var(--surface-card, #fff);
        box-shadow: var(--shadow-lg, 0 10px 30px rgba(15, 23, 42, 0.15));
    }

    .toast--success {
        --toast-accent: var(--color-success-dark, #15803d);
    }
    .toast--info {
        --toast-accent: var(--practiq-violet, #6d28d9);
    }
    .toast--warn {
        --toast-accent: var(--color-warning-dark, #b45309);
    }
    .toast--error {
        --toast-accent: var(--color-error-dark, #b91c1c);
    }

    .toast-icon {
        margin-top: 2px;
        color: var(--toast-accent);
    }

    .toast-body {
        min-width: 0;
    }

    .toast-summary {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--text-heading, #0f172a);
        overflow-wrap: anywhere;
    }

    .toast-detail {
        margin: 2px 0 0;
        font-size: 0.85rem;
        line-height: 1.4;
        color: var(--text-secondary, #475569);
        overflow-wrap: anywhere;
    }

    .toast-close {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: 0;
        border-radius: var(--radius-pill, 999px);
        background: transparent;
        color: var(--text-secondary, #475569);
        cursor: pointer;
    }

    .toast-enter-active,
    .toast-leave-active {
        transition:
            opacity 0.18s ease,
            transform 0.18s ease;
    }

    .toast-enter-from,
    .toast-leave-to {
        opacity: 0;
        transform: translateX(12px);
    }

    @media (max-width: 600px) {
        .toast-host {
            top: auto;
            bottom: calc(16px + env(safe-area-inset-bottom));
            left: 16px;
            right: 16px;
            width: auto;
        }
    }
</style>
