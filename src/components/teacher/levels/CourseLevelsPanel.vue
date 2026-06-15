<script setup lang="ts">
  import type {
    CourseLevelsPanelEmits,
    CourseLevelsPanelProps,
  } from "./CourseLevelsPanel.types";

  defineProps<CourseLevelsPanelProps>();
  const emit = defineEmits<CourseLevelsPanelEmits>();

  const countExercises = (value: unknown) =>
    Array.isArray(value) ? value.length : Number(value || 0);
  const countPages = (value: unknown) =>
    Array.isArray(value) ? value.length : Number(value || 0);
</script>

<template>
  <div class="tab-content">
    <div class="section-header">
      <div>
        <h2>Niveles del curso</h2>
        <p class="section-copy">
          Define aquí el contenido de cada nivel. El alumno verá actividad
          cuando existan prácticas, pruebas o cuadernos asignados a un nivel.
        </p>
      </div>
      <button class="btn btn-primary btn-sm" @click="emit('createNextLevel')">
        <i class="pi pi-plus"></i> Agregar nivel
      </button>
    </div>

    <div class="levels-grid">
      <article v-for="lv in levels" :key="lv.level" class="teacher-level-card">
        <div class="teacher-level-card__top">
          <div>
            <div class="teacher-level-label">Nivel {{ lv.level }}</div>
            <div class="teacher-level-meta">
              {{ lv.practices.length }} prácticas ·
              {{ lv.levelTest ? "1 prueba" : "0 pruebas" }} ·
              {{ lv.notebooks.length }} cuadernos
            </div>
          </div>
          <div class="teacher-level-actions">
            <button
              class="btn btn-secondary btn-sm"
              @click="emit('createPractice', lv.level)"
            >
              <i class="pi pi-pencil"></i> Práctica
            </button>
            <button
              class="btn btn-secondary btn-sm"
              @click="emit('createLevelTest', lv.level)"
            >
              <i class="pi pi-star"></i> Prueba
            </button>
            <button
              class="btn btn-secondary btn-sm"
              @click="emit('createNotebook', lv.level)"
            >
              <i class="pi pi-book"></i> Cuaderno
            </button>
          </div>
        </div>

        <div class="teacher-level-sections">
          <div class="teacher-level-block">
            <div class="teacher-level-block__title">Prácticas</div>
            <div v-if="lv.practices.length" class="mini-list">
              <button
                v-for="sheet in lv.practices"
                :key="sheet.id"
                type="button"
                class="mini-item mini-item--link"
                @click="emit('openSheet', sheet.id)"
              >
                <span>{{ sheet.title }}</span>
                <small>{{ countExercises(sheet.exercises) }} ejercicios</small>
              </button>
            </div>
            <div v-else class="mini-empty">Sin prácticas</div>
          </div>

          <div class="teacher-level-block">
            <div class="teacher-level-block__title">Prueba de nivel</div>
            <div v-if="lv.levelTest" class="mini-list">
              <button
                type="button"
                class="mini-item mini-item--link"
                @click="emit('openSheet', lv.levelTest.id)"
              >
                <span>{{ lv.levelTest.title }}</span>
                <small
                  >{{ countExercises(lv.levelTest.exercises) }} ejercicios ·
                  {{ lv.levelTest.test_style }}</small
                >
              </button>
            </div>
            <div v-else class="mini-empty">Sin prueba asignada</div>
          </div>

          <div class="teacher-level-block">
            <div class="teacher-level-block__title">Cuadernos</div>
            <div v-if="lv.notebooks.length" class="mini-list">
              <button
                v-for="nb in lv.notebooks"
                :key="nb.id"
                type="button"
                class="mini-item mini-item--link"
                @click="emit('openNotebook', nb.id)"
              >
                <span>{{ nb.title }}</span>
                <small>{{ countPages(nb.pages) }} páginas</small>
              </button>
            </div>
            <div v-else class="mini-empty">Sin cuadernos</div>
          </div>
        </div>
      </article>
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
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }
  .section-header h2 {
    margin: 0;
    color: var(--text-heading);
    font-size: 1.25rem;
    font-weight: 800;
  }
  .section-copy {
    margin: 6px 0 0;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    max-width: 680px;
  }
  .levels-grid {
    display: grid;
    gap: 16px;
  }
  .teacher-level-card {
    background: var(--surface-card);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-xl);
    padding: 16px;
    transition: var(--transition-fast);
  }
  .teacher-level-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }
  .teacher-level-card__top,
  .teacher-level-actions,
  .teacher-level-sections {
    display: flex;
  }
  .teacher-level-card__top {
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }
  .teacher-level-actions {
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .teacher-level-label {
    font-weight: 800;
    color: var(--text-heading);
  }
  .teacher-level-meta {
    color: var(--text-secondary);
    font-size: var(--text-sm);
    margin-top: 4px;
  }
  .teacher-level-sections {
    margin-top: 14px;
    gap: 12px;
    align-items: stretch;
  }
  .teacher-level-block {
    flex: 1;
    min-width: 0;
    background: var(--surface-hover);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    padding: 12px;
  }
  .teacher-level-block__title {
    font-size: var(--text-xs);
    font-weight: 800;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }
  .mini-list {
    display: grid;
    gap: 8px;
  }
  .mini-item {
    width: 100%;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    background: var(--surface-elevated);
    padding: 9px 10px;
    text-align: left;
    display: grid;
    gap: 2px;
  }
  .mini-item--link {
    cursor: pointer;
    transition: var(--transition-fast);
  }
  .mini-item--link:hover {
    border-color: var(--practiq-violet);
    transform: translateY(-1px);
  }
  .mini-item span {
    color: var(--text-primary);
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mini-item small,
  .mini-empty {
    color: var(--text-secondary);
    font-size: var(--text-xs);
  }
  @media (max-width: 760px) {
    .section-header,
    .teacher-level-card__top,
    .teacher-level-actions {
      flex-direction: column;
      align-items: stretch;
    }
    .teacher-level-sections {
      flex-direction: column;
    }
  }
</style>
