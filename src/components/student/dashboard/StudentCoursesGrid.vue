<script setup lang="ts">
  import type {
    StudentCoursesGridEmits,
    StudentCoursesGridProps,
  } from "./StudentCoursesGrid.types";

  const props = defineProps<StudentCoursesGridProps>();
  const emit = defineEmits<StudentCoursesGridEmits>();

  const practiceSheets = (courseId: string) =>
    (props.courseSheets[courseId] || []).filter(
      (sheet) => sheet.sheet_type !== "level_test",
    );
  const levelTests = (courseId: string) =>
    (props.courseSheets[courseId] || []).filter(
      (sheet) => sheet.sheet_type === "level_test",
    );
</script>

<template>
  <section id="courses-section" class="courses-section">
    <div class="section-head">
      <div>
        <div class="section-kicker">Tus espacios</div>
        <h2 class="section-title">Mis cursos y prácticas</h2>
      </div>
    </div>

    <div v-if="courses.length === 0" class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>No estás inscrito en ningún curso</h3>
      <p>Pide a tu docente que te inscriba en un curso para comenzar.</p>
    </div>

    <div v-else class="courses-grid">
      <article v-for="course in courses" :key="course.id" class="course-card">
        <div class="course-card__eyebrow">
          <span class="course-subject">{{ course.subject || "General" }}</span>
          <span class="course-level-pill"
            >Nivel {{ courseCurrentLevel[course.id] || 1 }}</span
          >
        </div>
        <h3 class="course-title">{{ course.title }}</h3>

        <div class="course-progress-wrap">
          <div class="course-progress-header">
            <span class="progress-label">Progreso del curso</span>
            <span class="progress-value"
              >{{ getCourseProgressPercent(course.id) }}%</span
            >
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: getCourseProgressPercent(course.id) + '%' }"
            ></div>
          </div>
        </div>

        <div
          v-if="
            topicsNeedingReview(course.id).length > 0 &&
            !dismissedReviewCards[course.id]
          "
          class="topics-review"
        >
          <div class="review-head">
            <span class="review-label"
              ><i class="pi pi-exclamation-triangle"></i>Repasar</span
            >
            <button
              type="button"
              class="review-dismiss"
              aria-label="Ocultar temas para repasar"
              @click="emit('dismissReview', course.id)"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="review-topics">
            <span
              v-for="topic in topicsNeedingReview(course.id).slice(0, 2)"
              :key="topic.topic_id"
              class="review-topic-tag"
              >{{ topic.topic_title }}</span
            >
            <span
              v-if="topicsNeedingReview(course.id).length > 2"
              class="review-more"
              >+{{ topicsNeedingReview(course.id).length - 2 }}</span
            >
          </div>
        </div>

        <div class="course-stats">
          <div class="course-stat">
            <span class="course-stat__value">{{
              practiceSheets(course.id).length
            }}</span>
            <span class="course-stat__label">Practicas</span>
          </div>
          <div class="course-stat-divider"></div>
          <div class="course-stat">
            <span class="course-stat__value">{{
              levelTests(course.id).length
            }}</span>
            <span class="course-stat__label">Pruebas</span>
          </div>
          <div class="course-stat-divider"></div>
          <div class="course-stat">
            <span class="course-stat__value">{{
              courseNotebooks[course.id]?.length || 0
            }}</span>
            <span class="course-stat__label">Cuadernos</span>
          </div>
        </div>
        <button class="btn-levels" @click="emit('openLevels', course.id)">
          <i class="pi pi-list"></i> Ver niveles
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
  .courses-section {
    position: relative;
    z-index: 1;
    margin-top: 24px;
  }
  .section-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .section-kicker {
    color: var(--practiq-violet);
    font-size: var(--text-xs);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .section-title {
    margin: 0;
    color: var(--text-heading);
    font-size: 1.2rem;
    font-weight: 800;
  }
  .empty-state {
    padding: 26px;
    text-align: center;
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-card);
    color: var(--text-secondary);
  }
  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }
  .courses-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }
  .course-card {
    display: grid;
    gap: 14px;
    padding: 18px;
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-card);
    transition: var(--transition);
  }
  .course-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card-lg);
  }
  .course-card__eyebrow,
  .course-progress-header,
  .course-stats,
  .review-head,
  .review-label,
  .review-topics {
    display: flex;
    align-items: center;
  }
  .course-card__eyebrow,
  .course-progress-header,
  .review-head {
    justify-content: space-between;
    gap: 10px;
  }
  .course-subject,
  .course-level-pill,
  .review-topic-tag,
  .review-more {
    border-radius: var(--radius-pill);
    padding: 5px 9px;
    font-size: var(--text-xs);
    font-weight: 800;
  }
  .course-subject {
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
  }
  .course-level-pill {
    background: var(--color-info-bg);
    color: var(--color-info-dark);
  }
  .course-title {
    margin: 0;
    color: var(--text-heading);
    font-size: 1.05rem;
    font-weight: 800;
  }
  .course-progress-wrap {
    display: grid;
    gap: 7px;
  }
  .progress-label,
  .progress-value {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: 800;
  }
  .progress-bar {
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--surface-hover);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: inherit;
    background: var(--gradient-primary);
  }
  .topics-review {
    display: grid;
    gap: 8px;
    padding: 10px;
    border-radius: var(--radius-lg);
    background: var(--color-warning-bg);
  }
  .review-label {
    gap: 5px;
    color: var(--color-warning-dark);
    font-size: var(--text-xs);
    font-weight: 800;
  }
  .review-dismiss {
    display: inline-grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--color-warning-dark);
    cursor: pointer;
    transition: var(--transition);
  }
  .review-dismiss:hover {
    background: rgba(var(--color-warning-rgb), 0.14);
  }
  .review-dismiss i {
    font-size: 10px;
  }
  .review-topics {
    gap: 6px;
    flex-wrap: wrap;
  }
  .review-topic-tag,
  .review-more {
    background: var(--surface-elevated);
    color: var(--text-primary);
  }
  .course-stats {
    justify-content: space-between;
    gap: 8px;
  }
  .course-stat {
    display: grid;
    gap: 2px;
    text-align: center;
    flex: 1;
  }
  .course-stat__value {
    font-weight: 800;
    color: var(--text-heading);
  }
  .course-stat__label {
    color: var(--text-secondary);
    font-size: var(--text-xs);
  }
  .course-stat-divider {
    width: 1px;
    height: 28px;
    background: var(--surface-border);
  }
  .btn-levels {
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
    border-radius: var(--radius-lg);
    padding: 10px 12px;
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    font-weight: 800;
    cursor: pointer;
    transition: var(--transition);
  }
  .btn-levels:hover {
    border-color: rgba(var(--practiq-violet-rgb), 0.35);
    transform: translateY(-1px);
  }

  @media (max-width: 640px) {
    /* auto-fit deja 2 columnas apretadas antes de caer a 1. */
    .courses-grid {
      grid-template-columns: 1fr;
    }
    .btn-levels {
      min-height: 48px;
    }
  }
</style>
