<template>
  <Teleport to="body">
    <Transition name="acm-fade">
      <div v-if="show" class="acm-overlay" @click.self="$emit('close')">
        <div class="acm-modal" role="dialog" aria-label="Asistente de práctica">
          <!-- ── Header ── -->
          <div class="acm-header">
            <div class="acm-header-info">
              <div class="acm-avatar"><i class="pi pi-robot"></i></div>
              <div>
                <div class="acm-title">Mi Asistente</div>
                <div class="acm-status">
                  <span
                    class="acm-dot"
                    :class="{ 'acm-dot--busy': isBusy }"
                  ></span>
                  {{ statusLabel }}
                </div>
              </div>
            </div>
            <button
              class="acm-close"
              @click="$emit('close')"
              aria-label="Cerrar"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- ── PIZARRÓN mode body ── -->
          <template v-if="mode === 'pizarron'">
            <!-- Idle: intro card -->
            <div v-if="pizState === 'idle'" class="acm-piz-idle">
              <div class="acm-piz-intro-icon">🖊️</div>
              <h3 class="acm-piz-intro-title">Modo Pizarrón</h3>
              <p class="acm-piz-intro-desc">
                Escribe el tema que quieres practicar y te generaré un
                ejercicio.<br />
                Luego lo resuelves en tu lienzo y lo evalúo al instante.
              </p>
            </div>

            <!-- Generating spinner -->
            <div v-else-if="pizState === 'generating'" class="acm-piz-loading">
              <div class="spinner spinner-violet"></div>
              <p>Generando tu ejercicio…</p>
            </div>

            <!-- Drawing: split layout -->
            <div
              v-else-if="pizState === 'drawing' || pizState === 'evaluating'"
              class="acm-piz-split"
            >
              <!-- Left: exercise -->
              <div class="acm-piz-exercise">
                <div class="acm-piz-panel-label">
                  <i class="pi pi-book"></i> Ejercicio
                </div>
                <div
                  class="acm-piz-exercise-content acm-bubble--md"
                  v-html="renderContent(exerciseHtml)"
                ></div>
              </div>

              <!-- Right: canvas -->
              <div class="acm-piz-canvas-area">
                <div class="acm-piz-panel-label">
                  <i class="pi pi-pencil"></i> Tu respuesta
                  <div class="acm-canvas-tools">
                    <button
                      class="acm-tool-btn"
                      :class="{ 'acm-tool-btn--active': activeTool === 'pen' }"
                      title="Lápiz"
                      @click="activeTool = 'pen'"
                    >
                      <i class="pi pi-pencil"></i>
                    </button>
                    <button
                      class="acm-tool-btn"
                      :class="{
                        'acm-tool-btn--active': activeTool === 'eraser',
                      }"
                      title="Borrador"
                      @click="activeTool = 'eraser'"
                    >
                      <i class="pi pi-eraser"></i>
                    </button>
                    <button
                      class="acm-tool-btn"
                      title="Limpiar lienzo"
                      @click="clearCanvas"
                    >
                      <i class="pi pi-trash"></i>
                    </button>
                  </div>
                </div>
                <canvas
                  ref="canvasEl"
                  class="acm-canvas"
                  @mousedown="onCanvasDown"
                  @mousemove="onCanvasMove"
                  @mouseup="onCanvasUp"
                  @mouseleave="onCanvasUp"
                  @touchstart.prevent="onTouchStart"
                  @touchmove.prevent="onTouchMove"
                  @touchend.prevent="onTouchEnd"
                ></canvas>
                <button
                  class="btn btn-primary acm-evaluar-btn"
                  :disabled="pizState === 'evaluating'"
                  @click="evaluateCanvas"
                >
                  <i
                    :class="
                      pizState === 'evaluating'
                        ? 'pi pi-spin pi-spinner'
                        : 'pi pi-check-circle'
                    "
                  ></i>
                  {{
                    pizState === "evaluating"
                      ? "Evaluando…"
                      : "Evaluar mi respuesta"
                  }}
                </button>
              </div>
            </div>

            <!-- Feedback -->
            <div v-else-if="pizState === 'feedback'" class="acm-piz-feedback">
              <div class="acm-piz-feedback-header">
                <i class="pi pi-comments"></i> Retroalimentación
              </div>
              <div
                class="acm-piz-feedback-content acm-bubble--md"
                v-html="renderContent(feedbackHtml)"
              ></div>
              <button
                class="btn btn-primary acm-next-btn"
                @click="resetPizarron"
              >
                <i class="pi pi-refresh"></i> Siguiente ejercicio
              </button>
            </div>
          </template>

          <!-- ── ORAL / ESCRITA: message list ── -->
          <template v-else>
            <div class="acm-messages" ref="messagesEl">
              <!-- Oral mode empty-state hint -->
              <div
                v-if="mode === 'oral' && messages.length <= 1"
                class="acm-oral-hint"
              >
                <div class="acm-oral-hint-icon">🎙️</div>
                <p>
                  Mantén presionado el botón de micrófono para grabar tu
                  pregunta
                </p>
              </div>

              <div
                v-for="msg in messages"
                :key="msg.id"
                class="acm-msg"
                :class="
                  msg.sender === 'user' ? 'acm-msg--user' : 'acm-msg--assistant'
                "
              >
                <div v-if="msg.isAudio" class="acm-bubble acm-bubble--audio">
                  <i class="pi pi-microphone"></i>
                  <audio
                    :src="msg.audioSrc"
                    controls
                    class="acm-audio-player"
                  ></audio>
                </div>
                <div
                  v-else
                  class="acm-bubble"
                  :class="{ 'acm-bubble--md': msg.sender === 'assistant' }"
                  v-html="
                    msg.sender === 'assistant'
                      ? renderContent(msg.content)
                      : escapeHtml(msg.content)
                  "
                ></div>
              </div>

              <div v-if="responding" class="acm-msg acm-msg--assistant">
                <div class="acm-bubble acm-bubble--typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </template>

          <!-- ── Footer: mode strip + input ── -->
          <div
            class="acm-footer"
            v-show="mode !== 'pizarron' || pizState === 'idle'"
          >
            <!-- Mode strip toggle -->
            <div class="acm-mode-toggle-row">
              <button
                class="acm-mode-toggle-btn"
                @click="showModes = !showModes"
              >
                <i
                  :class="showModes ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"
                ></i>
                <span
                  >Modo: <strong>{{ modeLabel }}</strong></span
                >
              </button>
            </div>

            <!-- Mode strip (collapsible) -->
            <Transition name="acm-slide">
              <div v-show="showModes" class="acm-mode-strip">
                <button
                  v-for="m in modes"
                  :key="m.value"
                  class="acm-mode-btn"
                  :class="{ 'acm-mode-btn--active': mode === m.value }"
                  @click="setMode(m.value)"
                >
                  <span class="acm-mode-icon">{{ m.icon }}</span>
                  <span class="acm-mode-label">{{ m.label }}</span>
                </button>
              </div>
            </Transition>

            <!-- Input row -->
            <div class="acm-input-area">
              <!-- ORAL: big mic button -->
              <template v-if="mode === 'oral'">
                <div class="acm-oral-input">
                  <button
                    class="acm-mic-big"
                    :class="{ 'acm-mic-big--recording': isRecording }"
                    :disabled="responding"
                    @mousedown.prevent="startRecording"
                    @mouseup.prevent="stopRecording"
                    @touchstart.prevent="startRecording"
                    @touchend.prevent="stopRecording"
                    @mouseleave="isRecording ? stopRecording() : undefined"
                  >
                    <i
                      :class="
                        isRecording ? 'pi pi-stop-circle' : 'pi pi-microphone'
                      "
                    ></i>
                  </button>
                  <p class="acm-oral-tip">
                    {{
                      isRecording
                        ? "🔴 Grabando… suelta para enviar"
                        : "Mantén presionado para grabar"
                    }}
                  </p>
                </div>
              </template>

              <!-- ESCRITA / PIZARRÓN-idle: textarea + buttons -->
              <template v-else>
                <textarea
                  ref="inputEl"
                  v-model="draft"
                  class="acm-textarea"
                  :placeholder="inputPlaceholder"
                  rows="1"
                  :disabled="responding"
                  @keydown.enter.exact.prevent="sendText"
                  @input="autoResize"
                ></textarea>

                <button
                  class="acm-send"
                  :disabled="!draft.trim() || responding"
                  @click="sendText"
                >
                  <i class="pi pi-send"></i>
                </button>
              </template>
            </div>

            <!-- Recording bar (oral) -->
            <div v-if="isRecording" class="acm-recording-bar">
              <span class="acm-recording-dot"></span>
              Grabando… suelta para enviar
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
  import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
  import { useAuthStore } from "@/stores/authStore";
  import { renderContent } from "@/composables/useContentRenderer";

  interface StudentContext {
    studentName?: string;
    courses?: {
      title: string;
      subject: string;
      grade: string;
      currentLevel: number;
    }[];
    topicProgress?: {
      topic: string;
      mastery: number;
      level: number;
      streak: number;
    }[];
  }

  const props = defineProps<{
    show: boolean;
    studentContext?: StudentContext;
  }>();

  defineEmits<{ close: [] }>();

  const authStore = useAuthStore();
  const API_BASE = `${import.meta.env.VITE_PRACTIQ_API_URL || "http://localhost:8083"}/api/assistant-proxy`;
  const STORAGE_KEY = "ai-client-id";

  // ── Types ────────────────────────────────────────────────────────────────────

  type Mode = "escrita" | "oral" | "pizarron";
  type PizarronState =
    | "idle"
    | "generating"
    | "drawing"
    | "evaluating"
    | "feedback";

  interface Message {
    id: number;
    sender: "user" | "assistant";
    content: string;
    html: boolean;
    isAudio?: boolean;
    audioSrc?: string;
  }

  // ── State ────────────────────────────────────────────────────────────────────

  const mode = ref<Mode>("escrita");
  const showModes = ref(false);

  const messages = ref<Message[]>([]);
  const draft = ref("");
  const responding = ref(false);
  const isRecording = ref(false);
  const messagesEl = ref<HTMLElement | null>(null);
  const inputEl = ref<HTMLTextAreaElement | null>(null);
  let conversationId: string | null = null;
  let msgCounter = 0;

  // Pizarrón
  const pizState = ref<PizarronState>("idle");
  const exerciseHtml = ref("");
  const feedbackHtml = ref("");
  const pizarronTopic = ref("");

  // Canvas
  const canvasEl = ref<HTMLCanvasElement | null>(null);
  const activeTool = ref<"pen" | "eraser">("pen");
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let canvasResizeObserver: ResizeObserver | null = null;

  // Audio recording
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];

  // ── Computed ─────────────────────────────────────────────────────────────────

  const modes = [
    { value: "escrita" as Mode, label: "Escrita", icon: "✍️" },
    { value: "oral" as Mode, label: "Oral", icon: "🎙️" },
    { value: "pizarron" as Mode, label: "Pizarrón", icon: "🖊️" },
  ];

  const modeLabel = computed(
    () => modes.find((m) => m.value === mode.value)?.label ?? "",
  );

  const isBusy = computed(
    () =>
      responding.value ||
      isRecording.value ||
      pizState.value === "generating" ||
      pizState.value === "evaluating",
  );

  const statusLabel = computed(() => {
    if (isRecording.value) return "Grabando…";
    if (pizState.value === "generating") return "Generando ejercicio…";
    if (pizState.value === "evaluating") return "Evaluando…";
    if (responding.value) return "Escribiendo…";
    return "En línea";
  });

  const inputPlaceholder = computed(() =>
    mode.value === "pizarron"
      ? "¿Qué tema quieres practicar? (ej: ecuaciones de segundo grado)"
      : "Escribe tu pregunta… (Enter para enviar)",
  );

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function authHeaders(contentType?: string): Record<string, string> {
    const h: Record<string, string> = {};
    if (contentType) h["Content-Type"] = contentType;
    const token = authStore.token;
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  function dataUrlToBlob(dataUrl: string): Blob {
    const [meta, data] = dataUrl.split(",", 2);
    const mimeMatch = meta.match(/^data:(.*?)(;base64)?$/);
    const contentType = mimeMatch?.[1] || "image/png";
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: contentType });
  }

  function addMsg(
    sender: Message["sender"],
    content: string,
    html = false,
    audio?: { src: string },
  ) {
    messages.value.push({
      id: ++msgCounter,
      sender,
      content,
      html,
      isAudio: !!audio,
      audioSrc: audio?.src,
    });
    nextTick(scrollBottom);
  }

  function scrollBottom() {
    if (messagesEl.value)
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }

  function autoResize() {
    if (!inputEl.value) return;
    inputEl.value.style.height = "auto";
    inputEl.value.style.height =
      Math.min(inputEl.value.scrollHeight, 140) + "px";
  }

  function buildContext(): string {
    const ctx = props.studentContext;
    if (!ctx) return "";
    const lines: string[] = [];
    if (ctx.studentName) lines.push(`Estudiante: ${ctx.studentName}`);
    if (ctx.courses?.length) {
      lines.push("Cursos:");
      ctx.courses.forEach((c) =>
        lines.push(
          `  - ${c.title} (${c.subject}, ${c.grade}) Nivel ${c.currentLevel}`,
        ),
      );
    }
    if (ctx.topicProgress?.length) {
      lines.push("Progreso:");
      ctx.topicProgress.forEach((p) =>
        lines.push(
          `  - ${p.topic}: ${Math.round(p.mastery)}% dominio, Nivel ${p.level}`,
        ),
      );
    }
    return lines.join("\n");
  }

  // ── API ───────────────────────────────────────────────────────────────────────

  async function createConversation(title: string) {
    const res = await fetch(`${API_BASE}/conversation/`, {
      method: "POST",
      headers: authHeaders("application/json"),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`create conversation ${res.status}`);
    const data = await res.json();
    conversationId = data.data.id;
    const clientId = data.data.client_id;
    if (clientId) localStorage.setItem(STORAGE_KEY, clientId);
  }

  async function postFormData(
    fd: FormData,
    imageProcessor = false,
  ): Promise<string> {
    if (!conversationId) {
      const text = (fd.get("content") as string) || "Nueva conversación";
      await createConversation(text.substring(0, 30));
    }
    const imgParam = imageProcessor ? "activate" : "deactivate";
    const url = `${API_BASE}/conversation/${conversationId}/message?has_image_processor=${imgParam}&has_text_to_voice=deactivate`;
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    if (!res.ok) throw new Error(`send message ${res.status}`);
    const data = await res.json();
    const msgs: any[] = data?.data || [];
    const assistantMsg = [...msgs]
      .reverse()
      .find((m: any) => m.sender === "assistant");
    return assistantMsg?.content || "";
  }

  async function loadHistory() {
    const storedClientId = localStorage.getItem(STORAGE_KEY);
    if (!storedClientId) return;
    try {
      const res = await fetch(`${API_BASE}/conversation/user`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      const convs: any[] = data?.data || data || [];
      const match = convs.find((c: any) => c.client_id === storedClientId);
      if (!match) return;
      conversationId = match.id;
      const msgRes = await fetch(`${API_BASE}/conversation/${conversationId}`, {
        headers: authHeaders(),
      });
      if (!msgRes.ok) return;
      const msgData = await msgRes.json();
      const rawMsgs: any[] = msgData?.data || [];
      rawMsgs.forEach((m: any) =>
        addMsg(m.sender === "user" ? "user" : "assistant", m.content, true),
      );
    } catch {
      /* silent */
    }
  }

  // ── Send: escrita ─────────────────────────────────────────────────────────────

  async function sendText() {
    const text = draft.value.trim();
    if (!text || responding.value) return;
    draft.value = "";
    if (inputEl.value) inputEl.value.style.height = "auto";

    if (mode.value === "pizarron") {
      await generateExercise(text);
      return;
    }

    addMsg("user", text);
    responding.value = true;
    try {
      const fd = new FormData();
      fd.append("content", text);
      fd.append("context", buildContext());
      const reply = await postFormData(fd);
      if (reply) addMsg("assistant", reply, true);
    } catch {
      addMsg("assistant", "Ocurrió un error. Por favor intenta de nuevo.");
    } finally {
      responding.value = false;
      nextTick(() => inputEl.value?.focus());
    }
  }

  // ── Send: oral ────────────────────────────────────────────────────────────────

  async function startRecording() {
    if (responding.value || isRecording.value) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.start();
      isRecording.value = true;
    } catch {
      addMsg(
        "assistant",
        "No se pudo acceder al micrófono. Revisa los permisos del navegador.",
      );
    }
  }

  async function stopRecording() {
    if (!isRecording.value || !mediaRecorder) return;
    isRecording.value = false;
    await new Promise<void>((resolve) => {
      mediaRecorder!.onstop = () => resolve();
      mediaRecorder!.stop();
      mediaRecorder!.stream.getTracks().forEach((t) => t.stop());
    });
    if (audioChunks.length === 0) return;
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const localUrl = URL.createObjectURL(blob);
    addMsg("user", "", false, { src: localUrl });
    responding.value = true;
    try {
      const fd = new FormData();
      fd.append("content", "");
      fd.append("voice_content", blob, "audio.wav");
      fd.append("context", buildContext());
      const reply = await postFormData(fd);
      if (reply) addMsg("assistant", reply, true);
    } catch {
      addMsg(
        "assistant",
        "Ocurrió un error procesando el audio. Por favor intenta de nuevo.",
      );
    } finally {
      responding.value = false;
    }
  }

  // ── Pizarrón ─────────────────────────────────────────────────────────────────

  async function generateExercise(topic: string) {
    pizarronTopic.value = topic;
    pizState.value = "generating";
    try {
      const prompt = [
        "MODO PIZARRÓN - GENERACIÓN DE EJERCICIO:",
        `Genera un ejercicio claro, bien estructurado y resolvible manualmente sobre el tema: "${topic}".`,
        "Requisitos:",
        "- Máximo 1 ejercicios numerados",
        "- Enunciado claro con todos los datos necesarios",
        "- Adecuado para resolver en un lienzo de dibujo a mano",
        "- NO incluyas la solución",
        "- Formato limpio, fácil de leer",
        '- Incluye una instrucción breve al inicio indicando qué debe hacer el alumno (ej: "Resolvé cada ejercicio en el lienzo")',
        "- Adapta la dificultad al nivel del alumno según el contexto enviado",
        "- Usa lenguaje simple, adecuado para niños",
        "Responde solo con los ejercicios, sin introducciones.",
      ].join("\n");

      const fd = new FormData();
      fd.append("content", prompt);
      fd.append("context", buildContext());
      const reply = await postFormData(fd);
      if (reply) {
        exerciseHtml.value = reply;
        pizState.value = "drawing";
        nextTick(initCanvas);
      } else {
        pizState.value = "idle";
      }
    } catch {
      pizState.value = "idle";
    }
  }

  async function evaluateCanvas() {
    if (!canvasEl.value || pizState.value === "evaluating") return;
    pizState.value = "evaluating";
    try {
      const dataUrl = canvasEl.value.toDataURL("image/png");
      const blob = dataUrlToBlob(dataUrl);
      const prompt = [
        "MODO PIZARRÓN - EVALUACIÓN DE RESPUESTA:",
        "El alumno ha resuelto el ejercicio anterior en su lienzo. Analiza la imagen adjunta y:",
        "1. Identifica lo que escribió o dibujó",
        "2. Evalúa si la respuesta es correcta o no",
        "3. Da retroalimentación constructiva (sin revelar la solución completa si está incompleta)",
        "4. Si está bien resuelto, felicítalo brevemente",
        "Responde en español con un tono amigable y educativo.",
        "IMPORTANTE: La retroalimentación es para un niño. Sé breve, claro y usa palabras simples y fáciles de entender.",
      ].join("\n");

      const fd = new FormData();
      fd.append("content", prompt);
      fd.append("context", buildContext());
      fd.append("image_content", blob, "student_canvas.png");
      const reply = await postFormData(fd, false);
      if (reply) feedbackHtml.value = reply;
      pizState.value = "feedback";
    } catch {
      feedbackHtml.value =
        "Ocurrió un error al evaluar. Por favor intenta de nuevo.";
      pizState.value = "feedback";
    }
  }

  function resetPizarron() {
    pizState.value = "idle";
    exerciseHtml.value = "";
    feedbackHtml.value = "";
    pizarronTopic.value = "";
    draft.value = "";
    if (canvasEl.value) {
      const ctx = canvasEl.value.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasEl.value.width, canvasEl.value.height);
    }
  }

  function setMode(m: Mode) {
    mode.value = m;
    showModes.value = false;
    if (m === "pizarron") resetPizarron();
  }

  // ── Canvas drawing ────────────────────────────────────────────────────────────

  function initCanvas() {
    const canvas = canvasEl.value;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (!canvasResizeObserver) {
      canvasResizeObserver = new ResizeObserver(() => {
        initCanvas();
      });
      canvasResizeObserver.observe(canvas);
    }
  }

  function getPos(
    e: MouseEvent | Touch,
    canvas: HTMLCanvasElement,
  ): [number, number] {
    const rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function getCtx(): CanvasRenderingContext2D | null {
    return canvasEl.value?.getContext("2d") ?? null;
  }

  function applyTool(ctx: CanvasRenderingContext2D) {
    if (activeTool.value === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 24;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.5;
    }
  }

  function onCanvasDown(e: MouseEvent) {
    const canvas = canvasEl.value;
    if (!canvas) return;
    isDrawing = true;
    [lastX, lastY] = getPos(e, canvas);
  }

  function onCanvasMove(e: MouseEvent) {
    if (!isDrawing || !canvasEl.value) return;
    const ctx = getCtx();
    if (!ctx) return;
    const [x, y] = getPos(e, canvasEl.value);
    applyTool(ctx);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
  }

  function onCanvasUp() {
    isDrawing = false;
  }

  function onTouchStart(e: TouchEvent) {
    const canvas = canvasEl.value;
    if (!canvas || !e.touches[0]) return;
    isDrawing = true;
    [lastX, lastY] = getPos(e.touches[0], canvas);
  }

  function onTouchMove(e: TouchEvent) {
    if (!isDrawing || !canvasEl.value || !e.touches[0]) return;
    const ctx = getCtx();
    if (!ctx) return;
    const [x, y] = getPos(e.touches[0], canvasEl.value);
    applyTool(ctx);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
  }

  function onTouchEnd() {
    isDrawing = false;
  }

  function clearCanvas() {
    const canvas = canvasEl.value;
    if (!canvas) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      0,
      0,
      canvas.width / (window.devicePixelRatio || 1),
      canvas.height / (window.devicePixelRatio || 1),
    );
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  let initialized = false;

  watch(
    () => authStore.token,
    async (token) => {
      if (!token || initialized) return;
      initialized = true;
      messages.value = [];
      conversationId = null;
      addMsg(
        "assistant",
        "¡Hola! Soy tu asistente de práctica. ¿Qué hacemos hoy?",
      );
      await loadHistory();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    canvasResizeObserver?.disconnect();
  });
</script>

<style scoped>
  /* ── Overlay & Modal ─────────────────────────────────────────────────────── */
  .acm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5vh 5vw;
  }

  .acm-modal {
    background: var(--surface-card);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    width: 90vw;
    height: 90vh;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .acm-fade-enter-active,
  .acm-fade-leave-active {
    transition: opacity 0.2s ease;
  }
  .acm-fade-enter-from,
  .acm-fade-leave-to {
    opacity: 0;
  }
  .acm-fade-enter-active .acm-modal,
  .acm-fade-leave-active .acm-modal {
    transition: transform 0.22s ease;
  }
  .acm-fade-enter-from .acm-modal,
  .acm-fade-leave-to .acm-modal {
    transform: translateY(18px);
  }

  /* ── Header ──────────────────────────────────────────────────────────────── */
  .acm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: var(--practiq-violet);
    color: #fff;
    flex-shrink: 0;
  }

  .acm-header-info {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .acm-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }

  .acm-title {
    font-size: 16px;
    font-weight: 700;
  }

  .acm-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    opacity: 0.85;
  }

  .acm-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4ade80;
    flex-shrink: 0;
  }

  .acm-dot--busy {
    background: #fbbf24;
    animation: acm-pulse 1s infinite;
  }

  .acm-close {
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: #fff;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: var(--transition-fast);
  }
  .acm-close:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* ── Messages (escrita/oral) ─────────────────────────────────────────────── */
  .acm-messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scroll-behavior: smooth;
  }

  .acm-msg {
    display: flex;
  }
  .acm-msg--user {
    justify-content: flex-end;
  }
  .acm-msg--assistant {
    justify-content: flex-start;
  }

  .acm-bubble {
    max-width: 68%;
    padding: 11px 16px;
    border-radius: var(--radius-md);
    font-size: var(--font-body);
    line-height: 1.6;
  }

  .acm-msg--user .acm-bubble {
    background: var(--practiq-violet);
    color: #fff;
    border-bottom-right-radius: var(--radius-xs);
  }

  .acm-msg--assistant .acm-bubble {
    background: var(--practiq-violet-bg);
    color: var(--text-primary);
    border-bottom-left-radius: var(--radius-xs);
  }

  /* Audio bubble */
  .acm-bubble--audio {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--practiq-violet);
    color: #fff;
    border-bottom-right-radius: var(--radius-xs);
  }

  .acm-audio-player {
    height: 32px;
    max-width: 240px;
    filter: invert(1);
  }

  /* Typing */
  .acm-bubble--typing {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 14px 18px;
    min-width: 60px;
  }

  .acm-bubble--typing span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--practiq-violet);
    opacity: 0.45;
    animation: acm-bounce 1.1s infinite;
  }

  .acm-bubble--typing span:nth-child(2) {
    animation-delay: 0.18s;
  }
  .acm-bubble--typing span:nth-child(3) {
    animation-delay: 0.36s;
  }

  /* Oral hint */
  .acm-oral-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 16px;
    color: var(--text-muted);
    text-align: center;
    padding: 40px;
  }

  .acm-oral-hint-icon {
    font-size: 48px;
  }

  /* ── PIZARRÓN: idle ──────────────────────────────────────────────────────── */
  .acm-piz-idle {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;
    gap: 16px;
  }

  .acm-piz-intro-icon {
    font-size: 52px;
  }

  .acm-piz-intro-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-heading);
  }

  .acm-piz-intro-desc {
    font-size: var(--font-body);
    color: var(--text-secondary);
    max-width: 440px;
    line-height: 1.7;
  }

  /* Loading */
  .acm-piz-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: var(--text-secondary);
  }

  /* ── PIZARRÓN: split layout ──────────────────────────────────────────────── */
  .acm-piz-split {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  /* Exercise panel */
  .acm-piz-exercise {
    flex: 0 0 42%;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--surface-border);
    overflow: hidden;
  }

  .acm-piz-panel-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--surface-bg);
    border-bottom: 1px solid var(--surface-border);
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  .acm-piz-exercise-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    font-size: var(--font-body);
    line-height: 1.7;
    color: var(--text-primary);
  }

  /* Canvas panel */
  .acm-piz-canvas-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .acm-piz-canvas-area .acm-piz-panel-label {
    justify-content: space-between;
  }

  .acm-canvas-tools {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }

  .acm-tool-btn {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--surface-border);
    background: var(--surface-card);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    transition: var(--transition-fast);
  }

  .acm-tool-btn:hover {
    background: var(--practiq-violet-bg);
    color: var(--practiq-violet);
  }

  .acm-tool-btn--active {
    background: var(--practiq-violet-bg);
    color: var(--practiq-violet);
    border-color: var(--practiq-violet-light);
  }

  .acm-canvas {
    flex: 1;
    display: block;
    cursor: crosshair;
    background: #fff;
    touch-action: none;
    width: 100%;
    height: 100%;
  }

  .acm-evaluar-btn {
    margin: 12px 16px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }

  /* ── PIZARRÓN: feedback ──────────────────────────────────────────────────── */
  .acm-piz-feedback {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 32px 36px;
    overflow-y: auto;
    gap: 20px;
  }

  .acm-piz-feedback-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-heading);
  }

  .acm-piz-feedback-content {
    flex: 1;
    font-size: var(--font-body);
    line-height: 1.75;
    color: var(--text-primary);
    background: var(--practiq-violet-bg);
    border-radius: var(--radius-md);
    padding: 20px;
  }

  .acm-next-btn {
    align-self: flex-start;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── Footer ──────────────────────────────────────────────────────────────── */
  .acm-footer {
    flex-shrink: 0;
    border-top: 1px solid var(--surface-border);
    background: var(--surface-card);
  }

  /* Mode toggle row */
  .acm-mode-toggle-row {
    display: flex;
    align-items: center;
    padding: 6px 16px 0;
  }

  .acm-mode-toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--radius-xs);
    transition: var(--transition-fast);
  }

  .acm-mode-toggle-btn:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  /* Mode strip */
  .acm-mode-strip {
    display: flex;
    gap: 8px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--surface-border);
  }

  .acm-mode-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: var(--radius-pill);
    border: 1.5px solid var(--surface-border);
    background: var(--surface-card);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    transition: var(--transition-fast);
  }

  .acm-mode-btn:hover {
    border-color: var(--practiq-violet-light);
    color: var(--practiq-violet);
    background: var(--practiq-violet-bg);
  }

  .acm-mode-btn--active {
    background: var(--practiq-violet);
    color: #fff;
    border-color: var(--practiq-violet);
  }

  /* Input area */
  .acm-input-area {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 12px 16px 14px;
  }

  .acm-textarea {
    flex: 1;
    resize: none;
    border: 1.5px solid var(--surface-border);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    font-size: var(--font-body);
    font-family: inherit;
    color: var(--text-primary);
    background: var(--surface-bg);
    outline: none;
    line-height: 1.5;
    transition: var(--transition-fast);
    max-height: 140px;
    overflow-y: auto;
  }

  .acm-textarea:focus {
    border-color: var(--practiq-violet-light);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    background: var(--surface-card);
  }

  .acm-textarea:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .acm-textarea::placeholder {
    color: var(--text-muted);
  }

  .acm-send {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: var(--practiq-violet);
    color: #fff;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: var(--transition-fast);
  }

  .acm-send:hover:not(:disabled) {
    background: var(--practiq-violet-dark);
    transform: scale(1.07);
    box-shadow: var(--shadow-violet);
  }

  .acm-send:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Oral input */
  .acm-oral-input {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
  }

  .acm-mic-big {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--practiq-violet);
    color: #fff;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    transition: var(--transition-fast);
    box-shadow: var(--shadow-violet);
    user-select: none;
    -webkit-user-select: none;
  }

  .acm-mic-big:hover:not(:disabled) {
    background: var(--practiq-violet-dark);
    transform: scale(1.06);
  }

  .acm-mic-big--recording {
    background: var(--color-error) !important;
    animation: acm-pulse 0.7s infinite;
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.15);
  }

  .acm-mic-big:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .acm-oral-tip {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    max-width: 260px;
  }

  /* Recording bar */
  .acm-recording-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 16px;
    background: #fef2f2;
    border-top: 1px solid #fecaca;
    font-size: var(--text-sm);
    color: var(--color-error-dark);
  }

  .acm-recording-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-error);
    animation: acm-pulse 0.7s infinite;
  }

  /* Slide transition for mode strip */
  .acm-slide-enter-active,
  .acm-slide-leave-active {
    transition: all 0.18s ease;
    overflow: hidden;
  }
  .acm-slide-enter-from,
  .acm-slide-leave-to {
    opacity: 0;
    max-height: 0;
  }
  .acm-slide-enter-to,
  .acm-slide-leave-from {
    opacity: 1;
    max-height: 80px;
  }

  /* ── Animations ──────────────────────────────────────────────────────────── */
  @keyframes acm-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  @keyframes acm-bounce {
    0%,
    80%,
    100% {
      transform: translateY(0);
      opacity: 0.45;
    }
    40% {
      transform: translateY(-6px);
      opacity: 1;
    }
  }

  /* ── Mobile ──────────────────────────────────────────────────────────────── */
  @media (max-width: 600px) {
    .acm-overlay {
      padding: 0;
      align-items: flex-end;
    }
    .acm-modal {
      width: 100vw;
      height: 100dvh;
      border-radius: 0;
    }
    .acm-bubble {
      max-width: 85%;
    }

    .acm-piz-split {
      flex-direction: column;
    }
    .acm-piz-exercise {
      flex: 0 0 40%;
      border-right: none;
      border-bottom: 1px solid var(--surface-border);
    }
  }

  /* ── Markdown + Math typography (deep = pierce scoped into v-html) ────────── */
  :deep(.acm-bubble--md) {
    line-height: 1.7;
    overflow-wrap: break-word;
  }

  :deep(.acm-bubble--md p) {
    margin: 0 0 10px;
  }
  :deep(.acm-bubble--md p:last-child) {
    margin-bottom: 0;
  }

  :deep(.acm-bubble--md strong) {
    font-weight: 700;
  }
  :deep(.acm-bubble--md em) {
    font-style: italic;
  }

  :deep(.acm-bubble--md h1),
  :deep(.acm-bubble--md h2),
  :deep(.acm-bubble--md h3) {
    font-weight: 700;
    margin: 14px 0 6px;
    line-height: 1.3;
  }
  :deep(.acm-bubble--md h1) {
    font-size: 1.15em;
  }
  :deep(.acm-bubble--md h2) {
    font-size: 1.05em;
  }
  :deep(.acm-bubble--md h3) {
    font-size: 1em;
  }

  :deep(.acm-bubble--md ul),
  :deep(.acm-bubble--md ol) {
    padding-left: 20px;
    margin: 6px 0 10px;
  }
  :deep(.acm-bubble--md li) {
    margin-bottom: 4px;
  }

  :deep(.acm-bubble--md code) {
    background: rgba(124, 58, 237, 0.08);
    border-radius: 4px;
    padding: 1px 5px;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.88em;
  }

  :deep(.acm-bubble--md pre) {
    background: #1e1e2e;
    color: #cdd6f4;
    border-radius: 8px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 8px 0;
    font-size: 0.85em;
    line-height: 1.5;
  }

  :deep(.acm-bubble--md pre code) {
    background: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }

  :deep(.acm-bubble--md blockquote) {
    border-left: 3px solid var(--practiq-violet-light);
    padding: 4px 12px;
    margin: 8px 0;
    color: var(--text-secondary);
    background: var(--practiq-violet-bg);
    border-radius: 0 6px 6px 0;
  }

  :deep(.acm-bubble--md table) {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    font-size: 0.9em;
  }

  :deep(.acm-bubble--md th),
  :deep(.acm-bubble--md td) {
    border: 1px solid var(--surface-border);
    padding: 6px 10px;
    text-align: left;
  }

  :deep(.acm-bubble--md th) {
    background: var(--practiq-violet-bg);
    font-weight: 700;
  }

  :deep(.acm-bubble--md hr) {
    border: none;
    border-top: 1px solid var(--surface-border);
    margin: 12px 0;
  }

  /* KaTeX display math centering */
  :deep(.acm-bubble--md .katex-display) {
    margin: 10px 0;
    overflow-x: auto;
  }

  /* Ensure KaTeX inline doesn't break layout */
  :deep(.acm-bubble--md .katex) {
    font-size: 1.05em;
  }
</style>
