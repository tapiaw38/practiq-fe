<script setup lang="ts">
  import { onMounted, reactive, ref, watch } from "vue";
  import { useToast } from "primevue/usetoast";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import FileViewer from "@/components/ui/FileViewer.vue";
  import ExerciseMedia from "@/components/ui/ExerciseMedia.vue";
  import { practiqApi } from "@/api/request/server";
  import { AttemptReviewService } from "@/services/attemptReviews/attemptReviewService";
  import type { AttemptReview } from "@/types";

  // ponytail: no store — this view is the only consumer of the queue.
  const service = new AttemptReviewService(practiqApi);
  const toast = useToast();

  const reviews = ref<AttemptReview[]>([]);
  const loading = ref(true);
  const hasMore = ref(false);
  const page = ref(1);
  const PAGE_SIZE = 20;

  // Course and student narrow a queue that mixes every course a teacher runs.
  // sheetType is the one specific to this screen: a level test holds the
  // student's promotion until it is corrected, so those are worth isolating.
  const filters = reactive({
    courseId: "",
    studentId: "",
    sheetType: "",
    reviewed: "unreviewed",
  });
  const saving = ref<string | null>(null);
  const feedback = ref<Record<string, string>>({});

  onMounted(load);

  async function load(target = page.value) {
    loading.value = true;
    try {
      const result = await service.list({
        ...filters,
        limit: PAGE_SIZE,
        offset: (target - 1) * PAGE_SIZE,
      });
      reviews.value = result.data;
      hasMore.value = result.has_more;
      // Only after the fetch resolves: advancing first left the counter on a
      // page whose rows never loaded.
      page.value = target;
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar las entregas",
        life: 3000,
      });
    } finally {
      loading.value = false;
    }
  }

  async function review(item: AttemptReview, isCorrect: boolean) {
    if (saving.value) return;
    saving.value = item.attempt_id;
    try {
      const feedbackWasEdited = Object.prototype.hasOwnProperty.call(
        feedback.value,
        item.attempt_id,
      );
      // A blank field means "unchanged" until the teacher edits it. Sending
      // undefined reached Go as an empty string and erased prior feedback.
      const feedbackValue = feedbackWasEdited
        ? feedback.value[item.attempt_id].trim()
        : (item.teacher_feedback ?? "");
      await service.review(item.attempt_id, {
        is_correct: isCorrect,
        feedback: feedbackValue,
      });
      toast.add({
        severity: "success",
        summary: "Corregida",
        detail: isCorrect ? "Marcada como correcta" : "Marcada como incorrecta",
        life: 2500,
      });
      delete feedback.value[item.attempt_id];
      await load();
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo guardar la corrección",
        life: 3000,
      });
    } finally {
      saving.value = null;
    }
  }

  function applyFilters() {
    load(1);
  }

  const courses = ref<{ id: string; title: string }[]>([]);
  const students = ref<{ id: string; name: string }[]>([]);

  /** Options come from the queue itself: no extra request, and it can only
      offer values that actually have deliveries waiting. */
  watch(reviews, (rows) => {
    const byCourse = new Map<string, string>();
    const byStudent = new Map<string, string>();
    for (const row of rows) {
      if (row.course_id) byCourse.set(row.course_id, row.course_title || row.course_id);
      if (row.student_id) byStudent.set(row.student_id, row.student_name || row.student_id);
    }
    if (!filters.courseId) courses.value = [...byCourse].map(([id, title]) => ({ id, title }));
    if (!filters.studentId) students.value = [...byStudent].map(([id, name]) => ({ id, name }));
  });

  function formatDate(value: string) {
    return new Date(value).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  /** The OCR marker is not an answer; saying so beats showing "UNREADABLE". */
  function isUnreadable(item: AttemptReview) {
    return (item.answer_text || "").trim().toUpperCase() === "UNREADABLE";
  }

  function answerText(item: AttemptReview) {
    if (isUnreadable(item)) return "No se pudo leer lo que escribió.";
    return (item.answer_text || "").trim();
  }

  function fileLabel(item: AttemptReview) {
    return item.attachment_name || "archivo adjunto";
  }

  const viewing = ref<AttemptReview | null>(null);

  // The image viewer is shared by the student's canvas, the statement media and
  // the handwritten statement, so it holds a plain url/title instead of a row.
  const preview = ref<{ url: string; title: string } | null>(null);
  const loadingStatement = ref<string | null>(null);

  function openPreview(url: string, title: string) {
    preview.value = { url, title };
  }

  /**
   * The handwritten statement is not in the list payload — a base64 canvas per
   * row would make the queue several megabytes — so it is fetched here.
   */
  async function openStatementImage(item: AttemptReview) {
    if (loadingStatement.value) return;
    loadingStatement.value = item.attempt_id;
    try {
      const { data } = await service.statementImage(item.attempt_id);
      if (!data.image) {
        toast.add({
          severity: "info",
          summary: "Sin consigna",
          detail: "Este ejercicio no tiene una consigna escrita a mano.",
          life: 3000,
        });
        return;
      }
      openPreview(data.image, "Consigna del docente");
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar la consigna",
        life: 3000,
      });
    } finally {
      loadingStatement.value = null;
    }
  }
</script>

<template>
  <TeacherLayout>
    <div class="reviews-page">
      <div class="page-header">
        <div>
          <div class="page-kicker">Corrección</div>
          <h1 class="page-title">Entregas por revisar</h1>
          <p class="page-subtitle">
            La IA corrige las entregas que puede leer para que el alumno siga
            practicando. Acá ves las que no pudo corregir. Podés cambiar la nota
            de una ya corregida cuando quieras.
          </p>
        </div>
      </div>

      <div class="filters-bar">
        <label class="filter-field">
          <span>Estado</span>
          <select v-model="filters.reviewed" class="form-select" @change="applyFilters">
            <option value="unreviewed">Sin corregir</option>
            <option value="reviewed">Ya corregidas</option>
            <option value="">Todas</option>
          </select>
        </label>

        <label class="filter-field">
          <span>Tipo</span>
          <select v-model="filters.sheetType" class="form-select" @change="applyFilters">
            <option value="">Todas</option>
            <option value="level_test">Pruebas de nivel</option>
            <option value="practice">Prácticas</option>
          </select>
        </label>

        <label class="filter-field">
          <span>Curso</span>
          <select v-model="filters.courseId" class="form-select" @change="applyFilters">
            <option value="">Todos</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.title }}
            </option>
          </select>
        </label>

        <label class="filter-field">
          <span>Alumno</span>
          <select v-model="filters.studentId" class="form-select" @change="applyFilters">
            <option value="">Todos</option>
            <option v-for="student in students" :key="student.id" :value="student.id">
              {{ student.name }}
            </option>
          </select>
        </label>
      </div>

      <p v-if="loading" class="muted">Cargando…</p>
      <p v-else-if="!reviews.length" class="muted">
        {{
          filters.reviewed === "unreviewed"
            ? "No hay entregas esperando tu corrección."
            : "No hay entregas para este filtro."
        }}
      </p>

      <div v-else class="reviews-list">
        <article
          v-for="item in reviews"
          :key="item.attempt_id"
          class="review-card"
          :class="{ 'review-card--done': !!item.teacher_reviewed_at }"
        >
          <header class="review-head">
            <div>
              <div class="review-student">{{ item.student_name || item.student_id }}</div>
              <div class="review-meta">
                {{ item.course_title }}
                <template v-if="item.practice_sheet_title">
                  · {{ item.practice_sheet_title }}
                </template>
                · {{ formatDate(item.created_at) }}
              </div>
            </div>
            <span
              v-if="item.teacher_reviewed_at"
              class="review-tag"
              :class="item.teacher_is_correct ? 'review-tag--ok' : 'review-tag--no'"
            >
              {{ item.teacher_is_correct ? "Correcta" : "Incorrecta" }} · vos
            </span>
            <span
              v-else-if="item.ai_is_correct !== undefined"
              class="review-tag"
              :class="item.ai_is_correct ? 'review-tag--ok' : 'review-tag--no'"
            >
              {{ item.ai_is_correct ? "Correcta" : "Incorrecta" }} · IA
            </span>
            <span v-else class="review-tag review-tag--pending">
              Sin corregir
            </span>
          </header>

          <p class="review-question">{{ item.question }}</p>

          <!-- One compact row of thumbnails: this is a triage queue, and a
               full-size canvas per card made it impossible to skim. Each one
               opens in the viewer. -->
          <div class="review-thumbs">
            <button
              v-if="item.has_teacher_image"
              type="button"
              class="review-thumb review-thumb--action"
              :disabled="loadingStatement === item.attempt_id"
              @click="openStatementImage(item)"
            >
              <i
                :class="
                  loadingStatement === item.attempt_id
                    ? 'pi pi-spin pi-spinner'
                    : 'pi pi-pencil'
                "
              ></i>
              <span>Consigna</span>
            </button>

            <button
              v-if="item.statement_media_view_url"
              type="button"
              class="review-thumb"
              @click="openPreview(item.statement_media_view_url, 'Material del enunciado')"
            >
              <img :src="item.statement_media_view_url" alt="" />
              <span>Enunciado</span>
            </button>

            <button
              v-if="item.image_view_url"
              type="button"
              class="review-thumb"
              @click="openPreview(item.image_view_url, 'Respuesta del alumno')"
            >
              <img :src="item.image_view_url" alt="" />
              <span>Respuesta</span>
            </button>

            <button
              v-if="item.attachment_url"
              type="button"
              class="review-thumb review-thumb--action"
              @click="viewing = item"
            >
              <i class="pi pi-paperclip"></i>
              <span>{{ fileLabel(item) }}</span>
            </button>
          </div>

          <p
            v-if="answerText(item)"
            class="review-answer-text"
            :class="{ 'review-answer-text--none': isUnreadable(item) }"
          >
            {{ answerText(item) }}
          </p>

          <button
            v-if="item.attachment_url"
            type="button"
            class="review-file"
            @click="viewing = item"
          >
            <i class="pi pi-paperclip"></i>
            {{ fileLabel(item) }}
            <span class="review-file-type">{{ item.attachment_content_type }}</span>
          </button>

          <!-- Collapsed by default: the AI note is context, not the decision
               the teacher came to make, and expanded it doubled the card. -->
          <details
            v-if="item.ai_feedback || item.ai_is_correct !== undefined"
            class="review-ai"
          >
            <summary class="review-ai-head">
              <i class="pi pi-sparkles"></i>
              <span>Corrección de la IA</span>
            </summary>
            <p v-if="item.ai_feedback" class="review-ai-text">{{ item.ai_feedback }}</p>
            <small class="review-ai-note">
              Si no coincidís, tu corrección reemplaza esta nota.
            </small>
          </details>

          <p v-if="item.teacher_feedback" class="review-teacher-feedback">
            {{ item.teacher_feedback }}
          </p>

          <!-- Also shown once reviewed: the page promises the teacher can
               change the grade whenever they want, and hiding the buttons
               after the first correction made that untrue. -->
          <label class="review-feedback-label">
            {{
              item.teacher_reviewed_at
                ? "Cambiar la devolución"
                : "Devolución para el alumno"
            }}
            <span>(opcional)</span>
          </label>
          <textarea
            v-model="feedback[item.attempt_id]"
            class="review-feedback"
            rows="2"
            placeholder="Contale en qué puede mejorar…"
          ></textarea>
          <div class="review-actions">
            <button
              class="btn btn-ghost btn-danger"
              type="button"
              :disabled="saving === item.attempt_id"
              @click="review(item, false)"
            >
              <i class="pi pi-times"></i>
              {{ item.teacher_reviewed_at ? "Marcar incorrecta" : "Incorrecta" }}
            </button>
            <button
              class="btn btn-primary"
              type="button"
              :disabled="saving === item.attempt_id"
              @click="review(item, true)"
            >
              <i class="pi pi-check"></i>
              {{ item.teacher_reviewed_at ? "Marcar correcta" : "Correcta" }}
            </button>
          </div>
        </article>
      </div>

      <div v-if="!loading && (page > 1 || hasMore)" class="pagination-controls">
        <button
          class="btn btn-secondary"
          :disabled="page === 1"
          @click="load(page - 1)"
        >
          <i class="pi pi-chevron-left"></i>
          Anterior
        </button>
        <span class="pagination-info">Página {{ page }}</span>
        <button
          class="btn btn-secondary"
          :disabled="!hasMore"
          @click="load(page + 1)"
        >
          Siguiente
          <i class="pi pi-chevron-right"></i>
        </button>
      </div>
    </div>

    <FileViewer
      :show="!!preview"
      :url="preview?.url || ''"
      :title="preview?.title || 'Imagen'"
      content-type="image/png"
      @close="preview = null"
    />

    <FileViewer
      :show="!!viewing"
      :url="viewing?.attachment_view_url || viewing?.attachment_url || ''"
      :title="viewing ? fileLabel(viewing) : 'Entrega'"
      :content-type="viewing?.attachment_content_type || ''"
      @close="viewing = null"
    />
  </TeacherLayout>
</template>

<style scoped>
  .reviews-page {
    padding: 24px 28px 40px;
    max-width: 900px;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
    padding: 24px 28px;
    border-radius: 28px;
    background: var(--gradient-card-accent);
    border: 1px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-soft);
  }

  .page-kicker {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-weight: 700;
    color: var(--practiq-violet);
  }

  .page-title {
    font-size: var(--font-hero);
    font-weight: 800;
    color: var(--text-primary);
    margin: 2px 0 0;
  }

  .page-subtitle {
    margin: 8px 0 0;
    color: var(--text-secondary);
    max-width: 60ch;
  }


  .reviews-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .review-card {
    padding: 18px 20px;
    border-radius: 20px;
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-card);
    box-shadow: var(--shadow-soft);
  }

  .review-card--done {
    opacity: 0.75;
  }

  .review-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .review-student {
    font-weight: 800;
    color: var(--text-primary);
  }

  .review-meta {
    font-size: var(--text-xs);
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .review-tag {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: var(--text-xs);
    font-weight: 700;
    white-space: nowrap;
  }

  .review-tag--ok {
    background: var(--color-success-bg);
    color: var(--color-success-dark);
  }

  .review-tag--no {
    background: var(--color-error-bg);
    color: var(--red-600, #b91c1c);
  }

  .review-tag--pending {
    background: var(--color-warning-bg, rgba(245, 158, 11, 0.14));
    color: var(--text-primary);
  }

  .review-question {
    margin: 12px 0;
    color: var(--text-primary);
    font-weight: 600;
  }

  .review-statement-media {
    margin: 12px 0;
    padding: 12px;
    border-radius: var(--radius-md);
    background: var(--surface-bg-soft);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 700;
  }

  .review-statement-media :deep(.exercise-media) {
    margin-bottom: 0;
  }



  .review-ai {
    margin: 12px 0 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
  }

  .review-ai-head {
    display: flex;
    align-items: center;
    gap: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--practiq-violet);
  }

  .review-ai-text {
    margin: 6px 0 0;
    font-size: var(--text-sm);
    color: var(--text-primary);
  }

  .review-ai-note {
    display: block;
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: var(--text-xs);
  }

  .review-teacher-feedback {
    margin: 10px 0 0;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .review-feedback {
    width: 100%;
    margin-top: 6px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-ground, #fff);
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-family: inherit;
    resize: vertical;
  }

  .review-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 12px;
  }

  /* Marking an answer wrong is a verdict, not a destructive action: a solid
     red button read as "delete" and shouted louder than the positive one.
     Outlined instead — and the previous rule set red text over the global
     red fill, which made the label invisible. */
  .review-actions .btn-danger {
    background: transparent;
    color: var(--color-error-dark, #b91c1c);
    border: 1.5px solid var(--color-error, #dc2626);
  }

  .review-actions .btn-danger:hover:not(:disabled) {
    background: var(--color-error-bg);
  }

  .review-feedback-label {
    display: block;
    margin-top: 14px;
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .review-feedback-label span {
    text-transform: none;
    letter-spacing: 0;
    font-weight: 600;
  }

  .filters-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin: 14px 0 18px;
  }

  .filter-field {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .filter-field > span {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-xl);
  }

  .pagination-info {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 700;
  }

  /* summary carries the marker; without this it also keeps the default
     triangle and the row reads as two bullets. */
  .review-ai > summary {
    cursor: pointer;
    list-style: none;
  }

  .review-ai > summary::-webkit-details-marker {
    display: none;
  }

  .review-ai > summary::after {
    content: "\e902";
    font-family: "primeicons";
    margin-left: auto;
    font-size: 11px;
    transition: transform 0.2s;
  }

  .review-ai[open] > summary::after {
    transform: rotate(180deg);
  }

  .review-thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
  }

  .review-thumb {
    display: grid;
    gap: 4px;
    justify-items: center;
    width: 96px;
    padding: 8px;
    border-radius: 12px;
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-elevated);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: 700;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .review-thumb:hover:not(:disabled) {
    border-color: var(--practiq-violet);
    color: var(--practiq-violet);
  }

  .review-thumb:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .review-thumb img {
    width: 100%;
    height: 56px;
    /* contain: a cropped preview of a child's working is unreadable. */
    object-fit: contain;
    border-radius: 8px;
    background: var(--surface-card);
  }

  .review-thumb--action {
    place-content: center;
    min-height: 84px;
    font-size: 18px;
  }

  .review-thumb span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--text-xs);
  }

  .review-answer-text {
    margin: 8px 0 0;
    color: var(--text-primary);
    white-space: pre-wrap;
  }

  .review-answer-text--none {
    color: var(--text-secondary);
    font-style: italic;
  }

  .muted {
    color: var(--text-secondary);
  }

  @media (max-width: 640px) {
    .reviews-page {
      padding: 16px 14px 32px;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }

    /* Two per row: one column wastes the width, four squeeze the labels. */
    .filters-bar {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .review-card {
      padding: 14px;
    }

    /* The meta line ran past the card and pushed the layout sideways. */
    .review-meta,
    .review-question {
      overflow-wrap: anywhere;
    }

    .review-head {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    /* Thumbnails share the row instead of wrapping one per line. */
    .review-thumbs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
    }

    .review-thumb {
      width: auto;
    }

    .review-actions {
      flex-direction: column;
    }
    .review-actions > * {
      width: 100%;
      justify-content: center;
      min-height: 46px;
    }

    .pagination-controls {
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      padding: 12px;
    }

    .pagination-info {
      order: -1;
      width: 100%;
      text-align: center;
    }

    .pagination-controls .btn {
      flex: 1;
      min-height: 44px;
      justify-content: center;
    }
  }
</style>
