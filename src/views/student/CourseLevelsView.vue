<template>
  <StudentLayout>
    <div class="levels-shell">
      <!-- Header -->
      <header class="levels-header">
        <button class="btn-back" @click="router.back()">
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="header-info">
          <div class="header-kicker">Mis niveles</div>
          <h1 class="header-title">{{ courseTitle }}</h1>
        </div>
        <div v-if="loading" class="current-level-badge-skeleton">
          <Skeleton width="60px" height="10px" />
          <Skeleton width="40px" height="32px" class="mt-4" />
        </div>
        <div v-else class="current-level-badge">
          <span class="cl-label">Nivel actual</span>
          <span class="cl-value">{{ data?.current_level }}</span>
        </div>
      </header>

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div class="levels-list">
          <div v-for="n in 3" :key="n" class="level-card level-card--skeleton">
            <div class="lc-header">
              <Skeleton variant="avatar" size="44px" :rounded="false" class="lc-num-skeleton" />
              <div class="lc-meta">
                <Skeleton width="80px" height="16px" />
                <Skeleton width="70px" height="20px" class="mt-4" />
              </div>
            </div>
            <div class="lc-body">
              <div class="lc-section">
                <Skeleton width="80px" height="12px" />
                <div class="lc-items">
                  <div v-for="i in 2" :key="i" class="lc-item-skeleton">
                    <div class="lc-item-info">
                      <Skeleton width="140px" height="14px" />
                      <Skeleton width="80px" height="12px" class="mt-4" />
                    </div>
                    <Skeleton width="16px" height="16px" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Levels list -->
      <div v-else-if="data" class="levels-list">
        <div
          v-for="lv in data.levels"
          :key="lv.level"
          class="level-card"
          :class="{
            'level-card--current': lv.level === data.current_level,
            'level-card--locked': !lv.unlocked
          }"
        >
          <!-- Level header -->
          <div class="lc-header">
            <div class="lc-num" :class="{ 'lc-num--locked': !lv.unlocked }">
              <i v-if="!lv.unlocked" class="pi pi-lock"></i>
              <span v-else>{{ lv.level }}</span>
            </div>
            <div class="lc-meta">
              <div class="lc-title">Nivel {{ lv.level }}</div>
              <div class="lc-status">
                <span v-if="!lv.unlocked" class="status-tag status-tag--locked">Bloqueado</span>
                <span v-else-if="lv.level === data.current_level" class="status-tag status-tag--active">En curso</span>
                <span v-else class="status-tag status-tag--done">Completado</span>
              </div>
            </div>
            <div v-if="lv.level === data.current_level" class="lc-current-indicator">
              <i class="pi pi-star-fill"></i> Aquí estás
            </div>
          </div>

          <!-- Content (only when unlocked) -->
          <div v-if="lv.unlocked" class="lc-body">
            <!-- Practices -->
            <div v-if="lv.practices?.length" class="lc-section">
              <div class="lc-section-label lc-section-label--practice">
                <i class="pi pi-pencil"></i> Prácticas
              </div>
              <div class="lc-items">
                <button
                  v-for="sheet in lv.practices"
                  :key="sheet.id"
                  class="lc-item lc-item--practice"
                  @click="router.push(`/student/practice/${sheet.id}`)"
                >
                  <div class="lc-item-info">
                    <span class="lc-item-title">{{ sheet.title }}</span>
                    <span class="lc-item-meta">{{ sheet.exercises }} ejercicios</span>
                  </div>
                  <i class="pi pi-arrow-right lc-item-arrow"></i>
                </button>
              </div>
            </div>

            <!-- Notebooks -->
            <div v-if="lv.notebooks?.length" class="lc-section">
              <div class="lc-section-label lc-section-label--notebook">
                <i class="pi pi-book"></i> Cuadernos
              </div>
              <div class="lc-items">
                <button
                  v-for="nb in lv.notebooks"
                  :key="nb.id"
                  class="lc-item lc-item--notebook"
                  @click="router.push(`/student/notebook/${nb.id}`)"
                >
                  <div class="lc-item-info">
                    <span class="lc-item-title">{{ nb.title }}</span>
                    <span class="lc-item-meta">{{ nb.pages }} páginas</span>
                  </div>
                  <i class="pi pi-arrow-right lc-item-arrow"></i>
                </button>
              </div>
            </div>

            <!-- Level test -->
            <div v-if="lv.level_test" class="lc-section">
              <div class="lc-section-label lc-section-label--test">
                <i class="pi pi-star"></i> Prueba de Nivel
              </div>
              <button
                class="lc-item lc-item--test lc-item--test-big"
                @click="goLevelTest(lv.level_test!)"
              >
                <div class="lc-item-info">
                  <span class="lc-item-title">{{ lv.level_test.title }}</span>
                  <span class="lc-item-meta">
                    {{ lv.level_test.exercises }} preguntas ·
                    {{ lv.level_test.test_style === 'canvas' ? 'Hoja' : 'Teclado' }} ·
                    75% para avanzar
                  </span>
                </div>
                <div class="test-cta">
                  {{ lv.level === data.current_level ? 'Rendir prueba' : 'Ver prueba' }}
                  <i class="pi pi-arrow-right"></i>
                </div>
              </button>
            </div>

            <div v-if="!lv.practices?.length && !lv.notebooks?.length && !lv.level_test" class="lc-empty">
              Sin contenido aún
            </div>
          </div>

          <!-- Locked overlay hint -->
          <div v-else class="lc-locked-hint">
            <i class="pi pi-lock"></i>
            Completá el nivel {{ lv.level - 1 }} para desbloquear
          </div>
        </div>
      </div>
    </div>
  </StudentLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StudentLayout from '@/layouts/StudentLayout.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { levelService } from '@/services/levels/levelService'
import { courseService } from '@/services/courses/courseService'
import type { CourseLevelsResponse, LevelSheetSummary } from '@/types'

const route = useRoute()
const router = useRouter()
const courseId = route.params.courseId as string

const loading = ref(true)
const data = ref<CourseLevelsResponse | null>(null)
const courseTitle = ref('')

onMounted(async () => {
  try {
    const [levelsRes, courseRes] = await Promise.allSettled([
      levelService.getCourseLevels(courseId),
      courseService.get(courseId)
    ])
    if (levelsRes.status === 'fulfilled') data.value = levelsRes.value
    if (courseRes.status === 'fulfilled') courseTitle.value = courseRes.value.data?.title || ''
  } finally {
    loading.value = false
  }
})

function goLevelTest(sheet: LevelSheetSummary) {
  router.push(`/student/level-test/${sheet.id}`)
}
</script>

<style scoped>
.levels-shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header */
.levels-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: rgba(255,255,255,0.92);
  border-radius: var(--radius-2xl);
  border: 1.5px solid rgba(124, 58, 237, 0.1);
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.06);
}

.btn-back {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid rgba(124, 58, 237, 0.2);
  background: rgba(255,255,255,0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}
.btn-back:hover { background: rgba(124,58,237,0.06); }

.header-info { flex: 1; }
.header-kicker {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--practiq-violet);
  margin-bottom: 4px;
}
.header-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
}

.current-level-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 20px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border-radius: var(--radius-xl);
  color: #fff;
  flex-shrink: 0;
}
.cl-label { font-size: 10px; font-weight: 600; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.06em; }
.cl-value { font-size: 1.8rem; font-weight: 800; line-height: 1; }

/* Skeleton styles */
.current-level-badge-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 20px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: var(--radius-xl);
  flex-shrink: 0;
}
.level-card--skeleton .lc-num-skeleton { border-radius: var(--radius-lg); }
.lc-item-skeleton {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(248,250,252,0.8);
  border-radius: var(--radius-md);
}
.mt-4 { margin-top: 4px; }

/* Levels list */
.levels-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.level-card {
  background: rgba(255,255,255,0.9);
  border-radius: var(--radius-2xl);
  border: 1.5px solid rgba(124, 58, 237, 0.08);
  overflow: hidden;
  transition: box-shadow 0.15s;
}

.level-card--current {
  border-color: rgba(124, 58, 237, 0.3);
  box-shadow: 0 8px 32px rgba(124, 58, 237, 0.1);
}

.level-card--locked {
  background: rgba(248, 250, 252, 0.8);
  border-color: rgba(148, 163, 184, 0.2);
}

/* Level card header */
.lc-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-bottom: 1.5px solid rgba(124, 58, 237, 0.06);
}

.level-card--locked .lc-header {
  border-bottom-color: transparent;
}

.lc-num {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
  font-size: 1.3rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}
.lc-num--locked {
  background: rgba(148, 163, 184, 0.2);
  color: var(--text-muted);
  box-shadow: none;
}

.lc-meta { flex: 1; }
.lc-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.level-card--locked .lc-title { color: var(--text-secondary); }

.status-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 700;
}
.status-tag--locked { background: rgba(148,163,184,0.15); color: var(--text-muted); }
.status-tag--active { background: rgba(124,58,237,0.1); color: var(--practiq-violet); }
.status-tag--done { background: rgba(16,185,129,0.1); color: var(--color-success-dark); }

.lc-current-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--practiq-violet);
  background: rgba(124,58,237,0.08);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

/* Level card body */
.lc-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lc-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lc-section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.lc-section-label--practice { color: var(--color-success-dark); }
.lc-section-label--notebook { color: #7c3aed; }
.lc-section-label--test     { color: #d97706; }

.lc-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1.5px solid transparent;
  background: rgba(248,250,252,0.8);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
  width: 100%;
}

.lc-item--practice {
  border-color: rgba(16,185,129,0.15);
  background: rgba(236,253,245,0.5);
}
.lc-item--practice:hover {
  border-color: rgba(16,185,129,0.3);
  background: rgba(236,253,245,0.9);
  transform: translateX(2px);
}

.lc-item--notebook {
  border-color: rgba(124,58,237,0.12);
  background: rgba(245,243,255,0.5);
}
.lc-item--notebook:hover {
  border-color: rgba(124,58,237,0.25);
  background: rgba(245,243,255,0.9);
  transform: translateX(2px);
}

.lc-item--test {
  border-color: rgba(245,158,11,0.2);
  background: rgba(255,251,235,0.5);
}
.lc-item--test-big {
  padding: 16px 18px;
}
.lc-item--test:hover {
  border-color: rgba(245,158,11,0.4);
  background: rgba(255,251,235,0.9);
  transform: translateX(2px);
}

.lc-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.lc-item-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
}
.lc-item-meta {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.lc-item-arrow {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-left: 8px;
}

.test-cta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--color-warning), #d97706);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  flex-shrink: 0;
  white-space: nowrap;
}

.lc-empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 8px 0;
}

.lc-locked-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

@media (max-width: 1024px) {
  .levels-shell {
    padding: 20px 16px 48px;
  }
  .levels-header {
    padding: 16px 20px;
  }
}

@media (max-width: 768px) {
  .levels-shell {
    padding: 16px 12px 40px;
    gap: 14px;
  }
  .levels-header {
    padding: 14px 16px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .header-title {
    font-size: 1.1rem;
  }
  .current-level-badge {
    padding: 8px 14px;
  }
  .cl-value {
    font-size: 1.5rem;
  }
  .lc-header {
    padding: 14px 16px;
    gap: 10px;
    flex-wrap: wrap;
  }
  .lc-current-indicator {
    width: 100%;
  }
  .lc-body {
    padding: 12px 16px;
  }
  .lc-item {
    padding: 10px 12px;
  }
  .lc-item--test-big {
    padding: 12px 14px;
  }
  .test-cta {
    padding: 6px 12px;
    font-size: 0.78rem;
  }
}

@media (max-width: 600px) {
  .levels-shell {
    padding: 12px 8px 32px;
    gap: 10px;
  }
  .levels-header {
    padding: 12px;
  }
  .lc-header {
    padding: 12px;
  }
  .lc-body {
    padding: 10px 12px;
  }
  .lc-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .test-cta {
    align-self: flex-end;
  }
  .lc-item-arrow {
    display: none;
  }
}
</style>
