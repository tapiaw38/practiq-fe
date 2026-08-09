<script setup lang="ts">
  import { onMounted, ref } from "vue";
  import { useToast } from "primevue/usetoast";
  import TeacherLayout from "@/layouts/TeacherLayout.vue";
  import { practiqApi } from "@/api/request/server";
  import { AttemptReviewService } from "@/services/attemptReviews/attemptReviewService";
  import type { AttemptReview } from "@/types";

  // ponytail: no store — this view is the only consumer of the queue.
  const service = new AttemptReviewService(practiqApi);
  const toast = useToast();

  const reviews = ref<AttemptReview[]>([]);
  const loading = ref(true);
  const includeReviewed = ref(false);
  const saving = ref<string | null>(null);
  const feedback = ref<Record<string, string>>({});

  onMounted(load);

  async function load() {
    loading.value = true;
    try {
      const { data } = await service.list(includeReviewed.value);
      reviews.value = data;
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
      await service.review(item.attempt_id, {
        is_correct: isCorrect,
        feedback: feedback.value[item.attempt_id]?.trim() || undefined,
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

  function formatDate(value: string) {
    return new Date(value).toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function fileLabel(item: AttemptReview) {
    return item.attachment_name || "archivo adjunto";
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
            practicando. Acá ves las que no pudo corregir, y activando el filtro
            también las que ya corrigió — podés cambiarles la nota cuando quieras.
          </p>
        </div>
        <label class="toggle-reviewed">
          <input
            v-model="includeReviewed"
            type="checkbox"
            @change="load"
          />
          Ver también las ya corregidas
        </label>
      </div>

      <p v-if="loading" class="muted">Cargando…</p>
      <p v-else-if="!reviews.length" class="muted">
        {{
          includeReviewed
            ? "Todavía no hay entregas con archivo en tus cursos."
            : "No hay entregas esperando tu corrección."
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

          <a
            v-if="item.attachment_url"
            class="review-file"
            :href="item.attachment_url"
            target="_blank"
            rel="noopener"
          >
            <i class="pi pi-paperclip"></i>
            {{ fileLabel(item) }}
            <span class="review-file-type">{{ item.attachment_content_type }}</span>
          </a>

          <div v-if="item.ai_feedback || item.ai_is_correct !== undefined" class="review-ai">
            <div class="review-ai-head">
              <i class="pi pi-sparkles"></i>
              <span>Corrección de la IA</span>
            </div>
            <p v-if="item.ai_feedback" class="review-ai-text">{{ item.ai_feedback }}</p>
            <small class="review-ai-note">
              Si no coincidís, tu corrección reemplaza esta nota.
            </small>
          </div>

          <template v-if="!item.teacher_reviewed_at">
            <textarea
              v-model="feedback[item.attempt_id]"
              class="review-feedback"
              rows="2"
              placeholder="Devolución para el alumno (opcional)"
            ></textarea>
            <div class="review-actions">
              <button
                class="btn btn-ghost btn-danger"
                type="button"
                :disabled="saving === item.attempt_id"
                @click="review(item, false)"
              >
                <i class="pi pi-times"></i> Incorrecta
              </button>
              <button
                class="btn btn-primary"
                type="button"
                :disabled="saving === item.attempt_id"
                @click="review(item, true)"
              >
                <i class="pi pi-check"></i> Correcta
              </button>
            </div>
          </template>
          <p v-else-if="item.teacher_feedback" class="review-teacher-feedback">
            {{ item.teacher_feedback }}
          </p>
        </article>
      </div>
    </div>
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

  .toggle-reviewed {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    white-space: nowrap;
    cursor: pointer;
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

  .review-file {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 12px;
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    color: var(--practiq-violet);
    font-size: var(--text-sm);
    font-weight: 600;
    text-decoration: none;
  }

  .review-file-type {
    color: var(--text-secondary);
    font-weight: 400;
    font-size: var(--text-xs);
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
    margin-top: 12px;
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

  .btn-danger {
    color: var(--red-500, #dc2626);
  }

  .muted {
    color: var(--text-secondary);
  }
</style>
