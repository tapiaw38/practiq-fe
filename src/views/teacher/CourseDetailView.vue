<script setup lang="ts">
  import UiModal from "@/components/ui/UiModal.vue";
  import {
    computed,
    ref,
    reactive,
    onMounted,
    watch,
    nextTick,
    defineAsyncComponent,
  } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useToast } from "primevue/usetoast";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import ConfirmModal from "@/components/ui/ConfirmModal.vue";
  import FileUploadField from "@/components/ui/FileUploadField.vue";
  import ExercisesList from "@/components/teacher/exercises/ExercisesList.vue";
  import CourseLevelsPanel from "@/components/teacher/levels/CourseLevelsPanel.vue";
  import MaterialsList from "@/components/teacher/materials/MaterialsList.vue";
  import NotebooksList from "@/components/teacher/notebooks/NotebooksList.vue";
  import PracticeSheetsList from "@/components/teacher/practiceSheets/PracticeSheetsList.vue";
  import StudentsList from "@/components/teacher/students/StudentsList.vue";
  import TopicModal from "@/components/teacher/topics/TopicModal.vue";
  import TopicsList from "@/components/teacher/topics/TopicsList.vue";
  import { useConfirm } from "@/composables/useConfirm";
  import { useCourse } from "@/composables/useCourse";
  import { useTopic } from "@/composables/useTopic";
  import { useExercise } from "@/composables/useExercise";
  import { usePracticeSheet } from "@/composables/usePracticeSheet";
  import { useMaterial } from "@/composables/useMaterial";
  import { useNotebook } from "@/composables/useNotebook";
  import { useLevel } from "@/composables/useLevel";
  import type {
    Topic,
    AttachmentKind,
    Exercise,
    Material,
    PracticeSheet,
    Notebook,
    CourseLevelsResponse,
  } from "@/types";
  import { parseExerciseMetadata } from "@/utils/assistantExerciseContext";
  import {
    statementImageDataURL,
    forgetStatementImage,
  } from "@/utils/statementImage";
  import { ATTACHMENT_KINDS, acceptedKinds } from "@/utils/attachments";
  import {
    buildCorrectAnswer,
    buildOptions,
    pruneFillBlanks,
    parseFillBlanksConfig,
    validateFillBlanks,
    type FillBlanksConfig,
  } from "@/utils/fillBlanks";
  import FillBlanksEditor from "@/components/teacher/exercises/FillBlanksEditor.vue";
  import { renderContent } from "@/composables/useContentRenderer";
  import { practiqApi } from "@/api/request/server";
  import { STATEMENT_MEDIA_ACCEPT } from "@/utils/fileKind";
  import { ExerciseService } from "@/services/exercises/exerciseService";

  // mathlive is ~200kB gzipped and only needed for equation exercises, so it
  // loads on demand instead of riding along on every course page.
  const MathFieldEditor = defineAsyncComponent(
    () => import("@/components/ui/MathFieldEditor.vue"),
  );

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();
  const courseId = route.params.id as string;
  const { confirmState, showConfirm, onConfirm, onCancel } = useConfirm();
  const {
    currentCourse: course,
    students,
    loadCourse,
    loadStudents,
    setCourseStatus,
  } = useCourse();

  type CourseStatus = "draft" | "published" | "archived";

  const savingStatus = ref("");
  const statusError = ref("");

  // What each state means for a student, stated where the teacher chooses it.
  // The label alone does not say whether anyone can see the course.
  const STATUS_OPTIONS: {
    value: CourseStatus;
    label: string;
    hint: string;
    icon: string;
  }[] = [
    { value: "draft", label: "Borrador", hint: "Solo vos. Los alumnos no lo ven.", icon: "pi-pencil" },
    { value: "published", label: "Publicado", hint: "Visible, y se puede entregar.", icon: "pi-check-circle" },
    { value: "archived", label: "Archivado", hint: "Los matriculados leen; nadie entrega ni se suma.", icon: "pi-inbox" },
  ];

  const STATUS_LABELS: Record<string, string> = Object.fromEntries(
    STATUS_OPTIONS.map((option) => [option.value, option.label]),
  );
  function statusLabel(status: string) {
    return STATUS_LABELS[status] ?? status;
  }

  const pendingArchive = ref(false);

  /**
   * Moves the course through its lifecycle.
   *
   * Archiving is not destructive — students who took it keep reading their
   * work and their marks — but it does stop new submissions, so it says so
   * before doing it.
   */
  async function chooseStatus(next: CourseStatus) {
    if (!course.value || savingStatus.value) return;
    if (next === course.value.status) {
      pendingArchive.value = false;
      return;
    }
    // Asked inline rather than through window.confirm: a browser dialog steals
    // the page and says nothing about what archiving actually does.
    if (next === "archived" && !pendingArchive.value) {
      pendingArchive.value = true;
      return;
    }
    pendingArchive.value = false;
    statusError.value = "";
    savingStatus.value = next;
    try {
      await setCourseStatus(course.value.id, next);
    } catch {
      statusError.value = "No pudimos cambiar el estado. Probá de nuevo.";
    } finally {
      savingStatus.value = "";
    }
  }
  const {
    topics,
    loadTopics,
    createTopic: createTopicService,
    updateTopic: updateTopicService,
    deleteTopic: deleteTopicService,
  } = useTopic();
  const {
    exercises,
    loadExercises,
    createExercise: createExerciseService,
    updateExercise: updateExerciseService,
    deleteExercise: deleteExerciseService,
  } = useExercise();
  const {
    practiceSheets,
    currentPage: sheetsPage,
    pageSize: sheetsPageSize,
    hasMore: sheetsHasMore,
    loadPracticeSheets,
    loadPracticeSheet,
    loadPage: loadSheetsPage,
    nextPage: nextSheetsPage,
    prevPage: prevSheetsPage,
    createPracticeSheet,
    updatePracticeSheet,
    deletePracticeSheet: deletePracticeSheetService,
  } = usePracticeSheet();
  const {
    loadMaterials,
    loadMaterial,
    createMaterial: createMaterialService,
    updateMaterial: updateMaterialService,
    deleteMaterial: deleteMaterialService,
  } = useMaterial();
  const {
    loadNotebooks,
    createNotebook: createNotebookService,
    updateNotebook: updateNotebookService,
    deleteNotebook: deleteNotebookService,
  } = useNotebook();
  const { loadCourseLevels } = useLevel();
  const materials = ref<Material[]>([]);
  const notebooks = ref<Notebook[]>([]);
  const courseLevels = ref<CourseLevelsResponse | null>(null);
  const selectedTopicId = ref("");
  const sheetExercises = ref<Exercise[]>([]);

  const activeTab = ref("levels");
  const tabsElement = ref<HTMLElement | null>(null);
  const tabs = [
    { id: "levels", label: "Niveles", icon: "pi pi-sitemap" },
    { id: "topics", label: "Temas", icon: "pi pi-list" },
    { id: "exercises", label: "Ejercicios", icon: "pi pi-pencil" },
    { id: "materials", label: "Materiales", icon: "pi pi-file" },
    { id: "students", label: "Alumnos", icon: "pi pi-users" },
    { id: "sheets", label: "Hojas de Práctica", icon: "pi pi-copy" },
    { id: "notebooks", label: "Cuadernos", icon: "pi pi-book" },
  ];

  function focusTab(index: number) {
    const tab = tabs[(index + tabs.length) % tabs.length];
    activeTab.value = tab.id;
    document.getElementById(`tab-${tab.id}`)?.focus();
  }

  function revealActiveTab() {
    const tabsRoot = tabsElement.value;
    const selected = tabsRoot?.querySelector<HTMLElement>(".tab-active");
    if (!tabsRoot || !selected || window.innerWidth > 600) return;
    tabsRoot.scrollTo({ left: Math.max(0, selected.offsetLeft - 8), behavior: "smooth" });
  }

  watch(activeTab, () => nextTick(revealActiveTab));

  const showTopicModal = ref(false);
  const showExerciseModal = ref(false);
  const showMaterialModal = ref(false);
  const showSheetModal = ref(false);
  const showNotebookModal = ref(false);
  const showEditSheetModal = ref(false);
  const showEditNotebookModal = ref(false);
  const showEditExerciseModal = ref(false);

  // Inline topic edit state
  const editingTopicId = ref<string | null>(null);
  const editTopicTitle = ref("");

  // Edit sheet state
  const editingSheetId = ref<string | null>(null);
  const editSheet = reactive({
    title: "",
    topic_id: "",
    level: 1,
    sheet_type: "practice",
    test_style: "keyboard",
    scheduled_at: "",
    available_until: "",
    // null, not 0: an empty number input reads as null, and the API takes
    // null to mean "no limit".
    max_attempts: null as number | null,
    time_limit_minutes: null as number | null,
    exercise_ids: [] as string[],
  });
  const editSheetExercises = ref<Exercise[]>([]);

  // Edit notebook state
  const editingNotebookId = ref<string | null>(null);
  const editNotebook = reactive({ title: "", description: "", topic_id: "" });

  // Edit exercise state
  const editingExerciseId = ref<string | null>(null);
  const editExercise = reactive({
    question: "",
    type: "open_text" as Exercise["type"],
    correct_answer: "",
    explanation: "",
    difficulty: 1,
    metadata: "{}",
    teacher_image: "",
    // Image/audio/video shown with the statement, for any exercise type.
    media_url: "",
    options: ["", "", "", ""],
    // Attachment exercises: which file families the student may upload.
    accept: [] as AttachmentKind[],
    // Fill-in-the-blanks: blanks come from the statement, options include distractors.
    fillBlanks: { blanks: [], distractors: [], layout: "text" } as FillBlanksConfig,
  });

  // Topic positions are shown to teachers starting at one. The API stores
  // zero-based indexes, so conversion happens only at its boundary.
  const newTopic = reactive({ title: "", description: "", order_index: 1 });
  const newExercise = reactive({
    question: "",
    type: "open_text" as Exercise["type"],
    correct_answer: "",
    explanation: "",
    difficulty: 1,
    metadata: "{}",
    teacher_image: "",
    // Image/audio/video shown with the statement, for any exercise type.
    media_url: "",
    options: ["", "", "", ""],
    // Attachment exercises: which file families the student may upload.
    accept: [] as AttachmentKind[],
    // Fill-in-the-blanks: blanks come from the statement, options include distractors.
    fillBlanks: { blanks: [], distractors: [], layout: "text" } as FillBlanksConfig,
  });
  // Gillie never returns handwritten directly. A teacher may explicitly turn
  // a reviewed draft into one, which creates a canvas image they can edit.
  type AIDraft = {
    draft_id: string;
    type: "open_text" | "multiple_choice" | "equation" | "canvas" | "attachment" | "fill_blanks" | "handwritten";
    question: string;
    correct_answer: string;
    explanation: string;
    difficulty: number;
    metadata?: { options?: string[]; blanks?: { id: number; answer: string }[]; distractors?: string[]; layout?: string; accept?: AttachmentKind[] };
    teacher_image: string;
    // Held apart from metadata because the editor owns this shape and the
    // answer/pool are derived from it at save time, exactly as in the manual
    // exercise form.
    fillBlanks: FillBlanksConfig;
  };
  // The batch writes straight through the service: the composable toasts on
  // every single create, which for five drafts meant six notifications.
  const exerciseService = new ExerciseService(practiqApi);
  const showAIDraftsModal = ref(false);
  const aiSource = ref<File | null>(null);
  const aiDrafts = ref<AIDraft[]>([]);
  const aiCount = ref(1);
  const aiDifficulty = ref(1);
  const aiInstruction = ref("");
  const aiType = ref("");
  const aiGenerating = ref(false);
  const aiSaving = ref(false);
  let aiDraftCounter = 0;
  const aiDraftCanvasRefs = new Map<string, HTMLCanvasElement>();
  const aiDraftDrawing = new Set<string>();

  // Either a file or a written topic is enough: the API accepts one of the two
  // and says so when neither is there.
  const canGenerateDrafts = computed(
    () => Boolean(selectedTopicId.value) && Boolean(aiSource.value || aiInstruction.value.trim()),
  );

  // A multiple-choice draft is only usable with options, and the review step is
  // where a teacher would notice they are missing. Every draft gets its four
  // slots on arrival rather than on render, so switching a draft's type later
  // has somewhere to write and the template stays free of side effects.
  function normalizeDraft(draft: AIDraft): AIDraft {
    const options = [...(draft.metadata?.options || [])];
    while (options.length < 4) options.push("");
    // A fill_blanks draft arrives as blanks plus distractors; the editor reads
    // the blanks from the statement, so anything the assistant numbered for a
    // marker it did not write is dropped here rather than saved.
    const fillBlanks: FillBlanksConfig = {
      blanks: (draft.metadata?.blanks || [])
        .map((blank) => ({ id: Number(blank?.id), answer: String(blank?.answer ?? "") }))
        .filter((blank) => Number.isFinite(blank.id)),
      distractors: (draft.metadata?.distractors || []).map((option) => String(option)).filter(Boolean),
      layout: draft.metadata?.layout === "code" ? "code" : "text",
    };
    const accept = (draft.metadata?.accept || []).filter((kind): kind is AttachmentKind =>
      ATTACHMENT_KINDS.some((option) => option.value === kind),
    );
    return {
      ...draft,
      draft_id: draft.draft_id || `ai-draft-${++aiDraftCounter}`,
      teacher_image: draft.teacher_image || "",
      metadata: { ...draft.metadata, options, accept },
      fillBlanks: pruneFillBlanks(fillBlanks, draft.question || ""),
    };
  }

  // Editing the option that is marked correct has to carry the answer with it:
  // with a plain v-model the selection came undone on the first keystroke.
  function setDraftOption(draft: AIDraft, position: number, value: string) {
    const options = draft.metadata?.options;
    if (!options) return;
    const previous = (options[position] || "").trim();
    options[position] = value;
    if (previous && draft.correct_answer.trim() === previous) {
      draft.correct_answer = value.trim();
    }
  }

  // fill_blanks has its own rules (markers present, no repeats, every blank
  // answered), and they already live in validateFillBlanks, which is what the
  // manual form uses. Reusing it keeps one definition of a valid exercise.
  function draftProblem(draft: AIDraft): string {
    if (!draft.question.trim()) return "Falta la consigna.";
    if (draft.type === "fill_blanks") return validateFillBlanks(draft.question, draft.fillBlanks);
    if (draft.type === "handwritten" && !draft.teacher_image) return "Generá o dibujá la consigna manuscrita.";
    // Manual attachment exercises have no single textual answer: the teacher
    // reviews the uploaded work. Keep this rule identical for AI drafts.
    if (draft.type === "attachment") return "";
    if (!draft.correct_answer.trim()) return "Falta la respuesta correcta.";
    if (draft.type !== "multiple_choice") return "";
    const options = (draft.metadata?.options || []).map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) return "Cargá al menos dos opciones.";
    if (!options.includes(draft.correct_answer.trim())) return "Marcá cuál de las opciones es la correcta.";
    return "";
  }

  function draftIsComplete(draft: AIDraft) {
    return draftProblem(draft) === "";
  }

  const incompleteDrafts = computed(() => aiDrafts.value.filter((d) => !draftIsComplete(d)).length);

  function apiMessage(error: unknown, fallback: string) {
    const response = (error as { response?: { data?: { message?: string } } })?.response;
    return response?.data?.message || fallback;
  }

  async function generateExerciseDrafts() {
    if (!canGenerateDrafts.value) return;
    aiGenerating.value = true;
    try {
      const form = new FormData();
      if (aiSource.value) form.append("source", aiSource.value);
      form.append("count", String(aiCount.value));
      form.append("difficulty", String(aiDifficulty.value));
      form.append("instruction", aiInstruction.value);
      form.append("exercise_type", aiType.value);
      const { data } = await practiqApi.post(`/topics/${selectedTopicId.value}/exercise-drafts/ai`, form, { headers: { "Content-Type": "multipart/form-data" } });
      aiDrafts.value = (data.data || []).map(normalizeDraft);
    } catch (error) {
      // The API distinguishes a file that is too big, an unsupported format,
      // a topic the teacher cannot write to and an assistant that answered
      // with nothing usable. Showing one message for all four sent a teacher
      // looking at the wrong thing.
      toast.add({ severity: "error", summary: "No se pudo generar", detail: apiMessage(error, "Revisá el archivo o el tema e intentá de nuevo."), life: 4500 });
    } finally { aiGenerating.value = false; }
  }

  async function saveAIDrafts() {
    if (!selectedTopicId.value || !aiDrafts.value.length || incompleteDrafts.value) return;
    aiSaving.value = true;
    // Each draft is written on its own, so a failure halfway leaves the ones
    // already created in the course. Dropping them from the list as they land
    // is what makes a retry save the rest instead of duplicating the lot.
    const pending: AIDraft[] = [];
    let saved = 0;
    let failure: unknown = null;
    try {
      for (const draft of aiDrafts.value) {
        if (failure) {
          pending.push(draft);
          continue;
        }
        try {
          await exerciseService.create(selectedTopicId.value, {
            type: draft.type,
            question: draft.question,
            correct_answer: draftCorrectAnswer(draft),
            explanation: draft.explanation,
            difficulty: draft.difficulty,
            metadata: JSON.stringify(draftMetadata(draft)),
          } as Partial<Exercise>);
          saved += 1;
        } catch (error) {
          failure = error;
          pending.push(draft);
        }
      }
      aiDrafts.value = pending;
      if (saved) await loadExercises(selectedTopicId.value);

      if (!failure) {
        showAIDraftsModal.value = false;
        toast.add({ severity: "success", summary: "Ejercicios creados", detail: `${saved} ${saved === 1 ? "ejercicio agregado" : "ejercicios agregados"} al tema.`, life: 3500 });
        return;
      }
      toast.add({
        severity: "warn",
        summary: "Guardado incompleto",
        detail: `${saved} de ${saved + pending.length} se guardaron. Quedan ${pending.length} en la lista: ${apiMessage(failure, "volvé a intentar.")}`,
        life: 6000,
      });
    } finally { aiSaving.value = false; }
  }

  function draftMetadata(draft: AIDraft) {
    if (draft.type === "handwritten") return { teacher_image: draft.teacher_image };
    if (draft.type === "multiple_choice") {
      return { options: (draft.metadata?.options || []).map((o) => o.trim()).filter(Boolean) };
    }
    if (draft.type === "fill_blanks") {
      const config = pruneFillBlanks(draft.fillBlanks, draft.question);
      return { blanks: config.blanks, options: buildOptions(config), layout: config.layout };
    }
    if (draft.type === "attachment") {
      return { accept: draft.metadata?.accept || [] };
    }
    return {};
  }

  function draftCorrectAnswer(draft: AIDraft) {
    if (draft.type !== "fill_blanks") return draft.correct_answer;
    return buildCorrectAnswer(pruneFillBlanks(draft.fillBlanks, draft.question).blanks);
  }

  function setAIDraftCanvasRef(draft: AIDraft, canvas: HTMLCanvasElement | null) {
    if (!canvas) {
      aiDraftCanvasRefs.delete(draft.draft_id);
      return;
    }
    aiDraftCanvasRefs.set(draft.draft_id, canvas);
    nextTick(() => initAIDraftCanvas(draft, draft.teacher_image));
  }

  function initAIDraftCanvas(draft: AIDraft, imageData = "") {
    const canvas = aiDraftCanvasRefs.get(draft.draft_id);
    if (!canvas) return;
    const width = canvas.offsetWidth || 720;
    const height = canvas.offsetHeight || 240;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawTeacherCanvasBackground(ctx, width, height);
    if (imageData) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, width, height);
      image.src = imageData;
    }
  }

  function seedAIDraftHandwriting(draft: AIDraft) {
    const canvas = aiDraftCanvasRefs.get(draft.draft_id);
    if (!canvas) return;
    initAIDraftCanvas(draft);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const words = (draft.question.trim() || "Escribí tu respuesta.").split(/\s+/);
    const maxWidth = canvas.width - 44;
    const lines: string[] = [];
    let line = "";
    ctx.font = 'italic 24px "Segoe Print", "Comic Sans MS", cursive';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    ctx.fillStyle = "#1f2937";
    ctx.textBaseline = "top";
    lines.slice(0, 5).forEach((text, index) => ctx.fillText(text, 22, 12 + index * 34));
    if (lines.length > 5) ctx.fillText("…", 22, 12 + 5 * 34);
    draft.teacher_image = canvas.toDataURL("image/png");
  }

  function enableAIDraftHandwriting(draft: AIDraft) {
    draft.type = "handwritten";
    // The canvas ref is mounted in the first flush; seed afterwards so its
    // own initial background pass cannot erase the generated writing.
    nextTick(() => nextTick(() => seedAIDraftHandwriting(draft)));
  }

  function aiDraftCanvasPosition(event: MouseEvent, draft: AIDraft) {
    const canvas = aiDraftCanvasRefs.get(draft.draft_id);
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startAIDraftDraw(event: MouseEvent, draft: AIDraft) {
    const canvas = aiDraftCanvasRefs.get(draft.draft_id);
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    aiDraftDrawing.add(draft.draft_id);
    const pos = aiDraftCanvasPosition(event, draft);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function drawAIDraftCanvas(event: MouseEvent, draft: AIDraft) {
    if (!aiDraftDrawing.has(draft.draft_id)) return;
    const canvas = aiDraftCanvasRefs.get(draft.draft_id);
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = aiDraftCanvasPosition(event, draft);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopAIDraftDraw(draft: AIDraft) {
    aiDraftDrawing.delete(draft.draft_id);
    draft.teacher_image = aiDraftCanvasRefs.get(draft.draft_id)?.toDataURL("image/png") || draft.teacher_image;
  }

  function startAIDraftDrawTouch(event: TouchEvent, draft: AIDraft) {
    const touch = event.touches[0];
    if (touch) startAIDraftDraw({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent, draft);
  }

  function drawAIDraftCanvasTouch(event: TouchEvent, draft: AIDraft) {
    const touch = event.touches[0];
    if (touch) drawAIDraftCanvas({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent, draft);
  }
  const newMaterial = reactive({
    title: "",
    type: "text" as Material["type"],
    extracted_text: "",
    // URL returned by the upload endpoint; empty for text-only materials.
    file_url: "",
  });

  // Narrows the file picker to what the backend actually accepts per type.
  const MATERIAL_ACCEPT: Record<string, string> = {
    pdf: "application/pdf",
    image: "image/*",
    video: "video/mp4,video/webm,video/ogg,video/quicktime",
  };

  function materialAccept(type: Material["type"]) {
    return MATERIAL_ACCEPT[type] ?? "";
  }

  /**
   * A failed upload leaves file_url empty, and saving anyway produces a
   * material the student sees listed but cannot open.
   */
  function missingMaterialFile(form: { type: Material["type"]; file_url: string }) {
    return form.type !== "text" && !form.file_url;
  }

  const showEditMaterialModal = ref(false);
  const editMaterialReady = ref(true);
  // The update endpoint replaces every field, so the form carries them all.
  // file_url is the canonical one, never the signed view_url.
  const editMaterial = reactive({
    id: "",
    title: "",
    type: "text" as Material["type"],
    extracted_text: "",
    file_url: "",
  });

  async function openEditMaterial(material: Material) {
    editMaterial.id = material.id;
    editMaterial.title = material.title;
    editMaterial.type = material.type;
    editMaterial.extracted_text = material.extracted_text || "";
    editMaterial.file_url = material.file_url || "";
    editMaterialReady.value = !material.extracted_text_truncated;
    showEditMaterialModal.value = true;
    // The listing carries only the beginning of the text and this form posts
    // whatever is in it back: prefilling from the preview would save the cut
    // version over the whole document.
    if (material.extracted_text_truncated) {
      const full = await loadMaterial(material.id);
      if (full && editMaterial.id === material.id) {
        editMaterial.extracted_text = full.extracted_text || "";
        editMaterialReady.value = true;
      }
    }
  }

  async function saveMaterial() {
    if (!editMaterialReady.value) return;
    if (uploadInFlight(editMaterialUpload)) return;
    await updateMaterialService(editMaterial.id, {
      title: editMaterial.title,
      extracted_text: editMaterial.extracted_text,
      file_url: editMaterial.file_url,
    });
    showEditMaterialModal.value = false;
    const res = await loadMaterials(courseId);
    materials.value = res || [];
  }
  const newSheet = reactive({
    title: "",
    topic_id: "",
    level: 1,
    sheet_type: "practice",
    test_style: "keyboard",
    // datetime-local value in the teacher's timezone; converted on submit.
    scheduled_at: "",
    available_until: "",
    // null, not 0: an empty number input reads as null, and the API takes
    // null to mean "no limit".
    max_attempts: null as number | null,
    time_limit_minutes: null as number | null,
    exercise_ids: [] as string[],
  });
  const newNotebook = reactive({ title: "", description: "", level: 1, topic_id: "" });

  const teacherLevels = computed(() => {
    if (courseLevels.value?.levels?.length) {
      return courseLevels.value.levels.map((ld) => ({
        level: ld.level,
        practices: ld.practices,
        levelTest: ld.level_test,
        notebooks: ld.notebooks,
      }));
    }
    const maxFromSheets = practiceSheets.value.reduce(
      (max, sheet) => Math.max(max, sheet.level || 1),
      1,
    );
    const maxFromNotebooks = notebooks.value.reduce(
      (max, notebook) => Math.max(max, notebook.level || 1),
      1,
    );
    const maxLevel = Math.max(maxFromSheets, maxFromNotebooks, 1);

    return Array.from({ length: maxLevel }, (_, index) => {
      const level = index + 1;
      return {
        level,
        practices: practiceSheets.value.filter(
          (sheet) => sheet.level === level && sheet.sheet_type !== "level_test",
        ),
        levelTest:
          practiceSheets.value.find(
            (sheet) =>
              sheet.level === level && sheet.sheet_type === "level_test",
          ) || null,
        notebooks: notebooks.value.filter(
          (notebook) => (notebook.level || 1) === level,
        ),
      };
    });
  });

  type TeacherCanvasKind = "new" | "edit";
  const teacherCanvasRefs: Record<TeacherCanvasKind, HTMLCanvasElement | null> =
    { new: null, edit: null };
  const teacherDrawing: Record<TeacherCanvasKind, boolean> = {
    new: false,
    edit: false,
  };
  const teacherLastPos: Record<TeacherCanvasKind, { x: number; y: number }> = {
    new: { x: 0, y: 0 },
    edit: { x: 0, y: 0 },
  };

  onMounted(async () => {
    const [
      courseRes,
      topicsRes,
      materialsRes,
      studentsRes,
      sheetsRes,
      notebooksRes,
      levelsRes,
    ] = await Promise.allSettled([
      loadCourse(courseId),
      loadTopics(courseId),
      loadMaterials(courseId),
      loadStudents(courseId),
      loadSheetsPage(courseId, 1),
      loadNotebooks(courseId),
      loadCourseLevels(courseId),
    ]);

    if (materialsRes.status === "fulfilled")
      materials.value = materialsRes.value || [];
    if (notebooksRes.status === "fulfilled")
      notebooks.value = notebooksRes.value || [];
    if (levelsRes.status === "fulfilled") courseLevels.value = levelsRes.value;
  });

  watch(selectedTopicId, async (id) => {
    if (!id) return;
    try {
      await loadExercises(id);
    } catch {}
  });

  watch(
    () => newSheet.topic_id,
    (id) => loadSheetExercises(id),
  );

  watch(
    () => editSheet.topic_id,
    async (id) => {
      editSheet.exercise_ids = [];
      await loadEditSheetExercises(id);
    },
  );

  watch(
    () => newExercise.type,
    async (type) => {
      if (type === "handwritten" && showExerciseModal.value) {
        await nextTick();
        initTeacherCanvas("new", newExercise.teacher_image);
      }
    },
  );

  watch(
    () => editExercise.type,
    async (type) => {
      if (type === "handwritten" && showEditExerciseModal.value) {
        await nextTick();
        initTeacherCanvas("edit", editExercise.teacher_image);
      }
    },
  );

  async function loadSheetExercises(topicId: string) {
    newSheet.exercise_ids = [];
    if (!topicId) {
      sheetExercises.value = [];
      return;
    }
    try {
      const res = await loadExercises(topicId);
      sheetExercises.value = res || [];
    } catch {
      sheetExercises.value = [];
    }
  }

  async function createTopic() {
    await createTopicService(courseId, {
      ...newTopic,
      order_index: newTopic.order_index - 1,
    });
    showTopicModal.value = false;
    newTopic.title = "";
    newTopic.description = "";
    newTopic.order_index = 1;
  }

  async function createExercise() {
    if (uploadInFlight(newExerciseUpload)) return;
    if (!ensureExerciseIsValid(newExercise)) return;
    await createExerciseService(
      selectedTopicId.value,
      buildExercisePayload(newExercise, "new"),
    );
    showExerciseModal.value = false;
    resetExerciseForm(newExercise);
  }

  const newExerciseUpload = ref<InstanceType<typeof FileUploadField> | null>(null);
  const editExerciseUpload = ref<InstanceType<typeof FileUploadField> | null>(null);
  const newMaterialUpload = ref<InstanceType<typeof FileUploadField> | null>(null);
  const editMaterialUpload = ref<InstanceType<typeof FileUploadField> | null>(null);

  /**
   * Saving mid-upload stored a material with an empty file_url — listed for
   * the student but impossible to open.
   */
  function uploadInFlight(field: typeof newMaterialUpload) {
    if (!field.value?.uploading) return false;
    toast.add({
      severity: "warn",
      summary: "Esperá un momento",
      detail: "El archivo se está subiendo todavía.",
      life: 3500,
    });
    return true;
  }

  // Switching the type only hides the upload field; without this the URL of a
  // file picked under the previous type stays in the form and gets saved, so a
  // text material ends up carrying a file the student is offered to open.
  // Only the create form can change type — editing keeps whatever it was.
  watch(
    () => newMaterial.type,
    () => {
      newMaterial.file_url = "";
      // Clearing the URL leaves a running upload alive; without this its late
      // result lands on the newly selected type.
      newMaterialUpload.value?.cancelUpload();
    },
  );

  async function createMaterial() {
    if (uploadInFlight(newMaterialUpload)) return;
    await createMaterialService(courseId, { ...newMaterial });
    showMaterialModal.value = false;
    newMaterial.title = "";
    newMaterial.type = "text";
    newMaterial.extracted_text = "";
    newMaterial.file_url = "";
    const res = await loadMaterials(courseId);
    materials.value = res || [];
  }

  // The browser gives local time ("2026-09-01T14:30"); the API stores UTC.
  // Only level tests carry a schedule, so switching back to practice clears it.
  function toUtcISO(localValue: string, sheetType: string) {
    if (sheetType !== "level_test" || !localValue) return "";
    const parsed = new Date(localValue);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  }

  /**
   * A closing date only means anything alongside an opening one. Clearing the
   * start disables the input but left its value in the form, so the sheet was
   * saved as "habilitada siempre" and students hit isExpired anyway.
   */
  // A limit only means something on a level test, and an emptied field has to
  // travel as null so the API clears it rather than keeping the old value.
  function sheetLimit(value: number | null, sheetType: string) {
    if (sheetType !== "level_test") return null;
    return typeof value === "number" && value > 0 ? value : null;
  }

  function closingUtcISO(form: {
    scheduled_at: string;
    available_until: string;
    sheet_type: string;
  }) {
    if (!form.scheduled_at) return "";
    return toUtcISO(form.available_until, form.sheet_type);
  }

  function toLocalInput(isoValue?: string) {
    if (!isoValue) return "";
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  async function createSheet() {
    if (newSheet.sheet_type === "level_test") {
      const existing = teacherLevels.value.find(
        (item) => item.level === newSheet.level,
      )?.levelTest;
      if (existing) {
        toast.add({
          severity: "info",
          summary: "Este nivel ya tiene una prueba",
          detail: "Podés editarla o eliminarla antes de crear otra.",
          life: 4000,
        });
        return;
      }
    }
    await createPracticeSheet(courseId, {
      ...newSheet,
      scheduled_at: toUtcISO(newSheet.scheduled_at, newSheet.sheet_type),
      available_until: closingUtcISO(newSheet),
      max_attempts: sheetLimit(newSheet.max_attempts, newSheet.sheet_type),
      time_limit_minutes: sheetLimit(newSheet.time_limit_minutes, newSheet.sheet_type),
    });
    showSheetModal.value = false;
    newSheet.title = "";
    newSheet.topic_id = "";
    newSheet.level = 1;
    newSheet.sheet_type = "practice";
    newSheet.test_style = "keyboard";
    newSheet.scheduled_at = "";
    newSheet.available_until = "";
    newSheet.exercise_ids = [];
    sheetExercises.value = [];
    await loadSheetsPage(courseId, 1);
  }

  async function createNotebook() {
    const res = await createNotebookService(courseId, { ...newNotebook });
    showNotebookModal.value = false;
    newNotebook.title = "";
    newNotebook.description = "";
    newNotebook.level = 1;
    newNotebook.topic_id = "";
    router.push(`/teacher/courses/${courseId}/notebooks/${res.id}`);
  }

  async function deleteExercise(id: string) {
    const ok = await showConfirm("¿Eliminar este ejercicio?");
    if (!ok) return;
    await deleteExerciseService(id);
  }

  // --- Exportar ejercicios a JSON ---
  // Only the fields create() accepts travel in the file, so the same export
  // re-imports into any topic without dragging along ids or signed URLs that
  // would not mean anything there.
  const showExportModal = ref(false);
  const exportSelectedIds = ref<Set<string>>(new Set());
  const exportAllSelected = computed(
    () => exercises.value.length > 0 && exportSelectedIds.value.size === exercises.value.length,
  );

  function openExportModal() {
    exportSelectedIds.value = new Set(exercises.value.map((e) => e.id));
    showExportModal.value = true;
  }

  function toggleExportExercise(id: string) {
    const next = new Set(exportSelectedIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    exportSelectedIds.value = next;
  }

  function toggleExportAll() {
    exportSelectedIds.value = exportAllSelected.value
      ? new Set()
      : new Set(exercises.value.map((e) => e.id));
  }

  function confirmExport() {
    const selected = exercises.value.filter((e) => exportSelectedIds.value.has(e.id));
    const payload = selected.map((ex) => ({
      type: ex.type,
      question: ex.question,
      correct_answer: ex.correct_answer,
      explanation: ex.explanation,
      difficulty: ex.difficulty,
      metadata: ex.metadata,
    }));
    const topic = topics.value.find((t) => t.id === selectedTopicId.value);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ejercicios-${topic?.title || selectedTopicId.value}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showExportModal.value = false;
  }

  // --- Importar ejercicios desde JSON ---
  interface ImportDraft extends Partial<Exercise> {
    selected: boolean;
  }

  const showImportModal = ref(false);
  const importDrafts = ref<ImportDraft[]>([]);
  const importFileError = ref("");
  const importSaving = ref(false);
  const importSelectedCount = computed(
    () => importDrafts.value.filter((d) => d.selected).length,
  );
  const importAllSelected = computed(
    () => importDrafts.value.length > 0 && importSelectedCount.value === importDrafts.value.length,
  );

  function openImportModal() {
    importDrafts.value = [];
    importFileError.value = "";
    showImportModal.value = true;
  }

  async function onImportFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = "";
    if (!file) return;
    importFileError.value = "";
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed) || !parsed.length) throw new Error("empty or not an array");
      importDrafts.value = parsed.map((d) => ({ ...d, selected: true }));
    } catch {
      importDrafts.value = [];
      importFileError.value = "El archivo debe ser un JSON con una lista de ejercicios.";
    }
  }

  function toggleImportDraft(index: number) {
    importDrafts.value[index].selected = !importDrafts.value[index].selected;
  }

  function toggleImportAll() {
    const next = !importAllSelected.value;
    importDrafts.value.forEach((d) => (d.selected = next));
  }

  async function confirmImport() {
    const unselected = importDrafts.value.filter((d) => !d.selected);
    const toImport = importDrafts.value.filter((d) => d.selected);
    if (!selectedTopicId.value || !toImport.length) return;
    importSaving.value = true;
    // Same pattern as saveAIDrafts: each exercise is created on its own, so a
    // failure partway through leaves the ones already created instead of
    // losing the whole batch — the ones still pending stay in the list to retry.
    const pending: ImportDraft[] = [];
    let saved = 0;
    let failure: unknown = null;
    try {
      for (const draft of toImport) {
        if (failure) {
          pending.push(draft);
          continue;
        }
        try {
          await exerciseService.create(selectedTopicId.value, {
            type: draft.type,
            question: draft.question,
            correct_answer: draft.correct_answer,
            explanation: draft.explanation,
            difficulty: draft.difficulty,
            metadata: draft.metadata,
          } as Partial<Exercise>);
          saved += 1;
        } catch (error) {
          failure = error;
          pending.push(draft);
        }
      }
      importDrafts.value = [...unselected, ...pending];
      if (saved) await loadExercises(selectedTopicId.value);

      if (failure) {
        toast.add({
          severity: "warn",
          summary: "Importación parcial",
          detail: `${saved} de ${toImport.length} se importaron. ${apiMessage(failure, "Revisá el resto e intentá de nuevo.")}`,
          life: 5000,
        });
      } else {
        toast.add({ severity: "success", summary: "Ejercicios importados", detail: `${saved} ${saved === 1 ? "ejercicio agregado" : "ejercicios agregados"} al tema.`, life: 3500 });
        showImportModal.value = false;
      }
    } finally {
      importSaving.value = false;
    }
  }

  function openNewSheet() {
    newSheet.topic_id = selectedTopicId.value;
    loadSheetExercises(newSheet.topic_id);
    showSheetModal.value = true;
  }

  async function goToSheet(sheetId: string) {
    const sheet = practiceSheets.value.find((s) => s.id === sheetId);
    if (sheet) {
      activeTab.value = "sheets";
      openEditSheet(sheet);
      return;
    }

    try {
      const loadedSheet = await loadPracticeSheet(sheetId);
      activeTab.value = "sheets";
      openEditSheet(loadedSheet);
    } catch {
      return;
    }
  }

  function openNotebook(notebookId: string) {
    router.push(`/teacher/courses/${courseId}/notebooks/${notebookId}`);
  }

  function openPracticeForLevel(level: number) {
    newSheet.level = level;
    newSheet.sheet_type = "practice";
    newSheet.test_style = "keyboard";
    newSheet.scheduled_at = "";
    newSheet.available_until = "";
    newSheet.topic_id = selectedTopicId.value;
    loadSheetExercises(newSheet.topic_id);
    showSheetModal.value = true;
  }

  function openLevelTestForLevel(level: number) {
    newSheet.level = level;
    newSheet.sheet_type = "level_test";
    newSheet.scheduled_at = "";
    newSheet.available_until = "";
    newSheet.topic_id = selectedTopicId.value;
    loadSheetExercises(newSheet.topic_id);
    showSheetModal.value = true;
  }

  function openNotebookForLevel(level: number) {
    newNotebook.level = level;
    showNotebookModal.value = true;
  }

  function createNextLevel() {
    const nextLevel = teacherLevels.value.length;
    openPracticeForLevel(nextLevel);
  }

  function startTopicEdit(topic: Topic) {
    editingTopicId.value = topic.id;
    editTopicTitle.value = topic.title;
  }

  async function saveTopicEdit(topic: Topic) {
    if (!editTopicTitle.value.trim()) return;
    await updateTopicService(topic.id, {
      title: editTopicTitle.value,
      description: topic.description,
      order_index: topic.order_index,
    });
    editingTopicId.value = null;
  }

  async function deleteTopic(id: string) {
    const ok = await showConfirm("¿Eliminar este tema?");
    if (!ok) return;
    await deleteTopicService(id);
  }

  async function deleteMaterial(id: string) {
    const ok = await showConfirm("¿Eliminar este material?");
    if (!ok) return;
    await deleteMaterialService(id);
    materials.value = materials.value.filter((m) => m.id !== id);
  }

  async function openEditSheet(sheet: PracticeSheet) {
    editingSheetId.value = sheet.id;
    editSheet.title = sheet.title;
    editSheet.topic_id = sheet.topic_id || "";
    editSheet.level = sheet.level ?? 1;
    editSheet.sheet_type = sheet.sheet_type || "practice";
    editSheet.test_style = sheet.test_style || "keyboard";
    editSheet.scheduled_at = toLocalInput(sheet.scheduled_at);
    editSheet.available_until = toLocalInput(sheet.available_until);
    editSheet.max_attempts = sheet.max_attempts ?? null;
    editSheet.time_limit_minutes = sheet.time_limit_minutes ?? null;
    editSheet.exercise_ids = (sheet.exercises || []).map((e) => e.exercise.id);
    await loadEditSheetExercises(editSheet.topic_id);
    showEditSheetModal.value = true;
  }

  async function loadEditSheetExercises(topicId: string) {
    if (!topicId) {
      editSheetExercises.value = [];
      return;
    }
    try {
      const res = await loadExercises(topicId);
      editSheetExercises.value = res || [];
    } catch {
      editSheetExercises.value = [];
    }
  }

  async function saveSheetEdit() {
    if (!editingSheetId.value) return;
    await updatePracticeSheet(editingSheetId.value, {
      title: editSheet.title,
      topic_id: editSheet.topic_id,
      level: editSheet.level,
      sheet_type: editSheet.sheet_type,
      test_style: editSheet.test_style,
      scheduled_at: toUtcISO(editSheet.scheduled_at, editSheet.sheet_type),
      available_until: closingUtcISO(editSheet),
      max_attempts: sheetLimit(editSheet.max_attempts, editSheet.sheet_type),
      time_limit_minutes: sheetLimit(editSheet.time_limit_minutes, editSheet.sheet_type),
      exercise_ids: editSheet.exercise_ids,
    });
    showEditSheetModal.value = false;
    await loadSheetsPage(courseId, 1);
  }

  async function deleteSheet(id: string) {
    const ok = await showConfirm("¿Eliminar esta hoja de práctica?");
    if (!ok) return false;
    await deletePracticeSheetService(id);
    await loadSheetsPage(courseId, sheetsPage.value);
    return true;
  }

  async function deleteEditingSheet() {
    if (!editingSheetId.value) return;
    if (await deleteSheet(editingSheetId.value)) {
      showEditSheetModal.value = false;
      editingSheetId.value = null;
    }
  }

  // Blocks saving an exercise the student could not solve: a fill_blanks with
  // no blanks, or with a blank nobody answered.
  function ensureExerciseIsValid(form: typeof newExercise) {
    if (form.type !== "fill_blanks") return true;
    const problem = validateFillBlanks(form.question, form.fillBlanks);
    if (problem) {
      toast.add({
        severity: "warn",
        summary: "Revisá el ejercicio",
        detail: problem,
        life: 4000,
      });
      return false;
    }
    return true;
  }

  /** What the editor loaded, to tell an untouched statement from a redrawn one. */
  const loadedTeacherImage = ref("");

  async function openEditExercise(ex: Exercise) {
    editingExerciseId.value = ex.id;
    editExercise.question = ex.question;
    editExercise.type = ex.type;
    editExercise.correct_answer = ex.correct_answer || "";
    editExercise.explanation = ex.explanation || "";
    editExercise.difficulty = ex.difficulty ?? 1;
    editExercise.metadata = ex.metadata || "{}";
    // The drawing is not part of the payload any more, so it is fetched. The
    // legacy reader stays for exercises that still carry it inline.
    editExercise.teacher_image = getMetadataTeacherImage(ex.metadata);
    editExercise.media_url = getMetadataMediaURL(ex.metadata);
    setExerciseOptions(editExercise, getMetadataOptions(ex.metadata));
    // Per-type configuration lives in metadata; without this the editor opens
    // empty and saving wipes what the teacher had set.
    editExercise.accept = acceptedKinds(ex);
    editExercise.fillBlanks = parseFillBlanksConfig(ex);
    showEditExerciseModal.value = true;
    if (editExercise.type === "handwritten") {
      const drawing =
        editExercise.teacher_image || (await statementImageDataURL(ex));
      editExercise.teacher_image = drawing;
      loadedTeacherImage.value = drawing;
      nextTick(() => initTeacherCanvas("edit", drawing));
    }
  }

  async function saveExerciseEdit() {
    if (!editingExerciseId.value) return;
    if (uploadInFlight(editExerciseUpload)) return;
    if (!ensureExerciseIsValid(editExercise)) return;
    await updateExerciseService(
      editingExerciseId.value,
      buildExercisePayload(editExercise, "edit"),
    );
    // Drawings are cached by exercise id; a teacher who just redrew a statement
    // has to see the new one, not the copy fetched when the modal opened.
    forgetStatementImage(editingExerciseId.value);
    showEditExerciseModal.value = false;
  }

  function needsLargeQuestionInput(type: Exercise["type"]) {
    return type === "handwritten" || type === "canvas";
  }

  function questionPlaceholder(type: Exercise["type"]) {
    if (type === "handwritten") {
      return "Texto de respaldo opcional para buscar/listar el ejercicio";
    }
    if (type === "canvas") {
      return "Escribe la consigna completa que verá el alumno...";
    }
    if (type === "attachment") {
      return "Describí qué tiene que entregar el alumno...";
    }
    if (type === "multiple_choice") {
      return "¿Cuánto es 12 + 5 + 8?";
    }
    if (type === "equation") {
      return "Resuelve: $\\frac{2x + 4}{3} = 10$";
    }
    return "¿Cuánto es 1/2 + 1/4?";
  }

  function answerPlaceholder(type: Exercise["type"]) {
    if (type === "equation") return "x = 13 o $x = 13$";
    if (type === "multiple_choice") return "Opción correcta";
    return "3/4";
  }

  function getMetadataOptions(metadata?: string) {
    const parsed = parseExerciseMetadata(metadata);
    const value = parsed?.options;
    return Array.isArray(value) ? value.map((option) => String(option)) : [];
  }

  function getMetadataTeacherImage(metadata?: string) {
    const parsed = parseExerciseMetadata(metadata);
    const value =
      parsed?.teacher_image ||
      parsed?.teacherImage ||
      parsed?.image_data ||
      parsed?.imageData;
    return typeof value === "string" && value.startsWith("data:image/")
      ? value
      : "";
  }

  function getMetadataMediaURL(metadata?: string) {
    const value = parseExerciseMetadata(metadata)?.media_url;
    return typeof value === "string" ? value : "";
  }

  function setExerciseOptions(
    form: typeof newExercise | typeof editExercise,
    options: string[],
  ) {
    const next = [...options];
    while (next.length < 4) next.push("");
    form.options.splice(0, form.options.length, ...next.slice(0, 8));
  }

  function buildExerciseMetadata(
    form: typeof newExercise | typeof editExercise,
    canvasKind?: TeacherCanvasKind,
  ) {
    const parsed = parseExerciseMetadata(form.metadata) || {};
    // Statement media is orthogonal to the type, so it survives every branch
    // below (each one copies `parsed`) instead of being re-added in each.
    if (form.media_url) parsed.media_url = form.media_url;
    else delete parsed.media_url;
    if (form.type === "multiple_choice") {
      const options = form.options
        .map((option) => option.trim())
        .filter(Boolean);
      return JSON.stringify({ ...parsed, options });
    }
    const rest = { ...parsed };
    delete rest.options;
    if (form.type === "fill_blanks") {
      // Both student views render any teacher image they find, whatever the
      // type. Converting a handwritten exercise used to keep it, so the old
      // prompt showed up next to the new statement — and reached the assistant.
      // Empty, not absent: absent means "keep what is stored".
      rest.teacher_image = "";
      const config = pruneFillBlanks(form.fillBlanks, form.question);
      return JSON.stringify({
        ...rest,
        blanks: config.blanks,
        options: buildOptions(config),
        layout: config.layout,
      });
    }
    if (form.type === "attachment") {
      // Empty means "any supported file"; the API enforces the whitelist.
      if (form.accept.length) rest.accept = [...form.accept];
      else delete rest.accept;
      rest.teacher_image = "";
      return JSON.stringify(rest);
    }
    delete rest.accept;
    if (form.type === "handwritten") {
      const canvasImage = canvasKind ? captureTeacherCanvas(canvasKind) : "";
      const drawing = canvasImage || form.teacher_image;
      // Leaving the key out tells the API to keep the drawing it already has.
      // Sending it back would upload a second copy of a statement nobody
      // changed, since the editor re-exports the canvas on every save.
      if (drawing && drawing === loadedTeacherImage.value) {
        delete rest.teacher_image;
      } else {
        rest.teacher_image = drawing;
      }
    } else {
      rest.teacher_image = "";
    }
    return JSON.stringify(rest);
  }

  function buildExercisePayload(
    form: typeof newExercise | typeof editExercise,
    canvasKind?: TeacherCanvasKind,
  ): Partial<Exercise> {
    return {
      question:
        form.question.trim() ||
        (form.type === "handwritten" ? "Ejercicio manuscrito" : form.question),
      type: form.type,
      correct_answer:
        form.type === "fill_blanks"
          ? buildCorrectAnswer(pruneFillBlanks(form.fillBlanks, form.question).blanks)
          : form.correct_answer,
      explanation: form.explanation,
      difficulty: form.difficulty,
      metadata: buildExerciseMetadata(form, canvasKind),
    };
  }

  function resetExerciseForm(form: typeof newExercise) {
    form.question = "";
    form.type = "open_text";
    form.correct_answer = "";
    form.explanation = "";
    form.difficulty = 1;
    form.metadata = "{}";
    form.teacher_image = "";
    form.media_url = "";
    form.accept = [];
    form.fillBlanks = { blanks: [], distractors: [], layout: "text" };
    setExerciseOptions(form, []);
    clearTeacherCanvas("new");
  }

  function setTeacherCanvasRef(
    kind: TeacherCanvasKind,
    el: HTMLCanvasElement | null,
  ) {
    if (teacherCanvasRefs[kind] === el) return;
    teacherCanvasRefs[kind] = el;
    if (el) {
      const form = kind === "new" ? newExercise : editExercise;
      nextTick(() => initTeacherCanvas(kind, form.teacher_image));
    }
  }

  function initTeacherCanvas(kind: TeacherCanvasKind, imageData = "") {
    const canvas = teacherCanvasRefs[kind];
    if (!canvas) return;
    const width = canvas.offsetWidth || 720;
    const height = canvas.offsetHeight || 240;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawTeacherCanvasBackground(ctx, width, height);
    if (imageData) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = imageData;
    }
  }

  function seedTeacherCanvasFromQuestion(kind: TeacherCanvasKind) {
    const form = kind === "new" ? newExercise : editExercise;
    const canvas = teacherCanvasRefs[kind];
    if (!canvas) return;
    initTeacherCanvas(kind);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const words = (form.question.trim() || "Escribí tu respuesta.").split(/\s+/);
    const maxWidth = canvas.width - 44;
    const lines: string[] = [];
    let line = "";
    ctx.font = 'italic 24px "Segoe Print", "Comic Sans MS", cursive';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    ctx.fillStyle = "#1f2937";
    ctx.textBaseline = "top";
    lines.slice(0, 5).forEach((text, index) => ctx.fillText(text, 22, 12 + index * 34));
    if (lines.length > 5) ctx.fillText("…", 22, 12 + 5 * 34);
    form.teacher_image = captureTeacherCanvas(kind);
  }

  function convertManualExerciseToHandwritten(kind: TeacherCanvasKind) {
    const form = kind === "new" ? newExercise : editExercise;
    if (!form.question.trim()) {
      toast.add({ severity: "warn", summary: "Escribí una consigna primero", detail: "La convertiremos en un borrador manuscrito para que lo corrijas.", life: 3500 });
      return;
    }
    form.type = "handwritten";
    // The type watcher mounts and clears the canvas in its first flush.
    nextTick(() => nextTick(() => seedTeacherCanvasFromQuestion(kind)));
  }

  function drawTeacherCanvasBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(124, 58, 237, 0.12)";
    ctx.lineWidth = 1;
    for (let y = 34; y < height; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function getTeacherCanvasPos(e: MouseEvent, kind: TeacherCanvasKind) {
    const canvas = teacherCanvasRefs[kind];
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startTeacherDraw(e: MouseEvent, kind: TeacherCanvasKind) {
    const canvas = teacherCanvasRefs[kind];
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    teacherDrawing[kind] = true;
    teacherLastPos[kind] = getTeacherCanvasPos(e, kind);
    ctx.beginPath();
    ctx.moveTo(teacherLastPos[kind].x, teacherLastPos[kind].y);
  }

  function drawTeacherCanvas(e: MouseEvent, kind: TeacherCanvasKind) {
    if (!teacherDrawing[kind]) return;
    const canvas = teacherCanvasRefs[kind];
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = getTeacherCanvasPos(e, kind);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    teacherLastPos[kind] = pos;
  }

  function stopTeacherDraw(kind: TeacherCanvasKind) {
    teacherDrawing[kind] = false;
    const form = kind === "new" ? newExercise : editExercise;
    form.teacher_image = captureTeacherCanvas(kind);
  }

  function startTeacherDrawTouch(e: TouchEvent, kind: TeacherCanvasKind) {
    const touch = e.touches[0];
    if (!touch) return;
    startTeacherDraw(
      { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent,
      kind,
    );
  }

  function drawTeacherCanvasTouch(e: TouchEvent, kind: TeacherCanvasKind) {
    const touch = e.touches[0];
    if (!touch) return;
    drawTeacherCanvas(
      { clientX: touch.clientX, clientY: touch.clientY } as MouseEvent,
      kind,
    );
  }

  function clearTeacherCanvas(kind: TeacherCanvasKind) {
    initTeacherCanvas(kind);
    const form = kind === "new" ? newExercise : editExercise;
    form.teacher_image = "";
  }

  function captureTeacherCanvas(kind: TeacherCanvasKind) {
    return teacherCanvasRefs[kind]?.toDataURL("image/png") || "";
  }

  function openEditNotebook(nb: Notebook) {
    editingNotebookId.value = nb.id;
    editNotebook.title = nb.title;
    editNotebook.description = nb.description || "";
    editNotebook.topic_id = nb.topic_id || "";
    showEditNotebookModal.value = true;
  }

  async function saveNotebookEdit() {
    if (!editingNotebookId.value) return;
    await updateNotebookService(editingNotebookId.value, {
      title: editNotebook.title,
      description: editNotebook.description,
      topic_id: editNotebook.topic_id,
    });
    showEditNotebookModal.value = false;
    notebooks.value = await loadNotebooks(courseId);
  }

  async function deleteNotebook(id: string) {
    const ok = await showConfirm("¿Eliminar este cuaderno?");
    if (!ok) return;
    await deleteNotebookService(id);
    notebooks.value = notebooks.value.filter((n) => n.id !== id);
  }
</script>

<template>
  <TeacherLayout>
    <div class="course-detail">
      <div class="course-header">
        <button class="btn btn-ghost btn-sm" @click="router.back()">
          <i class="pi pi-arrow-left"></i> Volver
        </button>
        <div v-if="course">
          <h1 class="page-title">{{ course.title }}</h1>
          <div class="course-badges">
            <span class="badge badge-violet">{{
              course.subject || "General"
            }}</span>
            <span class="badge badge-muted">{{
              course.level || "Sin nivel"
            }}</span>
            <span class="badge" :class="`badge-status--${course.status}`">{{ statusLabel(course.status) }}</span>
          </div>
          <div class="course-status" role="group" aria-label="Estado del curso">
            <button
              v-for="option in STATUS_OPTIONS"
              :key="option.value"
              type="button"
              class="status-option"
              :class="{
                'status-option--current': course.status === option.value,
                'status-option--saving': savingStatus === option.value,
              }"
              :aria-pressed="course.status === option.value"
              :disabled="Boolean(savingStatus)"
              @click="chooseStatus(option.value)"
            >
              <i
                class="pi"
                :class="savingStatus === option.value ? 'pi-spinner pi-spin' : option.icon"
                aria-hidden="true"
              ></i>
              <span class="status-option-text">
                <strong>{{ option.label }}</strong>
                <small>{{ option.hint }}</small>
              </span>
            </button>
          </div>

          <p v-if="pendingArchive" class="status-confirm">
            <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
            <span>
              Al archivar, quienes ya cursan siguen viendo el material y sus
              notas, pero nadie puede entregar ni matricularse.
            </span>
            <span class="status-confirm-actions">
              <button type="button" class="status-confirm-cancel" @click="pendingArchive = false">
                Cancelar
              </button>
              <button type="button" class="status-confirm-go" @click="chooseStatus('archived')">
                Archivar
              </button>
            </span>
          </p>

          <p v-if="statusError" class="status-error">
            <i class="pi pi-times-circle" aria-hidden="true"></i>
            {{ statusError }}
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div ref="tabsElement" class="tabs" role="tablist" aria-label="Secciones del curso">
        <button
          v-for="(tab, index) in tabs"
          :id="`tab-${tab.id}`"
          :key="tab.id"
          class="tab"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          aria-controls="course-tabpanel"
          :tabindex="activeTab === tab.id ? 0 : -1"
          :class="{ 'tab-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
          @keydown.left.prevent="focusTab(index - 1)"
          @keydown.right.prevent="focusTab(index + 1)"
          @keydown.home.prevent="focusTab(0)"
          @keydown.end.prevent="focusTab(tabs.length - 1)"
        >
          <i :class="tab.icon"></i> {{ tab.label }}
        </button>
      </div>

      <div
        id="course-tabpanel"
        role="tabpanel"
        :aria-labelledby="`tab-${activeTab}`"
        tabindex="0"
      >

      <!-- TAB: Niveles -->
      <CourseLevelsPanel
        v-if="activeTab === 'levels'"
        :levels="teacherLevels"
        @create-next-level="createNextLevel"
        @create-practice="openPracticeForLevel"
        @create-level-test="openLevelTestForLevel"
        @create-notebook="openNotebookForLevel"
        @open-sheet="goToSheet"
        @open-notebook="openNotebook"
      />

      <!-- TAB: Temas -->
      <TopicsList
        v-if="activeTab === 'topics'"
        :topics="topics"
        :editing-topic-id="editingTopicId"
        :edit-topic-title="editTopicTitle"
        @create="showTopicModal = true"
        @edit="startTopicEdit"
        @delete="deleteTopic"
        @save="saveTopicEdit"
        @cancel-edit="editingTopicId = null"
        @update:edit-topic-title="editTopicTitle = $event"
      />

      <!-- TAB: Ejercicios -->
      <ExercisesList
        v-if="activeTab === 'exercises'"
        :topics="topics"
        :selected-topic-id="selectedTopicId"
        :exercises="exercises"
        @update:selected-topic-id="selectedTopicId = $event"
        @create="showExerciseModal = true"
        @create-ai="showAIDraftsModal = true"
        @edit="openEditExercise"
        @delete="deleteExercise"
        @export-json="openExportModal"
        @import-json="openImportModal"
      />

      <!-- TAB: Materiales -->
      <MaterialsList
        v-if="activeTab === 'materials'"
        :materials="materials"
        @create="showMaterialModal = true"
        @edit="openEditMaterial"
        @delete="deleteMaterial"
      />

      <!-- TAB: Alumnos -->
      <StudentsList v-if="activeTab === 'students'" :students="students" />

      <!-- TAB: Hojas de Práctica -->
      <div v-if="activeTab === 'sheets'">
        <PracticeSheetsList
          :sheets="practiceSheets"
          @create="openNewSheet"
          @edit="openEditSheet"
          @delete="deleteSheet"
        />
        <div v-if="practiceSheets.length > 0 || sheetsPage > 1" class="pagination-controls">
          <button :disabled="sheetsPage === 1" @click="() => prevSheetsPage(courseId)">
            <i class="pi pi-chevron-left"></i> Anterior
          </button>
          <span class="pagination-info">
            Página {{ sheetsPage }} · {{ practiceSheets.length }} resultados
          </span>
          <button :disabled="!sheetsHasMore" @click="() => nextSheetsPage(courseId)">
            Siguiente <i class="pi pi-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- TAB: Cuadernos -->
      <NotebooksList
        v-if="activeTab === 'notebooks'"
        :notebooks="notebooks"
        @create="showNotebookModal = true"
        @open="openNotebook"
        @edit="openEditNotebook"
        @delete="deleteNotebook"
      />
      </div>
    </div>

    <TopicModal
      :visible="showTopicModal"
      :topic="newTopic"
      @close="showTopicModal = false"
      @submit="createTopic"
      @update:topic="Object.assign(newTopic, $event)"
    />

    <!-- Exercise Modal -->
    <UiModal
      :visible="Boolean(showExerciseModal)"
      @close="showExerciseModal = false"
    >
      <template v-if="showExerciseModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Nuevo Ejercicio</h3>
            <button
              type="button"
              class="modal-close"
              aria-label="Cerrar"
              @click="showExerciseModal = false"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
          <form @submit.prevent="createExercise">
            <div class="form-group">
              <label class="form-label">Tipo *</label>
              <select v-model="newExercise.type" class="form-select" required>
                <option value="open_text">Texto abierto</option>
                <option value="equation">Ecuación</option>
                <option value="multiple_choice">Opción múltiple</option>
                <option value="canvas">Canvas/Dibujo</option>
                <option value="handwritten">Escrito a mano</option>
                <option value="attachment">📎 Entrega de archivo</option>
                <option value="fill_blanks">🧩 Completar huecos</option>
              </select>
              <button v-if="newExercise.type !== 'handwritten'" type="button" class="btn btn-ghost btn-sm" @click="convertManualExerciseToHandwritten('new')"><i class="pi pi-pencil"></i> Convertir consigna a manuscrito</button>
            </div>
            <div v-if="newExercise.type === 'fill_blanks'" class="form-group">
              <label class="form-label">Huecos y opciones</label>
              <FillBlanksEditor
                v-model="newExercise.fillBlanks"
                :statement="newExercise.question"
                @insert-blank="(marker) => (newExercise.question += marker)"
              />
            </div>
            <div v-if="newExercise.type === 'attachment'" class="form-group">
              <label class="form-label">Formatos aceptados</label>
              <div class="accept-options">
                <label
                  v-for="option in ATTACHMENT_KINDS"
                  :key="option.value"
                  class="accept-option"
                >
                  <input
                    v-model="newExercise.accept"
                    type="checkbox"
                    :value="option.value"
                  />
                  {{ option.label }}
                </label>
              </div>
              <small class="field-hint">
                Sin marcar ninguno se acepta cualquier formato soportado. El
                audio y las imágenes los corrige la IA; los PDF y documentos
                quedan para tu revisión.
              </small>
            </div>
            <div class="form-group">
              <label class="form-label">Pregunta *</label>
              <template v-if="newExercise.type === 'equation'">
                <div class="equation-editor-wrap">
                  <div class="equation-editor-label">Editor de ecuación</div>
                  <MathFieldEditor v-model="newExercise.question" />
                </div>
                <div class="field-hint">
                  Usa el teclado virtual o escribe LaTeX directamente.
                  Ejemplo: \frac{2x+4}{3}=10
                </div>
              </template>
              <textarea
                v-else
                v-model="newExercise.question"
                class="form-textarea"
                :class="{
                  'form-textarea--large': needsLargeQuestionInput(
                    newExercise.type,
                  ),
                }"
                :placeholder="questionPlaceholder(newExercise.type)"
                :required="newExercise.type !== 'handwritten'"
                :rows="needsLargeQuestionInput(newExercise.type) ? 6 : 2"
              ></textarea>
            </div>
            <div v-if="newExercise.type === 'handwritten'" class="form-group">
              <label class="form-label">Consigna manuscrita</label>
              <div class="teacher-canvas-wrap">
                <div class="teacher-canvas-toolbar">
                  <span>Escribe aquí el ejercicio que verá el alumno</span>
                  <div class="teacher-canvas-actions"><button type="button" class="btn btn-ghost btn-sm" @click="seedTeacherCanvasFromQuestion('new')"><i class="pi pi-refresh"></i> Generar desde texto</button><button type="button" class="btn btn-ghost btn-sm" @click="clearTeacherCanvas('new')"><i class="pi pi-trash"></i> Limpiar</button></div>
                </div>
                <canvas
                  :ref="
                    (el) =>
                      setTeacherCanvasRef(
                        'new',
                        el as HTMLCanvasElement | null,
                      )
                  "
                  class="teacher-canvas"
                  @mousedown="startTeacherDraw($event, 'new')"
                  @mousemove="drawTeacherCanvas($event, 'new')"
                  @mouseup="stopTeacherDraw('new')"
                  @mouseleave="stopTeacherDraw('new')"
                  @touchstart.prevent="startTeacherDrawTouch($event, 'new')"
                  @touchmove.prevent="drawTeacherCanvasTouch($event, 'new')"
                  @touchend="stopTeacherDraw('new')"
                ></canvas>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Material del enunciado</label>
              <FileUploadField
                ref="newExerciseUpload"
                v-model="newExercise.media_url"
                folder="exercises"
                label="Subir archivo"
                :accept="STATEMENT_MEDIA_ACCEPT"
              />
              <small class="field-hint">
                Opcional. Imagen, audio, PDF o documento. El alumno lo recibe
                junto a la consigna; el asistente sólo lee imágenes y audio.
                Máximo 50 MB.
              </small>
            </div>
            <div class="form-group">
              <label class="form-label">Respuesta correcta</label>
              <template v-if="newExercise.type === 'equation'">
                <MathFieldEditor
                  v-model="newExercise.correct_answer"
                  :show-latex-toggle="false"
                  virtual-keyboard-mode="manual"
                />
                <div class="field-hint">
                  Escribe la respuesta esperada. Ejemplo: x=13
                </div>
              </template>
              <input
                v-else
                v-model="newExercise.correct_answer"
                class="form-input"
                :placeholder="answerPlaceholder(newExercise.type)"
              />
            </div>
            <div
              v-if="newExercise.type === 'multiple_choice'"
              class="form-group"
            >
              <label class="form-label">Opciones</label>
              <div class="options-editor">
                <input
                  v-for="(_, idx) in newExercise.options"
                  :key="idx"
                  v-model="newExercise.options[idx]"
                  class="form-input"
                  :placeholder="`Opción ${idx + 1}`"
                />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Explicación</label>
              <textarea
                v-model="newExercise.explanation"
                class="form-textarea"
                rows="2"
              ></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Dificultad (1-10)</label>
              <input
                v-model.number="newExercise.difficulty"
                type="number"
                class="form-input"
                min="1"
                max="10"
              />
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="btn btn-secondary"
                @click="showExerciseModal = false"
              >
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary">
                Crear Ejercicio
              </button>
            </div>
          </form>
        </div>
      </template>
    </UiModal>

    <UiModal
      :visible="Boolean(showAIDraftsModal)"
      @close="showAIDraftsModal = false"
    >
      <template v-if="showAIDraftsModal">
        <div class="modal-box ai-drafts-modal">
          <div class="modal-header">
            <h3 class="modal-title"><i class="pi pi-sparkles"></i> Crear ejercicios con IA</h3>
            <button type="button" class="modal-close" aria-label="Cerrar" @click="showAIDraftsModal = false">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <p class="field-hint">Subí una guía, evaluación o imagen, o escribí el tema. La IA prepara borradores; vos los revisás antes de publicarlos.</p>
          <template v-if="!aiDrafts.length">
            <div class="form-group"><label class="form-label">Material de apoyo <span class="label-optional">(opcional)</span></label><input type="file" accept=".pdf,.docx,image/png,image/jpeg,image/webp" @change="aiSource = (($event.target as HTMLInputElement).files?.[0] || null)" /></div>
            <div class="form-group"><label class="form-label">Tipo de ejercicio</label><select v-model="aiType" class="form-select"><option value="">Variado</option><option value="open_text">Texto abierto</option><option value="multiple_choice">Opción múltiple</option><option value="equation">Ecuación</option><option value="canvas">Canvas/Dibujo</option><option value="attachment">📎 Entrega de archivo</option><option value="fill_blanks">🧩 Completar huecos</option></select><small class="field-hint">Incluye todos los tipos del editor manual excepto manuscrito.</small></div>
            <div class="form-grid"><div class="form-group"><label class="form-label">Cantidad</label><input v-model.number="aiCount" class="form-input" type="number" min="1" max="10" /></div><div class="form-group"><label class="form-label">Dificultad</label><input v-model.number="aiDifficulty" class="form-input" type="number" min="1" max="10" /></div></div>
            <div class="form-group"><label class="form-label">Tema o indicación</label><textarea v-model="aiInstruction" class="form-textarea" rows="2" placeholder="Ej.: fracciones equivalentes con denominadores hasta 12" /><small class="field-hint">Sin material, la IA usa esta indicación para generar los ejercicios.</small></div>
            <div class="modal-actions"><button class="btn btn-secondary" @click="showAIDraftsModal = false">Cancelar</button><button class="btn btn-primary" :disabled="!canGenerateDrafts || aiGenerating" @click="generateExerciseDrafts"><i class="pi" :class="aiGenerating ? 'pi-spin pi-spinner' : 'pi-sparkles'"></i> {{ aiGenerating ? "Generando…" : "Generar borradores" }}</button></div>
          </template>
          <template v-else>
            <p class="field-hint">Editá o quitá los que no quieras. Nada se guarda hasta confirmar.</p>
            <div v-for="(draft, index) in aiDrafts" :key="index" class="ai-draft-card" :class="{ 'ai-draft-card--incomplete': !draftIsComplete(draft) }">
              <button class="btn btn-ghost btn-sm ai-draft-remove" @click="aiDrafts.splice(index, 1)"><i class="pi pi-times"></i></button>
              <select v-model="draft.type" class="form-select" @change="draft.type === 'handwritten' && enableAIDraftHandwriting(draft)"><option value="open_text">Texto abierto</option><option value="multiple_choice">Opción múltiple</option><option value="equation">Ecuación</option><option value="canvas">Canvas/Dibujo</option><option value="attachment">📎 Entrega de archivo</option><option value="fill_blanks">🧩 Completar huecos</option><option value="handwritten">✍ Manuscrito</option></select>
              <button v-if="draft.type !== 'handwritten'" type="button" class="btn btn-ghost btn-sm ai-draft-handwriting" @click="enableAIDraftHandwriting(draft)"><i class="pi pi-pencil"></i> Convertir a manuscrito</button>
              <textarea v-model="draft.question" class="form-textarea" rows="2" :placeholder="draft.type === 'fill_blanks' ? 'Enunciado con huecos: El agua hierve a {{1}} grados.' : 'Consigna'" />
              <template v-if="draft.type === 'multiple_choice'">
                <span class="ai-draft-label">Opciones — marcá la correcta</span>
                <label v-for="(_, position) in (draft.metadata?.options || [])" :key="position" class="ai-draft-option">
                  <input
                    type="radio"
                    :name="`draft-${index}-correct`"
                    :checked="Boolean(draft.metadata?.options?.[position]?.trim()) && draft.correct_answer.trim() === draft.metadata?.options?.[position]?.trim()"
                    :disabled="!draft.metadata?.options?.[position]?.trim()"
                    @change="draft.correct_answer = (draft.metadata?.options?.[position] || '').trim()"
                  />
                  <input :value="draft.metadata?.options?.[position]" class="form-input" :placeholder="`Opción ${position + 1}`" @input="setDraftOption(draft, position, ($event.target as HTMLInputElement).value)" />
                </label>
              </template>
              <FillBlanksEditor
                v-else-if="draft.type === 'fill_blanks'"
                v-model="draft.fillBlanks"
                :statement="draft.question"
                @insert-blank="(marker: string) => (draft.question += marker)"
              />
              <div v-else-if="draft.type === 'attachment'" class="accept-options">
                <span class="ai-draft-label">Formatos que podrá entregar el alumno</span>
                <label v-for="option in ATTACHMENT_KINDS" :key="option.value" class="accept-option">
                  <input v-model="draft.metadata!.accept" type="checkbox" :value="option.value" />
                  {{ option.label }}
                </label>
                <small class="field-hint">Sin selección se aceptan todos los formatos soportados.</small>
              </div>
              <div v-else-if="draft.type === 'handwritten'" class="teacher-canvas-wrap ai-draft-canvas-wrap">
                <div class="teacher-canvas-toolbar">
                  <span>Consigna generada; podés escribir encima antes de guardar.</span>
                  <button type="button" class="btn btn-ghost btn-sm" @click="seedAIDraftHandwriting(draft)"><i class="pi pi-refresh"></i> Regenerar desde texto</button>
                </div>
                <canvas
                  :ref="(el) => setAIDraftCanvasRef(draft, el as HTMLCanvasElement | null)"
                  class="teacher-canvas ai-draft-canvas"
                  @mousedown="startAIDraftDraw($event, draft)"
                  @mousemove="drawAIDraftCanvas($event, draft)"
                  @mouseup="stopAIDraftDraw(draft)"
                  @mouseleave="stopAIDraftDraw(draft)"
                  @touchstart.prevent="startAIDraftDrawTouch($event, draft)"
                  @touchmove.prevent="drawAIDraftCanvasTouch($event, draft)"
                  @touchend="stopAIDraftDraw(draft)"
                ></canvas>
              </div>
              <input v-else v-model="draft.correct_answer" class="form-input" placeholder="Respuesta correcta" />
              <textarea v-model="draft.explanation" class="form-textarea" rows="2" placeholder="Explicación" />
              <p v-if="draftProblem(draft)" class="ai-draft-problem">{{ draftProblem(draft) }}</p>
            </div>
            <p v-if="incompleteDrafts" class="ai-draft-warning">
              {{ incompleteDrafts === 1 ? "Hay un borrador incompleto." : `Hay ${incompleteDrafts} borradores incompletos.` }} Cada uno dice qué le falta.
            </p>
            <div class="modal-actions"><button class="btn btn-secondary" @click="aiDrafts = []">Volver</button><button class="btn btn-primary" :disabled="!aiDrafts.length || aiSaving || incompleteDrafts > 0" @click="saveAIDrafts">{{ aiSaving ? "Guardando…" : `Guardar ${aiDrafts.length} ${aiDrafts.length === 1 ? "ejercicio" : "ejercicios"}` }}</button></div>
          </template>
        </div>
      </template>
    </UiModal>

    <!-- Export Exercises Modal -->
    <UiModal
      :visible="Boolean(showExportModal)"
      @close="showExportModal = false"
    >
      <template v-if="showExportModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title"><i class="pi pi-download"></i> Exportar ejercicios</h3>
            <button type="button" class="modal-close" aria-label="Cerrar" @click="showExportModal = false">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <p class="field-hint">Elegí qué ejercicios de este tema exportar a un archivo JSON.</p>
          <label class="picker-select-all">
            <input type="checkbox" :checked="exportAllSelected" @change="toggleExportAll" />
            Seleccionar todos ({{ exercises.length }})
          </label>
          <div class="picker-list">
            <label v-for="exercise in exercises" :key="exercise.id" class="picker-row">
              <input
                type="checkbox"
                :checked="exportSelectedIds.has(exercise.id)"
                @change="toggleExportExercise(exercise.id)"
              />
              <span class="picker-row-text">{{ exercise.question || "(sin enunciado)" }}</span>
              <span class="picker-row-tag">{{ exercise.type }}</span>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showExportModal = false">Cancelar</button>
            <button class="btn btn-primary" :disabled="exportSelectedIds.size === 0" @click="confirmExport">
              Exportar {{ exportSelectedIds.size }} {{ exportSelectedIds.size === 1 ? "ejercicio" : "ejercicios" }}
            </button>
          </div>
        </div>
      </template>
    </UiModal>

    <!-- Import Exercises Modal -->
    <UiModal
      :visible="Boolean(showImportModal)"
      @close="showImportModal = false"
    >
      <template v-if="showImportModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title"><i class="pi pi-upload"></i> Importar ejercicios</h3>
            <button type="button" class="modal-close" aria-label="Cerrar" @click="showImportModal = false">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <template v-if="!importDrafts.length">
            <p class="field-hint">Elegí un archivo JSON exportado desde Practiq (una lista de ejercicios).</p>
            <div class="form-group">
              <input type="file" accept="application/json" @change="onImportFileChange" />
            </div>
            <p v-if="importFileError" class="ai-draft-problem">{{ importFileError }}</p>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="showImportModal = false">Cancelar</button>
            </div>
          </template>
          <template v-else>
            <p class="field-hint">Elegí qué ejercicios importar a este tema.</p>
            <label class="picker-select-all">
              <input type="checkbox" :checked="importAllSelected" @change="toggleImportAll" />
              Seleccionar todos ({{ importDrafts.length }})
            </label>
            <div class="picker-list">
              <label v-for="(draft, index) in importDrafts" :key="index" class="picker-row">
                <input type="checkbox" :checked="draft.selected" @change="toggleImportDraft(index)" />
                <span class="picker-row-text">{{ draft.question || "(sin enunciado)" }}</span>
                <span class="picker-row-tag">{{ draft.type }}</span>
              </label>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="importDrafts = []">Volver</button>
              <button class="btn btn-primary" :disabled="importSelectedCount === 0 || importSaving" @click="confirmImport">
                {{ importSaving ? "Importando…" : `Importar ${importSelectedCount} ${importSelectedCount === 1 ? "ejercicio" : "ejercicios"}` }}
              </button>
            </div>
          </template>
        </div>
      </template>
    </UiModal>

    <!-- Material Modal -->
    <UiModal
      :visible="Boolean(showMaterialModal)"
      @close="showMaterialModal = false"
    >
      <template v-if="showMaterialModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Agregar Material</h3>
            <button type="button" class="modal-close" aria-label="Cerrar" @click="showMaterialModal = false">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <form @submit.prevent="createMaterial">
            <div class="form-group">
              <label class="form-label">Título *</label>
              <input
                v-model="newMaterial.title"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Tipo *</label>
              <select v-model="newMaterial.type" class="form-select" required>
                <option value="text">Texto</option>
                <option value="pdf">PDF</option>
                <option value="image">Imagen</option>
                <option value="video">Video</option>
                <option value="worksheet">Hoja de trabajo</option>
              </select>
            </div>
            <div v-if="newMaterial.type !== 'text'" class="form-group">
              <label class="form-label">Archivo *</label>
              <FileUploadField
                ref="newMaterialUpload"
                v-model="newMaterial.file_url"
                folder="materials"
                label="Subir archivo"
                :accept="materialAccept(newMaterial.type)"
              />
              <small v-if="missingMaterialFile(newMaterial)" class="field-hint field-hint--error">
                Subí el archivo antes de guardar; si la subida falló, el
                material quedaría sin nada que abrir.
              </small>
              <small v-else class="field-hint">
                Los alumnos del curso pueden abrirlo desde su vista del curso.
              </small>
            </div>
            <div class="form-group">
              <label class="form-label">Contenido</label>
              <textarea
                v-model="newMaterial.extracted_text"
                class="form-textarea"
                rows="4"
                placeholder="Escribe el contenido del material..."
              ></textarea>
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="btn btn-secondary"
                @click="showMaterialModal = false"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="missingMaterialFile(newMaterial)"
              >
                Agregar
              </button>
            </div>
          </form>
        </div>
      </template>
    </UiModal>

    <!-- Edit Material Modal -->
    <UiModal
      :visible="Boolean(showEditMaterialModal)"
      @close="showEditMaterialModal = false"
    >
      <template v-if="showEditMaterialModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Editar Material</h3>
            <button type="button" class="modal-close" aria-label="Cerrar" @click="showEditMaterialModal = false">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <form @submit.prevent="saveMaterial">
            <div class="form-group">
              <label class="form-label">Título *</label>
              <input
                v-model="editMaterial.title"
                class="form-input"
                required
              />
            </div>
            <div v-if="editMaterial.type !== 'text'" class="form-group">
              <label class="form-label">Archivo *</label>
              <FileUploadField
                ref="editMaterialUpload"
                v-model="editMaterial.file_url"
                folder="materials"
                label="Reemplazar archivo"
                :accept="materialAccept(editMaterial.type)"
              />
              <small v-if="missingMaterialFile(editMaterial)" class="field-hint field-hint--error">
                Este material no tiene archivo: el alumno lo ve listado pero
                no puede abrirlo.
              </small>
            </div>
            <div class="form-group">
              <label class="form-label">Contenido</label>
              <textarea
                v-model="editMaterial.extracted_text"
                class="form-textarea"
                rows="4"
                :disabled="!editMaterialReady"
              ></textarea>
              <small v-if="!editMaterialReady" class="field-hint">
                Cargando contenido completo…
              </small>
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="btn btn-secondary"
                @click="showEditMaterialModal = false"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="!editMaterialReady || missingMaterialFile(editMaterial)"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </template>
    </UiModal>

    <!-- Practice Sheet Modal -->
    <Teleport to="body">
      <!-- Notebook Modal -->
      <UiModal
        :visible="Boolean(showNotebookModal)"
        @close="showNotebookModal = false"
      >
        <template v-if="showNotebookModal">
          <div class="modal-box">
            <div class="modal-header">
              <h3 class="modal-title">Nuevo Cuaderno</h3>
              <button type="button" class="modal-close" aria-label="Cerrar" @click="showNotebookModal = false">
                <i class="pi pi-times"></i>
              </button>
            </div>
            <form @submit.prevent="createNotebook">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input
                  v-model="newNotebook.title"
                  class="form-input"
                  placeholder="Cuaderno de Matemáticas"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea
                  v-model="newNotebook.description"
                  class="form-textarea"
                  rows="2"
                  placeholder="Descripción opcional"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Nivel</label>
                <input
                  v-model.number="newNotebook.level"
                  type="number"
                  min="1"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Tema *</label>
                <select v-model="newNotebook.topic_id" class="form-select" required>
                  <option value="" disabled>Elegí un tema</option>
                  <option v-for="topic in topics" :key="topic.id" :value="topic.id">
                    {{ topic.title }}
                  </option>
                </select>
                <p v-if="!topics.length" class="field-hint field-hint--warn">
                  Este curso todavía no tiene temas. Creá uno en la pestaña Temas
                  para poder guardar el cuaderno.
                </p>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="showNotebookModal = false"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary">
                  Crear Cuaderno
                </button>
              </div>
            </form>
          </div>
        </template>
      </UiModal>

      <UiModal
        :visible="Boolean(showSheetModal)"
        @close="showSheetModal = false"
      >
        <template v-if="showSheetModal">
          <div class="modal-box">
            <div class="modal-header">
              <h3 class="modal-title">Nueva Hoja de Práctica</h3>
              <button type="button" class="modal-close" aria-label="Cerrar" @click="showSheetModal = false">
                <i class="pi pi-times"></i>
              </button>
            </div>
            <form @submit.prevent="createSheet">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input v-model="newSheet.title" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">Tema</label>
                <select v-model="newSheet.topic_id" class="form-select">
                  <option value="">Sin tema específico</option>
                  <option v-for="t in topics" :key="t.id" :value="t.id">
                    {{ t.title }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tipo</label>
                <select v-model="newSheet.sheet_type" class="form-input">
                  <option value="practice">Hoja de Práctica</option>
                  <option value="level_test">🏆 Prueba de Nivel</option>
                </select>
              </div>
              <div
                v-if="newSheet.sheet_type === 'level_test'"
                class="form-group"
              >
                <label class="form-label">Estilo de respuesta</label>
                <select v-model="newSheet.test_style" class="form-input">
                  <option value="keyboard">⌨️ Teclado (texto)</option>
                  <option value="canvas">✏️ Hoja (dibujar)</option>
                </select>
              </div>
              <div
                v-if="newSheet.sheet_type === 'level_test'"
                class="form-group"
              >
                <label class="form-label">Fecha y hora de la prueba</label>
                <input
                  v-model="newSheet.scheduled_at"
                  type="datetime-local"
                  class="form-input"
                />
                <small class="form-hint">
                  Los alumnos reciben una notificación y no pueden rendirla
                  antes de esa fecha. Dejalo vacío para habilitarla siempre.
                </small>
              </div>
              <div
                v-if="newSheet.sheet_type === 'level_test'"
                class="form-group"
              >
                <label class="form-label">Cierre (opcional)</label>
                <input
                  v-model="newSheet.available_until"
                  :min="newSheet.scheduled_at || undefined"
                  :disabled="!newSheet.scheduled_at"
                  type="datetime-local"
                  class="form-input"
                />
                <small class="form-hint">
                  Elegí primero la fecha de la prueba. Después de esta fecha ya
                  no pueden rendirla; vacío queda sin plazo.
                </small>
              </div>
              <div
                v-if="newSheet.sheet_type === 'level_test'"
                class="form-group"
              >
                <label class="form-label">Intentos permitidos</label>
                <input
                  v-model.number="newSheet.max_attempts"
                  type="number"
                  min="1"
                  max="20"
                  class="form-input"
                  placeholder="1"
                />
                <small class="form-hint">
                  Cuántas veces puede enviarla cada alumno. Vacío deja un
                  intento, que es lo que valía hasta ahora.
                </small>
              </div>
              <div
                v-if="newSheet.sheet_type === 'level_test'"
                class="form-group"
              >
                <label class="form-label">Tiempo límite (minutos)</label>
                <input
                  v-model.number="newSheet.time_limit_minutes"
                  type="number"
                  min="1"
                  max="600"
                  class="form-input"
                  placeholder="Sin límite"
                />
                <small class="form-hint">
                  Corre desde que el alumno abre la prueba, no desde la fecha:
                  cada uno tiene el mismo tiempo. Vacío es sin límite.
                </small>
              </div>
              <div class="form-group">
                <label class="form-label">Nivel</label>
                <input
                  v-model.number="newSheet.level"
                  type="number"
                  class="form-input"
                  min="1"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Ejercicios (seleccionar)</label>
                <div class="exercise-selector">
                  <div
                    v-if="sheetExercises.length === 0"
                    class="empty-inline empty-inline--compact"
                  >
                    {{
                      newSheet.topic_id
                        ? "Este tema no tiene ejercicios aún."
                        : "Selecciona un tema para ver los ejercicios."
                    }}
                  </div>
                  <label
                    v-for="ex in sheetExercises"
                    :key="ex.id"
                    class="exercise-checkbox"
                  >
                    <input
                      type="checkbox"
                      :value="ex.id"
                      v-model="newSheet.exercise_ids"
                    />
                    <span>{{ ex.question.slice(0, 60) }}...</span>
                  </label>
                </div>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="showSheetModal = false"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary">
                  Crear Hoja
                </button>
              </div>
            </form>
          </div>
        </template>
      </UiModal>
    </Teleport>

    <!-- Edit Sheet Modal -->
    <UiModal
      :visible="Boolean(showEditSheetModal)"
      @close="showEditSheetModal = false"
    >
      <template v-if="showEditSheetModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Editar Hoja de Práctica</h3>
            <button type="button" class="modal-close" aria-label="Cerrar" @click="showEditSheetModal = false">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <form @submit.prevent="saveSheetEdit">
            <div class="form-group">
              <label class="form-label">Título *</label>
              <input v-model="editSheet.title" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Tema</label>
              <select v-model="editSheet.topic_id" class="form-select">
                <option value="">Sin tema específico</option>
                <option v-for="t in topics" :key="t.id" :value="t.id">
                  {{ t.title }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select v-model="editSheet.sheet_type" class="form-select">
                <option value="practice">Hoja de Práctica</option>
                <option value="level_test">🏆 Prueba de Nivel</option>
              </select>
            </div>
            <div
              v-if="editSheet.sheet_type === 'level_test'"
              class="form-group"
            >
              <label class="form-label">Estilo de respuesta</label>
              <select v-model="editSheet.test_style" class="form-select">
                <option value="keyboard">⌨️ Teclado (texto)</option>
                <option value="canvas">✏️ Hoja (dibujar)</option>
              </select>
            </div>
            <div
              v-if="editSheet.sheet_type === 'level_test'"
              class="form-group"
            >
              <label class="form-label">Fecha y hora de la prueba</label>
              <input
                v-model="editSheet.scheduled_at"
                type="datetime-local"
                class="form-input"
              />
              <small class="form-hint">
                Los alumnos reciben una notificación y no pueden rendirla
                antes de esa fecha. Dejalo vacío para habilitarla siempre.
              </small>
            </div>
            <div
              v-if="editSheet.sheet_type === 'level_test'"
              class="form-group"
            >
              <label class="form-label">Cierre (opcional)</label>
              <input
                v-model="editSheet.available_until"
                :min="editSheet.scheduled_at || undefined"
                :disabled="!editSheet.scheduled_at"
                type="datetime-local"
                class="form-input"
              />
              <small class="form-hint">
                Elegí primero la fecha de la prueba. Después de esta fecha ya
                no pueden rendirla; vacío queda sin plazo.
              </small>
            </div>
            <div
              v-if="editSheet.sheet_type === 'level_test'"
              class="form-group"
            >
              <label class="form-label">Intentos permitidos</label>
              <input
                v-model.number="editSheet.max_attempts"
                type="number"
                min="1"
                max="20"
                class="form-input"
                placeholder="1"
              />
              <small class="form-hint">
                Cuántas veces puede enviarla cada alumno. Vacío deja un
                intento, que es lo que valía hasta ahora.
              </small>
            </div>
            <div
              v-if="editSheet.sheet_type === 'level_test'"
              class="form-group"
            >
              <label class="form-label">Tiempo límite (minutos)</label>
              <input
                v-model.number="editSheet.time_limit_minutes"
                type="number"
                min="1"
                max="600"
                class="form-input"
                placeholder="Sin límite"
              />
              <small class="form-hint">
                Corre desde que el alumno abre la prueba, no desde la fecha:
                cada uno tiene el mismo tiempo. Vacío es sin límite.
              </small>
            </div>
            <div class="form-group">
              <label class="form-label">Nivel</label>
              <input
                v-model.number="editSheet.level"
                type="number"
                class="form-input"
                min="1"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Ejercicios</label>
              <div class="exercise-selector">
                <div
                  v-if="editSheetExercises.length === 0"
                  class="empty-inline empty-inline--compact"
                >
                  {{
                    editSheet.topic_id
                      ? "Este tema no tiene ejercicios aún."
                      : "Selecciona un tema para ver los ejercicios."
                  }}
                </div>
                <label
                  v-for="ex in editSheetExercises"
                  :key="ex.id"
                  class="exercise-checkbox"
                >
                  <input
                    type="checkbox"
                    :value="ex.id"
                    v-model="editSheet.exercise_ids"
                  />
                  <span>{{ ex.question.slice(0, 60) }}...</span>
                </label>
              </div>
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="btn btn-danger"
                @click="deleteEditingSheet"
              >
                <i class="pi pi-trash"></i> Eliminar
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                @click="showEditSheetModal = false"
              >
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </template>
    </UiModal>

    <!-- Edit Exercise Modal -->
    <UiModal
      :visible="Boolean(showEditExerciseModal)"
      @close="showEditExerciseModal = false"
    >
      <template v-if="showEditExerciseModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Editar Ejercicio</h3>
            <button
              type="button"
              class="modal-close"
              aria-label="Cerrar"
              @click="showEditExerciseModal = false"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
          <form @submit.prevent="saveExerciseEdit">
            <div class="form-group">
              <label class="form-label">Tipo *</label>
              <select
                v-model="editExercise.type"
                class="form-select"
                required
              >
                <option value="open_text">Texto abierto</option>
                <option value="equation">Ecuación</option>
                <option value="multiple_choice">Opción múltiple</option>
                <option value="canvas">Canvas/Dibujo</option>
                <option value="handwritten">Escrito a mano</option>
                <option value="attachment">📎 Entrega de archivo</option>
                <option value="fill_blanks">🧩 Completar huecos</option>
              </select>
              <button v-if="editExercise.type !== 'handwritten'" type="button" class="btn btn-ghost btn-sm" @click="convertManualExerciseToHandwritten('edit')"><i class="pi pi-pencil"></i> Convertir consigna a manuscrito</button>
            </div>
            <div v-if="editExercise.type === 'fill_blanks'" class="form-group">
              <label class="form-label">Huecos y opciones</label>
              <FillBlanksEditor
                v-model="editExercise.fillBlanks"
                :statement="editExercise.question"
                @insert-blank="(marker) => (editExercise.question += marker)"
              />
            </div>
            <div v-if="editExercise.type === 'attachment'" class="form-group">
              <label class="form-label">Formatos aceptados</label>
              <div class="accept-options">
                <label
                  v-for="option in ATTACHMENT_KINDS"
                  :key="option.value"
                  class="accept-option"
                >
                  <input
                    v-model="editExercise.accept"
                    type="checkbox"
                    :value="option.value"
                  />
                  {{ option.label }}
                </label>
              </div>
              <small class="field-hint">
                Sin marcar ninguno se acepta cualquier formato soportado. El
                audio y las imágenes los corrige la IA; los PDF y documentos
                quedan para tu revisión.
              </small>
            </div>
            <div class="form-group">
              <label class="form-label">Pregunta *</label>
              <template v-if="editExercise.type === 'equation'">
                <div class="equation-editor-wrap">
                  <div class="equation-editor-label">Editor de ecuación</div>
                  <MathFieldEditor v-model="editExercise.question" />
                </div>
                <div class="field-hint">
                  Usa el teclado virtual o escribe LaTeX directamente.
                  Ejemplo: \frac{2x+4}{3}=10
                </div>
              </template>
              <textarea
                v-else
                v-model="editExercise.question"
                class="form-textarea"
                :class="{
                  'form-textarea--large': needsLargeQuestionInput(
                    editExercise.type,
                  ),
                }"
                :placeholder="questionPlaceholder(editExercise.type)"
                :rows="needsLargeQuestionInput(editExercise.type) ? 6 : 2"
                :required="editExercise.type !== 'handwritten'"
              ></textarea>
            </div>
            <div
              v-if="editExercise.type === 'handwritten'"
              class="form-group"
            >
              <label class="form-label">Consigna manuscrita</label>
              <div class="teacher-canvas-wrap">
                <div class="teacher-canvas-toolbar">
                  <span>Escribe aquí el ejercicio que verá el alumno</span>
                  <div class="teacher-canvas-actions"><button type="button" class="btn btn-ghost btn-sm" @click="seedTeacherCanvasFromQuestion('edit')"><i class="pi pi-refresh"></i> Generar desde texto</button><button type="button" class="btn btn-ghost btn-sm" @click="clearTeacherCanvas('edit')"><i class="pi pi-trash"></i> Limpiar</button></div>
                </div>
                <canvas
                  :ref="
                    (el) =>
                      setTeacherCanvasRef(
                        'edit',
                        el as HTMLCanvasElement | null,
                      )
                  "
                  class="teacher-canvas"
                  @mousedown="startTeacherDraw($event, 'edit')"
                  @mousemove="drawTeacherCanvas($event, 'edit')"
                  @mouseup="stopTeacherDraw('edit')"
                  @mouseleave="stopTeacherDraw('edit')"
                  @touchstart.prevent="startTeacherDrawTouch($event, 'edit')"
                  @touchmove.prevent="drawTeacherCanvasTouch($event, 'edit')"
                  @touchend="stopTeacherDraw('edit')"
                ></canvas>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Material del enunciado</label>
              <FileUploadField
                ref="editExerciseUpload"
                v-model="editExercise.media_url"
                folder="exercises"
                label="Subir archivo"
                :accept="STATEMENT_MEDIA_ACCEPT"
              />
              <small class="field-hint">
                Opcional. Imagen, audio, PDF o documento. El alumno lo recibe
                junto a la consigna; el asistente sólo lee imágenes y audio.
                Máximo 50 MB.
              </small>
            </div>
            <div class="form-group">
              <label class="form-label">Respuesta correcta</label>
              <template v-if="editExercise.type === 'equation'">
                <MathFieldEditor
                  v-model="editExercise.correct_answer"
                  :show-latex-toggle="false"
                  virtual-keyboard-mode="manual"
                />
                <div class="field-hint">
                  Escribe la respuesta esperada. Ejemplo: x=13
                </div>
              </template>
              <input
                v-else
                v-model="editExercise.correct_answer"
                class="form-input"
                :placeholder="answerPlaceholder(editExercise.type)"
              />
            </div>
            <div
              v-if="editExercise.type === 'multiple_choice'"
              class="form-group"
            >
              <label class="form-label">Opciones</label>
              <div class="options-editor">
                <input
                  v-for="(_, idx) in editExercise.options"
                  :key="idx"
                  v-model="editExercise.options[idx]"
                  class="form-input"
                  :placeholder="`Opción ${idx + 1}`"
                />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Explicación</label>
              <textarea
                v-model="editExercise.explanation"
                class="form-textarea"
                rows="2"
              ></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Dificultad (1-10)</label>
              <input
                v-model.number="editExercise.difficulty"
                type="number"
                class="form-input"
                min="1"
                max="10"
              />
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="btn btn-secondary"
                @click="showEditExerciseModal = false"
              >
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </template>
    </UiModal>

    <!-- Edit Notebook Modal -->
    <UiModal
      :visible="Boolean(showEditNotebookModal)"
      @close="showEditNotebookModal = false"
    >
      <template v-if="showEditNotebookModal">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Editar Cuaderno</h3>
            <button type="button" class="modal-close" aria-label="Cerrar" @click="showEditNotebookModal = false">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <form @submit.prevent="saveNotebookEdit">
            <div class="form-group">
              <label class="form-label">Título *</label>
              <input
                v-model="editNotebook.title"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Descripción</label>
              <textarea
                v-model="editNotebook.description"
                class="form-textarea"
                rows="2"
              ></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Tema *</label>
              <select v-model="editNotebook.topic_id" class="form-select" required>
                <option value="" disabled>Elegí un tema</option>
                <option v-for="topic in topics" :key="topic.id" :value="topic.id">
                  {{ topic.title }}
                </option>
              </select>
              <p v-if="!topics.length" class="field-hint field-hint--warn">
                Este curso todavía no tiene temas. Creá uno en la pestaña Temas
                para poder guardar el cuaderno.
              </p>
            </div>
            <div class="modal-actions">
              <button
                type="button"
                class="btn btn-secondary"
                @click="showEditNotebookModal = false"
              >
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary">Guardar</button>
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
  .course-detail {
    padding: 24px 28px 40px;
    max-width: 1180px;
  }

  .course-header {
    position: relative;
    margin-bottom: 16px;
    padding: 22px 24px;
    border-radius: var(--radius-2xl);
    background: linear-gradient(115deg, var(--surface-elevated), var(--surface-card));
    border: 1px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-card);
    backdrop-filter: blur(18px);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    overflow: hidden;
  }

  .course-header > .btn {
    align-self: flex-start;
    width: auto;
    flex: 0 0 auto;
  }

  .course-header > * {
    position: relative;
    z-index: 1;
  }

  .page-title {
    font-size: clamp(1.55rem, 2.5vw, 2rem);
    font-weight: 800;
    color: var(--text-heading);
    line-height: 1.12;
    margin: 0;
  }

  /* Three visible choices rather than a closed select: the lifecycle is the
     one setting on this page a student can feel, and a native select hid both
     the options and what each one does behind a tap. */
  .course-status {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .status-option {
    display: flex;
    align-items: center;
    gap: 9px;
    flex: 1 1 210px;
    padding: 10px 12px;
    border: 1.5px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    color: var(--text-secondary);
    text-align: left;
    cursor: pointer;
    transition: var(--transition-fast);
  }
  .status-option:hover:not(:disabled) {
    border-color: rgba(var(--practiq-violet-rgb), 0.45);
    color: var(--text-primary);
  }
  .status-option:disabled {
    cursor: default;
  }
  .status-option--current {
    border-color: var(--practiq-violet);
    background: var(--fill-primary-faint);
    color: var(--practiq-violet);
  }
  .status-option i {
    font-size: 1rem;
    flex-shrink: 0;
  }
  .status-option-text {
    display: grid;
    gap: 1px;
    min-width: 0;
  }
  .status-option-text strong {
    font-size: var(--text-sm);
    font-weight: 800;
  }
  .status-option-text small {
    font-size: var(--text-xs);
    color: var(--text-muted);
    line-height: 1.3;
  }
  .status-option--current .status-option-text small {
    color: inherit;
    opacity: 0.8;
  }
  .status-confirm,
  .status-error {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0 0;
    padding: 10px 12px;
    border-radius: var(--radius-lg);
    font-size: var(--text-xs);
    line-height: 1.35;
  }
  .status-confirm {
    background: var(--color-warning-bg);
    color: var(--color-warning-dark);
  }
  .status-confirm span {
    flex: 1 1 200px;
  }
  .status-confirm-actions {
    display: flex;
    gap: 8px;
    flex: 0 0 auto;
  }
  .status-confirm-cancel,
  .status-confirm-go {
    border: none;
    border-radius: var(--radius-pill);
    padding: 6px 14px;
    font-weight: 800;
    font-size: var(--text-xs);
    cursor: pointer;
  }
  .status-confirm-cancel {
    background: transparent;
    color: inherit;
    text-decoration: underline;
  }
  .status-confirm-go {
    background: var(--color-warning-dark);
    color: #fff;
  }
  .status-error {
    background: var(--color-error-bg);
    color: var(--color-error-dark);
  }
  .badge-status--draft { background: #fef3c7; color: #92400e; }
  .badge-status--published { background: #dcfce7; color: #166534; }
  .badge-status--archived { background: var(--surface-hover); color: var(--text-muted); }
  .course-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .badge-muted {
    background: var(--surface-hover);
    color: var(--text-secondary);
  }

  .tabs {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-radius: var(--radius-2xl);
    background: var(--surface-glass);
    border: 1px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-card);
    margin-bottom: 24px;
    overflow-x: auto;
    scrollbar-width: thin;
    scroll-snap-type: x proximity;
    scroll-padding-inline: 8px;
  }

  .tab {
    padding: 10px 14px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-xl);
    font-size: var(--text-base);
    font-weight: 700;
    color: var(--text-secondary);
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    scroll-snap-align: start;
  }

  .tab:hover {
    background: var(--surface-elevated-strong);
    color: var(--text-heading);
  }

  .tab-active {
    color: var(--practiq-violet-dark);
    background: var(--gradient-brand-soft);
    border-color: rgba(var(--practiq-violet-rgb), 0.18);
  }

  .empty-inline {
    color: var(--text-muted);
    font-size: var(--text-md);
    padding: 24px 18px;
    border: 1px dashed rgba(var(--surface-border-rgb), 0.3);
    border-radius: var(--radius-xl);
    background: var(--surface-glass);
  }

  .empty-inline--compact {
    padding: 12px;
  }
  .exercise-selector {
    border: 1px solid rgba(var(--surface-border-rgb), 0.2);
    border-radius: var(--radius-lg);
    padding: 8px;
    max-height: 180px;
    overflow-y: auto;
    background: var(--surface-subtle);
  }
  .exercise-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 4px;
    cursor: pointer;
    font-size: var(--text-base);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
  }

  .exercise-checkbox:hover {
    background: var(--surface-hover);
  }
  .options-editor {
    display: grid;
    gap: 8px;
  }
  .form-textarea--large {
    min-height: 180px;
  }
  .field-hint--warn { color: #92400e; }
  .field-hint {
    margin-top: 6px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }
  .field-hint--error {
    color: var(--color-error);
    font-weight: 600;
  }
  .math-preview {
    margin-top: 10px;
    padding: 12px 14px;
    border: 1px solid rgba(var(--practiq-violet-rgb), 0.16);
    border-radius: var(--radius-md);
    background: var(--surface-subtle);
    color: var(--text-primary);
  }
  .math-preview-label {
    margin-bottom: 6px;
    font-size: var(--text-xs);
    font-weight: 800;
    text-transform: uppercase;
    color: var(--text-secondary);
  }
  .equation-editor-wrap {
    display: grid;
    gap: 6px;
  }
  .equation-editor-label {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--practiq-violet);
  }
  .teacher-canvas-wrap {
    display: grid;
    gap: 8px;
  }
  .teacher-canvas-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }
  .teacher-canvas-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }
  .teacher-canvas {
    width: 100%;
    height: 240px;
    display: block;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.18);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    cursor: crosshair;
    touch-action: none;
    box-shadow: var(--shadow-card);
  }
  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }
  .accept-options {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .accept-option {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-sm);
    color: var(--text-primary);
    cursor: pointer;
  }
  .form-hint {
    display: block;
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    line-height: 1.4;
  }
  /* Tablet landscape */
  @media (max-width: 1024px) {
    .course-detail {
      padding: 20px 20px 40px;
    }
  }

  /* Tablet portrait */
  @media (max-width: 768px) {
    .course-detail {
      padding: 16px 14px 32px;
      max-width: 100%;
    }
    .course-header {
      padding: 22px 18px;
      border-radius: 22px;
    }
  }

  /* Mobile */
  @media (max-width: 600px) {
    :global(:root[data-ui-theme="teacher"]) .course-detail .tabs {
      gap: 4px;
      margin-inline: 0;
      padding: 6px;
      scroll-snap-type: x mandatory;
      scroll-padding-inline: 6px;
    }
    .tab {
      padding: 9px 12px;
      /* Sin esto las 7 tabs se comprimen en vez de scrollear. */
      min-height: 44px;
      flex-shrink: 0;
    }
    .modal-actions {
      flex-direction: column-reverse;
    }
    .modal-actions .btn {
      width: 100%;
    }
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 24px;
    padding: 16px 20px;
    background: var(--surface-elevated);
    border-radius: var(--radius-xl);
  }

  .pagination-controls button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    background: var(--surface-base);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pagination-controls button:hover:not(:disabled) {
    background: var(--surface-elevated-strong);
    border-color: var(--border-strong);
  }

  .pagination-controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-info {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .ai-drafts-modal { max-width: 760px; max-height: min(88vh, 820px); overflow: auto; }
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .ai-draft-card { position: relative; display: grid; gap: 10px; padding: 14px; margin: 12px 0; border: 1px solid var(--surface-border); border-radius: var(--radius-lg); background: var(--surface-base); }
  .ai-draft-remove { position: absolute; top: 6px; right: 6px; }
  .ai-draft-card .form-select { padding-right: 42px; }
  .ai-draft-card--incomplete { border-color: var(--color-warning); }
  .ai-draft-label { color: var(--text-secondary); font-size: 12px; font-weight: 700; }
  .ai-draft-option { display: flex; align-items: center; gap: 8px; }
  .ai-draft-option input[type="radio"] { flex: 0 0 auto; }
  .ai-draft-warning { margin: 4px 0 0; color: var(--color-warning-dark); font-size: 13px; }
  .ai-draft-problem { margin: 0; color: var(--color-warning-dark); font-size: 12px; font-weight: 600; }
  .picker-select-all { display: flex; align-items: center; gap: 8px; margin: 10px 0; font-weight: 700; font-size: 13px; }
  .picker-list { display: grid; gap: 6px; max-height: 320px; overflow-y: auto; margin-bottom: 12px; }
  .picker-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--surface-border); border-radius: var(--radius-md); background: var(--surface-base); }
  .picker-row-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
  .picker-row-tag { flex: 0 0 auto; color: var(--text-secondary); font-size: 11px; text-transform: uppercase; }
  .label-optional { color: var(--text-muted); font-weight: 500; }
  @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .ai-drafts-modal { max-height: 92vh; } }
</style>
