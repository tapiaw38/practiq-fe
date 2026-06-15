<script setup lang="ts">
  import { renderEquation } from "@/composables/useContentRenderer";
  import type {
    ExercisesListEmits,
    ExercisesListProps,
  } from "./ExercisesList.types";

  defineProps<ExercisesListProps>();
  const emit = defineEmits<ExercisesListEmits>();

  const diffColor = (difficulty: number) => {
    if (difficulty <= 3) return "var(--color-success-bg)";
    if (difficulty <= 6) return "var(--color-warning-bg)";
    return "var(--color-error-bg)";
  };
</script>

<template>
  <div class="tab-content">
    <div class="section-header">
      <div class="flex gap-3 items-center">
        <h2>Ejercicios</h2>
        <select
          :value="selectedTopicId"
          class="form-select topic-select"
          @change="
            emit(
              'update:selectedTopicId',
              ($event.target as HTMLSelectElement).value,
            )
          "
        >
          <option value="">Seleccionar tema</option>
          <option v-for="topic in topics" :key="topic.id" :value="topic.id">
            {{ topic.title }}
          </option>
        </select>
      </div>
      <button
        class="btn btn-primary btn-sm"
        :disabled="!selectedTopicId"
        @click="emit('create')"
      >
        <i class="pi pi-plus"></i> Nuevo Ejercicio
      </button>
    </div>
    <div v-if="!selectedTopicId" class="empty-inline">
      Selecciona un tema para ver sus ejercicios.
    </div>
    <div v-else-if="exercises.length === 0" class="empty-inline">
      No hay ejercicios en este tema.
    </div>
    <div v-else class="items-list">
      <div v-for="exercise in exercises" :key="exercise.id" class="list-item">
        <div class="item-info">
          <div
            class="difficulty-badge"
            :style="{ background: diffColor(exercise.difficulty) }"
          >
            {{ exercise.difficulty }}
          </div>
          <div>
            <div
              v-if="exercise.type === 'equation'"
              class="item-title item-title--math"
              v-html="renderEquation(exercise.question)"
            ></div>
            <div v-else class="item-title">{{ exercise.question }}</div>
            <div class="item-subtitle">
              {{ exercise.type }}
              <template v-if="exercise.type === 'equation'">
                · Respuesta:
                <span
                  class="answer-math"
                  v-html="renderEquation(exercise.correct_answer || 'N/A')"
                ></span>
              </template>
              <template v-else
                >· Respuesta: {{ exercise.correct_answer || "N/A" }}</template
              >
            </div>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-ghost btn-sm" @click="emit('edit', exercise)">
            <i class="pi pi-pencil"></i>
          </button>
          <button
            class="btn btn-ghost btn-sm"
            @click="emit('delete', exercise.id)"
          >
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .tab-content {
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-card);
    padding: 20px;
  }
  .section-header,
  .item-info,
  .item-actions {
    display: flex;
    align-items: center;
  }
  .section-header {
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }
  .section-header h2 {
    margin: 0;
    color: var(--text-heading);
    font-size: 1.25rem;
    font-weight: 800;
  }
  .topic-select {
    min-width: 220px;
  }
  .empty-inline {
    padding: 18px;
    border: 1px dashed var(--surface-border);
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    text-align: center;
  }
  .items-list {
    display: grid;
    gap: 10px;
  }
  .list-item {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 14px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    transition: var(--transition-fast);
  }
  .list-item:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }
  .item-info {
    gap: 12px;
    min-width: 0;
  }
  .item-title {
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1.3;
  }
  .item-title--math {
    overflow-x: auto;
    padding-block: 2px;
  }
  .item-subtitle {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    margin-top: 3px;
  }
  .difficulty-badge {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    display: grid;
    place-items: center;
    font-weight: 800;
    color: var(--text-primary);
    flex: 0 0 auto;
  }
  .item-actions {
    gap: 8px;
    flex: 0 0 auto;
  }
  @media (max-width: 760px) {
    .section-header,
    .list-item {
      flex-direction: column;
      align-items: stretch;
    }
    .item-actions {
      justify-content: flex-end;
    }
  }
</style>
