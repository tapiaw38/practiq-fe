<script setup lang="ts">
  import UiModal from "@/components/ui/UiModal.vue";
  import ConfirmModal from "@/components/ui/ConfirmModal.vue";
  import { ref, computed, watch, nextTick, onMounted, reactive } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import { practiqApi } from "@/api/request/server";
  import { useNotebook } from "@/composables/useNotebook";
  import { useConfirm } from "@/composables/useConfirm";
  import type { Notebook, NotebookPage } from "@/types";

  const route = useRoute();
  const router = useRouter();
  const {
    loadNotebook,
    updateNotebook: updateNotebookService,
    addPage: addPageService,
    updatePage: updatePageService,
  } = useNotebook();

  const notebookId = route.params.id as string;
  const notebook = ref<Notebook | null>(null);
  const loading = ref(true);
  const saving = ref(false);
  const selectedIdx = ref(0);
  const showAddPage = ref(false);
  const showAIPagesModal = ref(false);
  const addingPage = ref(false);
  const aiPagesGenerating = ref(false);
  const aiPagesSaving = ref(false);
  const aiPageSource = ref<File | null>(null);
  const aiPageInstruction = ref("");
  const aiPageCount = ref(1);
  const aiPageError = ref("");
  type AINotebookPageDraft = {
    title: string;
    content_type: "text";
    content_data: string;
    instructions: string;
  };
  const aiPageDrafts = ref<AINotebookPageDraft[]>([]);
  const saveMsg = ref("");
  const deletingPage = ref(false);
  const { confirmState, showConfirm, onConfirm, onCancel } = useConfirm();

  // Canvas refs
  const editorCanvas = ref<HTMLCanvasElement | null>(null);
  const tool = ref<"pen" | "eraser">("pen");
  const penColor = ref(cssVar("--text-primary", "#1e293b"));
  const penSize = ref(3);
  const isDrawing = ref(false);
  const undoStack = ref<ImageData[]>([]);
  let pixelScale = 1;

  function cssVar(name: string, fallback: string, depth = 0): string {
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    if (!value) return fallback;
    const varMatch = value.match(/^var\((--[^,\s)]+)(?:,\s*(.+))?\)$/);
    if (varMatch && depth < 4) {
      return cssVar(varMatch[1], varMatch[2]?.trim() || fallback, depth + 1);
    }
    return value;
  }

  const penCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%231e1e2e' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/%3E%3C/svg%3E") 0 24, crosshair`;
  const eraserCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%23666' stroke-width='1.5'/%3E%3C/svg%3E") 10 10, cell`;
  const canvasCursor = computed(() =>
    tool.value === "eraser" ? eraserCursor : penCursor,
  );

  const newPage = reactive({
    title: "",
    content_type: "canvas" as "canvas" | "text",
    instructions: "",
  });

  const pages = computed(() => notebook.value?.pages || []);
  const canGenerateAIPages = computed(
    () => Boolean(aiPageSource.value || aiPageInstruction.value.trim()),
  );

  // FIX: currentPage devuelve el objeto mutable del array directamente.
  // Se expone como ref writeable para que v-model en el template pueda mutar
  // las propiedades y savePage() lea los valores actualizados.
  const currentPage = computed<NotebookPage | null>(
    () => pages.value[selectedIdx.value] ?? null,
  );

  onMounted(async () => {
    try {
      notebook.value = await loadNotebook(notebookId);
    } finally {
      loading.value = false;
      await nextTick();
      if (currentPage.value?.content_type === "canvas") initCanvas(true);
    }
  });

  watch(selectedIdx, async () => {
    undoStack.value = [];
    await nextTick();
    if (currentPage.value?.content_type === "canvas") initCanvas(true);
  });

  watch(
    () => currentPage.value?.content_type,
    async (type) => {
      if (type === "canvas") {
        await nextTick();
        initCanvas(true);
      }
    },
  );

  function selectPage(idx: number) {
    selectedIdx.value = idx;
  }

  async function addPage() {
    if (addingPage.value) return;
    addingPage.value = true;
    const pageCount = pages.value.length;
    try {
      await addPageService(notebookId, {
        page_number: pageCount + 1,
        title: newPage.title || `Página ${pageCount + 1}`,
        content_type: newPage.content_type,
        content_data: "",
        instructions: newPage.instructions,
      });
      showAddPage.value = false;
      newPage.title = "";
      newPage.instructions = "";
      newPage.content_type = "canvas";

      notebook.value = await loadNotebook(notebookId);
      await nextTick();
      selectedIdx.value = pages.value.length - 1;
      await nextTick();
      if (currentPage.value?.content_type === "canvas") initCanvas(true);
    } finally {
      addingPage.value = false;
    }
  }

  function setAIPageSource(event: Event) {
    aiPageSource.value = (event.target as HTMLInputElement).files?.[0] || null;
  }

  function resetAIPages() {
    aiPageSource.value = null;
    aiPageInstruction.value = "";
    aiPageCount.value = 1;
    aiPageDrafts.value = [];
    aiPageError.value = "";
  }

  async function generateAIPages() {
    if (!canGenerateAIPages.value || aiPagesGenerating.value) return;
    aiPagesGenerating.value = true;
    aiPageError.value = "";
    try {
      const form = new FormData();
      if (aiPageSource.value) form.append("source", aiPageSource.value);
      form.append("instruction", aiPageInstruction.value.trim());
      form.append("count", String(aiPageCount.value));
      const { data } = await practiqApi.post(
        `/notebooks/${notebookId}/page-drafts/ai`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      aiPageDrafts.value = (data.data || []).map((page: Partial<AINotebookPageDraft>) => ({
        title: page.title || "Nueva página",
        content_type: "text",
        content_data: page.content_data || "",
        instructions: page.instructions || "",
      }));
    } catch (error) {
      aiPageError.value =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "No se pudieron generar las hojas. Intentá nuevamente.";
    } finally {
      aiPagesGenerating.value = false;
    }
  }

  async function saveAIPages() {
    if (!aiPageDrafts.value.length || aiPagesSaving.value) return;
    if (aiPageDrafts.value.some((page) => !page.title.trim() || !page.content_data.trim())) {
      aiPageError.value = "Cada hoja necesita título y contenido.";
      return;
    }
    aiPagesSaving.value = true;
    aiPageError.value = "";
    try {
      let pageNumber = pages.value.length;
      const pending: AINotebookPageDraft[] = [];
      let failure = false;
      for (const page of aiPageDrafts.value) {
        if (failure) {
          pending.push(page);
          continue;
        }
        pageNumber += 1;
        try {
          await addPageService(notebookId, {
            page_number: pageNumber,
            title: page.title.trim(),
            content_type: "text",
            content_data: page.content_data.trim(),
            instructions: page.instructions.trim(),
          });
        } catch {
          failure = true;
          pending.push(page);
        }
      }
      notebook.value = await loadNotebook(notebookId);
      if (failure) {
        aiPageDrafts.value = pending;
        aiPageError.value = "Se agregaron algunas hojas. Quedan las restantes para reintentar.";
        return;
      }
      selectedIdx.value = Math.max(0, pages.value.length - aiPageDrafts.value.length);
      showAIPagesModal.value = false;
      resetAIPages();
    } catch {
      aiPageError.value = "No se pudieron guardar todas las hojas. Revisá el cuaderno e intentá de nuevo.";
    } finally {
      aiPagesSaving.value = false;
    }
  }

  const statementDraft = ref("");
  const savingStatement = ref(false);
  const statementMsg = ref("");

  const hasImageStatement = computed(() => {
    const value = (currentPage.value?.content_data || "").trim();
    if (!value) return false;
    if (value.startsWith("data:image/")) return true;
    return /^https?:\/\/\S+\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(value);
  });

  watch(
    () => currentPage.value?.id,
    () => {
      statementDraft.value = currentPage.value?.statement_text || "";
      statementMsg.value = "";
    },
    { immediate: true },
  );

  async function saveStatement() {
    if (!currentPage.value || savingStatement.value) return;
    savingStatement.value = true;
    try {
      await updatePageService(currentPage.value.id, {
        title: currentPage.value.title || "",
        content_type: currentPage.value.content_type,
        content_data: currentPage.value.content_data || "",
        instructions: currentPage.value.instructions || "",
        statement_text: statementDraft.value.trim(),
      });
      currentPage.value.statement_text = statementDraft.value.trim();
      currentPage.value.statement_verified = true;
      statementMsg.value = "Consigna confirmada";
      setTimeout(() => {
        statementMsg.value = "";
      }, 2500);
    } finally {
      savingStatement.value = false;
    }
  }

  async function savePage() {
    if (!currentPage.value || saving.value) return;
    saving.value = true;
    try {
      await updatePageService(currentPage.value.id, {
        title: currentPage.value.title || "",
        content_type: currentPage.value.content_type,
        content_data: currentPage.value.content_data || "",
        instructions: currentPage.value.instructions || "",
      });
      saveMsg.value = "Guardado";
      setTimeout(() => {
        saveMsg.value = "";
      }, 2000);
    } finally {
      saving.value = false;
    }
  }

  async function saveCanvasContent() {
    if (!editorCanvas.value || !currentPage.value) return;
    const dataUrl = editorCanvas.value.toDataURL("image/png");
    currentPage.value.content_data = dataUrl;
    await savePage();
  }

  async function deleteCurrentPage() {
    const page = currentPage.value;
    if (!page || deletingPage.value) return;
    const approved = await showConfirm(`¿Eliminar “${page.title || "esta hoja"}”?`, {
      description: "También se eliminarán las entregas de alumnos de esta hoja. No se puede deshacer.",
      confirmLabel: "Eliminar hoja",
      danger: true,
    });
    if (!approved) return;
    deletingPage.value = true;
    try {
      const previousIndex = selectedIdx.value;
      await practiqApi.delete(`/notebook-pages/${page.id}`);
      notebook.value = await loadNotebook(notebookId);
      selectedIdx.value = Math.max(0, Math.min(previousIndex, pages.value.length - 1));
      await nextTick();
      if (currentPage.value?.content_type === "canvas") initCanvas(true);
      saveMsg.value = "Hoja eliminada";
    } finally {
      deletingPage.value = false;
    }
  }

  function initCanvas(loadExisting = false) {
    const canvas = editorCanvas.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    pixelScale = window.devicePixelRatio || 1;
    canvas.width = Math.round((rect.width || 700) * pixelScale);
    canvas.height = Math.round((rect.height || 400) * pixelScale);
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = cssVar("--surface-card", "#ffffff");
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    undoStack.value = [];

    if (loadExisting && currentPage.value?.content_data) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = currentPage.value.content_data;
    }
  }

  function getCtx() {
    return editorCanvas.value?.getContext("2d") ?? null;
  }

  function getPoint(e: MouseEvent) {
    const canvas = editorCanvas.value!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startDraw(e: MouseEvent) {
    const ctx = getCtx();
    if (!ctx || !editorCanvas.value) return;
    undoStack.value.push(
      ctx.getImageData(
        0,
        0,
        editorCanvas.value.width,
        editorCanvas.value.height,
      ),
    );
    isDrawing.value = true;
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: MouseEvent) {
    if (!isDrawing.value) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.globalCompositeOperation =
      tool.value === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = penColor.value;
    ctx.lineWidth =
      (tool.value === "eraser" ? penSize.value * 4 : penSize.value) * pixelScale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endDraw() {
    isDrawing.value = false;
    getCtx()?.beginPath();
  }

  function startDrawTouch(e: TouchEvent) {
    startDraw({
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
    } as MouseEvent);
  }

  function drawTouch(e: TouchEvent) {
    draw({
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
    } as MouseEvent);
  }

  function undoDraw() {
    const ctx = getCtx();
    if (!ctx || !editorCanvas.value || !undoStack.value.length) return;
    ctx.putImageData(undoStack.value.pop()!, 0, 0);
  }

  function clearCanvas() {
    const canvas = editorCanvas.value;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    undoStack.value = [];
    ctx.fillStyle = cssVar("--surface-card", "#ffffff");
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (currentPage.value) currentPage.value.content_data = "";
  }
</script>

<template>
  <TeacherLayout>
    <div class="editor-shell">
      <!-- Header -->
      <header class="editor-header">
        <button
          class="btn-back"
          type="button"
          aria-label="Volver"
          @click="router.back()"
        >
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="header-info">
          <h1 class="editor-title">{{ notebook?.title || "Cuaderno" }}</h1>
          <span class="editor-desc">{{ notebook?.description }}</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary btn-sm" type="button" @click="showAIPagesModal = true">
            <i class="pi pi-sparkles"></i> Generar con IA
          </button>
          <button class="btn btn-primary btn-sm" type="button" @click="showAddPage = true">
            <i class="pi pi-plus"></i> Agregar página
          </button>
        </div>
      </header>

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div class="editor-body">
          <aside class="pages-sidebar pages-sidebar--skeleton">
            <div class="sidebar-title">Páginas</div>
            <div v-for="n in 3" :key="n" class="sidebar-item">
              <Skeleton
                variant="avatar"
                size="28px"
                :rounded="false"
                class="sidebar-num-skel"
              />
              <div class="sidebar-info">
                <Skeleton width="100px" height="14px" />
                <Skeleton width="60px" height="12px" class="mt-4" />
              </div>
            </div>
          </aside>
          <div class="editor-main">
            <div class="page-meta-bar">
              <Skeleton width="200px" height="40px" />
              <Skeleton width="140px" height="40px" />
            </div>
            <Skeleton width="100%" height="400px" class="canvas-skel" />
            <div class="instructions-row">
              <Skeleton width="180px" height="14px" />
              <Skeleton width="100%" height="40px" />
            </div>
          </div>
        </div>
      </template>

      <div v-else class="editor-body">
        <!-- Page list sidebar -->
        <aside class="pages-sidebar">
          <div class="sidebar-title">Páginas</div>
          <div v-if="pages.length === 0" class="sidebar-empty">Sin páginas</div>
          <div
            v-for="(page, idx) in pages"
            :key="page.id"
            class="sidebar-item"
            :class="{ 'sidebar-item--active': idx === selectedIdx }"
            role="button"
            tabindex="0"
            @click="selectPage(idx)"
            @keydown.enter.prevent="selectPage(idx)"
            @keydown.space.prevent="selectPage(idx)"
          >
            <span class="sidebar-num">{{ idx + 1 }}</span>
            <div class="sidebar-info">
              <div class="sidebar-pg-title">
                {{ page.title || "Sin título" }}
              </div>
              <div class="sidebar-pg-type">
                <i
                  :class="
                    page.content_type === 'canvas'
                      ? 'pi pi-image'
                      : 'pi pi-align-left'
                  "
                ></i>
                {{ page.content_type === "canvas" ? "Imagen" : "Texto" }}
              </div>
            </div>
          </div>
        </aside>

        <!-- Editor main -->
        <div class="editor-main">
          <div v-if="pages.length === 0" class="editor-empty">
            <div class="empty-icon"><i class="pi pi-book"></i></div>
            <p>Agrega la primera página usando el botón de arriba.</p>
          </div>

          <template v-else-if="currentPage">
            <!-- Page meta edit -->
            <div class="page-meta-bar">
              <input
                v-model="currentPage.title"
                class="page-title-input"
                placeholder="Título de la página"
                @blur="savePage"
              />
              <select
                v-model="currentPage.content_type"
                class="type-select"
                @change="savePage"
              >
                <option value="canvas">Imagen / Dibujo</option>
                <option value="text">Texto</option>
              </select>
              <button class="page-delete-btn" type="button" :disabled="deletingPage" @click="deleteCurrentPage">
                <i class="pi pi-trash"></i>
                {{ deletingPage ? "Eliminando…" : "Eliminar" }}
              </button>
            </div>

            <!-- Canvas content editor -->
            <div
              v-if="currentPage.content_type === 'canvas'"
              class="canvas-editor"
            >
              <div class="canvas-toolbar">
                <button
                  class="tool-btn"
                  type="button"
                  aria-label="Usar lápiz"
                  :class="{ 'tool-btn--active': tool === 'pen' }"
                  @click="tool = 'pen'"
                >
                  <i class="pi pi-pencil"></i> Lápiz
                </button>
                <button
                  class="tool-btn"
                  type="button"
                  aria-label="Usar borrador"
                  :class="{ 'tool-btn--active': tool === 'eraser' }"
                  @click="tool = 'eraser'"
                >
                  <i class="pi pi-times-circle"></i> Borrador
                </button>
                <button
                  class="tool-btn"
                  type="button"
                  aria-label="Deshacer trazo"
                  @click="undoDraw"
                >
                  <i class="pi pi-undo"></i> Deshacer
                </button>
                <button
                  class="tool-btn"
                  type="button"
                  aria-label="Limpiar dibujo"
                  @click="clearCanvas"
                >
                  <i class="pi pi-trash"></i> Limpiar
                </button>
                <input
                  type="color"
                  v-model="penColor"
                  class="color-picker"
                  title="Color"
                  aria-label="Color del lápiz"
                />
                <input
                  type="range"
                  v-model.number="penSize"
                  min="1"
                  max="20"
                  class="size-slider"
                  aria-label="Grosor del lápiz"
                />
                <button
                  class="btn btn-primary btn-sm"
                  type="button"
                  @click="saveCanvasContent"
                  :disabled="saving"
                >
                  <i class="pi pi-save"></i>
                  {{ saving ? "Guardando..." : "Guardar imagen" }}
                </button>
              </div>

              <!-- Load existing image -->
              <div
                v-if="currentPage.content_data"
                class="current-image-preview"
              >
                <div class="preview-label">Imagen guardada:</div>
                <img
                  :src="currentPage.content_data"
                  alt="Contenido actual"
                  class="preview-img"
                />
              </div>

              <canvas
                ref="editorCanvas"
                class="editor-canvas"
                :style="{ cursor: canvasCursor }"
                @mousedown="startDraw"
                @mousemove="draw"
                @mouseup="endDraw"
                @mouseleave="endDraw"
                @touchstart.prevent="startDrawTouch"
                @touchmove.prevent="drawTouch"
                @touchend="endDraw"
              ></canvas>
            </div>

            <!-- Text content editor -->
            <div v-else class="text-editor">
              <textarea
                v-model="currentPage.content_data"
                class="text-area"
                placeholder="Escribe el contenido de la página aquí. Los alumnos verán este texto y podrán escribir su respuesta debajo."
                rows="12"
                @blur="savePage"
              ></textarea>
            </div>

            <!-- Instructions -->
            <div class="instructions-row">
              <label class="inst-label">Instrucciones para el alumno</label>
              <input
                v-model="currentPage.instructions"
                class="inst-input"
                placeholder="Ej: Resuelve las siguientes operaciones con tu lápiz."
                @blur="savePage"
              />
            </div>

            <div v-if="hasImageStatement" class="statement-box">
              <div class="statement-head">
                <label class="inst-label">Consigna leída por la IA</label>
                <span
                  class="statement-tag"
                  :class="currentPage.statement_verified ? 'statement-tag--ok' : 'statement-tag--pending'"
                >
                  <i :class="currentPage.statement_verified ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'"></i>
                  {{ currentPage.statement_verified ? "Verificada" : "Sin verificar" }}
                </span>
              </div>
              <p class="statement-help">
                Esto es lo que el sistema entendió de tu hoja y contra lo que se
                corrigen las respuestas. Revisalo: si algo quedó mal leído, el
                alumno se corrige contra un enunciado equivocado. Hasta que la
                verifiques, las correcciones quedan como sugerencia y pasan por vos.
              </p>
              <textarea
                v-model="statementDraft"
                class="statement-input"
                rows="4"
                placeholder="Todavía no se pudo leer la consigna. Escribila acá."
              ></textarea>
              <div class="statement-actions">
                <button
                  class="statement-btn"
                  type="button"
                  :disabled="savingStatement"
                  @click="saveStatement"
                >
                  <i class="pi pi-check"></i>
                  {{ savingStatement ? "Guardando…" : "Confirmar consigna" }}
                </button>
                <span v-if="statementMsg" class="statement-msg">{{ statementMsg }}</span>
              </div>
            </div>

            <!-- Save feedback -->
            <div v-if="saveMsg" class="save-feedback">
              <i class="pi pi-check-circle"></i> {{ saveMsg }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Add page modal -->
    <UiModal
      :visible="Boolean(showAddPage)"
      @close="showAddPage = false"
    >
      <template v-if="showAddPage">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Nueva Página</h3>
            <button type="button" class="modal-close" aria-label="Cerrar" @click="showAddPage = false">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <form @submit.prevent="addPage">
            <div class="form-group">
              <label class="form-label">Título</label>
              <input
                v-model="newPage.title"
                class="form-input"
                placeholder="Página 1"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de contenido</label>
              <select v-model="newPage.content_type" class="form-input">
                <option value="canvas">Imagen / Dibujo</option>
                <option value="text">Texto</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Instrucciones para el alumno</label>
              <input
                v-model="newPage.instructions"
                class="form-input"
                placeholder="Opcional"
              />
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="btn btn-secondary"
                @click="showAddPage = false"
              >
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" :disabled="addingPage">
                {{ addingPage ? "Agregando…" : "Agregar página" }}
              </button>
            </div>
          </form>
        </div>
      </template>
    </UiModal>

    <UiModal :visible="showAIPagesModal" @close="showAIPagesModal = false">
      <template v-if="showAIPagesModal">
        <div class="modal-box ai-pages-modal">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Generar hojas con IA</h3>
              <p class="modal-help">La IA prepara borradores. Revisalos antes de agregarlos al cuaderno.</p>
            </div>
            <button type="button" class="modal-close" aria-label="Cerrar" @click="showAIPagesModal = false"><i class="pi pi-times"></i></button>
          </div>
          <form v-if="!aiPageDrafts.length" @submit.prevent="generateAIPages">
            <div class="form-group">
              <label class="form-label">Qué querés enseñar *</label>
              <textarea v-model="aiPageInstruction" class="form-textarea" rows="4" placeholder="Ej: Explicá fracciones equivalentes para 7mo, con ejemplo y una actividad final."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Archivo de apoyo (opcional)</label>
              <input type="file" accept=".pdf,.docx,image/png,image/jpeg,image/webp" @change="setAIPageSource" />
              <small v-if="aiPageSource">{{ aiPageSource.name }}</small>
            </div>
            <div class="form-group">
              <label class="form-label">Cantidad de hojas</label>
              <select v-model.number="aiPageCount" class="form-input"><option v-for="count in 5" :key="count" :value="count">{{ count }}</option></select>
            </div>
            <p v-if="aiPageError" class="form-error">{{ aiPageError }}</p>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="showAIPagesModal = false">Cancelar</button>
              <button type="submit" class="btn btn-primary" :disabled="!canGenerateAIPages || aiPagesGenerating">{{ aiPagesGenerating ? "Generando…" : "Generar borrador" }}</button>
            </div>
          </form>
          <form v-else @submit.prevent="saveAIPages">
            <article v-for="(page, index) in aiPageDrafts" :key="index" class="ai-page-draft">
              <strong>Hoja {{ index + 1 }}</strong>
              <input v-model="page.title" class="form-input" aria-label="Título de hoja" />
              <textarea v-model="page.content_data" class="form-textarea" rows="8" aria-label="Contenido de hoja"></textarea>
              <input v-model="page.instructions" class="form-input" placeholder="Instrucciones para el alumno" />
            </article>
            <p v-if="aiPageError" class="form-error">{{ aiPageError }}</p>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="aiPageDrafts = []">Volver</button>
              <button type="submit" class="btn btn-primary" :disabled="aiPagesSaving">{{ aiPagesSaving ? "Agregando…" : "Agregar hojas" }}</button>
            </div>
          </form>
        </div>
      </template>
    </UiModal>

    <ConfirmModal
      v-bind="confirmState"
      @confirm="onConfirm"
      @cancel="onCancel"
    />
  </TeacherLayout>
</template>

<style scoped>
  .editor-shell {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px 24px;
    gap: 16px;
    background: var(--gradient-app-bg);
  }

  .editor-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
    border: 1px solid rgba(var(--surface-border-rgb), 0.16);
    border-radius: var(--radius-2xl);
    background: var(--gradient-card-accent);
    box-shadow: var(--shadow-card);
  }

  .btn-back {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
    background: var(--surface);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .btn-back:hover {
    background: var(--fill-primary-faint);
  }

  .header-info {
    flex: 1;
  }
  .header-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .editor-title {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
  .editor-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  /* Skeleton styles */
  .pages-sidebar--skeleton {
    pointer-events: none;
  }
  .sidebar-num-skel {
    border-radius: var(--radius-sm);
  }
  .canvas-skel {
    border-radius: var(--radius-md);
  }
  .mt-4 {
    margin-top: 4px;
  }

  .editor-body {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 20px;
    flex: 1;
    min-height: 0;
  }

  /* Sidebar */
  .pages-sidebar {
    background: var(--surface);
    backdrop-filter: blur(12px);
    border-radius: var(--radius-xl);
    border: 1px solid var(--line);
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
  }

  .sidebar-title {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
    padding: 0 4px 8px;
    border-bottom: 1.5px solid rgba(var(--practiq-violet-rgb), 0.08);
    margin-bottom: 4px;
  }

  .sidebar-empty {
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-align: center;
    padding: 24px 0;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 0.15s;
  }
  .sidebar-item:hover {
    background: var(--fill-primary-faint);
  }
  .sidebar-item--active {
    background: var(--fill-primary-soft);
    box-shadow: inset 3px 0 0 var(--practiq-violet);
  }

  .sidebar-num {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: var(--practiq-violet);
    color: var(--color-on-primary);
    font-size: 0.82rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sidebar-pg-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 130px;
  }
  .sidebar-pg-type {
    font-size: 0.75rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Editor main */
  .editor-main {
    background: var(--surface);
    backdrop-filter: blur(12px);
    border-radius: var(--radius-2xl);
    border: 1px solid var(--line);
    box-shadow: var(--shadow-card-lg);
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
  }

  .editor-empty {
    text-align: center;
    padding: 64px 24px;
    color: var(--text-secondary);
  }
  .empty-icon {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: var(--fill-primary-subtle);
    color: var(--practiq-violet);
    font-size: 24px;
    display: grid;
    place-items: center;
    margin: 0 auto 12px;
  }

  .page-meta-bar {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .page-delete-btn {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 9px 12px;
    border: 1px solid rgba(var(--color-error-rgb), 0.25);
    border-radius: var(--radius-sm);
    color: var(--color-error-dark);
    background: var(--color-error-bg);
    font: inherit;
    font-size: var(--text-sm);
    font-weight: 700;
    cursor: pointer;
  }
  .page-delete-btn:disabled { opacity: 0.65; cursor: wait; }

  .page-title-input {
    flex: 1;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.15s;
  }
  .page-title-input:focus {
    border-color: var(--practiq-violet);
  }

  .type-select {
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    font-size: 0.9rem;
    color: var(--text-primary);
    outline: none;
    background: var(--surface-card);
    cursor: pointer;
  }

  /* Canvas editor */
  .canvas-editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .canvas-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 10px 14px;
    background: var(--gradient-brand-soft);
    border-radius: var(--radius-md);
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    background: var(--surface-elevated);
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text-secondary);
    transition: all 0.15s;
  }
  .tool-btn:hover {
    border-color: var(--practiq-violet);
    color: var(--practiq-violet);
  }
  .tool-btn--active {
    background: var(--practiq-violet);
    color: var(--color-on-primary);
    border-color: var(--practiq-violet);
  }

  .color-picker {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    padding: 2px;
    cursor: pointer;
    background: none;
  }
  .size-slider {
    width: 80px;
    accent-color: var(--practiq-violet);
  }

  .current-image-preview {
    padding: 12px;
    background: var(--surface-bg-soft);
    border-radius: var(--radius-md);
    border: 1.5px dashed rgba(var(--practiq-violet-rgb), 0.2);
  }
  .preview-label {
    font-size: 0.78rem;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }
  .preview-img {
    max-height: 120px;
    border-radius: var(--radius-sm);
  }

  .editor-canvas {
    width: 100%;
    height: 400px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    background: var(--surface-card);
    display: block;
    touch-action: none;
  }

  /* Text editor */
  .text-area {
    width: 100%;
    padding: 16px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    font-size: 1rem;
    line-height: 1.7;
    color: var(--text-primary);
    resize: vertical;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .text-area:focus {
    border-color: var(--practiq-violet);
  }

  /* Instructions */
  .statement-box {
    margin-top: 14px;
    padding: 14px 16px;
    border-radius: var(--radius-xl);
    background: var(--elevation-tint-bg);
    box-shadow: var(--elevation-tint-shadow);
  }
  .statement-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }
  .statement-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    font-size: var(--text-xs);
    font-weight: 700;
    flex-shrink: 0;
  }
  .statement-tag--ok {
    background: rgba(var(--color-success-rgb), 0.14);
    color: var(--color-success-dark);
  }
  .statement-tag--pending {
    background: rgba(var(--color-warning-rgb), 0.14);
    color: var(--color-warning-dark);
  }
  .statement-help {
    margin: 0 0 10px;
    font-size: var(--text-xs);
    line-height: 1.5;
    color: var(--text-secondary);
  }
  .statement-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    color: var(--text-primary);
    font-family: inherit;
    font-size: var(--text-sm);
    resize: vertical;
  }
  .statement-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }
  .statement-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    min-height: 38px;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet-dark);
    font-size: var(--text-sm);
    font-weight: 700;
    cursor: pointer;
    transition: var(--transition-fast);
  }
  .statement-btn:hover:not(:disabled) {
    background: rgba(var(--practiq-violet-rgb), 0.16);
  }
  .statement-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .statement-msg {
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--color-success-dark);
  }

  .instructions-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .inst-label {
    font-size: 0.82rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
  }
  .inst-input {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.12);
    font-size: 0.9rem;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.15s;
  }
  .inst-input:focus {
    border-color: var(--practiq-violet);
  }

  .save-feedback {
    font-size: 0.85rem;
    color: var(--color-success-dark);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Modal */
  .modal-box {
    background: var(--surface-card);
    border-radius: var(--radius-2xl);
    padding: 28px 32px;
    width: min(420px, 100%);
    max-width: 100%;
    box-sizing: border-box;
    box-shadow: var(--shadow-panel);
  }
  .modal-title {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0 0 20px;
    color: var(--text-primary);
  }
  .form-group {
    margin-bottom: 16px;
  }
  .form-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--text-secondary);
  }
  .form-input {
    width: 100%;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border: 1.5px solid var(--surface-border);
    font-size: 0.95rem;
    outline: none;
    box-sizing: border-box;
  }
  .form-input:focus {
    border-color: var(--practiq-violet);
  }
  .form-textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid var(--surface-border);
    border-radius: var(--radius-sm);
    box-sizing: border-box;
    color: var(--text-primary);
    font: inherit;
    line-height: 1.5;
    resize: vertical;
  }
  .form-textarea:focus { outline: none; border-color: var(--practiq-violet); }
  .modal-help {
    margin: -12px 0 18px;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    line-height: 1.45;
  }
  .ai-pages-modal { width: min(680px, 100%); }
  .ai-page-draft {
    display: grid;
    gap: 9px;
    padding: 14px;
    margin-bottom: 12px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-bg-soft);
  }
  .form-error { color: var(--color-error-dark); font-size: var(--text-sm); }
  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  /* Buttons (local) */
  .btn {
    padding: 9px 18px;
    border-radius: var(--radius-sm);
    border: none;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-primary {
    background: var(--practiq-violet);
    color: var(--color-on-primary);
  }
  .btn-primary:hover {
    opacity: 0.9;
  }
  .btn-secondary {
    background: var(--surface-hover);
    color: var(--text-primary);
  }
  .btn-sm {
    padding: 7px 14px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }

  /* Tablet landscape */
  @media (max-width: 1024px) {
    .editor-body {
      grid-template-columns: 180px 1fr;
    }
  }

  /* Tablet portrait */
  @media (max-width: 768px) {
    .editor-body {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }
    /* En fila: una lista vertical de páginas empuja el canvas fuera de pantalla. */
    .pages-sidebar {
      border-right: none;
      border-bottom: 1px solid var(--surface-border);
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .pages-sidebar > * {
      flex-shrink: 0;
    }
    .sidebar-title {
      align-self: center;
    }
    .sidebar-item {
      width: 170px;
      min-height: 48px;
    }
    .editor-main {
      padding: 16px;
    }
  }

  /* Mobile */
  @media (max-width: 600px) {
    .editor-shell {
      padding: 12px;
    }
    .editor-header {
      flex-wrap: wrap;
      align-items: flex-start;
    }
    .header-actions {
      width: 100%;
    }
    .header-actions .btn {
      flex: 1;
      min-height: 44px;
      justify-content: center;
    }
    .page-meta-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .page-delete-btn { min-height: 46px; }
    .canvas-toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .editor-empty {
      padding: 32px;
    }

    .modal-box {
      width: 100%;
      max-height: min(82dvh, 640px);
      padding: 22px 20px calc(20px + env(safe-area-inset-bottom));
      border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
    }
    .modal-title {
      margin-bottom: 16px;
    }
    .form-input {
      min-height: 46px;
      font-size: 16px;
    }
    .form-textarea { font-size: 16px; }
    .ai-pages-modal { max-height: 90dvh; }
    .modal-actions {
      position: sticky;
      bottom: 0;
      margin: 18px -20px -20px;
      padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
      background: var(--surface-card);
      border-top: 1px solid var(--surface-border);
    }
    .modal-actions .btn {
      flex: 1;
      min-height: 46px;
      justify-content: center;
    }

    /* Tap targets >= 44px en mobile */
    .btn-back,
    .color-picker {
      width: 44px;
      height: 44px;
    }
  }
</style>
