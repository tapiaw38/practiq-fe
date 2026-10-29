import { onUnmounted } from 'vue';

const BODY_CLASS = 'assistant-fab-tucked';
const CSS_VAR = '--practiq-footer-h';

export function tuckAssistantFab(footerSelector: string) {
    document.body.classList.add(BODY_CLASS);

    let observer: ResizeObserver | null = null;
    let frame = 0;
    let el: HTMLElement | null = null;

    const MAX_CLEARANCE_RATIO = 0.28;

    const measure = () => {
        if (!el) return;
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const clearance = viewportHeight - el.getBoundingClientRect().top;
        const bounded = Math.min(Math.max(clearance, 0), viewportHeight * MAX_CLEARANCE_RATIO);
        document.body.style.setProperty(CSS_VAR, `${Math.ceil(bounded)}px`);
    };

    const attach = () => {
        el = document.querySelector<HTMLElement>(footerSelector);
        if (!el) return false;
        observer = new ResizeObserver(measure);
        observer.observe(el);

        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, { passive: true });
        window.visualViewport?.addEventListener('resize', measure);
        measure();
        return true;
    };

    let attempts = 0;
    const tryAttach = () => {
        if (attach() || ++attempts > 30) return;
        frame = requestAnimationFrame(tryAttach);
    };
    tryAttach();

    onUnmounted(() => {
        cancelAnimationFrame(frame);
        observer?.disconnect();
        window.removeEventListener('resize', measure);
        window.removeEventListener('scroll', measure);
        window.visualViewport?.removeEventListener('resize', measure);
        document.body.classList.remove(BODY_CLASS);
        document.body.style.removeProperty(CSS_VAR);
    });
}
