<script setup lang="ts">
  import type { LevelSheetSummary } from "@/types";
  import type {
    StudentLevelsListEmits,
    StudentLevelsListProps,
  } from "./StudentLevelsList.types";

  defineProps<StudentLevelsListProps>();
  const emit = defineEmits<StudentLevelsListEmits>();

  // The server rejects an early attempt too; this only keeps the UI honest.
  const isScheduled = (sheet?: LevelSheetSummary | null) =>
    !!sheet?.scheduled_at && new Date(sheet.scheduled_at) > new Date();

  const formatSchedule = (value: string) =>
    new Date(value).toLocaleString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
</script>

<template>
  <div class="levels-list">
    <div
      v-for="level in data.levels"
      :key="level.level"
      class="level-card"
      :class="{
        'level-card--current': level.level === data.current_level,
        'level-card--locked': !level.unlocked,
      }"
    >
      <div class="lc-header">
        <div class="lc-num" :class="{ 'lc-num--locked': !level.unlocked }">
          <i v-if="!level.unlocked" class="pi pi-lock"></i>
          <span v-else>{{ level.level }}</span>
        </div>
        <div class="lc-meta">
          <div class="lc-title">Nivel {{ level.level }}</div>
          <div class="lc-status">
            <span v-if="!level.unlocked" class="status-tag status-tag--locked"
              >Bloqueado</span
            >
            <span
              v-else-if="level.level === data.current_level"
              class="status-tag status-tag--active"
              >En curso</span
            >
            <span v-else class="status-tag status-tag--done">Completado</span>
          </div>
        </div>
        <div
          v-if="level.level === data.current_level"
          class="lc-current-indicator"
        >
          <i class="pi pi-star-fill"></i> Aquí estás
        </div>
      </div>

      <div v-if="level.unlocked" class="lc-body">
        <div v-if="level.practices?.length" class="lc-section">
          <div class="lc-section-label lc-section-label--practice">
            <i class="pi pi-pencil"></i> Prácticas
          </div>
          <div class="lc-items">
            <button
              v-for="sheet in level.practices"
              :key="sheet.id"
              class="lc-item lc-item--practice"
              @click="emit('openPractice', sheet.id)"
            >
              <div class="lc-item-info">
                <span class="lc-item-title">{{ sheet.title }}</span>
                <span class="lc-item-meta"
                  >{{ sheet.exercises }} ejercicios</span
                >
              </div>
              <i class="pi pi-arrow-right lc-item-arrow"></i>
            </button>
          </div>
        </div>

        <div v-if="level.notebooks?.length" class="lc-section">
          <div class="lc-section-label lc-section-label--notebook">
            <i class="pi pi-book"></i> Cuadernos
          </div>
          <div class="lc-items">
            <button
              v-for="notebook in level.notebooks"
              :key="notebook.id"
              class="lc-item lc-item--notebook"
              @click="emit('openNotebook', notebook.id)"
            >
              <div class="lc-item-info">
                <span class="lc-item-title">{{ notebook.title }}</span>
                <span class="lc-item-meta">{{ notebook.pages }} páginas</span>
              </div>
              <i class="pi pi-arrow-right lc-item-arrow"></i>
            </button>
          </div>
        </div>

        <div v-if="level.level_test" class="lc-section">
          <div class="lc-section-label lc-section-label--test">
            <i class="pi pi-star"></i> Prueba de Nivel
          </div>
          <button
            class="lc-item lc-item--test lc-item--test-big"
            :class="{ 'lc-item--scheduled': isScheduled(level.level_test) }"
            :disabled="isScheduled(level.level_test)"
            @click="emit('openLevelTest', level.level_test!)"
          >
            <div class="lc-item-info">
              <span class="lc-item-title">{{ level.level_test.title }}</span>
              <span class="lc-item-meta">
                {{ level.level_test.exercises }} preguntas ·
                {{
                  level.level_test.test_style === "canvas" ? "Hoja" : "Teclado"
                }}
                · 75% para avanzar
              </span>
              <span
                v-if="level.level_test.scheduled_at"
                class="lc-item-schedule"
              >
                <i class="pi pi-calendar-clock"></i>
                {{ formatSchedule(level.level_test.scheduled_at) }}
              </span>
            </div>
            <div class="test-cta">
              <template v-if="isScheduled(level.level_test)">
                <i class="pi pi-lock"></i>
                Disponible en la fecha
              </template>
              <template v-else>
                {{
                  level.level === data.current_level
                    ? "Rendir prueba"
                    : "Ver prueba"
                }}
                <i class="pi pi-arrow-right"></i>
              </template>
            </div>
          </button>
        </div>

        <div
          v-if="
            !level.practices?.length &&
            !level.notebooks?.length &&
            !level.level_test
          "
          class="lc-empty"
        >
          Sin contenido aún
        </div>
      </div>

      <div v-else class="lc-locked-hint">
        <i class="pi pi-lock"></i>
        Completá el nivel {{ level.level - 1 }} para desbloquear
      </div>
    </div>
  </div>
</template>

<style scoped>
  .levels-list {
    display: grid;
    gap: 14px;
  }
  .level-card {
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-card);
    padding: 18px;
  }
  .level-card--current {
    border-color: var(--practiq-violet);
  }
  .level-card--locked {
    opacity: 0.72;
  }
  .level-card--locked .lc-header {
    border-bottom-color: transparent;
  }
  .lc-header,
  .lc-item,
  .test-cta,
  .lc-current-indicator {
    display: flex;
    align-items: center;
  }
  .lc-header {
    gap: 12px;
  }
  .lc-num {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-xl);
    display: grid;
    place-items: center;
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    font-weight: 900;
  }
  .lc-num--locked {
    background: var(--surface-hover);
    color: var(--text-secondary);
  }
  .lc-meta {
    display: grid;
    gap: 4px;
    flex: 1;
  }
  .lc-title {
    font-weight: 900;
    color: var(--text-heading);
  }
  .status-tag {
    border-radius: var(--radius-pill);
    padding: 4px 8px;
    font-size: var(--text-xs);
    font-weight: 800;
  }
  .status-tag--locked {
    background: var(--surface-hover);
    color: var(--text-secondary);
  }
  .status-tag--active {
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
  }
  .status-tag--done {
    background: var(--color-success-bg);
    color: var(--color-success-dark);
  }
  .lc-current-indicator {
    gap: 5px;
    color: var(--practiq-violet);
    font-size: var(--text-sm);
    font-weight: 800;
  }
  .lc-body {
    margin-top: 16px;
    display: grid;
    gap: 14px;
  }
  .lc-section {
    display: grid;
    gap: 8px;
  }
  .lc-section-label {
    font-size: var(--text-xs);
    font-weight: 900;
    text-transform: uppercase;
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .lc-section-label--practice {
    color: var(--practiq-violet);
  }
  .lc-section-label--notebook {
    color: var(--color-info-dark);
  }
  .lc-section-label--test {
    color: var(--color-warning-dark);
  }
  .lc-items {
    display: grid;
    gap: 8px;
  }
  .lc-item {
    width: 100%;
    justify-content: space-between;
    gap: 10px;
    border: 1.5px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
    padding: 12px;
    cursor: pointer;
    color: inherit;
    transition: var(--transition-fast);
  }
  .lc-item--practice {
    border-color: rgba(var(--color-success-rgb), 0.15);
    background: rgba(var(--color-success-rgb), 0.05);
  }
  .lc-item--practice:hover {
    border-color: rgba(var(--color-success-rgb), 0.3);
    background: rgba(var(--color-success-rgb), 0.1);
    transform: translateX(2px);
  }
  .lc-item--notebook {
    border-color: rgba(var(--practiq-violet-rgb), 0.12);
    background: rgba(var(--practiq-violet-rgb), 0.04);
  }
  .lc-item--notebook:hover {
    border-color: rgba(var(--practiq-violet-rgb), 0.25);
    background: rgba(var(--practiq-violet-rgb), 0.08);
    transform: translateX(2px);
  }
  .lc-item--test {
    border-color: rgba(var(--color-warning-rgb), 0.2);
    background: rgba(var(--color-warning-rgb), 0.05);
  }
  .lc-item--test-big {
    padding: 16px 18px;
  }
  .lc-item--test:hover {
    border-color: rgba(var(--color-warning-rgb), 0.4);
    background: rgba(var(--color-warning-rgb), 0.1);
    transform: translateX(2px);
  }
  .lc-item-info {
    display: grid;
    gap: 3px;
    text-align: left;
  }
  .lc-item-title {
    color: var(--text-primary);
    font-weight: 800;
  }
  .lc-item-meta,
  .lc-empty,
  .lc-item--scheduled {
    opacity: 0.65;
    cursor: not-allowed;
  }
  .lc-item-schedule {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--practiq-violet);
  }
  .lc-locked-hint {
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }
  .lc-item-arrow {
    color: var(--text-secondary);
    flex-shrink: 0;
    margin-left: 8px;
  }
  .test-cta {
    gap: 6px;
    color: var(--practiq-violet);
    font-weight: 800;
  }
  .lc-locked-hint {
    display: flex;
    gap: 7px;
    margin-top: 14px;
  }
  @media (max-width: 640px) {
    .lc-header,
    .lc-item {
      align-items: flex-start;
    }
    .lc-current-indicator,
    .test-cta {
      display: none;
    }
  }
</style>
