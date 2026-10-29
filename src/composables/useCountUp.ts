import { onUnmounted, ref, watch, type Ref } from 'vue';

export function useCountUp(source: Ref<number>, duration = 700): Ref<number> {
    const shown = ref(source.value);
    const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;

    watch(
        source,
        (target, previous) => {
            cancelAnimationFrame(frame);
            const from = previous ?? 0;
            if (reducedMotion || target === from) {
                shown.value = target;
                return;
            }
            const startedAt = performance.now();
            const step = (now: number) => {
                const progress = Math.min((now - startedAt) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);

                shown.value = progress < 1 ? Math.round(from + (target - from) * eased) : target;
                if (progress < 1) frame = requestAnimationFrame(step);
            };
            frame = requestAnimationFrame(step);
        },
        { immediate: true },
    );

    onUnmounted(() => cancelAnimationFrame(frame));

    return shown;
}
