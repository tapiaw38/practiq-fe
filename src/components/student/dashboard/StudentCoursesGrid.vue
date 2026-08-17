<script setup lang="ts">
  import { computed, ref, watch } from "vue";
  import type {
    StudentCoursesGridEmits,
    StudentCoursesGridProps,
  } from "./StudentCoursesGrid.types";

  const props = defineProps<StudentCoursesGridProps>();
  const emit = defineEmits<StudentCoursesGridEmits>();

  const VIEW_KEY = "student-courses-view";
  const viewMode = ref<"grid" | "list">(
    localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid",
  );

  function setViewMode(mode: "grid" | "list") {
    viewMode.value = mode;
    localStorage.setItem(VIEW_KEY, mode);
  }

  // The API returns every enrolled course in one call, so paging is a slice.
  const PAGE_SIZE = 20;
  const page = ref(1);

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(props.courses.length / PAGE_SIZE)),
  );

  const pagedCourses = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE;
    return props.courses.slice(start, start + PAGE_SIZE);
  });

  // Losing a course (or all of them) must not strand the student on a page
  // that no longer exists.
  watch(totalPages, (total) => {
    if (page.value > total) page.value = total;
  });


</script>

<template>
  <section id="courses-section" class="courses-section">
    <div class="section-head">
      <div>
        <div class="section-kicker">Tus espacios</div>
        <h2 class="section-title">Mis cursos y prácticas</h2>
      </div>

      <div
        v-if="courses.length > 0"
        class="view-toggle"
        role="group"
        aria-label="Cambiar vista"
      >
        <button
          type="button"
          class="view-btn"
          :class="{ 'view-btn--active': viewMode === 'grid' }"
          :aria-pressed="viewMode === 'grid'"
          title="Vista de tarjetas"
          aria-label="Vista de tarjetas"
          @click="setViewMode('grid')"
        >
          <i class="pi pi-th-large"></i>
        </button>
        <button
          type="button"
          class="view-btn"
          :class="{ 'view-btn--active': viewMode === 'list' }"
          :aria-pressed="viewMode === 'list'"
          title="Vista de lista"
          aria-label="Vista de lista"
          @click="setViewMode('list')"
        >
          <i class="pi pi-list"></i>
        </button>
      </div>
    </div>

    <div v-if="courses.length === 0" class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>No estás inscrito en ningún curso</h3>
      <p>Pide a tu docente que te inscriba en un curso para comenzar.</p>
    </div>

    <div
      v-else
      class="courses-grid anim-stagger"
      :class="{ 'courses-grid--list': viewMode === 'list' }"
    >
      <article
        v-for="course in pagedCourses"
        :key="course.course_id"
        class="course-card"
      >
        <div class="course-card__eyebrow">
          <span class="course-subject">{{ course.subject || "General" }}</span>
          <span class="course-level-pill"
            >Nivel {{ course.current_level }}</span
          >
        </div>
        <h3 class="course-title">{{ course.title }}</h3>

        <div class="course-progress-wrap">
          <div class="course-progress-header">
            <span class="progress-label">Progreso del curso</span>
            <span class="progress-value"
              >{{ getCourseProgressPercent(course.course_id) }}%</span
            >
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: getCourseProgressPercent(course.course_id) + '%' }"
            ></div>
          </div>
        </div>

        <div
          v-if="
            topicsNeedingReview(course.course_id).length > 0 &&
            !dismissedReviewCards[course.course_id]
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
              @click="emit('dismissReview', course.course_id)"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="review-topics">
            <span
              v-for="topic in topicsNeedingReview(course.course_id).slice(0, 2)"
              :key="topic.topic_id"
              class="review-topic-tag"
              >{{ topic.topic_title }}</span
            >
            <span
              v-if="topicsNeedingReview(course.course_id).length > 2"
              class="review-more"
              >+{{ topicsNeedingReview(course.course_id).length - 2 }}</span
            >
          </div>
        </div>

        <div class="course-stats">
          <div class="course-stat">
            <span class="course-stat__value">{{ course.practice_sheets }}</span>
            <span class="course-stat__label">Practicas</span>
          </div>
          <div class="course-stat-divider"></div>
          <div class="course-stat">
            <span class="course-stat__value">{{ course.level_tests }}</span>
            <span class="course-stat__label">Pruebas</span>
          </div>
          <div class="course-stat-divider"></div>
          <div class="course-stat">
            <span class="course-stat__value">{{ course.notebooks }}</span>
            <span class="course-stat__label">Cuadernos</span>
          </div>
        </div>
        <button class="btn-levels" @click="emit('openLevels', course.course_id)">
          <i class="pi pi-list"></i>
          <span class="btn-levels__label">Ver niveles</span>
        </button>
      </article>
    </div>

    <div v-if="courses.length > PAGE_SIZE" class="pagination-controls">
      <button
        class="btn btn-secondary"
        :disabled="page === 1"
        @click="page--"
      >
        <i class="pi pi-chevron-left"></i>
        Anterior
      </button>
      <span class="pagination-info">
        Página {{ page }} de {{ totalPages }} · {{ courses.length }} cursos
      </span>
      <button
        class="btn btn-secondary"
        :disabled="page === totalPages"
        @click="page++"
      >
        Siguiente
        <i class="pi pi-chevron-right"></i>
      </button>
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
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 14px;
  }

  .view-toggle {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: var(--radius-lg);
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    flex-shrink: 0;
  }

  .view-btn {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: var(--radius-md, 8px);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .view-btn:hover {
    color: var(--practiq-violet);
  }

  .view-btn--active {
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
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
    font-weight: 600;
    text-align: center;
  }

  /* En mobile los tres elementos en fila se aprietan y el texto se corta.
     El contador sube a su propia línea y los botones comparten la de abajo,
     que además les da el alto de toque. */
  @media (max-width: 640px) {
    .pagination-controls {
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      padding: 12px;
    }

    .pagination-info {
      order: -1;
      width: 100%;
    }

    .pagination-controls .btn {
      flex: 1;
      min-height: 44px;
      justify-content: center;
    }
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

  /* Vista lista: cada curso ocupa una fila y el contenido se acomoda en
     columnas, sin duplicar el markup de la tarjeta. */
  .courses-grid--list {
    grid-template-columns: 1fr;
  }

  .courses-grid--list .course-card {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr) auto auto;
    align-items: center;
    gap: 6px 18px;
    padding: 14px 18px;
  }

  /* Posicionado explícito: con auto-placement el título y las píldoras caen
     en la misma celda y se superponen. */
  .courses-grid--list .course-card__eyebrow {
    grid-column: 1;
    grid-row: 1;
    justify-content: flex-start;
  }

  .courses-grid--list .course-title {
    grid-column: 1;
    grid-row: 2;
    font-size: 1rem;
  }

  .courses-grid--list .course-progress-wrap {
    grid-column: 2;
    grid-row: 1 / 3;
  }

  .courses-grid--list .course-stats {
    grid-column: 3;
    grid-row: 1 / 3;
  }

  .courses-grid--list .btn-levels {
    grid-column: 4;
    grid-row: 1 / 3;
    white-space: nowrap;
  }

  /* El aviso de repaso no entra en la fila: va abajo, a lo ancho. */
  .courses-grid--list .topics-review {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  /* Angosto: las 4 columnas no entran, pero volver a la tarjeta apilada haría
     que la lista se vea igual que la grilla. En vez de eso, fila compacta:
     contenido a la izquierda, acción a la derecha. */
  @media (max-width: 900px) {
    .courses-grid--list .course-card {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 4px 12px;
      padding: 10px 14px;
    }

    .courses-grid--list .course-card__eyebrow {
      grid-column: 1;
      grid-row: 1;
    }

    .courses-grid--list .course-title {
      grid-column: 1;
      grid-row: 2;
      font-size: 0.95rem;
    }

    .courses-grid--list .course-progress-wrap {
      grid-column: 1;
      grid-row: 3;
      gap: 4px;
    }

    /* Las tres métricas son el grueso del alto de la tarjeta y no son lo que
       el alumno viene a buscar en una lista. */
    .courses-grid--list .course-stats {
      display: none;
    }

    .courses-grid--list .btn-levels {
      grid-column: 2;
      grid-row: 1 / 4;
      padding: 10px;
    }

    .courses-grid--list .topics-review {
      grid-column: 1 / -1;
      grid-row: 4;
    }

    /* Sin hover en táctil, el desplazamiento al pasar por encima sobra. */
    .courses-grid--list .course-card:hover {
      transform: none;
    }
  }

  @media (max-width: 640px) {
    /* El texto del botón ya lo dice el contexto: queda solo el ícono, con
       44px de área de toque. */
    .courses-grid--list .btn-levels__label {
      display: none;
    }

    .courses-grid--list .btn-levels {
      min-width: 44px;
      min-height: 44px;
      display: grid;
      place-items: center;
    }

    /* "Progreso del curso" repetido en cada fila es ruido; el % alcanza. */
    .courses-grid--list .progress-label {
      display: none;
    }

    .courses-grid--list .course-progress-header {
      justify-content: flex-end;
    }

    .courses-grid--list .progress-bar {
      height: 6px;
    }

    .courses-grid--list .course-subject,
    .courses-grid--list .course-level-pill {
      padding: 3px 7px;
    }
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
