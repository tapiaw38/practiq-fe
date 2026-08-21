import { onUnmounted } from "vue";

const BODY_CLASS = "assistant-fab-tucked";
const CSS_VAR = "--practiq-footer-h";

/**
 * Keeps the assistant launcher's mobile position clear of a screen's own
 * sticky footer. The footer's height isn't constant (practice's grows a row
 * whenever the draft-saved indicator shows), so this tracks it with a
 * ResizeObserver instead of a guessed pixel offset — see AssistantWidget.vue
 * for the CSS rule that reads --practiq-footer-h.
 */
export function tuckAssistantFab(footerSelector: string) {
  document.body.classList.add(BODY_CLASS);

  let observer: ResizeObserver | null = null;
  let frame = 0;

  const attach = () => {
    const el = document.querySelector<HTMLElement>(footerSelector);
    if (!el) return false;
    // offsetHeight, not the observer entry's contentRect: contentRect is the
    // content box only, so the footer's own padding was quietly missing from
    // the clearance and the launcher still overlapped its bottom edge.
    observer = new ResizeObserver(() => {
      document.body.style.setProperty(CSS_VAR, `${el.offsetHeight}px`);
    });
    observer.observe(el);
    return true;
  };

  // The footer renders only once the loading skeleton clears, on its own
  // schedule per screen; poll a few frames instead of coupling this to each
  // caller's data-loading sequence.
  let attempts = 0;
  const tryAttach = () => {
    if (attach() || ++attempts > 30) return;
    frame = requestAnimationFrame(tryAttach);
  };
  tryAttach();

  onUnmounted(() => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    document.body.classList.remove(BODY_CLASS);
    document.body.style.removeProperty(CSS_VAR);
  });
}
