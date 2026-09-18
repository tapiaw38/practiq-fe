<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch } from "vue";

  const props = defineProps<{
    /** Empty hides the bubble. */
    message: string;
    /** Changing this replays the same message. */
    beat?: number;
    tone?: "neutral" | "good" | "retry";
  }>();

  // Icon only: the labels sat in the reading area and were noise next to a
  // mascot that is already the obvious thing to tap. The name stays in the
  // tooltip and in the accessible name.
  const QUICK_ASKS = [
    { label: "Pedir ayuda", icon: "pi-question-circle", prompt: "Ayudame con el ejercicio actual. Dame una pista sin resolverlo." },
    { label: "Explicar el tema", icon: "pi-lightbulb", prompt: "Explicame el tema de este ejercicio con un ejemplo simple." },
    { label: "Revisar mi respuesta", icon: "pi-eye", prompt: "Mirá mi respuesta al ejercicio actual y decime si voy bien." },
  ];

  // With the chat open the student is already reading there, and answering in a
  // bubble over it would say the same thing twice. Closed, the bubble is the
  // only place the reply can land, so the chat stays out of the way.
  const chatOpen = ref(false);
  const waitingReply = ref(false);

  /**
   * The quick asks are a pointer affordance and nothing else.
   *
   * A touch screen has no hover, so they would have to stand there permanently
   * — which is what they did, sitting on top of the exercise. Tapping Practi
   * opens the chat, and the chat offers the same three actions along its
   * bottom edge, so nothing is out of reach without them.
   */
  const hoverCapable =
    typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;
  const hovering = ref(false);
  const asksVisible = computed(
    () => hoverCapable && hovering.value && !visible.value && !chatOpen.value,
  );

  function ask(prompt: string) {
    waitingReply.value = !chatOpen.value;
    if (waitingReply.value) speak("Pensando…", "neutral", false);
    window.dispatchEvent(
      new CustomEvent("practiq:assistant:prompt", {
        detail: { prompt, openWindow: chatOpen.value },
      }),
    );
  }

  function onChatToggle(event: Event) {
    chatOpen.value = !!(event as CustomEvent<{ open?: boolean }>).detail?.open;
    if (chatOpen.value) {
      waitingReply.value = false;
      visible.value = false;
    }
  }

  function onAssistantReply(event: Event) {
    if (!waitingReply.value) return;
    waitingReply.value = false;
    const text = (event as CustomEvent<{ text?: string }>).detail?.text?.trim();
    speak(text || "No pude responder ahora.", "neutral", true);
  }

  /**
   * Where the assistant launcher is right now.
   *
   * Read from the element rather than recomputed: the launcher is mounted by
   * the assistant library and moves on its own — it clears the screen's sticky
   * footer, and that footer grows a row whenever the draft indicator shows.
   * Null means there is no launcher on screen, and then there is nothing to
   * attach to and nothing to draw.
   */
  const anchor = ref<{
    right: number;
    asksRight: number;
    bottom: number;
    asksBottom: number;
  } | null>(null);

  /** Keep in sync with .coach-ask's width. */
  const ASK_SIZE = 40;
  /**
   * How far the quick asks reach down toward the launcher.
   *
   * Matched by an equal padding-bottom, so the icons stay where they look while
   * their box touches the launcher. Without it the pointer crossed bare page on
   * the way up, hover dropped, and they vanished before they could be reached.
   */
  const HOVER_BRIDGE = 14;

  const visible = ref(false);
  const spoken = ref("");
  const spokenTone = ref<"neutral" | "good" | "retry">("neutral");
  const dismissable = ref(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let typeTimer: ReturnType<typeof setInterval> | null = null;
  let frame = 0;

  /**
   * Shows a line above the launcher.
   *
   * An answer is revealed a few characters at a time and waits to be dismissed:
   * it is something the student asked for and has to be able to finish reading.
   * A remark the screen volunteered appears at once and leaves on its own.
   */
  function speak(text: string, tone: "neutral" | "good" | "retry", answer: boolean) {
    if (hideTimer) clearTimeout(hideTimer);
    if (typeTimer) clearInterval(typeTimer);
    measure();
    spokenTone.value = tone;
    dismissable.value = answer;
    visible.value = true;

    if (!answer) {
      spoken.value = text;
      hideTimer = setTimeout(() => {
        visible.value = false;
      }, 4200);
      return;
    }

    spoken.value = "";
    let shown = 0;
    typeTimer = setInterval(() => {
      shown = Math.min(shown + 2, text.length);
      spoken.value = text.slice(0, shown);
      if (shown < text.length || !typeTimer) return;
      clearInterval(typeTimer);
      typeTimer = null;
      // Time to read what was just said, then it clears itself. Long answers
      // get longer, within reason; the close button is there for the rest.
      hideTimer = setTimeout(dismiss, Math.min(3000 + text.length * 40, 20000));
    }, 18);
  }

  function dismiss() {
    if (hideTimer) clearTimeout(hideTimer);
    if (typeTimer) clearInterval(typeTimer);
    visible.value = false;
    // Without this the answer keeps outranking every later remark, and the
    // bubble never speaks again for the rest of the sheet.
    dismissable.value = false;
  }

  function measure() {
    const fab = document.querySelector<HTMLElement>(".floating-button");
    if (!fab || fab.classList.contains("practiq-assistant-drawer-hidden")) {
      anchor.value = null;
      return;
    }
    const rect = fab.getBoundingClientRect();
    if (!rect.width) {
      anchor.value = null;
      return;
    }
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    // The bubble and the quick asks share this spot above the launcher: one is
    // showing whenever the other is not.
    const right = Math.max(viewportWidth - rect.right, 8);
    anchor.value = {
      right,
      // Centred on the launcher rather than flush with its right edge: the
      // icons are narrower than it, and aligned edges read as crooked.
      asksRight: right + Math.max((rect.width - ASK_SIZE) / 2, 0),
      bottom: viewportHeight - rect.top + 10,
      asksBottom: viewportHeight - rect.top + 10 - HOVER_BRIDGE,
    };
  }

  // The launcher mounts on its own schedule, after this view is already up.
  let attempts = 0;
  function poll() {
    measure();
    if (anchor.value || ++attempts > 60) return;
    frame = requestAnimationFrame(poll);
  }

  let leaveTimer: ReturnType<typeof setTimeout> | null = null;

  function onPointerOver(event: Event) {
    const target = event.target as HTMLElement | null;
    const inside = !!target?.closest(".floating-button, .coach-asks, .coach-bubble");
    if (leaveTimer) clearTimeout(leaveTimer);
    if (inside) {
      hovering.value = true;
      return;
    }
    // A moment's grace: a pointer travelling between the icons can register on
    // whatever sits behind the gaps between them.
    leaveTimer = setTimeout(() => {
      hovering.value = false;
    }, 220);
  }

  onMounted(() => {
    poll();
    if (hoverCapable) document.addEventListener("pointerover", onPointerOver);
    // The chat can already be open when this view mounts; only its toggle is
    // announced, so the first reading comes from the DOM.
    const chat = document.querySelector<HTMLElement>(".ia-chat-container");
    chatOpen.value = !!chat && chat.style.display === "block";
    window.addEventListener("practiq:assistant:chat-toggle", onChatToggle);
    window.addEventListener("practiq:assistant:reply", onAssistantReply);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    window.visualViewport?.addEventListener("resize", measure);
  });

  onUnmounted(() => {
    cancelAnimationFrame(frame);
    document.removeEventListener("pointerover", onPointerOver);
    if (hideTimer) clearTimeout(hideTimer);
    if (typeTimer) clearInterval(typeTimer);
    if (leaveTimer) clearTimeout(leaveTimer);
    window.removeEventListener("practiq:assistant:chat-toggle", onChatToggle);
    window.removeEventListener("practiq:assistant:reply", onAssistantReply);
    window.removeEventListener("resize", measure);
    window.removeEventListener("scroll", measure);
    window.visualViewport?.removeEventListener("resize", measure);
  });

  watch(
    () => [props.message, props.beat],
    () => {
      // An answer the student asked for outranks a remark about progress, and
      // with the chat open the bubble would sit on top of it.
      if (waitingReply.value || chatOpen.value) return;
      if (dismissable.value && visible.value) return;
      if (!props.message) {
        visible.value = false;
        return;
      }
      speak(props.message, props.tone ?? "neutral", false);
    },
    { immediate: true },
  );
</script>

<template>
  <template v-if="anchor">
    <Transition name="coach">
      <div
        v-if="visible"
        class="coach-bubble"
        :class="[
          `coach-bubble--${spokenTone}`,
          { 'coach-bubble--answer': dismissable },
        ]"
        :style="{ right: `${anchor.right}px`, bottom: `${anchor.bottom}px` }"
        role="status"
        aria-live="polite"
      >
        <button
          v-if="dismissable"
          type="button"
          class="coach-close"
          aria-label="Cerrar"
          @click="dismiss"
        >
          <i class="pi pi-times" aria-hidden="true"></i>
        </button>
        <span class="coach-said">{{ spoken }}</span>
      </div>
    </Transition>

    <Transition name="coach">
      <div
        v-if="asksVisible"
        class="coach-asks"
        :style="{ right: `${anchor.asksRight}px`, bottom: `${anchor.asksBottom}px` }"
      >
        <button
          v-for="quick in QUICK_ASKS"
          :key="quick.label"
          type="button"
          class="coach-ask"
          :title="quick.label"
          :aria-label="quick.label"
          @click="ask(quick.prompt)"
        >
          <i class="pi" :class="quick.icon" aria-hidden="true"></i>
        </button>
      </div>
    </Transition>
  </template>
</template>

<style scoped>
  .coach-bubble {
    position: fixed;
    z-index: 1000;
    max-width: min(72vw, 300px);
    padding: 9px 14px;
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    border: 2px solid var(--fill-primary-soft);
    box-shadow: var(--elevation-tint-shadow);
    color: var(--text-heading);
    font-size: var(--text-sm);
    font-weight: 800;
    line-height: 1.25;
    pointer-events: none;
  }
  /* An answer is read, not glanced at: it gets room, its own weight, and it
     stays until it is tapped away. */
  .coach-bubble--answer {
    max-width: min(82vw, 330px);
    max-height: 38vh;
    overflow-y: auto;
    padding-right: 34px;
    font-weight: 600;
    text-align: left;
    /* The reply arrives with its own paragraphs; collapsing them turned an
       explanation into one unreadable block. */
    white-space: pre-line;
    pointer-events: auto;
  }
  .coach-close {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--surface-hover);
    color: var(--text-secondary);
    font-size: 0.7rem;
    cursor: pointer;
  }
  .coach-close:hover {
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
  }
  /* The tail points down at the launcher, which is what makes the text read as
     something Practi said rather than a notification that happened to land. */
  .coach-bubble::after {
    content: "";
    position: absolute;
    right: 18px;
    bottom: -9px;
    width: 14px;
    height: 14px;
    background: inherit;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: inherit;
    transform: rotate(45deg);
    border-radius: 0 0 3px 0;
  }
  .coach-bubble--good {
    border-color: var(--color-success);
  }
  .coach-bubble--retry {
    border-color: var(--color-warning);
  }

  /* Stacked above the launcher, never below it: the launcher already rests just
     above the screen's sticky footer, so anything under it lands on the
     footer's buttons. */
  .coach-asks {
    position: fixed;
    z-index: 999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    /* Matches HOVER_BRIDGE: the box reaches the launcher, the icons do not move. */
    padding-bottom: 14px;
  }
  .coach-ask {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--surface-border);
    border-radius: 50%;
    background: var(--surface-card);
    box-shadow: var(--elevation-tint-shadow);
    color: var(--practiq-violet);
    font-size: 1rem;
    cursor: pointer;
    transition: var(--transition-fast);
  }
  .coach-ask:hover {
    background: var(--fill-primary-faint);
    transform: scale(1.06);
  }
  .coach-ask:active {
    transform: none;
  }

  .coach-enter-active,
  .coach-leave-active {
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }
  .coach-enter-from,
  .coach-leave-to {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }

  @media (prefers-reduced-motion: reduce) {
    .coach-enter-active,
    .coach-leave-active {
      transition: none;
    }
    .coach-ask:hover {
      transform: none;
    }
  }
</style>
