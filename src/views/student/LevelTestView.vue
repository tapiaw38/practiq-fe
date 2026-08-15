<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import StudentLayout from "@/layouts/StudentLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import ConfirmModal from "@/components/ui/ConfirmModal.vue";
  import DrawingCanvas from "@/components/ui/DrawingCanvas.vue";
  import ColorPalette from "@/components/ui/ColorPalette.vue";
  import AttachmentAnswer from "@/components/student/exercises/AttachmentAnswer.vue";
  import ExerciseMedia from "@/components/ui/ExerciseMedia.vue";
  import FillBlanksAnswer from "@/components/student/exercises/FillBlanksAnswer.vue";
  import { useLeaveWarning } from "@/composables/useLeaveWarning";
  import { usePracticeSheet } from "@/composables/usePracticeSheet";
  import { useAuthStore } from "@/stores/authStore";
  import type { UploadedFile } from "@/services/uploads/uploadService";
  import type {
    PracticeSheet,
    PracticeSheetExercise,
    SubmitResult,
  } from "@/types";
  import {
    composeAssistantWorkImage,
    extractTeacherImageDataUrl,
    parseExerciseMetadata,
    pickBestStudentImage,
    summarizeExerciseMetadata,
    statementMediaAudioAttachment,
    statementMediaPreviewDataURL,
  } from "@/utils/assistantExerciseContext";
  import { formatDuration } from "@/utils/formatters";
  import {
    renderContent,
    renderEquation,
  } from "@/composables/useContentRenderer";
  import MathFieldEditor from "@/components/ui/MathFieldEditor.vue";
  import { useConfetti } from "@/composables/useConfetti";
  import { useSound } from "@/composables/useSound";
  import { useCuriosities } from "@/composables/useCuriosities";
  import AiLoadingModal from "@/components/student/ai/AiLoadingModal.vue";
  import { buildFillBlanksAssistantContext } from "@/utils/fillBlanks";
  import {
    loadingMessages,
    levelUpMessages,
    encourageMessages,
    randomMessage,
  } from "@/utils/motivationalMessages";

  const route = useRoute();
  const router = useRouter();
  const { leaveConfirmState, onLeaveConfirm, onLeaveCancel, leave } = useLeaveWarning(
    () => testStarted.value && !submitted.value,
  );
  const authStore = useAuthStore();
  const { loadPracticeSheet, submitPracticeSheetAsync, loadSubmitJob } =
    usePracticeSheet();
  const { fireLevelUp } = useConfetti();
  const { play: playSound } = useSound();
  const { curiosities, fetchCuriosities } = useCuriosities();
  const curiosityIndex = ref(0);

  const sheet = ref<PracticeSheet | null>(null);
  const loading = ref(true);
  const submitted = ref(false);
  const submitting = ref(false);
  const result = ref<SubmitResult | null>(null);
  const showAllErrors = ref(false);

  const incorrectResults = computed(() =>
    result.value?.exercise_results?.filter(
      (r) => !r.is_correct && !r.needs_teacher_review,
    ) ?? []
  );

  // Files the assistant could not grade are pending, not wrong.
  const pendingResults = computed(() =>
    result.value?.exercise_results?.filter((r) => r.needs_teacher_review) ?? []
  );

  const visibleErrors = computed(() =>
    showAllErrors.value ? incorrectResults.value : incorrectResults.value.slice(0, 3)
  );

  const hiddenErrorsCount = computed(() =>
    Math.max(0, incorrectResults.value.length - 3)
  );

  function formatStudentAnswer(answer: string): string {
    if (!answer || answer.trim() === "") return "(vacío)";
    if (answer.toUpperCase() === "UNREADABLE") return "(no se pudo leer)";
    if (answer.startsWith("data:image/")) return "(no se pudo leer)";
    return answer;
  }

  const answers = ref<Record<string, string>>({});
  const attachments = ref<Record<string, UploadedFile | null>>({});

  function setAttachment(exerciseId: string, value: UploadedFile | null) {
    attachments.value = { ...attachments.value, [exerciseId]: value };
  }

  // Modal states
  const showInstructionsModal = ref(true);
  const showTimeWarning = ref(false);
  const showRetryModal = ref(false);
  const showSuccessModal = ref(false);
  const testStarted = ref(false);
  let warningShown = false;
  const loadingMessage = ref(randomMessage(loadingMessages));
  let loadingMsgInterval: ReturnType<typeof setInterval> | null = null;

  // Canvas state
  const canvasRefs: Record<string, InstanceType<typeof DrawingCanvas> | null> = {};
  const canvasData = ref<Record<string, string>>({});
  const activeId = ref<string>("");
  const tool = ref<"pen" | "eraser">("pen");
  // Matches the palette's first swatch so one is selected from the start; the
  // theme's text colour is not one of the ink options.
  const penColor = ref("#1e1e2e");
  const penSize = ref(3);

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

  // Timer — 30 min
  const TEST_DURATION_SECONDS = 30 * 60;
  const timeLeft = ref(TEST_DURATION_SECONDS);
  let timer: ReturnType<typeof setInterval> | null = null;

  function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (timeLeft.value <= 0) {
        clearInterval(timer!);
        timer = null;
        submit();
      } else if (timeLeft.value === 300 && !warningShown) {
        // Show 5 minute warning
        showTimeWarning.value = true;
        warningShown = true;
        // Auto-hide after 10 seconds
        setTimeout(() => {
          showTimeWarning.value = false;
        }, 10000);
      } else {
        timeLeft.value--;
      }
    }, 1000);
  }

  const exercises = computed<PracticeSheetExercise[]>(
    () => sheet.value?.exercises || [],
  );
  const isCanvas = computed(() => sheet.value?.test_style === "canvas");
  const hasCanvasExercises = computed(() =>
    exercises.value.some((ex) => exerciseUsesCanvas(ex.exercise.type)),
  );

  function isAnswered(exerciseId: string) {
    const exercise = exercises.value.find(
      (ex) => ex.exercise.id === exerciseId,
    )?.exercise;
    if (exercise && exerciseUsesCanvas(exercise.type))
      return !!canvasData.value[exerciseId];
    return (answers.value[exerciseId] || "").trim() !== "";
  }

  function setActiveExercise(exerciseId: string) {
    activeId.value = exerciseId;
    const index = exercises.value.findIndex((item) => item.exercise.id === exerciseId);
    window.dispatchEvent(new CustomEvent("practiq:assistant:active-context", { detail: { label: index >= 0 ? `E${index + 1}` : "" } }));
  }

  function exerciseUsesCanvas(exerciseType: string) {
    return (
      isCanvas.value ||
      exerciseType === "handwritten" ||
      exerciseType === "canvas"
    );
  }

  function exerciseOptions(metadata?: string) {
    const options = parseExerciseMetadata(metadata)?.options;
    return Array.isArray(options)
      ? options.map((option) => String(option)).filter(Boolean)
      : [];
  }

  const answeredCount = computed(
    () => exercises.value.filter((ex) => isAnswered(ex.exercise.id)).length,
  );
  const unansweredCount = computed(
    () => exercises.value.length - answeredCount.value,
  );
  const answeredPercent = computed(() =>
    exercises.value.length
      ? Math.round((answeredCount.value / exercises.value.length) * 100)
      : 0,
  );
  const formattedTime = computed(() => formatDuration(timeLeft.value));

  // Canvas helpers

  function setCanvasRef(id: string, el: InstanceType<typeof DrawingCanvas> | null) {
    canvasRefs[id] = el;
  }

  function undoActive() {
    const id = activeId.value;
    if (!id) return;
    const canvas = canvasRefs[id];
    if (!canvas) return;
    canvas.undo();
  }

  function clearCanvas(id: string) {
    const canvas = canvasRefs[id];
    if (!canvas) return;
    canvas.clear();
    const copy = { ...canvasData.value };
    delete copy[id];
    canvasData.value = copy;
  }

  // Lifecycle

  onMounted(async () => {
    const id = route.params.id as string;
    try {
      sheet.value = await loadPracticeSheet(id);
      for (const ex of exercises.value) {
        answers.value[ex.exercise.id] = "";
      }
      // Fetch curiosities for loading screen
      if (sheet.value.course_id) {
        fetchCuriosities(sheet.value.course_id);
      }
      // Timer starts when user clicks "Comenzar" in instructions modal
    } finally {
      loading.value = false;
    }
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
    if (loadingMsgInterval) clearInterval(loadingMsgInterval);
    if ((window as any).__practiqAssistantHookSource === "level-test") {
      delete window.__practiqAssistantCapture;
      delete window.__practiqAssistantContext;
      delete window.__practiqAssistantMediaAttachments;
      delete (window as any).__practiqAssistantHookSource;
    }
  });

  function focusNext(idx: number) {
    const inputs = document.querySelectorAll<HTMLInputElement>(".ex-input");
    inputs[idx + 1]?.focus();
  }

  async function confirmExit() {
    await leave(() => router.back());
  }

  function getNextCuriosity(): string {
    if (curiosities.value.length > 0) {
      const msg = curiosities.value[curiosityIndex.value % curiosities.value.length];
      curiosityIndex.value++;
      return `💡 ${msg}`;
    }
    return randomMessage(loadingMessages);
  }

  async function submit() {
    if (submitting.value) return;
    submitting.value = true;
    if (timer) clearInterval(timer);

    loadingMessage.value = getNextCuriosity();
    loadingMsgInterval = setInterval(() => {
      loadingMessage.value = getNextCuriosity();
    }, 3000);

    const elapsedSeconds = TEST_DURATION_SECONDS - timeLeft.value;
    const perExerciseSeconds = exercises.value.length
      ? Math.round(elapsedSeconds / exercises.value.length)
      : 0;

    const attempts = exercises.value.map((ex) => {
      if (ex.exercise.type === "attachment") {
        const uploaded = attachments.value[ex.exercise.id];
        return {
          exercise_id: ex.exercise.id,
          answer_text: "",
          canvas_data: "",
          attachment_url: uploaded?.url ?? "",
          attachment_name: uploaded?.filename ?? "",
          attachment_content_type: uploaded?.content_type ?? "",
          time_spent_seconds: perExerciseSeconds,
          hints_used: 0,
        };
      }
      return {
        exercise_id: ex.exercise.id,
        answer_text: exerciseUsesCanvas(ex.exercise.type)
          ? ""
          : answers.value[ex.exercise.id] || "",
        canvas_data: exerciseUsesCanvas(ex.exercise.type)
          ? buildCanvasDataForOCR(ex.exercise.id)
          : "",
        time_spent_seconds: perExerciseSeconds,
        hints_used: 0,
      };
    });

    try {
      const start = await submitPracticeSheetAsync(sheet.value!.id, {
        attempts,
      });
      const jobId = start.job_id;
      let jobDone = false;

      while (!jobDone) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const job = await loadSubmitJob(jobId);
        if (job.status === "processing") {
          continue;
        }
        if (job.status === "failed") {
          throw new Error(job.message || "No se pudo evaluar la prueba");
        }
        result.value = job.result?.data || null;
        jobDone = true;
      }

      if (!result.value) {
        throw new Error("No se recibió resultado de evaluación");
      }
      showAllErrors.value = false;
      submitted.value = true;

      // Fire celebration based on result
      if (result.value.should_level_up) {
        showSuccessModal.value = true;
        fireLevelUp();
        playSound("levelup");
      } else {
        playSound("incorrect");
      }
    } catch (err) {
      console.error(err);
    } finally {
      submitting.value = false;
      if (loadingMsgInterval) {
        clearInterval(loadingMsgInterval);
        loadingMsgInterval = null;
      }
    }
  }

  function buildCanvasDataForOCR(exerciseId: string) {
    const dataUrl = canvasData.value[exerciseId] || "";
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      return "";
    }

    // Create temp canvas from dataURL
    const source = document.createElement("canvas");
    const sourceImg = new Image();
    sourceImg.src = dataUrl;

    // If image not yet loaded, return original
    if (!sourceImg.complete) {
      return dataUrl;
    }

    source.width = sourceImg.width || 680;
    source.height = sourceImg.height || 220;
    const sourceCtx = source.getContext("2d");
    if (!sourceCtx) return dataUrl;
    sourceCtx.drawImage(sourceImg, 0, 0);

    const scale = 2;
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.floor(source.width * scale));
    out.height = Math.max(1, Math.floor(source.height * scale));
    const ctx = out.getContext("2d");
    if (!ctx) {
      return dataUrl;
    }

    ctx.fillStyle = cssVar("--surface-card", "#ffffff");
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0, out.width, out.height);

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
      const value = gray > 205 ? 255 : 0;
      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
      pixels[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);

    return out.toDataURL("image/jpeg", 0.92);
  }

  function getAssistantExerciseId() {
    if (activeId.value) {
      return activeId.value;
    }

    const answeredId = Object.keys(canvasData.value)[0];
    if (answeredId) return answeredId;

    return exercises.value[0]?.exercise.id || "";
  }

  function getAssistantExerciseIndex(exerciseId: string) {
    return exercises.value.findIndex((item) => item.exercise.id === exerciseId);
  }

  function assistantMediaPath(exerciseId: string) {
    if (!sheet.value?.id || !exerciseId) return "";
    return `/practice-sheets/${encodeURIComponent(sheet.value.id)}/exercises/${encodeURIComponent(exerciseId)}/assistant-media`;
  }

  (window as any).__practiqAssistantHookSource = "level-test";

  window.__practiqAssistantContext = () => {
    if (!sheet.value) return null;

    const activeExerciseId = getAssistantExerciseId();
    const activeExerciseIndex = getAssistantExerciseIndex(activeExerciseId);
    const activeExercise =
      activeExerciseIndex >= 0
        ? exercises.value[activeExerciseIndex]?.exercise
        : null;
    const activeTeacherImage = extractTeacherImageDataUrl(activeExercise);

    return {
      current_view: "student_level_test",
      activity_type: "level_test",
      sheet_id: sheet.value.id,
      sheet_title: sheet.value.title,
      level: sheet.value.level,
      response_mode: hasCanvasExercises.value ? "mixed" : "keyboard",
      exercise_count: exercises.value.length,
      active_exercise: activeExercise
        ? {
            id: activeExercise.id,
            number: activeExerciseIndex + 1,
            type: activeExercise.type,
            difficulty: activeExercise.difficulty,
            question:
              activeExercise.type === "handwritten" && activeTeacherImage
                ? "[consigna manuscrita en imagen adjunta]"
                : activeExercise.question,
            has_teacher_image: !!activeTeacherImage,
            has_statement_media: !!activeExercise.media_view_url,
            question_source:
              activeExercise.type === "handwritten" && activeTeacherImage
                ? "teacher_image_attachment"
                : "text",
            student_answer:
              activeExercise.type === "fill_blanks"
                ? buildFillBlanksAssistantContext(
                    activeExercise,
                    answers.value[activeExercise.id] || "",
                  ).blanks
                    .filter((blank) => blank.value)
                    .map((blank) => `Hueco ${blank.id}: ${blank.value}`)
                    .join(", ")
                : answers.value[activeExercise.id] || "",
            student_answer_raw:
              activeExercise.type === "fill_blanks"
                ? answers.value[activeExercise.id] || ""
                : "",
            puzzle:
              activeExercise.type === "fill_blanks"
                ? buildFillBlanksAssistantContext(
                    activeExercise,
                    answers.value[activeExercise.id] || "",
                  )
                : null,
            metadata_summary:
              activeExercise.type === "fill_blanks"
                ? ""
                : JSON.stringify(summarizeExerciseMetadata(activeExercise) || {}),
          }
        : null,
      exercise_list: exercises.value.map((item, idx) => ({
        id: item.exercise.id,
        number: idx + 1,
        type: item.exercise.type,
        difficulty: item.exercise.difficulty,
        question:
          item.exercise.type === "handwritten" &&
          extractTeacherImageDataUrl(item.exercise)
            ? "[consigna manuscrita en imagen adjunta]"
            : item.exercise.question,
        has_teacher_image: !!extractTeacherImageDataUrl(item.exercise),
        question_source:
          item.exercise.type === "handwritten" &&
          extractTeacherImageDataUrl(item.exercise)
            ? "teacher_image_attachment"
            : "text",
      })),
      answered_exercise_ids: exercises.value
        .filter((item) => isAnswered(item.exercise.id))
        .map((item) => item.exercise.id),
    };
  };

  window.__practiqAssistantCapture = async () => {
    const exerciseId = getAssistantExerciseId();
    if (!exerciseId) return null;
    const exerciseIndex = getAssistantExerciseIndex(exerciseId);
    const exercise =
      exerciseIndex >= 0 ? exercises.value[exerciseIndex]?.exercise : null;
    if (!exercise) return null;

    const studentDataUrl = exerciseUsesCanvas(exercise.type)
      ? await pickBestStudentImage([
          buildCanvasDataForOCR(exerciseId),
          canvasData.value[exerciseId],
        ])
      : "";
    const teacherDataUrl =
      (await statementMediaPreviewDataURL(exercise, assistantMediaPath(exerciseId))) ||
      extractTeacherImageDataUrl(exercise);
    const dataUrl = await composeAssistantWorkImage({
      teacherDataUrl,
      studentDataUrl,
      teacherLabel: "Consigna del docente",
      studentLabel: "Respuesta del alumno",
    });

    if (!dataUrl) return null;

    return {
      dataUrl,
      filename: `level-test-${exerciseId}.jpg`,
      contentType: dataUrl.startsWith("data:image/png")
        ? "image/png"
        : "image/jpeg",
    };
  };

  window.__practiqAssistantMediaAttachments = async () => {
    const exerciseId = getAssistantExerciseId();
    const exerciseIndex = getAssistantExerciseIndex(exerciseId);
    const exercise =
      exerciseIndex >= 0 ? exercises.value[exerciseIndex]?.exercise : null;
    const audio = await statementMediaAudioAttachment(exercise, assistantMediaPath(exerciseId));
    return audio ? [audio] : [];
  };

  function retry() {
    showRetryModal.value = true;
  }

  function confirmRetry() {
    showRetryModal.value = false;
    submitted.value = false;
    result.value = null;
    timeLeft.value = TEST_DURATION_SECONDS;
    warningShown = false;
    canvasData.value = {};
    for (const key in answers.value) answers.value[key] = "";
    startTimer();
  }

  function goBackFromInstructions() {
    router.back();
  }

  function startTest() {
    showInstructionsModal.value = false;
    testStarted.value = true;
    startTimer();
  }

  function closeSuccessAndGoHome() {
    showSuccessModal.value = false;
    router.push("/student/dashboard");
  }
</script>

<template>
  <StudentLayout>
    <div class="test-shell">
      <!-- Header -->
      <header class="test-header">
        <button
          class="btn-back"
          type="button"
          aria-label="Salir de prueba"
          @click="confirmExit"
          title="Salir"
        >
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="test-header-info">
          <div class="level-badge">Nivel {{ sheet?.level }}</div>
          <h1 class="test-title">{{ sheet?.title }}</h1>
          <span class="test-subtitle"
            >Prueba de Nivel — respondé correctamente el 75% para avanzar</span
          >
        </div>
        <div class="timer" :class="{ 'timer--warning': timeLeft < 120 }">
          <i class="pi pi-clock"></i>
          {{ formattedTime }}
        </div>
      </header>

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div class="test-progress-bar">
          <div class="test-progress-fill" style="width: 0%"></div>
        </div>
        <Skeleton width="120px" height="14px" class="progress-skel" />
        <div class="exercises-list">
          <div v-for="n in 3" :key="n" class="ex-card ex-card--skeleton">
            <Skeleton
              variant="avatar"
              size="32px"
              :rounded="false"
              class="ex-num-skel"
            />
            <div class="ex-body ex-body--skeleton">
              <Skeleton width="100%" height="18px" />
              <Skeleton width="80%" height="16px" />
              <Skeleton width="100%" height="180px" class="canvas-skel" />
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="sheet && !submitted">
        <!-- Progress bar -->
        <div class="test-progress-bar">
          <div
            class="test-progress-fill"
            :style="{ width: answeredPercent + '%' }"
          ></div>
        </div>
        <div class="test-progress-label">
          {{ answeredCount }} / {{ exercises.length }} respondidas
        </div>

        <!-- Canvas toolbar (only in canvas mode) -->
        <div v-if="hasCanvasExercises" class="draw-tools-bar">
          <button
            class="tool-btn"
            type="button"
            aria-label="Usar lápiz"
            :class="{ 'tool-btn--active': tool === 'pen' }"
            @click="tool = 'pen'"
            title="Lápiz"
          >
            <i class="pi pi-pencil"></i>
          </button>
          <button
            class="tool-btn"
            type="button"
            aria-label="Usar borrador"
            :class="{ 'tool-btn--active': tool === 'eraser' }"
            @click="tool = 'eraser'"
            title="Borrador"
          >
            <i class="pi pi-times-circle"></i>
          </button>
          <button
            class="tool-btn"
            type="button"
            aria-label="Deshacer trazo"
            @click="undoActive"
            title="Deshacer"
          >
            <i class="pi pi-undo"></i>
          </button>
          <div class="tool-sep"></div>
          <ColorPalette v-model="penColor" />
          <input
            type="range"
            v-model.number="penSize"
            min="1"
            max="20"
            class="size-slider"
            title="Grosor"
            aria-label="Grosor del lápiz"
          />
          <span class="size-val">{{ penSize }}px</span>
        </div>

        <!-- Exercises -->
        <div class="exercises-list">
          <div
            v-for="(ex, idx) in exercises"
            :key="ex.id"
            class="ex-card"
            :class="{ 'ex-card--answered': isAnswered(ex.exercise.id) }"
            @click="setActiveExercise(ex.exercise.id)"
            @focusin="setActiveExercise(ex.exercise.id)"
            @mouseenter="setActiveExercise(ex.exercise.id)"
          >
            <div class="ex-num">{{ idx + 1 }}</div>
            <div class="ex-body">
              <div
                v-if="ex.exercise.type === 'equation'"
                class="ex-question ex-question--math"
                v-html="renderEquation(ex.exercise.question)"
              ></div>
              <div
                v-else-if="
                  ex.exercise.type !== 'fill_blanks' &&
                  (ex.exercise.type !== 'handwritten' ||
                  !extractTeacherImageDataUrl(ex.exercise)
                  )
                "
                class="ex-question"
              >
                {{ ex.exercise.question }}
              </div>
              <img
                v-if="extractTeacherImageDataUrl(ex.exercise)"
                :src="extractTeacherImageDataUrl(ex.exercise)"
                class="teacher-handwritten-image"
                alt="Consigna manuscrita del profesor"
              />
              <ExerciseMedia :url="ex.exercise.media_view_url" />

              <!-- Multiple choice -->
              <div
                v-if="ex.exercise.type === 'multiple_choice'"
                class="choice-options"
              >
                <label
                  v-for="option in exerciseOptions(ex.exercise.metadata)"
                  :key="option"
                  class="choice-option"
                  :class="{
                    'choice-option--selected':
                      answers[ex.exercise.id] === option,
                  }"
                >
                  <input
                    v-model="answers[ex.exercise.id]"
                    type="radio"
                    :name="`level-test-exercise-${ex.exercise.id}`"
                    :value="option"
                  />
                  <span>{{ option }}</span>
                </label>
                <input
                  v-if="exerciseOptions(ex.exercise.metadata).length === 0"
                  v-model="answers[ex.exercise.id]"
                  class="ex-input"
                  placeholder="Escribe la opción correcta..."
                  @keydown.enter="focusNext(idx)"
                />
              </div>

              <!-- Fill in the blanks -->
              <div
                v-else-if="ex.exercise.type === 'fill_blanks'"
                class="fill-blanks-wrap"
              >
                <FillBlanksAnswer
                  :exercise="ex.exercise"
                  :model-value="answers[ex.exercise.id] || ''"
                  @update:model-value="
                    (value) => (answers[ex.exercise.id] = value)
                  "
                />
              </div>

              <!-- File / audio submission -->
              <div
                v-else-if="ex.exercise.type === 'attachment'"
                class="attachment-answer-wrap"
              >
                <AttachmentAnswer
                  :exercise="ex.exercise"
                  :model-value="attachments[ex.exercise.id] ?? null"
                  @update:model-value="
                    (value) => setAttachment(ex.exercise.id, value)
                  "
                />
              </div>

              <!-- Equation answer mode -->
              <div
                v-else-if="ex.exercise.type === 'equation'"
                class="equation-answer-wrap"
              >
                <MathFieldEditor
                  v-model="answers[ex.exercise.id]"
                  :show-latex-toggle="false"
                  virtual-keyboard-mode="onfocus"
                />
              </div>

              <!-- Keyboard mode (text/open_text/multiple_choice) -->
              <input
                v-else-if="!exerciseUsesCanvas(ex.exercise.type)"
                v-model="answers[ex.exercise.id]"
                class="ex-input"
                placeholder="Escribe tu respuesta..."
                @keydown.enter="focusNext(idx)"
              />

              <!-- Canvas mode -->
              <div v-else class="canvas-wrap">
                <div class="canvas-header">
                  <span class="canvas-label">Tu respuesta</span>
                  <button
                    class="btn-clear-canvas"
                    type="button"
                    @click="clearCanvas(ex.exercise.id)"
                    title="Borrar todo"
                    aria-label="Limpiar respuesta"
                  >
                    <i class="pi pi-trash"></i> Limpiar
                  </button>
                </div>
                <DrawingCanvas
                  :ref="
                    (el) =>
                      setCanvasRef(
                        ex.exercise.id,
                        el as InstanceType<typeof DrawingCanvas> | null,
                      )
                  "
                  v-model="canvasData[ex.exercise.id]"
                  :height="220"
                  :tool="tool"
                  :pen-size="penSize"
                  :pen-color="penColor"
                  @click="activeId = ex.exercise.id"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="test-footer">
          <span class="footer-hint">{{ unansweredCount }} sin responder</span>
          <button class="btn-submit" :disabled="submitting" @click="submit">
            <i v-if="!submitting" class="pi pi-send"></i>
            <span v-else class="spinner"></span>
            Entregar prueba
          </button>
        </div>
      </template>

      <!-- Results -->
      <div v-else-if="result" class="results-panel">
        <div
          class="result-card"
          :class="
            result.should_level_up ? 'result-card--pass' : 'result-card--fail'
          "
        >
          <div class="result-icon">
            {{ result.should_level_up ? "🏆" : "📚" }}
          </div>
          <h2 class="result-heading">
            {{ result.should_level_up ? "¡Aprobaste!" : "No pasaste esta vez" }}
          </h2>

          <div class="score-ring">
            <svg viewBox="0 0 120 120" class="ring-svg">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="var(--surface-border)"
                stroke-width="10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                :stroke="
                  result.should_level_up
                    ? 'var(--color-success)'
                    : 'var(--color-warning)'
                "
                stroke-width="10"
                stroke-linecap="round"
                stroke-dasharray="314"
                :stroke-dashoffset="314 - (314 * result.score) / 100"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div class="ring-label">
              <div class="ring-score">{{ Math.round(result.score) }}%</div>
              <div class="ring-sub">
                {{ result.correct }}/{{ result.total }}
              </div>
            </div>
          </div>

          <div v-if="result.should_level_up" class="level-up-badge">
            Nivel {{ result.next_level }} desbloqueado 🎉
          </div>

          <p class="result-rec">{{ result.recommendation }}</p>

          <!-- Per-exercise feedback (only errors) -->
          <div v-if="pendingResults.length" class="pending-review-badge">
            <i class="pi pi-clock"></i>
            Tu entrega quedó esperando la corrección del docente.
          </div>

          <div v-if="incorrectResults.length === 0 && result.exercise_results?.length && !pendingResults.length" class="all-correct-badge">
            ✅ ¡Todas las respuestas correctas!
          </div>

          <div v-else-if="incorrectResults.length > 0" class="exercise-results-section">
            <div class="exercise-results-list" :class="{ 'exercise-results-list--expanded': showAllErrors }">
              <div
                v-for="exResult in visibleErrors"
                :key="exResult.exercise_id"
                class="exercise-result-item exercise-result--incorrect"
              >
                <div class="exercise-result-icon">❌</div>
                <div class="exercise-result-content">
                  <div class="exercise-result-answers">
                    <span class="answer-label">Tu respuesta:</span>
                    <span class="answer-student">{{ formatStudentAnswer(exResult.student_answer) }}</span>
                    <span class="answer-label">Correcta:</span>
                    <span class="answer-correct">{{ exResult.correct_answer }}</span>
                  </div>
                  <div v-if="exResult.ai_feedback && !exResult.ai_feedback.includes('UNREADABLE')" class="exercise-result-feedback">
                    {{ exResult.ai_feedback }}
                  </div>
                </div>
              </div>
            </div>

            <button
              v-if="hiddenErrorsCount > 0 && !showAllErrors"
              class="btn-show-more"
              @click="showAllErrors = true"
            >
              Ver {{ hiddenErrorsCount }} error{{ hiddenErrorsCount > 1 ? 'es' : '' }} más
            </button>
          </div>

          <div class="result-actions">
            <button
              class="btn-secondary"
              @click="router.push('/student/dashboard')"
            >
              Ir al inicio
            </button>
            <button
              v-if="!result.should_level_up"
              class="btn-retry"
              @click="retry"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    </div>
  </StudentLayout>

  <AiLoadingModal
    :show="submitting"
    badge-label="IA evaluando"
    title="Evaluando prueba"
    :message="loadingMessage"
  />

  <ConfirmModal
    v-bind="leaveConfirmState"
    @confirm="onLeaveConfirm"
    @cancel="onLeaveCancel"
  />

  <!-- Instructions Modal (before test) -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showInstructionsModal" class="modal-overlay">
        <div class="modal-box instructions-modal">
          <div class="instructions-icon">
            <i class="pi pi-info-circle"></i>
          </div>
          <h3 class="modal-title">Prueba de Nivel {{ sheet?.level }}</h3>
          <div class="instructions-content">
            <p class="instructions-intro">
              Estas a punto de comenzar una prueba de nivel. Lee atentamente las
              siguientes instrucciones:
            </p>
            <ul class="instructions-list">
              <li>
                <i class="pi pi-clock"></i>
                Tiempo limite: <strong>30 minutos</strong>
              </li>
              <li>
                <i class="pi pi-check-circle"></i>
                Necesitas <strong>75%</strong> de respuestas correctas para
                aprobar
              </li>
              <li>
                <i class="pi pi-pencil"></i>
                Responde todos los ejercicios antes de enviar
              </li>
              <li>
                <i class="pi pi-exclamation-triangle"></i>
                No podras pausar la prueba una vez iniciada
              </li>
            </ul>
            <p class="instructions-tip">
              <strong>Consejo:</strong> Revisa todas tus respuestas antes de
              entregar.
            </p>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="goBackFromInstructions">
              <i class="pi pi-arrow-left"></i> Volver
            </button>
            <button class="btn btn-primary" @click="startTest">
              <i class="pi pi-play"></i> Comenzar prueba
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Time Warning Toast -->
  <Teleport to="body">
    <Transition name="slide-up">
      <div v-if="showTimeWarning" class="time-warning-toast">
        <i class="pi pi-clock"></i>
        <span>Quedan <strong>5 minutos</strong> para terminar la prueba</span>
        <button class="toast-close" @click="showTimeWarning = false">
          <i class="pi pi-times"></i>
        </button>
      </div>
    </Transition>
  </Teleport>

  <!-- Retry Confirmation Modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showRetryModal"
        class="modal-overlay"
        @click.self="showRetryModal = false"
      >
        <div class="modal-box">
          <h3 class="modal-title">
            <i class="pi pi-refresh"></i> Reintentar prueba
          </h3>
          <p class="modal-desc">
            ¿Estas seguro de que deseas reintentar la prueba de nivel?
          </p>
          <div class="retry-warning">
            <i class="pi pi-exclamation-triangle"></i>
            <div>
              <strong>Ten en cuenta:</strong>
              <ul>
                <li>Tendras otros 30 minutos para completar la prueba</li>
                <li>Tus respuestas anteriores no se conservaran</li>
                <li>Necesitaras 75% de respuestas correctas para aprobar</li>
              </ul>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showRetryModal = false">
              Cancelar
            </button>
            <button class="btn btn-primary" @click="confirmRetry">
              <i class="pi pi-refresh"></i> Reintentar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Success Congratulations Modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showSuccessModal" class="modal-overlay">
        <div class="modal-box success-modal">
          <div class="success-confetti">
            <span class="confetti-piece">🎉</span>
            <span class="confetti-piece">🏆</span>
            <span class="confetti-piece">⭐</span>
          </div>
          <h3 class="modal-title success-title">Felicitaciones!</h3>
          <p class="success-message">
            Has aprobado la prueba de nivel {{ sheet?.level }} con un
            <strong>{{ Math.round(result?.score || 0) }}%</strong>
          </p>
          <div class="level-unlock-badge">
            <i class="pi pi-lock-open"></i>
            Nivel
            {{ result?.next_level || (sheet?.level || 0) + 1 }} desbloqueado
          </div>
          <p class="success-recommendation" v-if="result?.recommendation">
            {{ result.recommendation }}
          </p>
          <div class="modal-actions">
            <button
              class="btn btn-primary btn-lg"
              @click="closeSuccessAndGoHome"
            >
              <i class="pi pi-home"></i> Continuar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .test-shell {
    max-width: 780px;
    margin: 0 auto;
    padding: 24px 20px 60px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: var(--gradient-app-bg);
  }

  /* Header */
  .test-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 20px 24px;
    background: var(--gradient-card-accent);
    border-radius: var(--radius-2xl);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.12);
    box-shadow: var(--shadow-card);
  }

  .btn-back {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
    background: var(--surface-elevated-strong);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .btn-back:hover {
    background: var(--fill-primary-faint);
  }

  .test-header-info {
    flex: 1;
  }

  .level-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: var(--radius-2xl);
    background: var(--gradient-brand);
    color: var(--color-on-primary);
    font-size: 0.75rem;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .test-title {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 4px;
  }

  .test-subtitle {
    font-size: 0.82rem;
    color: var(--text-secondary);
  }

  .timer {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-secondary);
    background: var(--gradient-brand-soft);
    padding: 8px 16px;
    border-radius: var(--radius-md);
    flex-shrink: 0;
  }
  .timer--warning {
    color: var(--color-error-dark);
    background: var(--color-error-bg);
  }

  /* Progress */
  .test-progress-bar {
    height: 6px;
    background: var(--fill-primary-soft);
    border-radius: var(--radius-pill);
    overflow: hidden;
  }
  .test-progress-fill {
    height: 100%;
    background: var(--gradient-brand);
    border-radius: var(--radius-pill);
    transition: width 0.3s ease;
  }
  .test-progress-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-align: right;
  }

  /* Draw toolbar */
  .draw-tools-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: var(--surface-elevated-strong);
    border-radius: var(--radius-lg);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
    flex-wrap: wrap;
  }

  .tool-btn {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    background: var(--surface-elevated);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
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

  .tool-sep {
    width: 1px;
    height: 28px;
    background: rgba(var(--practiq-violet-rgb), 0.15);
    margin: 0 4px;
  }

  .size-slider {
    width: 80px;
    accent-color: var(--practiq-violet);
  }

  .size-val {
    font-size: 0.8rem;
    color: var(--text-secondary);
    min-width: 28px;
  }

  /* Exercises */
  .exercises-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ex-card {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    padding: 18px 20px;
    background: var(--surface-elevated-strong);
    border-radius: var(--radius-xl);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.08);
    transition: border-color 0.15s;
  }

  .ex-card--answered {
    border-color: rgba(var(--color-success-rgb), 0.3);
    background: var(--color-success-bg);
  }

  .ex-num {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    font-weight: 800;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ex-card--answered .ex-num {
    background: rgba(var(--color-success-rgb), 0.15);
    color: var(--color-success-dark);
  }

  .ex-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ex-body--skeleton {
    gap: 12px;
  }

  .ex-question {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.5;
  }

  .ex-question--math {
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    background: var(--surface-elevated-strong);
    border: 1px solid rgba(var(--practiq-violet-rgb), 0.12);
  }

  .teacher-handwritten-image {
    width: 100%;
    max-height: 260px;
    object-fit: contain;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    border-radius: var(--radius-sm);
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
  }

  .ex-input {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    font-size: 1rem;
    color: var(--text-primary);
    background: var(--surface-elevated-strong);
    outline: none;
    transition: border-color 0.15s;
  }
  .ex-input:focus {
    border-color: var(--practiq-violet);
  }

  .equation-answer-wrap {
    width: 100%;
  }
  .equation-answer-wrap :deep(.math-field-editor) {
    min-height: 44px;
    padding: 8px 12px;
    font-size: 1.1rem;
    border-radius: var(--radius-sm);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    background: var(--surface-elevated-strong);
  }
  .equation-answer-wrap :deep(.math-field-editor:focus-within) {
    border-color: var(--practiq-violet);
    box-shadow: 0 0 0 3px rgba(var(--practiq-violet-rgb), 0.12);
  }

  .choice-options {
    display: grid;
    gap: 10px;
  }

  .choice-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.14);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated-strong);
    color: var(--text-primary);
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .choice-option:hover,
  .choice-option--selected {
    border-color: rgba(var(--practiq-violet-rgb), 0.36);
    background: var(--fill-primary-faint);
  }

  .choice-option input {
    width: 18px;
    height: 18px;
    accent-color: var(--practiq-violet);
    flex: 0 0 auto;
  }

  /* Canvas */
  .canvas-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .canvas-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .canvas-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .btn-clear-canvas {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(var(--color-error-rgb), 0.2);
    background: var(--surface-elevated-strong);
    color: var(--color-error);
    cursor: pointer;
    font-size: 0.78rem;
    transition: all 0.15s;
  }
  .btn-clear-canvas:hover {
    background: rgba(var(--color-error-rgb), 0.08);
  }

  .ex-canvas {
    width: 100%;
    height: 220px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    display: block;
    touch-action: none;
    box-shadow: var(--shadow-card);
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

  /* Footer */
  .test-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: var(--surface-elevated-strong);
    border-radius: var(--radius-xl);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
    position: sticky;
    bottom: 16px;
  }

  .footer-hint {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .btn-submit {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    border-radius: var(--radius-md);
    border: none;
    background: var(--gradient-brand);
    color: var(--color-on-primary);
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    box-shadow: var(--shadow-indigo);
    transition: opacity 0.15s;
  }
  .btn-submit:hover:not(:disabled) {
    opacity: 0.9;
  }
  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Skeleton styles */
  .progress-skel {
    margin-left: auto;
  }
  .ex-card--skeleton {
    pointer-events: none;
  }
  .ex-num-skel {
    border-radius: var(--radius-sm);
  }
  .canvas-skel {
    border-radius: var(--radius-md);
    margin-top: 8px;
  }

  /* Results */
  .results-panel {
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }

  .result-card {
    background: var(--surface-elevated-strong);
    border-radius: 28px;
    padding: 40px 48px;
    text-align: center;
    max-width: 460px;
    width: 100%;
    box-shadow: var(--shadow-panel);
    border: 2px solid transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .result-card--pass {
    border-color: rgba(var(--color-success-rgb), 0.3);
  }
  .result-card--fail {
    border-color: rgba(var(--color-warning-rgb), 0.3);
  }

  .result-icon {
    font-size: 3rem;
    line-height: 1;
  }

  .result-heading {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  .score-ring {
    position: relative;
    width: 140px;
    height: 140px;
  }

  .ring-svg {
    width: 140px;
    height: 140px;
    transform: scaleX(-1);
  }

  .ring-label {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .ring-score {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1;
  }

  .ring-sub {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .level-up-badge {
    padding: 8px 20px;
    border-radius: var(--radius-pill);
    background: linear-gradient(
      135deg,
      var(--color-success),
      var(--color-success-dark)
    );
    color: var(--color-on-primary);
    font-weight: 700;
    font-size: 0.95rem;
  }

  .result-rec {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  .result-ai-feedback {
    background: var(--fill-primary-faint);
    border: 1px solid rgba(var(--practiq-violet-rgb), 0.15);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-size: 0.88rem;
    color: var(--text-secondary);
    line-height: 1.5;
    width: 100%;
    text-align: left;
  }

  /* Exercise results */
  .pending-review-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 16px 0;
    padding: 14px 16px;
    border-radius: var(--radius-lg, 14px);
    background: var(--color-warning-bg, rgba(245, 158, 11, 0.12));
    color: var(--text-primary);
    font-weight: 600;
  }
  .all-correct-badge {
    width: 100%;
    padding: 14px 16px;
    border-radius: var(--radius-lg);
    background: var(--fill-success-subtle);
    color: var(--color-success-dark, #166534);
    font-weight: 600;
    text-align: center;
  }

  .exercise-results-section {
    width: 100%;
  }

  .exercise-results-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .exercise-results-list--expanded {
    max-height: 250px;
    overflow-y: auto;
  }

  .exercise-result-item {
    display: flex;
    gap: 10px;
    padding: 12px;
    border-radius: var(--radius-lg);
    text-align: left;
  }

  .exercise-result--incorrect {
    background: var(--fill-error-subtle, #fef2f2);
  }

  .exercise-result-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .exercise-result-content {
    flex: 1;
    font-size: 0.85rem;
  }

  .exercise-result-answers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    margin-bottom: 6px;
  }

  .answer-label {
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .answer-student {
    color: var(--color-error, #dc2626);
    font-weight: 600;
  }

  .answer-correct {
    color: var(--color-success, #16a34a);
    font-weight: 600;
  }

  .exercise-result-feedback {
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .btn-show-more {
    margin-top: 8px;
    width: 100%;
    padding: 10px;
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-show-more:hover {
    background: var(--surface-subtle);
    color: var(--text-primary);
  }

  .result-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .btn-secondary {
    padding: 10px 22px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
    background: var(--surface-elevated-strong);
    color: var(--text-primary);
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.15s;
  }
  .btn-secondary:hover {
    border-color: var(--practiq-violet);
  }

  .btn-retry {
    padding: 10px 22px;
    border-radius: var(--radius-md);
    border: none;
    background: linear-gradient(
      135deg,
      var(--color-warning),
      var(--color-warning-strong)
    );
    color: var(--color-on-primary);
    font-weight: 700;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .btn-retry:hover {
    opacity: 0.9;
  }

  /* Instructions Modal */
  .instructions-modal {
    max-width: 500px;
    text-align: center;
  }

  .instructions-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    border-radius: 50%;
    background: var(--fill-primary-soft);
    display: grid;
    place-items: center;
    font-size: 28px;
    color: var(--practiq-violet);
  }

  .instructions-content {
    text-align: left;
    margin-bottom: 20px;
  }

  .instructions-intro {
    font-size: var(--text-base);
    color: var(--text-secondary);
    margin-bottom: 16px;
  }

  .instructions-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .instructions-list li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--surface-subtle);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    color: var(--text-primary);
  }

  .instructions-list li i {
    color: var(--practiq-violet);
    font-size: 18px;
    flex-shrink: 0;
  }

  .instructions-tip {
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--fill-primary-faint);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--practiq-violet-dark);
  }

  /* Time Warning Toast */
  .time-warning-toast {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 24px;
    background: linear-gradient(
      135deg,
      var(--color-warning),
      var(--color-warning-strong)
    );
    color: white;
    border-radius: var(--radius-xl);
    box-shadow: 0 8px 32px rgba(var(--color-warning-rgb), 0.3);
    font-size: var(--text-base);
    font-weight: 600;
    z-index: 10000;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: translateX(-50%) scale(1);
    }
    50% {
      transform: translateX(-50%) scale(1.02);
    }
  }

  .toast-close {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: rgba(var(--surface-card-rgb), 0.2);
    color: white;
    cursor: pointer;
    display: grid;
    place-items: center;
    margin-left: 8px;
  }

  .toast-close:hover {
    background: rgba(var(--surface-card-rgb), 0.3);
  }

  /* Retry Warning */
  .retry-warning {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: rgba(var(--color-warning-rgb), 0.1);
    border: 1px solid rgba(var(--color-warning-rgb), 0.3);
    border-radius: var(--radius-md);
    margin: 16px 0;
    text-align: left;
  }

  .retry-warning > i {
    color: var(--color-warning-dark);
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .retry-warning ul {
    margin: 8px 0 0;
    padding-left: 20px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .retry-warning li {
    margin-bottom: 4px;
  }

  .modal-desc {
    font-size: var(--text-base);
    color: var(--text-secondary);
    margin: 0;
  }

  /* Success Modal */
  .success-modal {
    max-width: 440px;
    text-align: center;
  }

  .success-confetti {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .confetti-piece {
    font-size: 42px;
    animation: bounce 0.6s ease-out;
  }

  .confetti-piece:nth-child(2) {
    animation-delay: 0.1s;
  }

  .confetti-piece:nth-child(3) {
    animation-delay: 0.2s;
  }

  @keyframes bounce {
    0% {
      transform: translateY(20px) scale(0);
      opacity: 0;
    }
    60% {
      transform: translateY(-10px) scale(1.1);
    }
    100% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  .success-title {
    color: var(--color-success-dark);
    font-size: 1.8rem;
  }

  .success-message {
    font-size: var(--text-lg);
    color: var(--text-primary);
    margin-bottom: 20px;
  }

  .level-unlock-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 24px;
    background: var(--gradient-brand);
    color: white;
    border-radius: var(--radius-xl);
    font-size: var(--text-lg);
    font-weight: 700;
    margin-bottom: 16px;
  }

  .success-recommendation {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    padding: 12px 16px;
    background: var(--surface-subtle);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
  }

  .btn-lg {
    padding: 14px 32px;
    font-size: var(--text-lg);
  }

  /* Slide-up transition for toast */
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: all 0.3s ease;
  }

  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translateX(-50%) translateY(100px);
    opacity: 0;
  }

  @media (max-width: 1024px) {
    .test-shell {
      padding: 20px 16px 48px;
    }
    .test-header {
      padding: 16px 20px;
    }
  }

  @media (max-width: 768px) {
    .test-shell {
      padding: 16px 12px 40px;
      gap: 12px;
    }
    .test-header {
      padding: 14px 16px;
      gap: 10px;
      flex-wrap: wrap;
    }
    .test-title {
      font-size: 1.1rem;
    }
    .test-subtitle {
      font-size: 0.78rem;
    }
    .timer {
      font-size: 0.95rem;
      padding: 6px 12px;
    }
    .ex-card {
      padding: 14px 16px;
      gap: 12px;
    }
    .draw-tools-bar {
      padding: 8px 12px;
    }
    .test-footer {
      padding: 12px 16px;
    }
    .btn-submit {
      padding: 10px 20px;
      font-size: 0.88rem;
    }
    .result-card {
      padding: 28px 24px;
    }
  }

  @media (max-width: 600px) {
    .test-shell {
      padding: 10px 8px 32px;
      gap: 10px;
    }
    .test-header {
      padding: 12px;
    }
    .ex-card {
      padding: 12px;
      flex-direction: column;
      gap: 8px;
    }
    .ex-num {
      width: 28px;
      height: 28px;
      font-size: 0.82rem;
    }
    .ex-canvas {
      height: 180px;
    }
    .test-footer {
      padding: 10px 12px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .btn-submit {
      width: 100%;
      justify-content: center;
    }
    .result-card {
      padding: 20px 16px;
    }
    .result-actions {
      flex-direction: column;
      align-items: stretch;
    }
    .btn-secondary,
    .btn-retry {
      text-align: center;
    }

    /* Tap targets >= 44px en mobile */
    .btn-back,
    .toast-close {
      width: 44px;
      height: 44px;
    }

    .tool-btn {
      width: 46px;
      height: 46px;
      font-size: 1rem;
    }

    .choice-option {
      min-height: 52px;
      padding: 12px 14px;
    }

    .choice-option input {
      width: 22px;
      height: 22px;
    }

    .btn-submit {
      min-height: 50px;
    }
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
