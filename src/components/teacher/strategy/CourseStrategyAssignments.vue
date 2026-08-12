<script setup lang="ts">
  import type {
    CourseStrategyAssignmentsEmits,
    CourseStrategyAssignmentsProps,
  } from "./CourseStrategyAssignments.types";

  const props = defineProps<CourseStrategyAssignmentsProps>();
  const emit = defineEmits<CourseStrategyAssignmentsEmits>();

  const getCourseAssignments = (courseId: string) =>
    props.courseAssignments[courseId] || [];
  const getAvailableStrategies = (courseId: string) => {
    const assigned = getCourseAssignments(courseId).map(
      (assignment) => assignment.strategy_id,
    );
    return props.strategies.filter(
      (strategy) => !assigned.includes(strategy.id),
    );
  };
  const selectStrategy = (courseId: string, strategyId: string) => {
    emit("update:selectedStrategyForCourse", {
      ...props.selectedStrategyForCourse,
      [courseId]: strategyId,
    });
  };
</script>

<template>
  <section class="content-section">
    <div class="section-header">
      <div>
        <h2 class="section-title">Asignaciones por curso</h2>
        <p class="section-subtitle">
          Asigna estrategias a tus cursos para personalizar el aprendizaje.
        </p>
      </div>
    </div>

    <div v-if="courses.length === 0" class="empty-state">
      <p>No tienes cursos para asignar estrategias.</p>
    </div>

    <div v-else class="courses-assignments">
      <div
        v-for="course in courses"
        :key="course.id"
        class="course-assignment-card"
      >
        <div class="course-info">
          <h4 class="course-name">{{ course.title }}</h4>
          <span class="course-subject-badge">{{
            course.subject || "General"
          }}</span>
        </div>

        <div class="assigned-strategies">
          <div
            v-for="assignment in getCourseAssignments(course.id)"
            :key="assignment.id"
            class="assigned-strategy"
          >
            <span class="strategy-tag"
              ><i class="pi pi-cog"></i>{{ assignment.strategy.name }}</span
            >
            <button
              class="btn-remove"
              title="Quitar"
              @click="emit('remove', course.id, assignment.id)"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
          <span
            v-if="getCourseAssignments(course.id).length === 0"
            class="no-strategies"
            >Sin estrategias asignadas</span
          >
        </div>

        <div class="assignment-actions">
          <select
            :value="selectedStrategyForCourse[course.id]"
            class="strategy-select"
            @change="
              selectStrategy(
                course.id,
                ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option value="">Seleccionar estrategia...</option>
            <option
              v-for="strategy in getAvailableStrategies(course.id)"
              :key="strategy.id"
              :value="strategy.id"
            >
              {{ strategy.name }}
            </option>
          </select>
          <button
            class="btn btn-sm btn-secondary"
            :disabled="
              !selectedStrategyForCourse[course.id] || assigning[course.id]
            "
            @click="emit('assign', course.id)"
          >
            <i v-if="assigning[course.id]" class="pi pi-spin pi-spinner"></i>
            <i v-else class="pi pi-plus"></i>
            Asignar
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
  .content-section {
    margin-bottom: 28px;
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }
  .section-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text-heading);
  }
  .section-subtitle {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }
  .empty-state,
  .course-assignment-card {
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card);
    padding: 16px;
  }
  .courses-assignments {
    display: grid;
    gap: 12px;
  }
  .course-assignment-card {
    display: grid;
    gap: 12px;
  }
  .course-info,
  .assigned-strategy,
  .strategy-tag,
  .assignment-actions {
    display: flex;
    align-items: center;
  }
  .course-info {
    justify-content: space-between;
    gap: 12px;
  }
  .course-name {
    margin: 0;
    color: var(--text-heading);
    font-size: 1rem;
    font-weight: 800;
  }
  .course-subject-badge,
  .strategy-tag {
    border-radius: var(--radius-pill);
    padding: 5px 9px;
    font-size: var(--text-xs);
    font-weight: 800;
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
  }
  .assigned-strategies {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .assigned-strategy {
    gap: 4px;
  }
  .strategy-tag {
    gap: 5px;
  }
  .btn-remove {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 50%;
    background: var(--color-error-bg);
    color: var(--color-error-dark);
    cursor: pointer;
  }
  .no-strategies {
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }
  .assignment-actions {
    gap: 8px;
  }
  .strategy-select {
    flex: 1;
    min-width: 180px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    background: var(--surface-card);
    color: var(--text-primary);
    padding: 9px 10px;
  }
  @media (max-width: 700px) {
    .course-info,
    .assignment-actions {
      flex-direction: column;
      align-items: stretch;
    }

    /* Tap targets >= 44px en mobile */
    .btn-remove {
      width: 44px;
      height: 44px;
    }
  }
</style>
