export interface FloatingButtonOptions {
  backgroundColor?: string;
  color?: string;
  icon?: string;
  avatarUrl?: string;
  size?: "small" | "medium" | "large";
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  onClick?: () => void;
  text?: string;
  container?: HTMLElement | string;
  draggable?: boolean;
  storageKey?: string;
}

export class FloatingButton {
  private element: HTMLButtonElement;
  private options: Required<FloatingButtonOptions>;
  private dragged = false;
  private autoTimer?: number;
  private gazeResetTimer?: number;
  private returnTimer?: number;
  private gazeActiveUntil = 0;
  private nextGazeAt = 0;

  constructor(options: FloatingButtonOptions = {}) {
    this.options = {
      backgroundColor: options.backgroundColor || "#4a90e2",
      color: options.color || "#ffffff",
      icon: options.icon || "💬",
      avatarUrl: options.avatarUrl || "",
      size: options.size || "medium",
      position: options.position || "bottom-right",
      onClick: options.onClick || (() => {}),
      text: options.text || "",
      container: options.container || document.body,
      draggable: options.draggable ?? true,
      storageKey: options.storageKey || "practiq-assistant:bubble-position",
    };

    this.element = document.createElement("button");
    this.render();
  }

  private render(): void {
    const { backgroundColor, color, icon, avatarUrl, size, position, text } =
      this.options;

    // Set classes and styles
    this.element.className = `floating-button ${size} ${position}${avatarUrl ? "" : " floating-button--robot"}`;
    this.element.style.backgroundColor = backgroundColor;
    this.element.style.color = color;
    this.element.setAttribute("aria-label", "Open chat");

    // Button content
    this.element.replaceChildren();
    if (avatarUrl) {
      const avatar = document.createElement("img");
      avatar.src = avatarUrl;
      avatar.alt = "";
      avatar.className = "floating-button-avatar";
      this.element.appendChild(avatar);
    } else {
      const face = document.createElement("span");
      face.className = "floating-button-face";
      face.innerHTML = this.quantyMascotSvg();
      this.element.appendChild(face);
    }
    if (text) {
      const textSpan = document.createElement("span");
      textSpan.textContent = text;
      textSpan.style.marginLeft = "5px";
      this.element.appendChild(textSpan);
    }

    // Events
    this.element.addEventListener("click", () => {
      if (this.dragged) { this.dragged = false; return; }
      this.element.classList.remove("floating-button--click-compress");
      void this.element.offsetWidth;
      this.element.classList.add("floating-button--click-compress");
      window.setTimeout(() => this.element.classList.remove("floating-button--click-compress"), 300);
      if (this.options.onClick) {
        this.options.onClick();
      }
    });

    this.element.addEventListener("mouseenter", () => {
      this.element.classList.add("hovered");
    });

    this.element.addEventListener("mouseleave", () => {
      this.element.classList.remove("hovered");
    });
    this.enableDrag();
  }

  public mount(container: HTMLElement | string = document.body): void {
    const targetContainer =
      typeof container === "string"
        ? (document.querySelector(container) as HTMLElement)
        : container;

    if (targetContainer) {
      targetContainer.appendChild(this.element);
      this.restorePosition();
      this.startAutomaticMode();

      // Load styles if not already loaded
      if (!document.getElementById("floating-button-styles")) {
        this.loadStyles();
      }
    }
  }

  public unmount(): void {
    window.clearTimeout(this.autoTimer);
    window.clearTimeout(this.gazeResetTimer);
    window.clearTimeout(this.returnTimer);
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  /** Compact Quanty head; its eye classes keep existing blink and gaze effects. */
  private quantyMascotSvg(): string {
    return `<svg class="floating-button-mascot floating-button-mascot--quanty" viewBox="0 0 160 132" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fbq-shell" x1="35" y1="28" x2="123" y2="119" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".52" stop-color="#f4f9ff"/><stop offset="1" stop-color="#c8def8"/></linearGradient>
        <linearGradient id="fbq-antenna" x1="74" y1="4" x2="95" y2="43" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b9e1ff"/><stop offset="1" stop-color="#2074d7"/></linearGradient>
      </defs>
      <g class="floating-button-head-group">
        <path d="M86 36V20" fill="none" stroke="#1764bf" stroke-width="7" stroke-linecap="round"/>
        <circle class="floating-button-cap" cx="86" cy="13" r="8" fill="url(#fbq-antenna)"/>
        <path d="M77 43c3-6 8-9 15-9s12 3 15 9" fill="none" stroke="#1764bf" stroke-width="7" stroke-linecap="round"/>
        <path class="floating-button-shell" d="M21 76c0-30 24-53 55-53h20c31 0 55 23 55 53 0 30-25 50-56 50H77C46 126 21 106 21 76z" fill="url(#fbq-shell)"/>
        <path class="floating-button-visor" d="M31 78c0-24 19-42 45-42h20c26 0 45 18 45 42 0 23-19 37-46 37H77c-27 0-46-14-46-37z" fill="#0c1c3b"/>
        <g class="floating-button-eye-group">
          <ellipse class="floating-button-eye" cx="63" cy="78" rx="10" ry="13" fill="#35d9d0"/>
          <ellipse class="floating-button-eye" cx="108" cy="78" rx="10" ry="13" fill="#35d9d0"/>
        </g>
      </g>
    </svg>`;
  }

  private loadStyles(): void {
    const styleElement = document.createElement("style");
    styleElement.id = "floating-button-styles";
    styleElement.textContent = `
      .floating-button {
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 18px rgba(76, 54, 164, .22);
        position: fixed;
        /* Stay visible when chat overlay is open on desktop too. */
        z-index: 1002;
        outline: none;
        transition: transform 160ms ease-out, box-shadow 160ms ease-out, left 420ms cubic-bezier(.2,.8,.2,1), top 420ms cubic-bezier(.2,.8,.2,1);
        font-size: 24px;
      }

      .floating-button:hover, .floating-button.hovered {
        transform: translateY(-2px) scale(1.06);
        box-shadow: 0 10px 24px rgba(76, 54, 164, .28);
      }
      .floating-button:focus-visible { outline:3px solid #f4c95d; outline-offset:4px; }
      .floating-button--robot { background:transparent !important; border-radius:0; box-shadow:none; overflow:visible; touch-action:none; }
      .floating-button--robot:hover, .floating-button--robot.hovered { box-shadow:none; }
      .floating-button--click-compress { transform-origin:right center; animation:floating-robot-click .3s cubic-bezier(.2,.8,.2,1) 1; }
      @keyframes floating-robot-click { 45% { transform:scaleX(.78) scaleY(1.04); } }
      .floating-button--chat-anchor { z-index:1002; }
      .floating-button--speaking .floating-button-face { animation:floating-robot-speaking 1.5s ease-in-out infinite; }
      /* drop-shadow traces the mascot's own silhouette. The glow used to be a
         box-shadow spread on this element, which is a plain square box with no
         radius, so the halo came out as a square around a rounded tile. */
      @keyframes floating-robot-speaking { 0%,100% { transform:scale(1); filter:drop-shadow(0 8px 12px rgba(91,69,181,.20)) drop-shadow(0 0 2px rgba(244,201,93,.55)); } 50% { transform:scale(1.03); filter:drop-shadow(0 8px 12px rgba(91,69,181,.20)) drop-shadow(0 0 9px rgba(244,201,93,.95)) drop-shadow(0 0 17px rgba(244,201,93,.45)); } }
      @media (prefers-reduced-motion: reduce) { .floating-button--speaking .floating-button-face { animation:none; filter:drop-shadow(0 8px 12px rgba(91,69,181,.20)) drop-shadow(0 0 7px rgba(244,201,93,.8)); } }

      .floating-button-avatar {
        width: 72%;
        height: 72%;
        object-fit: contain;
        display: block;
      }
      /* Direct SVG adaptation of supplied Brilliant mascot. */
      .floating-button-face { display:block; width:100%; height:100%; filter:drop-shadow(0 8px 12px rgba(91,69,181,.20)); animation:floating-robot-idle 4.8s ease-in-out infinite; }
      .floating-button-mascot { display:block; width:100%; height:100%; overflow:visible; }
      .floating-button-ear { fill:url(#fb-ear); }
      .floating-button-shell { fill:url(#fb-shell); }
      .floating-button-cap { fill:url(#fb-cap); }
      .floating-button-visor { fill:#05060b; }
      .floating-button-eye { fill:url(#fb-eye); transform-box:fill-box; transform-origin:center; }
      .floating-button-mascot--quanty .floating-button-shell { fill:url(#fbq-shell); }
      .floating-button-mascot--quanty .floating-button-cap { fill:url(#fbq-antenna); }
      .floating-button-mascot--quanty .floating-button-visor { fill:#0c1c3b; }
      .floating-button-mascot--quanty .floating-button-eye { fill:#35d9d0; }
      .floating-button-eye-group { transform-box:fill-box; transform-origin:center; transition:transform .28s cubic-bezier(.2,.8,.2,1); }
      .floating-button--blink .floating-button-eye { animation:floating-robot-blink .16s ease-in-out 1; }
      .floating-button--nod .floating-button-face { animation:floating-robot-nod .7s ease-in-out 1; }
      @keyframes floating-robot-idle { 0%,100% { transform:translateY(0) rotate(0); } 25% { transform:translateY(-3px) rotate(-.8deg); } 75% { transform:translateY(-2px) rotate(.8deg); } }
      @keyframes floating-robot-blink { 50% { transform:scaleY(.08); } }
      @keyframes floating-robot-nod { 45% { transform:translateY(5px); } }

      .floating-button.small {
        width: 40px;
        height: 40px;
        font-size: 18px;
      }

      .floating-button.medium {
        width: 88px;
        height: 76px;
        font-size: 24px;
      }

      .floating-button.large {
        width: 72px;
        height: 72px;
        font-size: 30px;
      }

      /* Posiciones */
      .floating-button.bottom-right {
        bottom: 90px;
        right: 20px;
      }

      .floating-button.bottom-left {
        bottom: 90px;
        left: 20px;
      }

      .floating-button.top-right {
        top: 20px;
        right: 20px;
      }

      .floating-button.top-left {
        top: 20px;
        left: 20px;
      }

      /* Animación al hacer clic */
      .floating-button:active {
        transform: scale(0.96);
      }
      @media (max-width:720px) {
        .floating-button.medium { width:72px; height:62px; }
        .floating-button.bottom-right, .floating-button.bottom-left { bottom:max(76px, calc(56px + env(safe-area-inset-bottom))); }
        .floating-button--chat-anchor { width:64px !important; height:55px !important; }
      }
    `;
    document.head.appendChild(styleElement);
  }

  // Métodos para actualizar propiedades
  public setColor(color: string): void {
    this.options.color = color;
    this.element.style.color = color;
  }

  public setBackgroundColor(color: string): void {
    this.options.backgroundColor = color;
    this.element.style.backgroundColor = color;
  }

  public setIcon(icon: string): void {
    this.options.icon = icon;
    this.options.avatarUrl = "";
    this.render();
  }

  private enableDrag(): void {
    if (!this.options.draggable) return;
    let startX = 0, startY = 0, left = 0, top = 0;
    let dragReady = false;
    let touchHoldTimer: ReturnType<typeof setTimeout> | undefined;
    this.element.addEventListener("pointerdown", (event) => {
      window.clearTimeout(this.returnTimer);
      startX = event.clientX; startY = event.clientY;
      const rect = this.element.getBoundingClientRect(); left = rect.left; top = rect.top;
      this.element.setPointerCapture(event.pointerId);
      dragReady = event.pointerType !== "touch";
      // Touch is click-first. Drag starts only after a short hold, avoiding
      // normal tap jitter consuming the first chat-open click.
      if (event.pointerType === "touch") {
        touchHoldTimer = setTimeout(() => { dragReady = true; }, 260);
      }
    });
    this.element.addEventListener("pointermove", (event) => {
      if (!this.element.hasPointerCapture(event.pointerId)) return;
      if (!dragReady) return;
      const x = Math.max(8, Math.min(window.innerWidth - this.element.offsetWidth - 8, left + event.clientX - startX));
      const y = Math.max(8, Math.min(window.innerHeight - this.element.offsetHeight - 8, top + event.clientY - startY));
      this.dragged ||= Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) > 5;
      this.element.style.cssText += `;left:${x}px;top:${y}px;right:auto;bottom:auto`;
    });
    this.element.addEventListener("pointerup", (event) => {
      if (!this.element.hasPointerCapture(event.pointerId)) return;
      if (touchHoldTimer) clearTimeout(touchHoldTimer);
      touchHoldTimer = undefined;
      this.element.releasePointerCapture(event.pointerId);
      if (this.dragged) this.scheduleReturnHome();
    });
    this.element.addEventListener("pointercancel", () => {
      if (touchHoldTimer) clearTimeout(touchHoldTimer);
      touchHoldTimer = undefined;
      dragReady = false;
    });
  }

  private restorePosition(): void {
    // Drag is intentionally temporary: old persisted positions must not make
    // the mascot start away from its default edge on a new visit.
    try { localStorage.removeItem(this.options.storageKey); } catch { /* optional storage */ }
  }

  private scheduleReturnHome(): void {
    window.clearTimeout(this.returnTimer);
    this.returnTimer = window.setTimeout(() => this.returnHome(), 4000);
  }

  private returnHome(): void {
    const { width, height } = this.element.getBoundingClientRect();
    const inset = 20;
    const right = this.options.position.includes("right");
    const bottom = this.options.position.includes("bottom");
    const x = right ? window.innerWidth - width - inset : inset;
    const y = bottom ? window.innerHeight - height - inset : inset;
    this.element.classList.add("floating-button--returning");
    this.element.style.left = `${Math.max(8, x)}px`;
    this.element.style.top = `${Math.max(8, y)}px`;
    this.element.style.right = "auto";
    this.element.style.bottom = "auto";
    window.setTimeout(() => {
      this.element.style.left = "";
      this.element.style.top = "";
      this.element.style.right = "";
      this.element.style.bottom = "";
      this.element.classList.remove("floating-button--returning");
    }, 440);
  }

  public setSize(size: "small" | "medium" | "large"): void {
    this.options.size = size;
    this.element.className = this.element.className.replace(
      /small|medium|large/,
      size
    );
  }

  public setPosition(
    position: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  ): void {
    this.options.position = position;
    this.element.className = this.element.className.replace(
      /bottom-right|bottom-left|top-right|top-left/,
      position
    );
  }

  public setOnClick(onClick: () => void): void {
    this.options.onClick = onClick;
  }

  public hide(): void {
    this.element.style.display = "none";
  }

  public show(): void {
    this.element.style.display = "flex";
  }

  /** Mobile open state: keep same robot visible as a sheet-side companion. */
  public anchorToMobileChat(sheetTop: number): void {
    if (window.innerWidth > 720) return;
    this.element.classList.add("floating-button--chat-anchor");
    this.element.style.left = "20px";
    this.element.style.top = `${Math.max(8, sheetTop - 48)}px`;
    this.element.style.right = "auto";
    this.element.style.bottom = "auto";
  }

  /** Desktop focus state: mascot occupies panel header's left edge. */
  public anchorToDesktopChat(chatTop: number, chatLeft: number): void {
    if (window.innerWidth <= 720) return;
    this.element.classList.add("floating-button--chat-anchor");
    this.element.style.left = `${Math.max(8, chatLeft + 14)}px`;
    this.element.style.top = `${Math.max(8, chatTop + 10)}px`;
    this.element.style.right = "auto";
    this.element.style.bottom = "auto";
  }

  public restoreFromMobileChat(): void {
    this.element.classList.remove("floating-button--chat-anchor", "floating-button--speaking");
    this.element.style.left = "";
    this.element.style.top = "";
    this.element.style.right = "";
    this.element.style.bottom = "";
    // Desktop drag coordinates can be outside a narrow mobile viewport.
    // Mobile always returns to a reachable default bubble position.
    if (window.innerWidth <= 720) {
      this.element.style.right = "16px";
      this.element.style.bottom = "max(76px, calc(56px + env(safe-area-inset-bottom)))";
      return;
    }
    this.restorePosition();
  }

  public setSpeaking(speaking: boolean): void {
    this.element.classList.toggle("floating-button--speaking", speaking);
  }

  /** Automatic idle animation, plus brief mouse tracking at irregular intervals. */
  public followPointerOccasionally(event: PointerEvent): void {
    if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const now = Date.now();
    if (now >= this.nextGazeAt && now >= this.gazeActiveUntil) {
      this.gazeActiveUntil = now + 700 + Math.random() * 900;
      this.nextGazeAt = this.gazeActiveUntil + 1800 + Math.random() * 3200;
    }
    if (now >= this.gazeActiveUntil) return;

    const rect = this.element.getBoundingClientRect();
    const x = Math.max(-3, Math.min(3, (event.clientX - (rect.left + rect.width / 2)) / 14));
    const y = Math.max(-3, Math.min(3, (event.clientY - (rect.top + rect.height / 2)) / 14));
    this.setEyeOffset(x, y);
    window.clearTimeout(this.gazeResetTimer);
    this.gazeResetTimer = window.setTimeout(() => this.setEyeOffset(0, 0), Math.max(0, this.gazeActiveUntil - now));
  }

  private setEyeOffset(x: number, y: number): void {
    this.element.querySelectorAll<HTMLElement>(".floating-button-eye-group").forEach((eyes) => {
      eyes.style.transform = `translate(${x * 7}px, ${y * 7}px)`;
    });
  }

  private startAutomaticMode(): void {
    window.clearTimeout(this.autoTimer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = () => {
      const roll = Math.random();
      if (roll < .58) {
        this.element.classList.remove("floating-button--blink");
        void this.element.offsetWidth;
        this.element.classList.add("floating-button--blink");
      } else if (roll < .80) {
        this.element.classList.remove("floating-button--nod");
        void this.element.offsetWidth;
        this.element.classList.add("floating-button--nod");
      } else {
        this.setEyeOffset((Math.random() - .5) * 4, (Math.random() - .5) * 3);
        window.setTimeout(() => this.setEyeOffset(0, 0), 650);
      }
      this.autoTimer = window.setTimeout(next, 1800 + Math.random() * 2600);
    };
    this.autoTimer = window.setTimeout(next, 1300 + Math.random() * 1400);
  }
}
