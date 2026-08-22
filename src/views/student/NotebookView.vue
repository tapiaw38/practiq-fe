<script setup lang="ts">
  import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useAuthStore } from "@/stores/authStore";
  import StudentLayout from "@/layouts/StudentLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import ConfirmModal from "@/components/ui/ConfirmModal.vue";
  import DrawingCanvas from "@/components/ui/DrawingCanvas.vue";
  import ColorPalette from "@/components/ui/ColorPalette.vue";
  import { BASE_COLORS } from "@/utils/palette";
  import { useNotebook } from "@/composables/useNotebook";
  import { useLeaveWarning } from "@/composables/useLeaveWarning";
  import type { Notebook, NotebookPage } from "@/types";
  import {
    composeAssistantWorkImage,
    pickBestStudentImage,
  } from "@/utils/assistantExerciseContext";
  import { formatAIFeedback, formatRelativeTime } from "@/utils/formatters";
  import { renderContent } from "@/composables/useContentRenderer";
  import { useConfetti } from "@/composables/useConfetti";
  import { useSound } from "@/composables/useSound";
  import { useCuriosities } from "@/composables/useCuriosities";
  import AiLoadingModal from "@/components/student/ai/AiLoadingModal.vue";
  import { loadingMessages, randomMessage } from "@/utils/motivationalMessages";
  import { tuckAssistantFab } from "@/composables/useAssistantFabOffset";

  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const { leaveConfirmState, onLeaveConfirm, onLeaveCancel } = useLeaveWarning(
    () => hasPendingWork.value || saveStatus.value === "saving",
  );
  const { loadNotebook, saveSubmissionAsync, loadSubmissionJob } =
    useNotebook();
  const { fireCorrect } = useConfetti();
  const { play: playSound } = useSound();
  const { curiosities, fetchCuriosities } = useCuriosities();
  const curiosityIndex = ref(0);

  const notebook = ref<Notebook | null>(null);
  const loading = ref(true);
  const currentPageIndex = ref(0);

  // Drawing state
  const canvasRef = ref<InstanceType<typeof DrawingCanvas> | null>(null);
  const tool = ref<"pen" | "eraser">("pen");
  const penColor = ref(BASE_COLORS[0].value);
  const penSize = ref(3);

  // Save state
  const saveStatus = ref<"saving" | "saved" | "">("");
  const loadingMessage = ref(randomMessage(loadingMessages));
  let loadingMsgInterval: ReturnType<typeof setInterval> | null = null;

  // Per-page canvas snapshots
  const canvasSnapshots = ref<Record<string, string>>({});
  const savedCanvasSnapshots = ref<Record<string, string>>({});

  tuckAssistantFab(".save-bar");

  const hasPendingWork = computed(() =>
    Object.entries(canvasSnapshots.value).some(
      ([pageId, canvas]) =>
        (canvas || "") !== (savedCanvasSnapshots.value[pageId] || ""),
    ),
  );

  const pages = computed(() => notebook.value?.pages || []);
  const currentPage = computed<NotebookPage | null>(
    () => pages.value[currentPageIndex.value] ?? null,
  );
  const studentId = computed(
    () => authStore.profile?.id || authStore.authUser?.id || "",
  );

  function hasSubmission(page: NotebookPage) {
    return !!page.submission;
  }

  onMounted(async () => {
    const id = route.params.id as string;
    try {
      notebook.value = await loadNotebook(id, studentId.value);
      // Pre-fill existing submissions
      for (const page of pages.value) {
        if (page.submission?.canvas_data)
          canvasSnapshots.value[page.id] = page.submission.canvas_data;
      }
      savedCanvasSnapshots.value = { ...canvasSnapshots.value };
      // Fetch curiosities for loading screen
      if (notebook.value.course_id) {
        fetchCuriosities(notebook.value.course_id);
      }
    } finally {
      loading.value = false;
      await nextTick();
      registerAssistantHooks();
    }
  });

  onUnmounted(() => {
    unregisterAssistantHooks();
    if (loadingMsgInterval) clearInterval(loadingMsgInterval);
  });

  watch(currentPageIndex, async () => {
    await nextTick();
    registerAssistantHooks();
  });

  function getReviewBoxClass(submission: { ai_is_correct?: boolean }) {
    if (submission.ai_is_correct === true) return "ai-review-box--success";
    if (submission.ai_is_correct === false) return "ai-review-box--error";
    return "ai-review-box--pending";
  }

  function hasUnreadableAIFeedback(feedback?: string) {
    return !!feedback?.includes("UNREADABLE");
  }

  function getReviewBadgeLabel(submission: {
    ai_is_correct?: boolean;
    ai_feedback?: string;
  }) {
    if (submission.ai_is_correct === true) return "Correcto";
    if (submission.ai_is_correct === false) return "Incorrecto";
    if (hasUnreadableAIFeedback(submission.ai_feedback)) return "No legible";
    return "Pendiente de revision";
  }

  function captureCanvas(): string {
    const pageId = currentPage.value?.id || "";
    const dataUrl = canvasSnapshots.value[pageId] || "";
    if (!dataUrl) return "";

    // Create temp canvas to process the image
    const source = document.createElement("canvas");
    const img = new Image();
    img.src = dataUrl;
    if (!img.complete) return dataUrl; // If image not loaded, return as-is
    source.width = img.width;
    source.height = img.height;
    const sourceCtx = source.getContext("2d");
    if (!sourceCtx) return dataUrl;
    sourceCtx.drawImage(img, 0, 0);

    const scale = 2.5;
    const temp = document.createElement("canvas");
    temp.width = Math.max(1, Math.floor(source.width * scale));
    temp.height = Math.max(1, Math.floor(source.height * scale));
    const tempCtx = temp.getContext("2d");
    if (!tempCtx) {
      return source.toDataURL("image/png");
    }

    tempCtx.fillStyle = "#ffffff";
    tempCtx.fillRect(0, 0, temp.width, temp.height);
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(source, 0, 0, temp.width, temp.height);

    const baseImage = tempCtx.getImageData(0, 0, temp.width, temp.height);
    const basePixels = baseImage.data;
    const threshold = 188;

    let minX = temp.width;
    let minY = temp.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < temp.height; y++) {
      for (let x = 0; x < temp.width; x++) {
        const idx = (y * temp.width + x) * 4;
        const r = basePixels[idx];
        const g = basePixels[idx + 1];
        const b = basePixels[idx + 2];
        const alpha = basePixels[idx + 3];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const isInk = alpha >= 8 && gray <= threshold;
        if (!isInk) continue;

        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    const pad = Math.floor(28 * scale);
    if (maxX < minX || maxY < minY) {
      minX = 0;
      minY = 0;
      maxX = temp.width - 1;
      maxY = temp.height - 1;
    } else {
      minX = Math.max(0, minX - pad);
      minY = Math.max(0, minY - pad);
      maxX = Math.min(temp.width - 1, maxX + pad);
      maxY = Math.min(temp.height - 1, maxY + pad);
    }

    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);

    const out = document.createElement("canvas");
    out.width = cropW;
    out.height = cropH;
    const ctx = out.getContext("2d");
    if (!ctx) {
      return source.toDataURL("image/png");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(temp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    const image = ctx.getImageData(0, 0, out.width, out.height);
    const pixels = image.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const alpha = pixels[i + 3];

      if (alpha < 8) {
        pixels[i] = 255;
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
        pixels[i + 3] = 255;
        continue;
      }

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const value = gray > threshold ? 255 : 0;
      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
      pixels[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);

    return out.toDataURL("image/png");
  }

  async function getBestStudentNotebookImage(): Promise<string> {
    const pageId = currentPage.value?.id || "";
    return pickBestStudentImage([
      captureCanvas(),
      canvasSnapshots.value[pageId],
      currentPage.value?.submission?.canvas_data,
    ]);
  }

  async function buildNotebookAssistantImage(): Promise<string> {
    const teacherDataUrl =
      currentPage.value?.content_type === "canvas" &&
      currentPage.value?.content_data
        ? currentPage.value.content_data
        : "";
    const studentDataUrl = await getBestStudentNotebookImage();

    if (!teacherDataUrl) {
      return studentDataUrl;
    }

    try {
      return await composeAssistantWorkImage({
        teacherDataUrl,
        studentDataUrl,
        teacherLabel: "Consigna del docente",
        studentLabel: "Respuesta del alumno",
      });
    } catch (error) {
      console.error(
        "[notebook-view] failed to compose teacher and student images",
        error,
      );
      return teacherDataUrl || studentDataUrl;
    }
  }

  const notebookAssistantCapture = async () => {
    if (!currentPage.value) return null;

    const dataUrl = await buildNotebookAssistantImage();
    if (!dataUrl) return null;

    console.log("[notebook-view] assistant capture generated", {
      pageId: currentPage.value.id,
      pageNumber: currentPage.value.page_number,
      hasTeacherImage:
        currentPage.value.content_type === "canvas" &&
        !!currentPage.value.content_data,
      dataUrlPrefix: dataUrl.slice(0, 32),
      dataUrlLength: dataUrl.length,
    });

    // The capture is produced as PNG, but this used to declare JPEG. An
    // integration that validates or decodes by the declared type rejects or
    // misreads it, so the label follows the payload instead of a constant.
    const mime = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/png";
    const extension = mime.split("/")[1] || "png";
    const page = currentPage.value.page_number || currentPageIndex.value + 1;

    return {
      dataUrl,
      filename: `notebook-page-${page}.${extension}`,
      contentType: mime,
    };
  };

  const notebookAssistantContext = () => {
    if (!notebook.value || !currentPage.value) return null;

    return {
      current_view: "student_notebook",
      activity_type: "notebook_page",
      notebook_id: notebook.value.id,
      notebook_title: notebook.value.title,
      notebook_description: notebook.value.description,
      current_page: {
        id: currentPage.value.id,
        number: currentPage.value.page_number,
        title: currentPage.value.title,
        content_type: currentPage.value.content_type,
        instructions: currentPage.value.instructions || "",
        teacher_content_text:
          currentPage.value.content_type === "text"
            ? currentPage.value.content_data
            : currentPage.value.content_data
              ? "[consigna manuscrita en imagen adjunta]"
              : "",
        teacher_content_source:
          currentPage.value.content_type === "canvas" &&
          currentPage.value.content_data
            ? "teacher_image_attachment"
            : "text",
        has_teacher_image:
          currentPage.value.content_type === "canvas" &&
          !!currentPage.value.content_data,
        has_student_submission: !!currentPage.value.submission,
        ai_feedback_visible: !!currentPage.value.submission?.ai_feedback,
      },
      page_list: pages.value.map((page) => ({
        id: page.id,
        number: page.page_number,
        title: page.title,
        content_type: page.content_type,
        instructions: page.instructions || "",
        teacher_content_text:
          page.content_type === "text"
            ? page.content_data
            : page.content_data
              ? "[consigna manuscrita en imagen adjunta]"
              : "",
        teacher_content_source:
          page.content_type === "canvas" && page.content_data
            ? "teacher_image_attachment"
            : "text",
        has_teacher_image:
          page.content_type === "canvas" && !!page.content_data,
      })),
    };
  };

  function registerAssistantHooks() {
    window.__practiqAssistantCapture = notebookAssistantCapture;
    window.__practiqAssistantContext = notebookAssistantContext;
    (window as any).__practiqAssistantHookSource = "notebook";
    console.log("[notebook-view] assistant hooks registered", {
      notebookId: notebook.value?.id || null,
      pageId: currentPage.value?.id || null,
    });
  }

  function unregisterAssistantHooks() {
    if ((window as any).__practiqAssistantHookSource !== "notebook") return;
    if (window.__practiqAssistantCapture === notebookAssistantCapture) {
      delete window.__practiqAssistantCapture;
    }
    if (window.__practiqAssistantContext === notebookAssistantContext) {
      delete window.__practiqAssistantContext;
    }
    delete (window as any).__practiqAssistantHookSource;
  }

  function getNextCuriosity(): string {
    if (curiosities.value.length > 0) {
      const msg = curiosities.value[curiosityIndex.value % curiosities.value.length];
      curiosityIndex.value++;
      return `💡 ${msg}`;
    }
    return randomMessage(loadingMessages);
  }

  async function saveAndNext() {
    if (!currentPage.value || saveStatus.value === "saving") return;
    saveStatus.value = "saving";
    loadingMessage.value = getNextCuriosity();
    loadingMsgInterval = setInterval(() => {
      loadingMessage.value = getNextCuriosity();
    }, 3000);

    try {
      const pageId = currentPage.value.id;
      const data = captureCanvas();

      const start = await saveSubmissionAsync(pageId, { canvas_data: data });
      const jobId = start.job_id;
      let jobDone = false;

      while (!jobDone) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const job = await loadSubmissionJob(jobId);
        if (job.status === "processing") {
          continue;
        }
        if (job.status === "failed") {
          throw new Error(job.message || "No se pudo evaluar el cuaderno");
        }
        jobDone = true;
      }

      saveStatus.value = "saved";
      const notebookId = route.params.id as string;
      notebook.value = await loadNotebook(notebookId, studentId.value);
      savedCanvasSnapshots.value = {
        ...savedCanvasSnapshots.value,
        [pageId]: canvasSnapshots.value[pageId] || "",
      };

      // Check if submission was correct and celebrate
      const updatedPage = pages.value.find((p) => p.id === pageId);
      if (updatedPage?.submission?.ai_is_correct === true) {
        fireCorrect();
        playSound("correct");
      } else if (updatedPage?.submission?.ai_is_correct === false) {
        playSound("incorrect");
      }

      setTimeout(() => {
        saveStatus.value = "";
      }, 2000);
    } catch (err) {
      console.error(err);
      saveStatus.value = "";
    } finally {
      if (loadingMsgInterval) {
        clearInterval(loadingMsgInterval);
        loadingMsgInterval = null;
      }
    }
  }

  function goToPage(idx: number) {
    currentPageIndex.value = idx;
  }
</script>

<template>
  <StudentLayout>
    <div class="notebook-shell">
      <!-- Header -->
      <header class="nb-header">
        <button class="btn-back" @click="router.back()">
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="nb-title-area">
          <h1 class="nb-title">{{ notebook?.title || "Cuaderno" }}</h1>
          <span class="nb-desc">{{ notebook?.description }}</span>
        </div>
        <div class="nb-page-indicator">
          Página {{ currentPageIndex + 1 }} / {{ pages.length }}
        </div>
      </header>

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <nav class="page-tabs">
          <Skeleton v-for="n in 4" :key="n" width="40px" height="40px" />
        </nav>
        <div class="notebook-page notebook-page--skeleton">
          <section class="page-content page-content--skeleton">
            <div class="page-header-row">
              <Skeleton width="200px" height="20px" />
              <Skeleton variant="badge" width="80px" />
            </div>
            <Skeleton width="100%" height="180px" style="margin-top: 16px" />
            <div class="page-instructions-skel" style="margin-top: 14px">
              <Skeleton width="100%" height="40px" />
            </div>
          </section>
          <section class="answer-section answer-section--skeleton">
            <div class="answer-header" style="margin-bottom: 12px">
              <Skeleton width="100px" height="14px" />
              <div class="draw-tools" style="gap: 8px">
                <Skeleton v-for="n in 4" :key="n" width="34px" height="34px" />
              </div>
            </div>
            <Skeleton width="100%" height="280px" class="canvas-skel" />
          </section>
        </div>
      </template>

      <div v-else-if="pages.length === 0" class="nb-empty">
        <div class="empty-icon">📓</div>
        <p>Este cuaderno no tiene páginas aún.</p>
      </div>

      <template v-else>
        <!-- Page tabs -->
        <nav class="page-tabs">
          <button
            v-for="(page, idx) in pages"
            :key="page.id"
            class="page-tab"
            :class="{
              'page-tab--active': idx === currentPageIndex,
              'page-tab--done': hasSubmission(page),
            }"
            @click="goToPage(idx)"
          >
            <span>{{ idx + 1 }}</span>
            <i v-if="hasSubmission(page)" class="pi pi-check tab-check"></i>
          </button>
        </nav>

        <!-- Notebook page -->
        <div class="notebook-page" v-if="currentPage">
          <!-- Teacher content -->
          <section class="page-content">
            <div class="page-header-row">
              <h2 class="page-title">{{ currentPage.title }}</h2>
              <span class="content-type-badge">{{
                currentPage.content_type === "canvas" ? "🖼 Imagen" : "📝 Texto"
              }}</span>
            </div>

            <!-- Teacher wrote image (canvas) -->
            <div
              v-if="
                currentPage.content_type === 'canvas' &&
                currentPage.content_data
              "
              class="teacher-image-wrap"
            >
              <img
                :src="currentPage.content_data"
                alt="Contenido del docente"
                class="teacher-image"
              />
            </div>

            <!-- Teacher wrote text (with math support) -->
            <div
              v-else-if="
                currentPage.content_type === 'text' && currentPage.content_data
              "
              class="teacher-text teacher-text--rendered"
              v-html="renderContent(currentPage.content_data)"
            ></div>

            <div v-if="currentPage.instructions" class="page-instructions">
              <i class="pi pi-info-circle"></i>
              <span v-html="renderContent(currentPage.instructions)"></span>
            </div>
          </section>

          <!-- Student answer area — always canvas -->
          <section class="answer-section">
            <div class="answer-header">
              <span class="answer-label">Tu respuesta</span>
              <div class="draw-tools">
                <button
                  class="tool-btn"
                  :class="{ 'tool-btn--active': tool === 'pen', 'tool-btn--pen-active': tool === 'pen' }"
                  :style="{ backgroundColor: penColor }"
                  @click="tool = 'pen'"
                  title="Lápiz"
                >
                  <i class="pi pi-pencil"></i>
                </button>
                <button
                  class="tool-btn"
                  :class="{ 'tool-btn--active': tool === 'eraser' }"
                  @click="tool = 'eraser'"
                  title="Borrador"
                >
                  <i class="pi pi-times-circle"></i>
                </button>
                <button class="tool-btn" @click="canvasRef?.undo()" title="Deshacer">
                  <i class="pi pi-undo"></i>
                </button>
                <button class="tool-btn" @click="canvasRef?.clear()" title="Limpiar">
                  <i class="pi pi-trash"></i>
                </button>
                <ColorPalette v-model="penColor" />
                <input
                  type="range"
                  v-model.number="penSize"
                  min="1"
                  max="20"
                  class="size-slider"
                  title="Grosor"
                />
              </div>
            </div>

            <DrawingCanvas
              ref="canvasRef"
              v-model="canvasSnapshots[currentPage.id]"
              :height="300"
              :tool="tool"
              :pen-size="penSize"
              :pen-color="penColor"
            />
          </section>

          <!-- Save bar -->
          <div class="save-bar">
            <div class="save-status" v-if="saveStatus">
              <i
                class="pi"
                :class="
                  saveStatus === 'saved'
                    ? 'pi-check-circle'
                    : 'pi-spin pi-spinner'
                "
              ></i>
              {{ saveStatus === "saved" ? "Guardado" : "Evaluando con IA..." }}
            </div>

            <!-- AI Review Box - Enhanced -->
            <div
              v-if="currentPage?.submission"
              class="ai-review-box"
              :class="getReviewBoxClass(currentPage.submission)"
            >
              <div class="ai-review-head">
                <div class="ai-review-icon">
                  <i
                    v-if="currentPage.submission.ai_is_correct === true"
                    class="pi pi-check-circle"
                  ></i>
                  <i
                    v-else-if="currentPage.submission.ai_is_correct === false"
                    class="pi pi-times-circle"
                  ></i>
                  <i v-else class="pi pi-clock"></i>
                </div>
                <div class="ai-review-status">
                  <span
                    v-if="
                      currentPage.submission.ai_is_correct !== undefined ||
                      hasUnreadableAIFeedback(currentPage.submission.ai_feedback)
                    "
                    class="ai-review-badge"
                    :class="
                      currentPage.submission.ai_is_correct === true
                        ? 'ai-review-badge--ok'
                        : currentPage.submission.ai_is_correct === false
                          ? 'ai-review-badge--fail'
                          : 'ai-review-badge--warn'
                    "
                  >
                    {{ getReviewBadgeLabel(currentPage.submission) }}
                  </span>
                  <span v-else class="ai-review-badge ai-review-badge--warn"
                    >Pendiente de revision</span
                  >
                  <span
                    v-if="currentPage.submission.ai_reviewed_at"
                    class="ai-review-time"
                  >
                    Revisado
                    {{
                      formatRelativeTime(currentPage.submission.ai_reviewed_at)
                    }}
                  </span>
                </div>
              </div>
              <p class="ai-review-text">
                {{ formatAIFeedback(currentPage.submission.ai_feedback) }}
              </p>

              <!-- Teacher override indicator -->
              <div
                v-if="currentPage.submission.teacher_feedback"
                class="teacher-review-section"
              >
                <div class="teacher-review-head">
                  <i class="pi pi-user"></i>
                  <span>Tu docente dice:</span>
                  <span
                    class="teacher-badge"
                    :class="
                      currentPage.submission.teacher_is_correct
                        ? 'teacher-badge--ok'
                        : 'teacher-badge--fail'
                    "
                  >
                    {{
                      currentPage.submission.teacher_is_correct
                        ? "Correcto"
                        : "Incorrecto"
                    }}
                  </span>
                </div>
                <p class="teacher-review-text">
                  {{ currentPage.submission.teacher_feedback }}
                </p>
              </div>
            </div>
            <div class="page-nav">
              <button
                class="btn-nav"
                :disabled="currentPageIndex === 0"
                @click="goToPage(currentPageIndex - 1)"
              >
                <i class="pi pi-chevron-left"></i> Anterior
              </button>
              <button
                class="btn-save"
                :disabled="saveStatus === 'saving'"
                @click="saveAndNext"
              >
                <i
                  v-if="saveStatus === 'saving'"
                  class="pi pi-spin pi-spinner"
                ></i>
                Guardar
              </button>
              <button
                class="btn-nav"
                :disabled="currentPageIndex === pages.length - 1"
                @click="goToPage(currentPageIndex + 1)"
              >
                Siguiente <i class="pi pi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </StudentLayout>

  <AiLoadingModal
    :show="saveStatus === 'saving'"
    badge-label="IA evaluando"
    title="Evaluando con IA"
    :message="loadingMessage"
  />
  <ConfirmModal
    v-bind="leaveConfirmState"
    @confirm="onLeaveConfirm"
    @cancel="onLeaveCancel"
  />
</template>

<style scoped>
  .notebook-shell {
    max-width: 860px;
    margin: 0 auto;
    padding: 24px 20px 104px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .nb-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .btn-back {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
    background: rgba(var(--surface-card-rgb), 0.8);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .btn-back:hover {
    background: rgba(var(--practiq-violet-rgb), 0.06);
  }

  .nb-title-area {
    flex: 1;
  }
  .nb-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
  .nb-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  .nb-page-indicator {
    font-size: 0.82rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  /* Skeleton styles */
  .notebook-page--skeleton {
    pointer-events: none;
  }
  .page-instructions-skel {
    margin-top: 14px;
  }
  .canvas-skel {
    border-radius: var(--radius-md);
  }

  .nb-empty {
    text-align: center;
    padding: 64px 24px;
    color: var(--text-secondary);
    font-size: 1rem;
  }
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 12px;
  }

  /* Page tabs */
  .page-tabs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding: 4px 0;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .page-tab {
    min-width: 40px;
    height: 40px;
    padding: 0 12px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    background: rgba(var(--surface-card-rgb), 0.8);
    cursor: pointer;
    font-weight: 600;
    font-size: 0.88rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s;
  }

  .page-tab:hover {
    border-color: rgba(var(--practiq-violet-rgb), 0.3);
    color: var(--practiq-violet);
  }

  .page-tab--active {
    background: var(--practiq-violet);
    color: var(--color-on-primary);
    border-color: var(--practiq-violet);
  }

  .page-tab--done {
    border-color: rgba(var(--color-success-rgb), 0.4);
    color: var(--color-success-dark);
  }
  .page-tab--done.page-tab--active {
    background: var(--color-success-dark);
    border-color: var(--color-success-dark);
    color: var(--color-on-primary);
  }

  .tab-check {
    font-size: 0.75rem;
  }

  /* Notebook page card */
  .notebook-page {
    background: rgba(var(--surface-card-rgb), 0.92);
    backdrop-filter: blur(12px);
    border-radius: var(--radius-2xl);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
    box-shadow: 0 4px 24px rgba(var(--practiq-violet-rgb), 0.06);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Teacher content */
  .page-content {
    padding: 24px 28px 20px;
    border-bottom: 1.5px dashed rgba(var(--practiq-violet-rgb), 0.12);
  }

  .page-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .page-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .content-type-badge {
    font-size: 0.75rem;
    padding: 4px 10px;
    border-radius: var(--radius-2xl);
    background: rgba(var(--practiq-violet-rgb), 0.08);
    color: var(--practiq-violet);
    font-weight: 600;
  }

  .teacher-image-wrap {
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
    background: var(--practiq-violet-bg);
  }
  .teacher-image {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .teacher-text {
    font-size: 1rem;
    line-height: 1.7;
    color: var(--text-primary);
    white-space: pre-wrap;
  }

  .page-instructions {
    margin-top: 14px;
    padding: 10px 14px;
    background: linear-gradient(
      135deg,
      var(--practiq-violet),
      var(--practiq-indigo)
    );
    border-left: 3px solid var(--practiq-violet);
    border-radius: 0 8px 8px 0;
    font-size: 0.88rem;
    color: #ffffff;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .page-instructions > span {
    color: #ffffff !important;
  }

  .page-instructions :deep(*) {
    color: #ffffff !important;
  }

  .page-instructions :deep(p) {
    margin: 0;
  }

  /* Answer area */
  .answer-section {
    padding: 20px 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .answer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }

  .answer-label {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .draw-tools {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tool-btn {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    background: rgba(var(--surface-card-rgb), 0.8);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--text-secondary);
    transition: all 0.15s;
  }
  .tool-btn:hover:not(.tool-btn--active) {
    border-color: var(--practiq-violet);
    color: var(--practiq-violet);
  }
  .tool-btn--active:hover {
    color: var(--color-on-primary);
  }
  .tool-btn--pen-active,
  .tool-btn--pen-active:hover {
    border-color: transparent;
    color: #fff;
    box-shadow: none;
  }
  .tool-btn--active {
    background: var(--practiq-violet);
    color: var(--color-on-primary);
    border-color: var(--practiq-violet);
  }

  .size-slider {
    width: 80px;
    accent-color: var(--practiq-violet);
  }

  .answer-canvas {
    width: 100%;
    height: 300px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    display: block;
    touch-action: none;
    box-shadow: 0 2px 12px rgba(var(--practiq-violet-rgb), 0.06);
    background-color: var(--surface-bg-soft);
    background-image:
      linear-gradient(90deg, transparent 56px, rgba(var(--color-error-rgb), 0.25) 56px, rgba(var(--color-error-rgb), 0.25) 57.5px, transparent 57.5px),
      repeating-linear-gradient(
        transparent,
        transparent 31px,
        rgba(var(--practiq-violet-rgb), 0.1) 31px,
        rgba(var(--practiq-violet-rgb), 0.1) 32px
      );
    background-repeat: no-repeat, repeat;
  }

  .answer-textarea {
    width: 100%;
    min-height: 280px;
    padding: 16px 16px 16px 72px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    font-size: 1rem;
    line-height: 2rem;
    color: var(--text-heading);
    background-color: var(--surface-bg);
    background-image:
      linear-gradient(rgba(var(--practiq-violet-rgb), 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(var(--color-error-rgb), 0.2) 1px, transparent 1px);
    background-size:
      100% 2rem,
      1px 100%;
    background-position:
      0 2rem,
      56px 0;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
    font-family: "Segoe UI", sans-serif;
    box-shadow: 0 2px 12px rgba(var(--practiq-violet-rgb), 0.06);
  }
  .answer-textarea:focus {
    border-color: var(--practiq-violet);
  }

  /* Save bar */
  .save-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 28px;
    border-top: 1.5px solid rgba(var(--practiq-violet-rgb), 0.08);
    background: linear-gradient(180deg, var(--surface-card), var(--surface-bg));
    gap: 16px;
    flex-wrap: wrap;
    position: sticky;
    bottom: 16px;
    z-index: 3;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card-lg);
  }

  .save-status {
    font-size: 0.85rem;
    color: var(--color-success-dark);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ai-review-box {
    width: 100%;
    order: 1;
    padding: 16px 18px;
    border-radius: var(--radius-md);
    background: var(--surface-card);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.14);
    box-shadow: 0 8px 22px rgba(var(--practiq-violet-rgb), 0.08);
  }

  .ai-review-box--success {
    background: var(--color-success-bg);
    border-color: rgba(var(--color-success-rgb), 0.32);
  }

  .ai-review-box--error {
    background: var(--color-error-bg);
    border-color: rgba(var(--color-error-rgb), 0.32);
  }

  .ai-review-box--pending {
    background: var(--color-warning-bg);
    border-color: rgba(var(--color-warning-rgb), 0.38);
  }

  .ai-review-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ai-review-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  .ai-review-box--success .ai-review-icon {
    background: rgba(var(--color-success-rgb), 0.18);
    color: var(--color-success-dark);
  }

  .ai-review-box--error .ai-review-icon {
    background: rgba(var(--color-error-rgb), 0.18);
    color: var(--color-error-dark);
  }

  .ai-review-box--pending .ai-review-icon {
    background: rgba(var(--color-warning-rgb), 0.2);
    color: var(--color-warning-strong);
  }

  .ai-review-status {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ai-review-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    font-size: var(--text-sm);
    font-weight: 700;
  }

  .ai-review-badge--ok {
    background: var(--color-success-bg);
    color: var(--color-success-dark);
  }

  .ai-review-badge--fail {
    background: var(--color-error-bg);
    color: var(--color-error-dark);
  }

  .ai-review-badge--warn {
    background: var(--color-warning-bg);
    color: var(--color-warning-dark);
  }

  .ai-review-time {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .ai-review-text {
    margin: 10px 0 0;
    font-size: var(--text-base);
    color: var(--text-primary);
    line-height: 1.6;
    padding-left: 48px;
  }

  /* Teacher review section */
  .teacher-review-section {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px dashed rgba(var(--practiq-violet-rgb), 0.2);
    padding-left: 48px;
  }

  .teacher-review-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--practiq-violet);
    margin-bottom: 6px;
  }

  .teacher-badge {
    padding: 2px 8px;
    border-radius: var(--radius-pill);
    font-size: var(--text-xs);
    font-weight: 700;
  }

  .teacher-badge--ok {
    background: rgba(var(--color-success-rgb), 0.15);
    color: var(--color-success-dark);
  }

  .teacher-badge--fail {
    background: rgba(var(--color-error-rgb), 0.15);
    color: var(--color-error-dark);
  }

  .teacher-review-text {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .page-nav {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
    order: 2;
  }

  .btn-nav {
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
    background: var(--surface-card);
    cursor: pointer;
    font-size: 0.88rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }
  .btn-nav:hover:not(:disabled) {
    border-color: var(--practiq-violet);
    color: var(--practiq-violet);
    background: var(--practiq-violet-bg);
  }
  .btn-nav:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-save {
    padding: 10px 22px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--practiq-violet);
    color: var(--color-on-primary);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: opacity 0.15s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .btn-save:hover {
    opacity: 0.9;
  }
  .btn-save:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  @media (max-width: 1024px) {
    .notebook-shell {
      padding: 20px 16px 40px;
    }
    .page-content {
      padding: 20px 22px 16px;
    }
    .answer-section {
      padding: 16px 22px;
    }
    .save-bar {
      padding: 14px 22px;
    }
    .answer-canvas {
      height: 260px;
    }
  }

  @media (max-width: 600px) {
    .notebook-shell {
      padding: 12px 8px 116px;
      gap: 10px;
    }
    .nb-header {
      flex-wrap: wrap;
      gap: 10px;
    }
    .nb-title {
      font-size: 1.1rem;
    }
    .page-content {
      padding: 14px 14px 12px;
    }
    .page-header-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .answer-section {
      padding: 12px 14px;
    }
    .answer-header {
      flex-direction: column;
      align-items: flex-start;
    }
    .answer-canvas {
      height: 200px;
    }
    .save-bar {
      padding: 12px 14px;
      flex-direction: column;
      align-items: stretch;
      bottom: 0;
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      margin-left: -8px;
      margin-right: -8px;
      border-bottom: 0;
      padding-bottom: max(12px, env(safe-area-inset-bottom));
    }
    .page-nav {
      margin-left: 0;
      order: 2;
      justify-content: space-between;
      width: 100%;
    }
    .btn-nav {
      flex: 1;
      justify-content: center;
      padding: 8px 10px;
    }
    .btn-save {
      width: 100%;
      text-align: center;
      order: -1;
    }
    /* Tap targets >= 44px en mobile */
    .btn-nav,
    .btn-save {
      min-height: 48px;
    }
    .btn-back {
      width: 44px;
      height: 44px;
    }
    .tool-btn {
      width: 40px;
      height: 40px;
      font-size: 1rem;
    }
    .page-tab {
      min-width: 44px;
      height: 44px;
      flex: 0 0 auto;
    }
    .ai-review-head {
      align-items: flex-start;
    }
    .ai-review-status {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .ai-review-text,
    .teacher-review-section {
      padding-left: 0;
    }
  }

  @media (min-width: 921px) {
    :global(.practiq-assistant-focus-target--open .notebook-shell) {
      width: calc(100% - var(--practiq-assistant-rail));
      max-width: calc(100% - var(--practiq-assistant-rail));
      margin-left: 0;
      margin-right: auto;
    }
  }
</style>
