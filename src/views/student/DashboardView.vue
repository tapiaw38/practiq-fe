<template>
  <StudentLayout>
    <div class="student-home">
      <div v-if="loading" class="loading-state">
        <div class="spinner spinner-violet"></div>
      </div>

      <template v-else>
        <!-- Welcome banner -->
        <section class="welcome-banner">
          <div class="welcome-copy">
            <div class="welcome-kicker">Tu práctica de hoy</div>
            <h1 class="welcome-title">Hola, {{ firstName }}.</h1>
            <p class="welcome-subtitle">
              Sigamos avanzando con ejercicios cortos, retroalimentación inmediata y ayuda paso a paso.
            </p>
          </div>

          <div class="welcome-topic-card">
            <div class="topic-card__top">
              <div>
                <div class="topic-card__label">Tema actual</div>
                <div class="topic-card__name">{{ currentTopic }}</div>
              </div>
              <div class="topic-card__level">Nivel {{ currentLevel }}</div>
            </div>
            <div class="progress-bar topic-progress">
              <div class="progress-fill" :style="{ width: averageMastery + '%' }"></div>
            </div>
            <div class="topic-progress-meta">
              <span>{{ Math.round(averageMastery) }}% de dominio</span>
              <span>{{ totalSheets }} prácticas disponibles</span>
            </div>
          </div>

          <div class="welcome-actions">
            <button class="btn btn-primary welcome-btn" @click="startFeaturedPractice" :disabled="!featuredSheetId">
              <i class="pi pi-play-circle"></i>
              Continuar práctica
            </button>
            <button class="btn btn-secondary welcome-btn" @click="scrollToCourses">
              Ver mis cursos
            </button>
          </div>
        </section>

        <!-- Metrics row -->
        <section class="metrics-row">
          <div class="metric-card">
            <div class="metric-card__icon metric-card__icon--fire">🔥</div>
            <div>
              <div class="metric-card__value">{{ streakDays }}</div>
              <div class="metric-card__label">Racha</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-card__icon metric-card__icon--star">⭐</div>
            <div>
              <div class="metric-card__value">{{ earnedPoints }}</div>
              <div class="metric-card__label">Puntos</div>
            </div>
          </div>

          <div class="metric-card metric-card--goal">
            <div class="metric-card__icon metric-card__icon--goal">🎯</div>
            <div class="metric-goal-body">
              <div class="metric-goal-top">
                <span class="metric-card__label">Meta de hoy</span>
                <span class="metric-goal-count">{{ completedGoals }}/{{ todayGoalTarget }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: goalProgress + '%' }"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Progress section -->
        <section v-if="progress.length > 0" class="mastery-section">
          <div class="section-head">
            <div>
              <div class="section-kicker">Resumen rápido</div>
              <h2 class="section-title">Tu progreso por tema</h2>
            </div>
          </div>

          <div class="mastery-grid">
            <article v-for="p in progress" :key="p.topic_id" class="mastery-card">
              <div class="mastery-card__top">
                <div class="mastery-topic">{{ p.topic_title }}</div>
                <div class="mastery-level">Nivel {{ p.current_level }}</div>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: p.mastery_score + '%' }"></div>
              </div>
              <div class="mastery-meta">
                <span>{{ Math.round(p.mastery_score) }}% dominio</span>
                <span>{{ p.correct_attempts }}/{{ p.total_attempts }} aciertos</span>
              </div>
            </article>
          </div>
        </section>

        <!-- Courses section -->
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
                <span class="course-subject">{{ course.subject || 'General' }}</span>
                <span class="course-count">{{ practiceSheets(course.id).length }} prácticas · {{ levelTests(course.id).length }} pruebas</span>
              </div>
              <button class="course-toggle" @click="toggleCourse(course.id)">
                <h3 class="course-title">{{ course.title }}</h3>
                <i class="pi" :class="openCards.has(course.id) ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
              </button>
              <p v-if="openCards.has(course.id)" class="course-desc">{{ course.description || 'Sin descripción' }}</p>

              <template v-if="openCards.has(course.id)">
              <!-- Prácticas -->
              <div v-if="practiceSheets(course.id).length" class="sheets-section">
                <div class="sheets-header">
                  <span class="sheets-label sheets-label--practice">📝 Prácticas</span>
                </div>
                <div class="sheets-list">
                  <button
                    v-for="sheet in practiceSheets(course.id)"
                    :key="sheet.id"
                    class="sheet-btn sheet-btn--practice"
                    @click="startPractice(sheet.id)"
                  >
                    <div class="sheet-info">
                      <span class="sheet-title">{{ sheet.title }}</span>
                      <span class="sheet-meta">Nivel {{ sheet.level }} · {{ sheet.exercises?.length || '?' }} ejercicios</span>
                    </div>
                    <i class="pi pi-arrow-right"></i>
                  </button>
                </div>
              </div>

              <!-- Pruebas de nivel -->
              <div v-if="levelTests(course.id).length" class="sheets-section">
                <div class="sheets-header">
                  <span class="sheets-label sheets-label--test">🏆 Pruebas de Nivel</span>
                </div>
                <div class="sheets-list">
                  <button
                    v-for="sheet in levelTests(course.id)"
                    :key="sheet.id"
                    class="sheet-btn sheet-btn--test"
                    @click="openLevelTest(sheet.id)"
                  >
                    <div class="sheet-info">
                      <span class="sheet-title">{{ sheet.title }}</span>
                      <span class="sheet-meta">Nivel {{ sheet.level }} · {{ sheet.test_style === 'canvas' ? 'Hoja' : 'Teclado' }}</span>
                    </div>
                    <i class="pi pi-arrow-right"></i>
                  </button>
                </div>
              </div>

              <!-- Sin hojas -->
              <div v-if="!practiceSheets(course.id).length && !levelTests(course.id).length" class="sheets-section">
                <div class="sheets-empty">No hay hojas disponibles aún</div>
              </div>

              <!-- Cuadernos -->
              <div v-if="courseNotebooks[course.id]?.length" class="sheets-section">
                <div class="sheets-header">
                  <span class="sheets-label sheets-label--notebook">📓 Cuadernos</span>
                </div>
                <div class="sheets-list">
                  <button
                    v-for="nb in courseNotebooks[course.id]"
                    :key="nb.id"
                    class="sheet-btn sheet-btn--notebook"
                    @click="openNotebook(nb.id)"
                  >
                    <div class="sheet-info">
                      <span class="sheet-title">{{ nb.title }}</span>
                      <span class="sheet-meta">{{ nb.pages?.length || 0 }} páginas</span>
                    </div>
                    <i class="pi pi-arrow-right"></i>
                  </button>
                </div>
              </div>
              </template>
            </article>
          </div>
        </section>
      </template>
    </div>
  </StudentLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import StudentLayout from '@/layouts/StudentLayout.vue'
import { courseService } from '@/services/courses/courseService'
import { practiceSheetService } from '@/services/practiceSheets/practiceSheetService'
import { notebookService } from '@/services/notebooks/notebookService'
import { progressService } from '@/services/progress/progressService'
import { profileService } from '@/services/profile/profileService'
import type { Course, PracticeSheet, TopicProgress, Notebook } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const courses = ref<Course[]>([])
const progress = ref<TopicProgress[]>([])
const courseSheets = ref<Record<string, PracticeSheet[]>>({})
const courseNotebooks = ref<Record<string, Notebook[]>>({})
const loading = ref(true)
const openCards = ref(new Set<string>())

function toggleCourse(id: string) {
  const s = new Set(openCards.value)
  s.has(id) ? s.delete(id) : s.add(id)
  openCards.value = s
}

const firstName = computed(() => {
  const name = authStore.profile?.name || ''
  return name.split(' ')[0] || 'Estudiante'
})

const currentTopic = computed(() => progress.value[0]?.topic_title || 'Fracciones')
const currentLevel = computed(() => progress.value[0]?.current_level || 3)
const streakDays = computed(() => Math.max(...progress.value.map((p) => p.streak_days), 0) || 12)
const averageMastery = computed(() => {
  if (!progress.value.length) return 68
  return progress.value.reduce((acc, item) => acc + item.mastery_score, 0) / progress.value.length
})
const totalSheets = computed(() =>
  Object.values(courseSheets.value).reduce((acc, items) => acc + items.length, 0)
)
const completedGoals = computed(() =>
  progress.value.reduce((acc, item) => acc + item.correct_attempts, 0)
)
const todayGoalTarget = computed(() => Math.max(10, progress.value.length * 3 || 10))
const goalProgress = computed(() =>
  Math.min(100, Math.round((completedGoals.value / todayGoalTarget.value) * 100))
)
const earnedPoints = computed(() =>
  progress.value.reduce((acc, item) => acc + item.correct_attempts * 12, 0) || 120
)
const featuredSheetId = computed(() => {
  for (const course of courses.value) {
    const firstSheet = courseSheets.value[course.id]?.[0]
    if (firstSheet) return firstSheet.id
  }
  return ''
})

onMounted(async () => {
  if (!authStore.profile) {
    try {
      const res = await profileService.get()
      authStore.setProfile(res.data)
    } catch {}
  }

  try {
    const [coursesRes, progressRes] = await Promise.allSettled([
      courseService.list('student'),
      progressService.getMyProgress()
    ])

    if (coursesRes.status === 'fulfilled') {
      courses.value = coursesRes.value.data || []
      await Promise.all(courses.value.map(async (c) => {
        try {
          const sheetsRes = await practiceSheetService.list(c.id)
          courseSheets.value[c.id] = sheetsRes.data || []
        } catch {
          courseSheets.value[c.id] = []
        }
        try {
          courseNotebooks.value[c.id] = await notebookService.list(c.id)
        } catch {
          courseNotebooks.value[c.id] = []
        }
      }))
    }

    if (progressRes.status === 'fulfilled') {
      progress.value = progressRes.value.data || []
    }
  } finally {
    loading.value = false
  }
})

function practiceSheets(courseId: string) {
  return (courseSheets.value[courseId] || []).filter(s => s.sheet_type !== 'level_test')
}

function levelTests(courseId: string) {
  return (courseSheets.value[courseId] || []).filter(s => s.sheet_type === 'level_test')
}

function startPractice(sheetId: string) {
  router.push(`/student/practice/${sheetId}`)
}

function openLevelTest(sheetId: string) {
  router.push(`/student/level-test/${sheetId}`)
}

function openNotebook(notebookId: string) {
  router.push(`/student/notebook/${notebookId}`)
}

function startFeaturedPractice() {
  if (featuredSheetId.value) startPractice(featuredSheetId.value)
}

function scrollToCourses() {
  document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.student-home {
  padding: 24px 28px 40px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 80px;
}

/* ── Welcome banner ── */
.welcome-banner {
  padding: 28px 32px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(124, 58, 237, 0.12), transparent 28%),
    radial-gradient(circle at bottom right, rgba(96, 165, 250, 0.1), transparent 22%),
    rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 20px 48px rgba(98, 112, 149, 0.1);
  margin-bottom: 20px;
}

.welcome-kicker,
.section-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  color: var(--practiq-violet-dark);
  margin-bottom: 6px;
}

.welcome-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  line-height: 1.1;
  color: #162033;
  margin-bottom: 6px;
  font-weight: 800;
}

.welcome-subtitle {
  max-width: 560px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.65;
  margin-bottom: 20px;
}

.welcome-topic-card {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 18px;
  padding: 16px 20px;
  margin-bottom: 18px;
  max-width: 600px;
}

.topic-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.topic-card__label {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.topic-card__name {
  font-size: 18px;
  font-weight: 700;
  color: #1e1f4b;
}

.topic-card__level {
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(124, 58, 237, 0.1);
  color: var(--practiq-violet-dark);
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.topic-progress {
  margin-bottom: 8px;
}

.topic-progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.welcome-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.welcome-btn {
  min-height: 44px;
  border-radius: 14px;
  font-size: 14px;
}

/* ── Metrics row ── */
.metrics-row {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 16px;
  margin-bottom: 28px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 24px rgba(93, 108, 146, 0.08);
}

.metric-card--goal {
  gap: 14px;
}

.metric-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 22px;
  flex-shrink: 0;
}

.metric-card__icon--fire { background: linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(239, 68, 68, 0.1)); }
.metric-card__icon--star { background: linear-gradient(135deg, rgba(250, 204, 21, 0.2), rgba(124, 58, 237, 0.1)); }
.metric-card__icon--goal { background: linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(96, 165, 250, 0.1)); }

.metric-card__value {
  font-size: 28px;
  line-height: 1;
  font-weight: 800;
  color: #17203a;
}

.metric-card__label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 3px;
}

.metric-goal-body {
  flex: 1;
  min-width: 0;
}

.metric-goal-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.metric-goal-count {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

/* ── Progress section ── */
.mastery-section,
.courses-section {
  margin-top: 8px;
  margin-bottom: 28px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 22px;
  font-weight: 800;
  color: #162033;
  line-height: 1.2;
}

.mastery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.mastery-card {
  padding: 18px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 20px rgba(93, 108, 146, 0.08);
}

.mastery-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.mastery-topic {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.mastery-level {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(124, 58, 237, 0.08);
  color: var(--practiq-violet-dark);
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.mastery-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
}

/* ── Courses section ── */
.empty-state {
  text-align: center;
  padding: 64px 20px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  border: 1px dashed var(--surface-border);
  color: var(--text-secondary);
}

.empty-icon { font-size: 48px; margin-bottom: 14px; }
.empty-state h3 { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.empty-state p { font-size: 14px; }

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.course-card {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 28px rgba(93, 108, 146, 0.08);
}

.course-card__eyebrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.course-subject {
  display: inline-flex;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(124, 58, 237, 0.1);
  color: var(--practiq-violet-dark);
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
}

.course-count {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}

.course-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
  margin-bottom: 6px;
}
.course-toggle .pi {
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: var(--transition);
}
.course-toggle:hover .pi { color: var(--practiq-violet); }

.course-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

.course-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.sheets-section {
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  padding-top: 14px;
}

.sheets-header { margin-bottom: 10px; }

.sheets-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sheets-empty {
  font-size: 13px;
  color: var(--text-muted);
  padding: 8px 0;
}

.sheets-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sheet-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(124, 58, 237, 0.1);
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,243,255,0.9));
  cursor: pointer;
  transition: var(--transition);
  text-align: left;
}

.sheet-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 58, 237, 0.24);
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.08);
}

.sheets-label--practice { color: #059669; }
.sheets-label--test     { color: #d97706; }
.sheets-label--notebook { color: #7c3aed; }

.sheet-btn--practice {
  border-color: rgba(16, 185, 129, 0.15);
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(236,253,245,0.9));
}
.sheet-btn--practice:hover {
  border-color: rgba(16, 185, 129, 0.3);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.08);
}

.sheet-btn--test {
  border-color: rgba(245, 158, 11, 0.2);
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,251,235,0.9));
}
.sheet-btn--test:hover {
  border-color: rgba(245, 158, 11, 0.35);
  box-shadow: 0 8px 20px rgba(245, 158, 11, 0.1);
}

.sheet-btn--notebook {
  border-color: rgba(124, 58, 237, 0.15);
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,243,255,0.9));
}
.sheet-btn--notebook:hover {
  border-color: rgba(124, 58, 237, 0.3);
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.08);
}

.sheet-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sheet-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.sheet-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .metrics-row {
    grid-template-columns: 1fr 1fr;
  }
  .metric-card--goal {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .student-home { padding: 16px 14px 28px; }
  .welcome-banner { padding: 22px 18px; border-radius: 22px; }
  .welcome-title { font-size: 1.6rem; }
  .welcome-actions { flex-direction: column; }
  .welcome-btn { width: 100%; justify-content: center; }
  .metrics-row { grid-template-columns: 1fr; }
  .metric-card--goal { grid-column: auto; }
  .mastery-grid, .courses-grid { grid-template-columns: 1fr; }
  .section-title { font-size: 18px; }
}
</style>
