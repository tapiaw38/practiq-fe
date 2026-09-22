<script setup lang="ts">
  import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import PractiCoach from "@/components/student/practice/PractiCoach.vue";
  import { useToast } from "primevue/usetoast";
  import { useAuthStore } from "@/stores/authStore";
  import StudentLayout from "@/layouts/StudentLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import ConfirmModal from "@/components/ui/ConfirmModal.vue";
  import DrawingCanvas from "@/components/ui/DrawingCanvas.vue";
  import ColorPalette from "@/components/ui/ColorPalette.vue";
  import { BASE_COLORS } from "@/utils/palette";
  import AttachmentAnswer from "@/components/student/exercises/AttachmentAnswer.vue";
  import ExerciseStepper from "@/components/student/exercises/ExerciseStepper.vue";
  import ExerciseMedia from "@/components/ui/ExerciseMedia.vue";
  import FillBlanksAnswer from "@/components/student/exercises/FillBlanksAnswer.vue";
  import { usePracticeSheet } from "@/composables/usePracticeSheet";
  import { useLeaveWarning } from "@/composables/useLeaveWarning";
  import { useProgress } from "@/composables/useProgress";
  import type { PracticeSheet, SubmitResult, TopicProgress } from "@/types";
  import type { UploadedFile } from "@/services/uploads/uploadService";
  import {
    composeAssistantWorkImage,
    extractTeacherImageDataUrl,
    parseExerciseMetadata,
    pickBestStudentImage,
    prepareHandwritingImage,
    summarizeExerciseMetadata,
    statementMediaAudioAttachment,
    statementMediaDocumentAttachment,
    statementMediaPreviewDataURL,
  } from "@/utils/assistantExerciseContext";
  import { statementImageDataURL } from "@/utils/statementImage";
  import { formatDuration } from "@/utils/formatters";
  import {
    renderContent,
    renderEquation,
  } from "@/composables/useContentRenderer";
  import { useConfetti } from "@/composables/useConfetti";
  import { useSound } from "@/composables/useSound";
  import { useCuriosities } from "@/composables/useCuriosities";
  import { tuckAssistantFab } from "@/composables/useAssistantFabOffset";
  import AiLoadingModal from "@/components/student/ai/AiLoadingModal.vue";
  import UiModal from "@/components/ui/UiModal.vue";
  import { buildFillBlanksAssistantContext } from "@/utils/fillBlanks";
  import {
    loadingMessages,
    successMessages,
    encourageMessages,
    randomMessage,
  } from "@/utils/motivationalMessages";

  // mathlive is ~200kB gzipped and only needed for equation exercises, so it
  // loads on demand instead of riding along on every practice session.
  const MathFieldEditor = defineAsyncComponent(
    () => import("@/components/ui/MathFieldEditor.vue"),
  );

  const toast = useToast();
  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const { leaveConfirmState, onLeaveConfirm, onLeaveCancel } = useLeaveWarning(
    () => hasPendingWork.value,
  );
  const { loadCourseProgress } = useProgress();
  const { loadPracticeSheet, submitPracticeSheetAsync, loadSubmitJob } =
    usePracticeSheet();
  const { fireSuccess } = useConfetti();
  const { play: playSound } = useSound();
  const { curiosities, fetchCuriosities } = useCuriosities();
  const sheetId = route.params.id as string;
  const curiosityIndex = ref(0);

  const sheet = ref<PracticeSheet | null>(null);
  const loading = ref(true);
  const currentIdx = ref(0);

  const answers = ref<
    Record<string, { answer: string; timeStart: number; hints: number }>
  >({});
  const keyboardAnswers = ref<Record<string, string>>({});
  const attachments = ref<Record<string, UploadedFile | null>>({});

  // Ids with an upload still in flight; submitting now would deliver the
  // exercise without its file.
  const uploadingAttachments = ref<Set<string>>(new Set());

  function setUploading(exerciseId: string, value: boolean) {
    const next = new Set(uploadingAttachments.value);
    if (value) next.add(exerciseId);
    else next.delete(exerciseId);
    uploadingAttachments.value = next;
  }

  function setAttachment(exerciseId: string, value: UploadedFile | null) {
    attachments.value = { ...attachments.value, [exerciseId]: value };
  }
  const timers = ref<Record<string, number>>({});
  const hints = ref<Record<string, number>>({});

  // Canvas — multiple refs, one per exercise
  const canvasRefs: Record<string, InstanceType<typeof DrawingCanvas> | null> = {};
  const tool = ref<"pen" | "eraser">("pen");
  // Matches the palette's first swatch so one is selected from the start; the
  // theme's text colour is not one of the ink options.
  const penColor = ref(BASE_COLORS[0].value);
  const penSize = ref(3);
  const activeCanvasId = ref("");

  const showSubmitConfirm = ref(false);
  const showResults = ref(false);
  const submitting = ref(false);
  const result = ref<SubmitResult | null>(null);
  const showAllErrors = ref(false);

  const hasPendingWork = computed(() =>
    !result.value &&
    (hasDraft.value ||
      submitting.value ||
      Object.values(answers.value).some((item) => !!item?.answer) ||
      Object.values(keyboardAnswers.value).some((answer) => !!answer?.trim()) ||
      Object.values(attachments.value).some(Boolean) ||
      // An upload in flight is work too: it is the student's first action on
      // an attachment exercise, and until it resolves `attachments` is still
      // empty, so leaving now dropped the answer with no warning.
      uploadingAttachments.value.size > 0),
  );

  // An answer nobody could grade comes back with is_correct=false; showing it
  // as an error would be a lie, so it gets its own bucket. A practice is never
  // corrected by the teacher, so this is as far as those answers go.
  const incorrectResults = computed(() =>
    result.value?.exercise_results?.filter(
      (r) => !r.is_correct && !r.not_graded && !r.needs_teacher_review,
    ) ?? []
  );

  const ungradedResults = computed(() =>
    result.value?.exercise_results?.filter(
      (r) => r.not_graded || r.needs_teacher_review,
    ) ?? []
  );

  // Nothing at all came back with a verdict, so the score is not a judgement
  // on the student's work.
  const allUngraded = computed(
    () =>
      !!result.value?.exercise_results?.length &&
      ungradedResults.value.length === result.value.exercise_results.length,
  );

  const visibleErrors = computed(() =>
    showAllErrors.value ? incorrectResults.value : incorrectResults.value.slice(0, 3)
  );

  const hiddenErrorsCount = computed(() =>
    Math.max(0, incorrectResults.value.length - 3)
  );

  /**
   * A blanks answer is stored keyed by blank, as {"1":"entretener"}. That is how
   * the grader compares it, not something a student should be asked to read: the
   * results modal was showing them the braces and the quotes.
   */
  function formatBlanksAnswer(answer: string): string {
    if (!answer.startsWith("{")) return answer;
    try {
      const parsed = JSON.parse(answer);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return answer;
      const words = Object.keys(parsed)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => String(parsed[key] ?? "").trim())
        .filter(Boolean);
      return words.length ? words.join(" · ") : answer;
    } catch {
      return answer;
    }
  }

  function formatStudentAnswer(answer: string): string {
    if (!answer || answer.trim() === "") return "(vacío)";
    if (answer.toUpperCase() === "UNREADABLE") return "(no se pudo leer)";
    if (answer.startsWith("data:image/")) return "(no se pudo leer)";
    return formatBlanksAnswer(answer);
  }

  const hasDraft = ref(false);
  // A separate flag from hasDraft: that one gates the leave-warning and has to
  // stay true for as long as a draft exists on this device. This one is the
  // badge, and a badge that never turns off just occupies a row forever.
  const showDraftSaved = ref(false);
  let draftBadgeTimer: ReturnType<typeof setTimeout> | null = null;

  function flashDraftSaved() {
    if (draftBadgeTimer) clearTimeout(draftBadgeTimer);
    showDraftSaved.value = true;
    draftBadgeTimer = setTimeout(() => {
      showDraftSaved.value = false;
    }, 2500);
  }
  const showRestoreModal = ref(false);
  const loadingMessage = ref(randomMessage(loadingMessages));
  let loadingMsgInterval: ReturnType<typeof setInterval> | null = null;

  let timerInterval: ReturnType<typeof setInterval>;

  const hasCanvasExercises = computed(
    () =>
      !!sheet.value?.exercises?.some((pse) =>
        exerciseUsesCanvas(pse.exercise.type),
      ),
  );
  const isCanvasMode = computed(() => sheet.value?.test_style !== "keyboard");

  const currentExercise = computed(
    () => sheet.value?.exercises?.[currentIdx.value]?.exercise ?? null,
  );

  /**
   * The one exercise on screen. The rest stay in state, not in the DOM.
   *
   * A list of one rather than a single value: rendered through `v-for`, the
   * template gets a non-null binding, which `v-if` does not give the callbacks
   * inside it.
   */
  const visibleExercises = computed(() => {
    const current = sheet.value?.exercises?.[currentIdx.value];
    return current ? [current] : [];
  });

  const answeredFlags = computed(() =>
    (sheet.value?.exercises ?? []).map((item) => isAnswered(item.exercise.id)),
  );

  const coachMessage = ref("");
  const coachTone = ref<"neutral" | "good" | "retry">("neutral");
  // Repeating a message would not retrigger a watcher on the text alone.
  const coachBeat = ref(0);

  function say(message: string, tone: "neutral" | "good" | "retry" = "neutral") {
    coachMessage.value = message;
    coachTone.value = tone;
    coachBeat.value += 1;
  }



  /**
   * Moves to an exercise and saves what the student had written.
   *
   * Saving here rather than on a button is what the step-by-step layout buys:
   * every change of exercise is a natural checkpoint, so a reload never costs
   * more than the exercise in progress.
   */
  function goToExercise(index: number) {
    if (index < 0 || index >= totalCount.value) return;
    if (index === currentIdx.value) return;
    const target = sheet.value?.exercises?.[index];
    if (!target) return;
    saveDraft();
    setActiveExercise(target.exercise.id, index);
  }

  const answeredCount = computed(() => {
    return (
      sheet.value?.exercises?.filter((pse) => isAnswered(pse.exercise.id))
        .length ?? 0
    );
  });

  const totalCount = computed(() => sheet.value?.exercises?.length ?? 0);

  // Reacting to the count rather than to each input keeps the coach quiet while
  // the student types and gives it something to say the moment one is done.
  watch(answeredCount, (count, previous) => {
    if (count <= previous || !totalCount.value) return;
    if (count === totalCount.value) {
      say("¡Todas respondidas! Revisá cuando quieras.", "good");
      return;
    }
    if (count === totalCount.value - 1) {
      say("Queda una.");
      return;
    }
    say(`Van ${count} de ${totalCount.value}.`);
  });

  const progressPct = computed(() =>
    totalCount.value
      ? Math.round((answeredCount.value / totalCount.value) * 100)
      : 0,
  );

  const topicProgress = ref<TopicProgress[]>([]);

  const streakCount = computed(() => {
    const topicId = sheet.value?.topic_id;
    const match = topicId
      ? topicProgress.value.find((p) => p.topic_id === topicId)
      : undefined;
    if (match) return match.streak_days;
    return Math.max(...topicProgress.value.map((p) => p.streak_days), 0);
  });
  const studentInitial = computed(() => {
    const name = authStore.profile?.name?.trim() || "Estudiante";
    return name.charAt(0).toUpperCase();
  });

  /**
   * Handwritten statements, by exercise id.
   *
   * They are not part of the sheet payload — one drawing outweighed the whole
   * sheet — so they are fetched once the sheet is known and rendered from here.
   */
  const teacherImages = ref<Record<string, string>>({});

  function teacherImageFor(exercise?: { id?: string; question?: string; metadata?: string } | null) {
    if (!exercise?.id) return "";
    // The legacy reader still runs: a handful of exercises kept the drawing in
    // `question` before metadata existed.
    return teacherImages.value[exercise.id] || extractTeacherImageDataUrl(exercise as never);
  }

  async function loadTeacherImages() {
    const pending = (sheet.value?.exercises ?? [])
      .map((pse) => pse.exercise)
      .filter((exercise) => exercise?.has_teacher_image)
      .map(async (exercise) => {
        const dataUrl = await statementImageDataURL(exercise);
        if (dataUrl) teacherImages.value[exercise.id] = dataUrl;
      });
    await Promise.all(pending);
  }

  tuckAssistantFab(".practice-footer");

  onMounted(async () => {
    try {
      sheet.value = await loadPracticeSheet(sheetId);
      window.dispatchEvent(
        new CustomEvent("practiq:last-practice-changed", { detail: { id: sheetId } }),
      );
      loadTeacherImages();
      // Publish where the student starts. Nothing else does it now: the label
      // used to be published by the hover handler on every exercise card, and
      // showing one exercise at a time removed those.
      publishAssistantLabel();

      for (const pse of sheet.value.exercises ?? []) {
        answers.value[pse.exercise.id] = {
          answer: "",
          timeStart: Date.now(),
          hints: 0,
        };
        keyboardAnswers.value[pse.exercise.id] = "";
        timers.value[pse.exercise.id] = 0;
      }

      startTimer();
      loadTopicProgress();
      say(
        totalCount.value === 1
          ? "Un ejercicio. Tomate tu tiempo."
          : `Son ${totalCount.value} ejercicios. A tu ritmo.`,
      );

      // Fetch curiosities for loading screen
      if (sheet.value.course_id) {
        fetchCuriosities(sheet.value.course_id);
      }

      // Check for saved draft after canvases are initialized
      setTimeout(() => {
        checkForDraft();
      }, 500);
    } finally {
      loading.value = false;
    }
  });

  onUnmounted(() => {
    clearInterval(timerInterval);
    if (draftBadgeTimer) clearTimeout(draftBadgeTimer);
    if (loadingMsgInterval) clearInterval(loadingMsgInterval);
    if ((window as any).__practiqAssistantHookSource === "practice") {
      delete window.__practiqAssistantCapture;
      delete window.__practiqAssistantContext;
      delete window.__practiqAssistantMediaAttachments;
      delete (window as any).__practiqAssistantHookSource;
    }
  });

  function startTimer() {
    timerInterval = setInterval(() => {
      if (currentExercise.value) {
        timers.value[currentExercise.value.id] =
          (timers.value[currentExercise.value.id] ?? 0) + 1;
      }
    }, 1000);
  }

  function isAnswered(exerciseId: string) {
    const exercise = sheet.value?.exercises?.find(
      (pse) => pse.exercise.id === exerciseId,
    )?.exercise;
    // An uploaded file is an answer: without this the exercise stayed marked
    // as pending and the student got warned about unanswered work they had
    // already delivered.
    if (exercise?.type === "attachment") {
      return !!attachments.value[exerciseId];
    }
    if (exercise && exerciseUsesCanvas(exercise.type)) {
      return !!answers.value[exerciseId]?.answer;
    }
    return !!keyboardAnswers.value[exerciseId]?.trim();
  }

  function setActiveExercise(exerciseId: string, idx: number) {
    currentIdx.value = idx;
    // Clearing matters as much as setting: this only ever got assigned on
    // canvas exercises and was never reset, so after visiting a canvas one it
    // kept winning inside getAssistantExerciseId(). Selecting a text exercise
    // then showed "E3" while the assistant was handed E1.
    activeCanvasId.value = exerciseUsesCanvas(
      sheet.value?.exercises?.[idx]?.exercise.type || "",
    )
      ? exerciseId
      : "";
    publishAssistantLabel();
  }

  /**
   * The badge and the context the assistant receives must come from the same
   * resolver. They used to be computed independently — the label from the
   * clicked index, the context from getAssistantExerciseId() — and any
   * disagreement between them showed up as the assistant explaining a
   * different exercise than the one it named.
   */
  function publishAssistantLabel() {
    const index = getAssistantExerciseIndex(getAssistantExerciseId());
    window.dispatchEvent(
      new CustomEvent("practiq:assistant:active-context", {
        detail: { label: index >= 0 ? `E${index + 1}` : "" },
      }),
    );
  }

  // Types with their own answer widget are never drawn on, not even in a
  // canvas-style sheet. Without this the submit path treated a fill_blanks or
  // attachment answer as a drawing and sent an empty answer_text, discarding
  // what the student had already completed.
  const OWN_INPUT_TYPES = new Set([
    "multiple_choice",
    "fill_blanks",
    "attachment",
    "equation",
  ]);

  function exerciseUsesCanvas(exerciseType: string) {
    if (OWN_INPUT_TYPES.has(exerciseType)) return false;
    return (
      isCanvasMode.value ||
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

  function getPlaceholder(exerciseType: string) {
    switch (exerciseType) {
      case "equation":
        return "Escribe la ecuacion o resultado...";
      case "multiple_choice":
        return "Escribe la opcion correcta (A, B, C, D)...";
      default:
        return "Escribe tu respuesta aqui...";
    }
  }

  // Canvas

  function setCanvasRef(id: string, el: InstanceType<typeof DrawingCanvas> | null) {
    canvasRefs[id] = el;
  }

  function undoActive() {
    const id = activeCanvasId.value;
    if (!id) return;
    const canvas = canvasRefs[id];
    if (!canvas) return;
    canvas.undo();
  }

  function clearCanvas(id: string) {
    const canvas = canvasRefs[id];
    if (!canvas) return;
    canvas.clear();
    answers.value[id].answer = "";
  }

  function requestAssistantHelp() {
    window.dispatchEvent(new CustomEvent("practiq:assistant:prompt", {
      detail: { prompt: "Ayudame con el ejercicio actual. Dame una pista sin resolverlo." },
    }));
  }

  // Submit

  function getNextCuriosity(): string {
    if (curiosities.value.length > 0) {
      const msg = curiosities.value[curiosityIndex.value % curiosities.value.length];
      curiosityIndex.value++;
      return msg;
    }
    return randomMessage(loadingMessages);
  }

  async function submitAnswers() {
    if (uploadingAttachments.value.size > 0) {
      toast.add({
        severity: "warn",
        summary: "Esperá un momento",
        detail: "Todavía se está subiendo un archivo. Se enviaría sin él.",
        life: 3500,
      });
      return;
    }

    submitting.value = true;
    showSubmitConfirm.value = false;
    loadingMessage.value = getNextCuriosity();
    loadingMsgInterval = setInterval(() => {
      loadingMessage.value = getNextCuriosity();
    }, 3000);

    try {
      const attempts = await Promise.all(
        sheet.value?.exercises.map(async (pse) => {
          const exerciseId = pse.exercise.id;
          const data = answers.value[exerciseId];
          if (pse.exercise.type === "attachment") {
            const uploaded = attachments.value[exerciseId];
            return {
              exercise_id: exerciseId,
              answer_text: "",
              canvas_data: "",
              attachment_url: uploaded?.url ?? "",
              attachment_name: uploaded?.filename ?? "",
              attachment_content_type: uploaded?.content_type ?? "",
              time_spent_seconds: timers.value[exerciseId] || 0,
              hints_used: data?.hints || 0,
            };
          }
          if (exerciseUsesCanvas(pse.exercise.type)) {
            return {
              exercise_id: exerciseId,
              answer_text: "",
              canvas_data: data?.answer?.startsWith("data:image/")
                ? await buildCanvasDataForOCR(exerciseId)
                : "",
              time_spent_seconds: timers.value[exerciseId] || 0,
              hints_used: data?.hints || 0,
            };
          } else {
            return {
              exercise_id: exerciseId,
              answer_text: keyboardAnswers.value[exerciseId] || "",
              canvas_data: "",
              time_spent_seconds: timers.value[exerciseId] || 0,
              hints_used: data?.hints || 0,
            };
          }
        }) ?? [],
      );
      const start = await submitPracticeSheetAsync(sheetId, { attempts });
      const jobId = start.job_id;
      let jobDone = false;

      while (!jobDone) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const job = await loadSubmitJob(jobId);
        if (job.status === "processing") {
          continue;
        }
        if (job.status === "failed") {
          throw new Error(job.message || "No se pudo evaluar la práctica");
        }
        result.value = job.result?.data || null;
        jobDone = true;
      }

      if (!result.value) {
        throw new Error("No se recibió resultado de evaluación");
      }
      showSubmitConfirm.value = false;
      showAllErrors.value = false;
      showResults.value = true;
      loadTopicProgress();
      clearDraft();

      // A practice always comes back scored. Only when nothing at all could be
      // graded is there no result to react to — celebrating or commiserating on
      // a placeholder 0% would tell the student they failed work nobody read.
      if (!allUngraded.value) {
        if (result.value.score >= 70) {
          fireSuccess();
          playSound("correct");
        } else {
          playSound("incorrect");
        }
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

  async function loadTopicProgress() {
    const courseId = sheet.value?.course_id;
    if (!courseId) return;
    try {
      const res = await loadCourseProgress(courseId);
      topicProgress.value = res ?? [];
    } catch {
      topicProgress.value = [];
    }
  }

  // Draft Save/Restore

  function getDraftKey(): string {
    // Scoped to the account: with only the sheet id, two students sharing a
    // browser restored each other's draft — including the attachment metadata,
    // so the second one submitted the first one's upload URL.
    return `practiq-draft-${authStore.profile?.id ?? "anon"}-${sheetId}`;
  }

  function saveDraft() {
    if (!sheet.value) return;

    const draftData: Record<
      string,
      {
        canvasData: string;
        keyboardAnswer: string;
        // The uploaded file itself already lives in storage; keeping its
        // metadata is enough to restore the answer after a reload.
        attachment: UploadedFile | null;
        timestamp: number;
      }
    > = {};

    for (const pse of sheet.value.exercises || []) {
      const exerciseId = pse.exercise.id;
      draftData[exerciseId] = {
        canvasData: answers.value[exerciseId]?.answer || "",
        keyboardAnswer: keyboardAnswers.value[exerciseId] || "",
        attachment: attachments.value[exerciseId] ?? null,
        timestamp: Date.now(),
      };
    }

    localStorage.setItem(
      getDraftKey(),
      JSON.stringify({
        sheetId,
        data: draftData,
        // Where the student was. Restoring the answers but reopening at the
        // first exercise would make them hunt for the one they left.
        currentIdx: currentIdx.value,
        savedAt: Date.now(),
      }),
    );

    hasDraft.value = true;
    flashDraftSaved();
  }

  function checkForDraft() {
    const key = getDraftKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sheetId === sheetId && parsed.data) {
          // Check if draft is less than 24 hours old
          const hoursSinceSave =
            (Date.now() - parsed.savedAt) / (1000 * 60 * 60);
          if (hoursSinceSave < 24) {
            hasDraft.value = true;
            showRestoreModal.value = true;
            return parsed;
          } else {
            // Draft too old, remove it
            localStorage.removeItem(key);
          }
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
    return null;
  }

  function restoreDraft() {
    const key = getDraftKey();
    const saved = localStorage.getItem(key);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      const draftData = parsed.data;

      for (const exerciseId in draftData) {
        const draft = draftData[exerciseId];

        // Restore keyboard answers
        if (draft.keyboardAnswer) {
          keyboardAnswers.value[exerciseId] = draft.keyboardAnswer;
        }

        // Restore canvas data via v-model
        if (draft.canvasData) {
          answers.value[exerciseId] = {
            ...answers.value[exerciseId],
            answer: draft.canvasData,
          };
        }

        if (draft.attachment?.url) {
          setAttachment(exerciseId, draft.attachment);
        }
      }

      const savedIdx = Number(parsed.currentIdx);
      if (Number.isInteger(savedIdx) && savedIdx >= 0 && savedIdx < totalCount.value) {
        const target = sheet.value?.exercises?.[savedIdx];
        if (target) setActiveExercise(target.exercise.id, savedIdx);
      }

      showRestoreModal.value = false;
    } catch (err) {
      console.error("Failed to restore draft:", err);
    }
  }

  function discardDraft() {
    localStorage.removeItem(getDraftKey());
    hasDraft.value = false;
    showRestoreModal.value = false;
  }

  function clearDraft() {
    localStorage.removeItem(getDraftKey());
    hasDraft.value = false;
  }

  // Was a hand-rolled 1-bit threshold pass, but it never ran: it bailed on
  // `!sourceImg.complete`, which a freshly assigned data: URL always is, so
  // grading received the raw transparent canvas. Flattening on white is what
  // it was reaching for anyway, and the threshold itself only cost the model
  // the stroke detail it needs to read fractions and exponents.
  function buildCanvasDataForOCR(exerciseId: string) {
    return prepareHandwritingImage(answers.value[exerciseId]?.answer || "");
  }

  function getAssistantExerciseId() {
    // What the student currently has selected wins. The fallbacks below used
    // to come first, so "the first exercise with a drawing" (usually E1) beat
    // the actual selection and the assistant explained the wrong one.
    const selected = sheet.value?.exercises?.[currentIdx.value]?.exercise.id;
    if (selected) return selected;

    if (activeCanvasId.value) {
      return activeCanvasId.value;
    }

    return (
      Object.entries(answers.value).find(([, data]) =>
        data.answer?.startsWith("data:image/"),
      )?.[0] || ""
    );
  }

  function getAssistantExerciseIndex(exerciseId: string) {
    return (
      sheet.value?.exercises.findIndex(
        (pse) => pse.exercise.id === exerciseId,
      ) ?? -1
    );
  }

  function assistantMediaPath(exerciseId: string) {
    if (!sheet.value?.id || !exerciseId) return "";
    return `/practice-sheets/${encodeURIComponent(sheet.value.id)}/exercises/${encodeURIComponent(exerciseId)}/assistant-media`;
  }

  (window as any).__practiqAssistantHookSource = "practice";

  window.__practiqAssistantContext = () => {
    if (!sheet.value) return null;

    const activeExerciseId = getAssistantExerciseId();
    const activeExerciseIndex = getAssistantExerciseIndex(activeExerciseId);
    const activeExercise =
      activeExerciseIndex >= 0
        ? sheet.value.exercises[activeExerciseIndex]?.exercise
        : null;
    const activeTeacherImage = teacherImageFor(activeExercise);

    return {
      current_view: "student_practice",
      activity_type: "practice_sheet",
      sheet_id: sheet.value.id,
      sheet_title: sheet.value.title,
      level: sheet.value.level,
      response_mode: activeExercise?.type === "fill_blanks" ? "fill_blanks" : "canvas",
      exercise_count: sheet.value.exercises.length,
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
            student_answer: (() => {
              const canvasAnswer = answers.value[activeExercise.id]?.answer || "";
              if (canvasAnswer && !canvasAnswer.startsWith("data:image/")) return canvasAnswer;
              if (activeExercise.type === "fill_blanks") {
                return buildFillBlanksAssistantContext(
                  activeExercise,
                  keyboardAnswers.value[activeExercise.id] || "",
                ).blanks
                  .filter((blank) => blank.value)
                  .map((blank) => `Hueco ${blank.id}: ${blank.value}`)
                  .join(", ");
              }
              return keyboardAnswers.value[activeExercise.id] || "";
            })(),
            student_answer_raw:
              activeExercise.type === "fill_blanks"
                ? keyboardAnswers.value[activeExercise.id] || ""
                : "",
            puzzle:
              activeExercise.type === "fill_blanks"
                ? buildFillBlanksAssistantContext(
                    activeExercise,
                    keyboardAnswers.value[activeExercise.id] || "",
                  )
                : null,
            has_student_image: (answers.value[activeExercise.id]?.answer || "").startsWith("data:image/"),
            metadata_summary:
              activeExercise.type === "fill_blanks"
                ? ""
                : JSON.stringify(summarizeExerciseMetadata(activeExercise) || {}),
          }
        : null,
      exercise_list: sheet.value.exercises.map((pse, idx) => ({
        id: pse.exercise.id,
        number: idx + 1,
        type: pse.exercise.type,
        difficulty: pse.exercise.difficulty,
        question:
          pse.exercise.type === "handwritten" &&
          teacherImageFor(pse.exercise)
            ? "[consigna manuscrita en imagen adjunta]"
            : pse.exercise.question,
        has_teacher_image: !!teacherImageFor(pse.exercise),
        question_source:
          pse.exercise.type === "handwritten" &&
          teacherImageFor(pse.exercise)
            ? "teacher_image_attachment"
            : "text",
      })),
      answered_exercise_ids: Object.entries(answers.value)
        .filter(([, data]) => !!data.answer)
        .map(([exerciseId]) => exerciseId),
    };
  };

  window.__practiqAssistantCapture = async () => {
    const exerciseId = getAssistantExerciseId();
    if (!exerciseId) return null;
    const exerciseIndex = getAssistantExerciseIndex(exerciseId);
    const exercise =
      exerciseIndex >= 0
        ? sheet.value?.exercises?.[exerciseIndex]?.exercise
        : null;

    const studentDataUrl = await pickBestStudentImage([
      await buildCanvasDataForOCR(exerciseId),
      answers.value[exerciseId]?.answer,
    ]);
    // Awaited rather than read from teacherImages: the drawings are prefetched
    // on mount, but grading must not send a page without the statement just
    // because a student answered faster than the fetch finished.
    const teacherDataUrl =
      (await statementMediaPreviewDataURL(exercise, assistantMediaPath(exerciseId))) ||
      (await statementImageDataURL(exercise)) ||
      teacherImageFor(exercise);
    const dataUrl = await composeAssistantWorkImage({
      teacherDataUrl,
      studentDataUrl,
      teacherLabel: "Consigna del docente",
      studentLabel: "Respuesta del alumno",
    });

    if (!dataUrl) return null;

    return {
      dataUrl,
      filename: `practice-${exerciseId}.jpg`,
      contentType: dataUrl.startsWith("data:image/png")
        ? "image/png"
        : "image/jpeg",
    };
  };

  window.__practiqAssistantMediaAttachments = async () => {
    const exerciseId = getAssistantExerciseId();
    const exerciseIndex = getAssistantExerciseIndex(exerciseId);
    const exercise =
      exerciseIndex >= 0 ? sheet.value?.exercises[exerciseIndex]?.exercise : null;
    const [audio, document] = await Promise.all([
      statementMediaAudioAttachment(exercise, assistantMediaPath(exerciseId)),
      statementMediaDocumentAttachment(exercise, assistantMediaPath(exerciseId)),
    ]);
    // A statement carries one file, so at most one of these is ever set.
    return [audio, document].filter((item) => item !== null);
  };

  function closeSubmitConfirm() {
    if (submitting.value) return;
    showSubmitConfirm.value = false;
  }

  // Helpers

  function diffColor(d: number) {
    if (d <= 3) return "var(--color-success)";
    if (d <= 6) return "var(--color-warning)";
    return "var(--color-error)";
  }

  function scoreColor(score: number) {
    if (score >= 90) return "var(--color-success)";
    if (score >= 70) return "var(--color-warning)";
    return "var(--color-error)";
  }
</script>

<template>
  <StudentLayout>
    <div class="practice-shell">
      <!-- Header -->
      <header class="practice-header">
        <button
          class="btn-back"
          type="button"
          aria-label="Volver"
          @click="router.back()"
        >
          <i class="pi pi-arrow-left"></i>
        </button>
        <div v-if="loading" class="practice-header-info practice-header-info--skeleton" aria-hidden="true">
          <div class="level-badges">
            <Skeleton variant="badge" width="64px" height="26px" />
            <Skeleton variant="badge" width="70px" height="26px" />
          </div>
          <Skeleton width="min(360px, 72%)" height="24px" />
          <Skeleton width="min(460px, 90%)" height="14px" class="practice-subtitle-skeleton" />
        </div>
        <div v-else class="practice-header-info">
          <div class="level-badges">
            <div class="level-badge">Nivel {{ sheet?.level }}</div>
            <div
              v-if="sheet?.sheet_type === 'level_test'"
              class="level-test-badge"
            >
              <i class="pi pi-star"></i> Prueba de Nivel
            </div>
            <div
              v-if="sheet?.test_style === 'keyboard'"
              class="input-mode-badge"
            >
              <i class="pi pi-keyboard"></i> Teclado
            </div>
          </div>
          <h1 class="practice-title">{{ sheet?.title }}</h1>
          <span class="practice-subtitle">
            {{
              sheet?.sheet_type === "level_test"
                ? "Responde correctamente el 75% para avanzar al siguiente nivel"
                : "Resuelve los siguientes ejercicios a tu propio ritmo"
            }}
          </span>
        </div>
        <div v-if="loading" class="header-right header-right--skeleton" aria-hidden="true">
          <Skeleton width="88px" height="48px" class="streak-skeleton" />
          <Skeleton variant="avatar" size="46px" />
        </div>
        <div v-else class="header-right">
          <div
            class="streak-chip"
            :class="{ 'streak-chip--active': streakCount > 0 }"
            :aria-label="
              streakCount > 0
                ? `${streakCount} ${streakCount === 1 ? 'día' : 'días'} de racha`
                : 'Todavía no tenés racha'
            "
          >
            <img src="@/assets/burn.png" alt="" class="streak-icon" />
            <div class="streak-text">
              <template v-if="streakCount > 0">
                <div class="streak-val">{{ streakCount }}</div>
                <div class="streak-lbl">racha</div>
              </template>
              <div v-else class="streak-lbl streak-lbl--invite">
                Empezá tu racha
              </div>
            </div>
          </div>
          <div class="student-avatar">{{ studentInitial }}</div>
        </div>
        <div
          v-if="!loading"
          class="mobile-practice-progress"
          role="progressbar"
          aria-label="Progreso de ejercicios"
          :aria-valuenow="answeredCount"
          aria-valuemin="0"
          :aria-valuemax="totalCount"
          :aria-valuetext="`Ejercicio ${currentIdx + 1} de ${totalCount}; ${answeredCount} respondidos`"
        >
          <div
            class="mobile-practice-progress__fill"
            :style="{ width: progressPct + '%' }"
          ></div>
        </div>
        <Skeleton v-else width="100%" height="8px" class="mobile-practice-progress-skeleton" />
      </header>

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div class="practice-progress-bar">
          <div class="practice-progress-fill" style="width: 0%"></div>
        </div>
        <div class="exercises-list">
          <div v-for="n in 3" :key="n" class="ex-card ex-card--skeleton">
            <Skeleton
              variant="avatar"
              size="32px"
              :rounded="false"
              class="ex-num-skel"
            />
            <div class="ex-body ex-body--skeleton">
              <div class="ex-meta">
                <Skeleton variant="badge" width="90px" />
                <Skeleton width="50px" height="14px" />
              </div>
              <Skeleton width="100%" height="18px" />
              <Skeleton width="80%" height="16px" />
              <Skeleton width="100%" height="200px" class="canvas-skel" />
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="sheet">
        <!-- Progress bar -->
        <div class="practice-progress-bar">
          <div
            class="practice-progress-fill"
            :style="{ width: progressPct + '%' }"
          ></div>
        </div>
        <div class="practice-body">
          <!-- Exercises + footer -->
          <main class="practice-area">
            <!-- Canvas toolbar (only in canvas mode) -->
            <div v-if="hasCanvasExercises" class="draw-tools-bar">
              <button
                class="tool-btn"
                type="button"
                aria-label="Usar lápiz"
                :class="{ 'tool-btn--active': tool === 'pen', 'tool-btn--pen-active': tool === 'pen' }"
                :style="{ backgroundColor: penColor }"
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

            <!-- One exercise at a time; the stepper above jumps between them -->
            <ExerciseStepper
              class="practice-stepper"
              :total="totalCount"
              :current="currentIdx"
              :answered="answeredFlags"
              @select="goToExercise"
            />
            <span class="mobile-stepper-status">
              Ejercicio {{ currentIdx + 1 }} de {{ totalCount }}. {{ answeredCount }} respondidos.
            </span>

            <div class="exercises-list">
              <div
                v-for="pse in visibleExercises"
                :key="pse.id"
                class="ex-card"
                :class="{ 'ex-card--answered': isAnswered(pse.exercise.id) }"
              >
                <div
                  class="ex-num"
                  :class="{ 'ex-num--done': isAnswered(pse.exercise.id) }"
                >
                  {{ currentIdx + 1 }}
                </div>
                <div class="ex-body">
                  <div class="ex-meta">
                    <button
                      class="exercise-assistant-trigger"
                      type="button"
                      title="Pedir ayuda con este ejercicio"
                      @click.stop="requestAssistantHelp"
                    >
                      <i class="pi pi-question-circle" aria-hidden="true"></i>
                      Ayuda
                    </button>
                    <span
                      class="difficulty-pill"
                      :style="{
                        '--difficulty-color': diffColor(
                          pse.exercise.difficulty,
                        ),
                      }"
                    >
                      Dificultad {{ pse.exercise.difficulty }}
                    </span>
                    <span class="time-display">
                      <i class="pi pi-clock" aria-hidden="true"></i>
                      {{ formatDuration(timers[pse.exercise.id] || 0) }}
                    </span>
                    <span v-if="hints[pse.exercise.id]" class="hint-count">
                      <i class="pi pi-lightbulb" aria-hidden="true"></i>
                      {{ hints[pse.exercise.id] }} pista{{
                        hints[pse.exercise.id] > 1 ? "s" : ""
                      }}
                    </span>
                  </div>

                  <div
                    v-if="pse.exercise.type === 'equation'"
                    class="ex-question ex-question--math"
                    v-html="renderEquation(pse.exercise.question)"
                  ></div>
                  <div
                    v-else-if="
                      pse.exercise.type !== 'fill_blanks' &&
                      (pse.exercise.type !== 'handwritten' ||
                      !teacherImageFor(pse.exercise)
                      )
                    "
                    class="ex-question"
                  >
                    {{ pse.exercise.question }}
                  </div>
                  <img
                    v-if="teacherImageFor(pse.exercise)"
                    :src="teacherImageFor(pse.exercise)"
                    class="teacher-handwritten-image"
                    alt="Consigna manuscrita del profesor"
                  />
                  <ExerciseMedia :url="pse.exercise.media_view_url" />

                  <!-- Keyboard mode input -->
                  <div
                    v-if="pse.exercise.type === 'multiple_choice'"
                    class="choice-options"
                  >
                    <label
                      v-for="option in exerciseOptions(pse.exercise.metadata)"
                      :key="option"
                      class="choice-option"
                      :class="{
                        'choice-option--selected':
                          keyboardAnswers[pse.exercise.id] === option,
                      }"
                    >
                      <input
                        v-model="keyboardAnswers[pse.exercise.id]"
                        type="radio"
                        :name="`exercise-${pse.exercise.id}`"
                        :value="option"
                      />
                      <span>{{ option }}</span>
                    </label>
                    <textarea
                      v-if="exerciseOptions(pse.exercise.metadata).length === 0"
                      v-model="keyboardAnswers[pse.exercise.id]"
                      class="ex-textarea"
                      :placeholder="getPlaceholder(pse.exercise.type)"
                      rows="4"
                    ></textarea>
                  </div>

                  <!-- Fill in the blanks -->
                  <div
                    v-else-if="pse.exercise.type === 'fill_blanks'"
                    class="fill-blanks-wrap"
                  >
                    <FillBlanksAnswer
                      :exercise="pse.exercise"
                      :model-value="keyboardAnswers[pse.exercise.id] || ''"
                      @update:model-value="
                        (value) => (keyboardAnswers[pse.exercise.id] = value)
                      "
                    />
                  </div>

                  <!-- File / audio submission -->
                  <div
                    v-else-if="pse.exercise.type === 'attachment'"
                    class="attachment-answer-wrap"
                  >
                    <AttachmentAnswer
                      :exercise="pse.exercise"
                      :model-value="attachments[pse.exercise.id] ?? null"
                      @update:model-value="
                        (value) => setAttachment(pse.exercise.id, value)
                      "
                      @update:uploading="(v: boolean) => setUploading(pse.exercise.id, v)"
                    />
                  </div>

                  <!-- Equation answer mode -->
                  <div
                    v-else-if="pse.exercise.type === 'equation'"
                    class="equation-answer-wrap"
                  >
                    <MathFieldEditor
                      v-model="keyboardAnswers[pse.exercise.id]"
                      :show-latex-toggle="false"
                      :placeholder="getPlaceholder(pse.exercise.type)"
                      virtual-keyboard-mode="onfocus"
                    />
                  </div>

                  <!-- Keyboard mode input (text/open_text) -->
                  <div
                    v-else-if="!exerciseUsesCanvas(pse.exercise.type)"
                    class="keyboard-input-wrap"
                  >
                    <textarea
                      v-model="keyboardAnswers[pse.exercise.id]"
                      class="ex-textarea"
                      :placeholder="getPlaceholder(pse.exercise.type)"
                      rows="4"
                    ></textarea>
                  </div>

                  <!-- Canvas mode input -->
                  <div v-else class="canvas-wrap">
                    <div class="canvas-header">
                      <span class="canvas-label">Tu respuesta</span>
                      <button
                        class="btn-clear-canvas"
                        type="button"
                        @click="clearCanvas(pse.exercise.id)"
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
                            pse.exercise.id,
                            el as InstanceType<typeof DrawingCanvas> | null,
                          )
                      "
                      v-model="answers[pse.exercise.id].answer"
                      :height="240"
                      :tool="tool"
                      :pen-size="penSize"
                      :pen-color="penColor"
                                          />
                  </div>

                </div>
              </div>
            </div>

            <PractiCoach
              :message="coachMessage"
              :beat="coachBeat"
              :tone="coachTone"
            />

            <!-- Sticky footer -->
            <div class="practice-footer">
              <div class="footer-left">
                <span class="footer-hint"
                  >{{ totalCount - answeredCount }} sin responder</span
                >
                <Transition name="draft-badge">
                  <span v-if="showDraftSaved" class="draft-indicator">
                    <i class="pi pi-save"></i> Borrador guardado
                  </span>
                </Transition>
              </div>
              <div class="footer-nav">
                <button
                  v-if="currentIdx > 0"
                  class="btn-step"
                  type="button"
                  @click="goToExercise(currentIdx - 1)"
                >
                  <i class="pi pi-chevron-left"></i>
                  Anterior
                </button>
                <button
                  class="btn-step"
                  type="button"
                  :disabled="currentIdx >= totalCount - 1"
                  @click="goToExercise(currentIdx + 1)"
                >
                  Siguiente
                  <i class="pi pi-chevron-right"></i>
                </button>
              </div>
              <div class="footer-actions">
                <button
                  class="btn-submit"
                  :class="{ 'btn-submit--idle': answeredCount === 0 }"
                  @click="showSubmitConfirm = true"
                >
                  <i class="pi pi-send"></i>
                  {{
                    answeredCount === 0
                      ? "Revisar respuestas"
                      : answeredCount === 1
                        ? "Revisar 1 respuesta"
                        : `Revisar ${answeredCount} respuestas`
                  }}
                </button>
              </div>
            </div>
          </main>
        </div>
      </template>

      <!-- Restore draft modal -->
      <UiModal
        :visible="Boolean(showRestoreModal)"
        @close="showRestoreModal = false"
      >
        <template v-if="showRestoreModal">
          <div class="modal-box">
            <div class="modal-header">
              <h3 class="modal-title">
                <i class="pi pi-save"></i> Borrador encontrado
              </h3>
              <button
                type="button"
                class="modal-close"
                aria-label="Cerrar"
                @click="showRestoreModal = false"
              >
                <i class="pi pi-times"></i>
              </button>
            </div>
            <p class="submit-copy">
              Encontramos un borrador guardado de esta practica. ¿Deseas
              restaurar tu progreso anterior?
            </p>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="discardDraft">
                Descartar
              </button>
              <button class="btn btn-primary" @click="restoreDraft">
                <i class="pi pi-refresh"></i> Restaurar
              </button>
            </div>
          </div>
        </template>
      </UiModal>

      <!-- Submit confirm modal -->
      <UiModal
        :visible="Boolean(showSubmitConfirm)"
        @close="closeSubmitConfirm()"
      >
        <template v-if="showSubmitConfirm">
          <div class="modal-box submit-confirm-box">
            <button
              type="button"
              class="modal-close submit-confirm-close"
              aria-label="Cerrar"
              @click="closeSubmitConfirm()"
            >
              <i class="pi pi-times"></i>
            </button>
            <div class="practice-submit-header">
              <div class="practice-submit-badge practice-submit-badge--quiet">
                <i class="pi pi-send"></i>
                <span>Enviar práctica</span>
              </div>
              <h3 class="modal-title">Revisar y enviar</h3>
              <p class="submit-copy practice-submit-copy">
                Respondiste <strong>{{ answeredCount }}</strong> de
                <strong>{{ totalCount }}</strong> ejercicios.
              </p>
            </div>
            <div class="practice-submit-summary">
              <div class="practice-submit-summary-item">
                <span class="practice-submit-summary-value">
                  {{ answeredCount }}
                </span>
                <span class="practice-submit-summary-label">Listas</span>
              </div>
              <div class="practice-submit-summary-divider"></div>
              <div class="practice-submit-summary-item">
                <span class="practice-submit-summary-value">
                  {{ totalCount - answeredCount }}
                </span>
                <span class="practice-submit-summary-label">Faltan</span>
              </div>
            </div>
            <p class="practice-submit-question">
              ¿Deseas enviar tus respuestas para que IA las evalúe?
            </p>
            <div class="modal-actions">
              <button
                class="btn btn-secondary"
                :disabled="submitting || uploadingAttachments.size > 0"
                @click="closeSubmitConfirm()"
              >
                Cancelar
              </button>
              <button
                class="btn btn-primary"
                :disabled="submitting || uploadingAttachments.size > 0"
                @click="submitAnswers"
              >
                Enviar respuestas
              </button>
            </div>
          </div>
        </template>
      </UiModal>

      <AiLoadingModal
        :show="submitting"
        title="Revisando respuestas"
        :message="loadingMessage"
        footnote="No cierres esta ventana"
      />

      <!-- Results modal -->
      <UiModal
        :visible="Boolean(showResults && result)"
        @close="showResults = false"
      >
        <template v-if="showResults && result">
          <div class="modal-box results-box">
            <button
                type="button"
                class="modal-close results-close"
                aria-label="Cerrar"
                @click="showResults = false"
              >
                <i class="pi pi-times"></i>
              </button>
              <div class="results-header">
                <div
                  class="results-emoji"
                  :class="
                    allUngraded
                      ? 'results-emoji--sent'
                      : result.score >= 70
                        ? 'results-emoji--good'
                        : 'results-emoji--try'
                  "
                >
                  <i
                    class="pi"
                    :class="
                      allUngraded
                        ? 'pi-send'
                        : result.score >= 90
                          ? 'pi-trophy'
                          : result.score >= 70
                            ? 'pi-star-fill'
                            : 'pi-flag'
                    "
                    aria-hidden="true"
                  ></i>
                </div>
                <h3 class="results-title">
                  {{
                    allUngraded
                      ? "Práctica entregada"
                      : result.score >= 70
                        ? randomMessage(successMessages)
                        : randomMessage(encourageMessages)
                  }}
                </h3>
              </div>
              <div v-if="!allUngraded" class="results-stats">
                <div class="stat-card">
                  <div
                    class="stat-value"
                    :style="{ color: scoreColor(result.score) }"
                  >
                    {{ Math.round(result.score) }}%
                  </div>
                  <div class="stat-label">Puntaje</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">
                    {{ result.correct }}/{{ result.total }}
                  </div>
                  <div class="stat-label">Correctas</div>
                </div>
                <div class="stat-card">
                  <div
                    class="stat-value"
                    :style="{ color: scoreColor(result.mastery_score) }"
                  >
                    {{ Math.round(result.mastery_score) }}%
                  </div>
                  <div class="stat-label">Dominio</div>
                </div>
              </div>
              <div v-if="!allUngraded" class="results-recommendation">
                <div class="rec-icon">
                  <i
                    class="pi"
                    :class="result.should_repeat ? 'pi-replay' : 'pi-arrow-right'"
                    aria-hidden="true"
                  ></i>
                </div>
                <p>{{ result.recommendation }}</p>
              </div>

              <!-- A practice is never sent to the teacher: what the assistant
                   could not read is simply left out of the score. -->
              <div v-if="ungradedResults.length" class="ungraded-badge">
                <i class="pi pi-info-circle"></i>
                {{ ungradedResults.length === 1
                  ? "No pudimos corregir 1 respuesta automáticamente, así que no cuenta en tu puntaje."
                  : `No pudimos corregir ${ungradedResults.length} respuestas automáticamente, así que no cuentan en tu puntaje.` }}
              </div>

              <!-- Per-exercise feedback (only errors) -->
              <div v-if="incorrectResults.length === 0 && result.exercise_results?.length && !ungradedResults.length" class="all-correct-badge">
                <i class="pi pi-check-circle" aria-hidden="true"></i>
                ¡Todas las respuestas correctas!
              </div>

              <div v-else-if="incorrectResults.length > 0" class="exercise-results-section">
                <div class="exercise-results-list" :class="{ 'exercise-results-list--expanded': showAllErrors }">
                  <div
                    v-for="exResult in visibleErrors"
                    :key="exResult.exercise_id"
                    class="exercise-result-item exercise-result--incorrect"
                  >
                    <div class="exercise-result-icon">
                      <i class="pi pi-times-circle" aria-hidden="true"></i>
                    </div>
                    <div class="exercise-result-content">
                      <div class="exercise-result-answers">
                        <span class="answer-label">Tu respuesta:</span>
                        <span class="answer-student">{{ formatStudentAnswer(exResult.student_answer) }}</span>
                        <span class="answer-label">Correcta:</span>
                        <span class="answer-correct">{{ formatStudentAnswer(exResult.correct_answer) }}</span>
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

            <div class="modal-actions">
              <button class="btn btn-secondary" @click="router.back()">
                Volver al inicio
              </button>
              <button class="btn btn-primary" @click="showResults = false">
                Ver mis respuestas
              </button>
            </div>
          </div>
        </template>
      </UiModal>
    </div>
  </StudentLayout>
  <ConfirmModal
    v-bind="leaveConfirmState"
    @confirm="onLeaveConfirm"
    @cancel="onLeaveCancel"
  />
</template>

<style scoped>
  .practice-shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 20px 80px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: transparent;
  }

  /* Header */
  .practice-header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 20px 24px;
    background: var(--elevation-tint-bg);
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

  .practice-header-info {
    flex: 1;
  }
  .practice-header-info--skeleton {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
  }
  .practice-subtitle-skeleton { display: block; }

  .level-badges {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }

  .level-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 12px;
    border-radius: var(--radius-2xl);
    background: var(--gradient-brand);
    color: var(--color-on-primary);
    font-size: 0.75rem;
    font-weight: 700;
  }

  .level-test-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 12px;
    border-radius: var(--radius-2xl);
    background: linear-gradient(
      135deg,
      var(--color-warning),
      var(--color-warning-strong)
    );
    color: var(--color-on-primary);
    font-size: 0.75rem;
    font-weight: 700;
  }

  .input-mode-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 12px;
    border-radius: var(--radius-2xl);
    background: rgba(var(--practiq-violet-rgb), 0.15);
    color: var(--practiq-violet);
    font-size: 0.75rem;
    font-weight: 700;
  }

  .practice-title {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 4px;
  }

  .practice-subtitle {
    font-size: 0.82rem;
    color: var(--text-secondary);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .header-right--skeleton { pointer-events: none; }
  .streak-skeleton { border-radius: var(--radius-lg); }

  /* Same identity anchor as the student avatar in the sidebar. Without this
     base style the header rendered only its initial as plain text on desktop. */
  .student-avatar {
    width: 46px;
    height: 46px;
    border-radius: var(--radius-xl);
    background: var(--gradient-brand);
    color: var(--color-on-primary);
    display: grid;
    place-items: center;
    font-weight: 800;
    box-shadow: var(--shadow-indigo);
    flex-shrink: 0;
  }

  .streak-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: var(--radius-lg);
    background: var(--gradient-brand-soft);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
    transition: all 0.3s ease;
  }

  .streak-chip--active {
    background: linear-gradient(135deg, #ff6b35, #f7931e);
    border-color: rgba(255, 107, 53, 0.3);
    box-shadow: none;
    animation: none;
  }

  .streak-chip--active .streak-val {
    color: white;
    font-size: 1.15rem;
  }

  .streak-chip--active .streak-lbl {
    color: rgba(255, 255, 255, 0.85);
  }

  .streak-chip--active .streak-icon {
    animation: flame-dance 0.5s ease-in-out infinite alternate;
  }

  @keyframes flame-dance {
    from { transform: scale(1) rotate(-2deg); }
    to { transform: scale(1.06) rotate(2deg); }
  }

  .streak-icon {
    width: 22px;
    height: 22px;
    object-fit: contain;
    flex-shrink: 0;
    /* ponytail: transform-origin bottom so el fuego "crece" desde la base */
    transform-origin: 50% 100%;
  }

  .streak-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    line-height: 1;
  }

  .streak-val {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1;
  }

  .streak-lbl {
    font-size: 0.7rem;
    line-height: 1;
    color: var(--text-secondary);
  }

  /* Progress */
  .practice-progress-bar {
    height: 6px;
    background: var(--fill-primary-soft);
    border-radius: 99px;
    overflow: hidden;
  }
  .practice-progress-fill {
    height: 100%;
    background: var(--gradient-brand);
    border-radius: 99px;
    transition: width 0.3s ease;
  }

  .mobile-practice-progress,
  .mobile-practice-progress-skeleton,
  .mobile-stepper-status {
    display: none;
  }

  /* Skeleton styles */
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

  /* Body layout */
  .practice-body {
    display: block;
  }

  .practice-area {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 24px;
  }

  /* Canvas toolbar */
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
    width: 30px;
    height: 30px;
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

  /* Exercise cards */
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

  .ex-num--done {
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

  .ex-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .difficulty-pill {
    padding: 3px 8px;
    border-radius: var(--radius-pill);
    background: color-mix(
      in srgb,
      var(--difficulty-color) 12%,
      var(--surface-card)
    );
    color: var(--difficulty-color);
    font-size: 0.75rem;
    font-weight: 700;
  }

  .time-display {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .hint-count {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
    color: var(--color-warning-dark);
  }

  .ex-question {
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.5;
  }

  .ex-question--math {
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: var(--surface-bg-soft);
    border: 1px solid rgba(var(--practiq-violet-rgb), 0.12);
    /* Display math does not wrap. A formula wider than the phone scrolls
       inside its own box instead of being cut off at the screen edge. */
    overflow-x: auto;
  }

  .teacher-handwritten-image {
    width: 100%;
    max-height: 280px;
    object-fit: contain;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    border-radius: var(--radius-md);
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
  }

  .ex-input {
    padding: 10px 14px 10px 62px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    font-size: 1rem;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.15s;
    min-height: 96px;
    background-color: var(--surface-bg-soft);
    background-image:
      linear-gradient(
        to right,
        rgba(var(--color-error-rgb), 0.25) 1.5px,
        transparent 1.5px
      ),
      repeating-linear-gradient(
        to bottom,
        transparent,
        transparent 31px,
        rgba(var(--practiq-violet-rgb), 0.1) 31px,
        rgba(var(--practiq-violet-rgb), 0.1) 32px
      );
    background-size: 56px 32px;
    background-position: 0 0;
    line-height: 32px;
    box-shadow: var(--shadow-card);
  }
  .ex-input:focus {
    border-color: var(--practiq-violet);
  }

  /* Equation answer input */
  .equation-answer-wrap {
    width: 100%;
  }
  .equation-answer-wrap :deep(.math-field-editor) {
    min-height: 48px;
    padding: 10px 14px;
    font-size: 1.1rem;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    background: var(--surface-card);
  }
  .equation-answer-wrap :deep(.math-field-editor:focus-within) {
    border-color: var(--practiq-violet);
    box-shadow: 0 0 0 3px rgba(var(--practiq-violet-rgb), 0.12);
  }

  /* Keyboard input textarea */
  .keyboard-input-wrap {
    width: 100%;
  }

  .ex-textarea {
    width: 100%;
    padding: 14px 16px 14px 62px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    font-size: 1rem;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.15s;
    min-height: 120px;
    background-color: var(--surface-bg-soft);
    background-image:
      linear-gradient(
        to right,
        rgba(var(--color-error-rgb), 0.25) 1.5px,
        transparent 1.5px
      ),
      repeating-linear-gradient(
        to bottom,
        transparent,
        transparent 31px,
        rgba(var(--practiq-violet-rgb), 0.1) 31px,
        rgba(var(--practiq-violet-rgb), 0.1) 32px
      );
    background-size: 56px 32px;
    background-position: 0 0;
    line-height: 32px;
    box-shadow: var(--shadow-card);
    resize: vertical;
    font-family: inherit;
  }
  .ex-textarea:focus {
    border-color: var(--practiq-violet);
  }

  .choice-options {
    display: grid;
    gap: 10px;
  }

  .choice-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.14);
    border-radius: var(--radius-md);
    background: var(--surface-bg-soft);
    color: var(--text-primary);
    font-size: 1rem;
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
    height: 240px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
    display: block;
    touch-action: none;
    cursor: crosshair;
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

  /* Sticky footer */
  .practice-footer {
    /* Three tracks rather than space-between: the side columns share the
       leftover width, so the navigation sits in the middle of the bar and does
       not drift as the hint text changes length. */
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    /* Opaco a propósito: es sticky y el contenido pasa por atrás; con el 92%
       de --surface-elevated-strong los textos se leían a través de la barra. */
    background: rgb(var(--surface-card-rgb));
    border-radius: var(--radius-xl);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
    position: sticky;
    bottom: 16px;
    box-shadow: var(--shadow-card-lg);
    z-index: 3;
    scroll-margin-bottom: 24px;
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .footer-hint {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .draft-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: rgba(var(--color-success-rgb), 0.12);
    color: var(--color-success-dark);
    border-radius: var(--radius-pill);
    font-size: 0.78rem;
    font-weight: 600;
  }
  .draft-badge-enter-active,
  .draft-badge-leave-active {
    transition:
      opacity 0.18s ease,
      transform 0.18s ease;
  }
  .draft-badge-enter-from,
  .draft-badge-leave-to {
    opacity: 0;
    transform: translateY(3px);
  }
  @media (prefers-reduced-motion: reduce) {
    .draft-badge-enter-active,
    .draft-badge-leave-active {
      transition: none;
    }
  }

  .footer-nav {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
  }

  .footer-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: flex-end;
  }

  .btn-step {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border-radius: var(--radius-md);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
    background: var(--surface-elevated-strong);
    color: var(--practiq-violet);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-step:hover:not(:disabled) {
    background: var(--fill-primary-faint);
    border-color: rgba(var(--practiq-violet-rgb), 0.35);
  }
  .btn-step:disabled {
    opacity: 0.45;
    cursor: not-allowed;
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
    font-weight: 800;
    font-size: 0.95rem;
    cursor: pointer;
    box-shadow: var(--shadow-indigo);
    transition: opacity 0.15s;
  }
  .btn-submit:hover {
    opacity: 0.9;
  }

  /* Modals */
  .submit-copy {
    color: var(--text-secondary);
    font-size: 0.88rem;
    margin-bottom: 20px;
  }

  .submit-confirm-box {
    position: relative;
  }

  .submit-confirm-close {
    position: absolute;
    top: 16px;
    right: 16px;
  }

  .practice-submit-header {
    display: grid;
    gap: 10px;
    justify-items: start;
  }

  .practice-submit-copy {
    margin-bottom: 0;
    max-width: 42ch;
  }

  .practice-submit-summary {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: var(--radius-xl);
    background: var(--surface-bg-soft);
    border: 1px solid rgba(var(--practiq-violet-rgb), 0.1);
  }

  .practice-submit-summary-item {
    display: grid;
    gap: 2px;
    text-align: center;
  }

  .practice-submit-summary-value {
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1;
  }

  .practice-submit-summary-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 700;
  }

  .practice-submit-summary-divider {
    width: 1px;
    height: 38px;
    background: rgba(var(--practiq-violet-rgb), 0.14);
  }

  .practice-submit-question {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.92rem;
  }

  .results-box {
    position: relative;
    max-width: 520px;
  }

  .results-close {
    position: absolute;
    top: 16px;
    right: 16px;
  }

  /* Two full-width stacked buttons ate most of the screen on a small phone,
     pushing "Ver mis respuestas" below the fold on a modal that already has
     no other way to dismiss it. Side by side fits both in one row instead. */
  @media (max-width: 480px) {
    .results-box .modal-actions {
      flex-direction: row;
    }
    .results-box .modal-actions > * {
      width: auto;
      flex: 1;
    }
  }

  .results-header {
    text-align: center;
    margin-bottom: 16px;
  }
  /* An emoji arrived with its own colour; an icon inherits one, so the meaning
     that was in the picture now has to be in the palette. */
  .results-emoji {
    font-size: 38px;
    line-height: 1;
    margin-bottom: 10px;
  }
  .results-emoji--good {
    color: var(--color-warning);
  }
  .results-emoji--try {
    color: var(--practiq-violet);
  }
  .results-emoji--sent {
    color: var(--text-secondary);
  }
  .results-title {
    font-size: 1.4rem;
  }

  .results-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat-card {
    background: var(--gradient-brand-soft);
    border-radius: var(--radius-xl);
    padding: 16px 12px;
    text-align: center;
  }
  .stat-value {
    font-size: 1.7rem;
    font-weight: 800;
  }
  .stat-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .results-recommendation {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 14px;
    border-radius: var(--radius-xl);
    background: var(--surface-subtle);
  }
  .rec-icon {
    font-size: 20px;
    line-height: 1;
    color: var(--practiq-violet);
  }

  .results-ai-feedback {
    margin-top: 10px;
    padding: 12px 14px;
    border-radius: var(--radius-lg);
    background: var(--fill-primary-subtle);
    color: var(--practiq-violet-dark);
    font-size: 0.9rem;
  }

  /* Exercise results */
  .ungraded-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
    padding: 14px 16px;
    border-radius: var(--radius-lg, 14px);
    background: var(--color-warning-bg, rgba(245, 158, 11, 0.12));
    color: var(--text-primary);
    font-weight: 600;
  }
  .all-correct-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 14px 16px;
    border-radius: var(--radius-lg);
    background: var(--fill-success-subtle);
    color: var(--color-success-dark, #166534);
    font-weight: 600;
    text-align: center;
  }

  .exercise-results-section {
    margin-top: 12px;
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
    font-size: 1.15rem;
    line-height: 1;
    flex-shrink: 0;
    color: var(--color-error);
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

  /* Responsive */
  @media (max-width: 1180px) {
    .practice-shell {
      padding: 18px 14px 90px;
    }
  }

  /* Assistant rail is an overlay. Keep practice on left side of freed
     sidebar space instead of centering it beneath chat. */
  @media (min-width: 921px) {
    :global(.practiq-assistant-focus-target--open .practice-shell) {
      width: calc(100% - var(--practiq-assistant-rail));
      max-width: calc(100% - var(--practiq-assistant-rail));
      margin-left: 0;
      margin-right: auto;
    }
  }

  @media (max-width: 680px) {
    .practice-shell {
      padding: 16px 10px 80px;
    }
    .practice-header {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr) 44px;
      grid-template-rows: 44px 8px;
      padding: 10px 12px 12px;
      gap: 10px 8px;
      align-items: center;
      border-radius: var(--radius-lg);
    }
    .practice-header-info { display: contents; }
    .practice-header-info--skeleton {
      display: contents;
    }
    .btn-back { grid-column: 1; grid-row: 1; margin: 0; }
    .practice-title,
    .practice-subtitle { display: none; }
    .student-avatar { display: none; }
    .header-right { grid-column: 3; grid-row: 1; justify-content: center; }
    .header-right--skeleton :deep(.skeleton),
    .header-right--skeleton :deep(.skeleton-wrapper) { display: none; }
    .level-badges {
      grid-column: 2;
      grid-row: 1;
      justify-content: center;
      margin: 0;
    }
    .practice-header-info--skeleton .level-badges { display: flex; }
    .practice-header-info--skeleton > :not(.level-badges) { display: none; }
    .level-test-badge,
    .input-mode-badge { display: none; }
    .level-badge {
      padding: 6px 12px;
      font-size: .78rem;
      line-height: 1;
      white-space: nowrap;
    }
    .streak-chip {
      position: relative;
      width: 44px;
      height: 44px;
      justify-content: center;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      box-shadow: none;
    }
    .mobile-practice-progress-skeleton {
      display: block;
      grid-column: 1 / -1;
      grid-row: 2;
      border-radius: var(--radius-pill);
    }
    .streak-icon {
      width: 29px;
      height: 29px;
    }
    .streak-text {
      position: absolute;
      right: 0;
      bottom: 0;
    }
    .streak-val,
    .streak-lbl--invite::after {
      display: grid;
      place-items: center;
      min-width: 18px;
      height: 18px;
      padding: 0 3px;
      border: 2px solid var(--surface-card);
      border-radius: 50%;
      background: var(--practiq-violet);
      color: var(--color-on-primary);
      font-size: .62rem;
      font-weight: 800;
      line-height: 1;
    }
    .streak-chip--active .streak-val { font-size: .62rem; }
    .streak-lbl { display: none; }
    .streak-lbl--invite::after {
      content: "0";
    }
    .mobile-practice-progress {
      display: block;
      grid-column: 1 / -1;
      grid-row: 2;
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--fill-primary-soft);
    }
    .mobile-practice-progress__fill {
      height: 100%;
      border-radius: inherit;
      background: #8edb32;
      transition: width .3s ease;
    }
    :deep(.practice-stepper) {
      display: none;
    }
    .mobile-stepper-status {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Puntaje/Correctas/Dominio se piden en una sola fila incluso en mobile
       (antes se apilaban acá). El texto es corto, entra sin recorte. */
    .results-stats {
      gap: 8px;
    }
    .stat-card {
      padding: 12px 8px;
    }
    .stat-value {
      font-size: 1.35rem;
    }
    .stat-label {
      font-size: 0.68rem;
    }

    /* El número en columna propia comía ~48px de ancho útil. En mobile queda
       en la misma fila que los badges y el resto del ejercicio va full width.
       ponytail: grid + display:contents en vez de duplicar markup. */
    .ex-card {
      padding: 14px 12px;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      align-items: center;
    }

    .ex-card > .ex-body {
      display: contents;
    }

    .ex-card > .ex-body > :not(.ex-meta) {
      grid-column: 1 / -1;
    }

    .ex-num {
      width: 28px;
      height: 28px;
      font-size: 0.82rem;
    }

    .ex-canvas {
      height: 320px;
    }

    .practice-footer {
      /* Fixed, not sticky: a short exercise must still leave the actions at
         the bottom of the viewport instead of immediately below its card. */
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      grid-template-columns: 1fr;
      gap: 12px;
      align-items: stretch;
      padding: 12px 16px;
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      border-bottom: 0;
      padding-bottom: max(12px, env(safe-area-inset-bottom));
      z-index: 20;
    }

    /* The fixed footer may grow when the draft indicator is visible. Reserve
       the larger state so an exercise never disappears under its actions. */
    .practice-area {
      padding-bottom: calc(190px + env(safe-area-inset-bottom));
    }

    .draw-tools-bar {
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding: 10px 12px;
    }

    .draw-tools-bar > * {
      flex-shrink: 0;
    }


    /* The three 44px tool buttons plus the palette trigger already fill most
       of a 375px screen; a full-width slider pushed the "3px" readout off
       the edge, so both were the ones actually reachable only by swiping. */
    .draw-tools-bar .size-slider {
      width: 54px;
    }

    .tool-btn {
      width: 40px;
      height: 40px;
    }

    .draw-tools-bar .size-val {
      min-width: 26px;
    }

    .footer-hint { display: none; }
    .footer-left:not(:has(.draft-indicator)) { display: none; }
    .footer-left { width: 100%; justify-content: flex-end; }

    .footer-nav,
    .footer-actions {
      width: 100%;
      gap: 8px;
    }

    .footer-actions .btn-submit {
      flex: 1;
    }

    .btn-step {
      flex: 1;
      padding: 12px 16px;
      justify-content: center;
      font-size: 0.875rem;
    }

    .btn-submit {
      flex: 1;
      padding: 12px 20px;
      justify-content: center;
      font-size: 0.9rem;
    }

    /* Tap targets >= 44px en mobile */
    .btn-step,
    .btn-submit {
      min-height: 50px;
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

    .choice-option {
      min-height: 52px;
      padding: 12px 14px;
    }

    .choice-option input {
      width: 22px;
      height: 22px;
    }
  }
  /* Sits in a row of badges, so without an icon and a solid fill it read as
     one more label rather than the way into Practi from the exercise. */
  .exercise-assistant-trigger {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: auto;
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 4px 11px;
    background: var(--practiq-violet);
    color: #fff;
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.4;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
  }

  .exercise-assistant-trigger:hover {
    background: color-mix(in srgb, var(--practiq-violet) 88%, #000);
  }

  .exercise-assistant-trigger:active {
    transform: translateY(1px);
  }

  .streak-lbl--invite {
    line-height: 1.15;
    max-width: 68px;
  }
  /* Nothing to review yet: the button stays reachable but stops shouting for an
     action the student cannot take. */
  .btn-submit--idle {
    background: var(--surface-hover);
    color: var(--text-secondary);
    box-shadow: none;
  }

  .streak-lbl--invite {
    line-height: 1.15;
    max-width: 68px;
  }
  /* Nothing to review yet: the button stays reachable but stops shouting for an
     action the student cannot take. */
  .btn-submit--idle {
    background: var(--surface-hover);
    color: var(--text-secondary);
    box-shadow: none;
  }
  /* Changing exercise replaces the card's DOM node, so this replays on every
     move and the swap reads as a step rather than a flicker. */
  .ex-card:not(.ex-card--skeleton) {
    animation: ex-card-in 0.26s ease both;
  }
  @keyframes ex-card-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ex-card:not(.ex-card--skeleton) {
      animation: none;
    }
  }
</style>
