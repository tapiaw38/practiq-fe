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
  let el: HTMLElement | null = null;

  // Distance from the viewport's bottom edge to the footer's top edge, not
  // just the footer's own height: on tablet/desktop widths the footer is a
  // sticky bar with its own `bottom: 16px` gap, so height alone undercounted
  // by that gap and the launcher still clipped the footer's top edge.
  // However tall the footer grows, the launcher stops here. Past this point it
  // is no longer hovering beside a footer, it is sitting in the middle of the
  // screen on top of whatever the student is reading.
  const MAX_CLEARANCE_RATIO = 0.28;

  const measure = () => {
    if (!el) return;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const clearance = viewportHeight - el.getBoundingClientRect().top;
    const bounded = Math.min(
      Math.max(clearance, 0),
      viewportHeight * MAX_CLEARANCE_RATIO,
    );
    document.body.style.setProperty(CSS_VAR, `${Math.ceil(bounded)}px`);
  };

  const attach = () => {
    el = document.querySelector<HTMLElement>(footerSelector);
    if (!el) return false;
    observer = new ResizeObserver(measure);
    observer.observe(el);
    // ResizeObserver only fires on size changes. A sticky footer moves without
    // resizing whenever the page scrolls, a tablet rotates, or the mobile
    // browser collapses its address bar — each of those leaves the launcher
    // parked at a clearance that no longer matches where the footer is.
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    window.visualViewport?.addEventListener("resize", measure);
    measure();
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
    window.removeEventListener("resize", measure);
    window.removeEventListener("scroll", measure);
    window.visualViewport?.removeEventListener("resize", measure);
    document.body.classList.remove(BODY_CLASS);
    document.body.style.removeProperty(CSS_VAR);
  });
}
