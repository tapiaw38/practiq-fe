<template>
  <StudentLayout>
    <div class="student-home">
      <!-- Loading skeletons -->
      <template v-if="loading">
        <!-- Welcome skeleton -->
        <section class="welcome-banner welcome-banner--skeleton">
          <div class="welcome-copy">
            <Skeleton width="120px" height="14px" style="margin-bottom: 8px" />
            <Skeleton width="200px" height="32px" style="margin-bottom: 12px" />
            <Skeleton width="90%" height="16px" />
          </div>
          <div class="welcome-topic-card">
            <div class="topic-card__top">
              <div>
                <Skeleton width="80px" height="12px" style="margin-bottom: 6px" />
                <Skeleton width="140px" height="20px" />
              </div>
              <Skeleton width="60px" height="24px" rounded />
            </div>
            <Skeleton width="100%" height="8px" rounded style="margin: 12px 0" />
            <div style="display: flex; justify-content: space-between">
              <Skeleton width="100px" height="12px" />
              <Skeleton width="120px" height="12px" />
            </div>
          </div>
          <div class="welcome-actions">
            <Skeleton variant="button" width="160px" height="44px" />
            <Skeleton variant="button" width="180px" height="44px" />
          </div>
        </section>

        <!-- Metrics skeleton -->
        <section class="metrics-row">
          <div v-for="i in 3" :key="i" class="metric-card metric-card--skeleton">
            <Skeleton variant="circle" size="40px" />
            <div>
              <Skeleton width="50px" height="24px" style="margin-bottom: 4px" />
              <Skeleton width="60px" height="14px" />
            </div>
          </div>
        </section>

        <!-- Progress skeleton -->
        <section class="mastery-section">
          <div class="section-head">
            <div>
              <Skeleton width="100px" height="12px" style="margin-bottom: 6px" />
              <Skeleton width="180px" height="24px" />
            </div>
          </div>
          <div class="mastery-grid">
            <div v-for="i in 3" :key="i" class="mastery-card mastery-card--skeleton">
              <div class="mastery-card__top">
                <Skeleton width="70%" height="16px" />
                <Skeleton width="60px" height="20px" rounded />
              </div>
              <Skeleton width="100%" height="8px" rounded style="margin: 10px 0" />
              <div style="display: flex; justify-content: space-between">
                <Skeleton width="80px" height="12px" />
                <Skeleton width="90px" height="12px" />
              </div>
            </div>
          </div>
        </section>

        <!-- Courses skeleton -->
        <section class="courses-section">
          <div class="section-head">
            <div>
              <Skeleton width="80px" height="12px" style="margin-bottom: 6px" />
              <Skeleton width="140px" height="24px" />
            </div>
          </div>
          <div class="courses-list">
            <div v-for="i in 2" :key="i" class="course-row course-row--skeleton">
              <Skeleton variant="circle" size="48px" />
              <div style="flex: 1">
                <Skeleton width="60%" height="18px" style="margin-bottom: 6px" />
                <Skeleton width="40%" height="14px" />
              </div>
              <Skeleton width="80px" height="32px" rounded />
            </div>
          </div>
        </section>
      </template>

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
              <button class="btn btn-secondary welcome-btn" @click="showAssistant = true">
                <i class="pi pi-comments"></i>
                Practicar con mi asistente
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
              <div class="metric-card__value">{{ totalCorrect }}</div>
              <div class="metric-card__label">Aciertos</div>
            </div>
          </div>

          <div class="metric-card metric-card--goal">
            <div class="metric-card__icon metric-card__icon--goal">🎯</div>
            <div class="metric-goal-body">
              <div class="metric-goal-top">
                <span class="metric-card__label">Precisión global</span>
                <span class="metric-goal-count">{{ totalCorrect }}/{{ totalAttempts }}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: goalProgress + '%' }"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Progress section -->
        <section v-if="groupedProgress.length > 0" class="mastery-section">
          <div class="section-head">
            <div>
              <div class="section-kicker">Resumen rápido</div>
              <h2 class="section-title">Tu progreso por tema</h2>
            </div>
          </div>

          <div class="mastery-grid">
            <article v-for="p in groupedProgress" :key="p.topic_id" class="mastery-card">
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
                <span class="course-level-pill">Nivel {{ courseCurrentLevel[course.id] || 1 }}</span>
              </div>
              <h3 class="course-title">{{ course.title }}</h3>

              <!-- Course Progress Bar -->
              <div class="course-progress-wrap">
                <div class="course-progress-header">
                  <span class="progress-label">Progreso del curso</span>
                  <span class="progress-value">{{ getCourseProgressPercent(course.id) }}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: getCourseProgressPercent(course.id) + '%' }"></div>
                </div>
              </div>

              <!-- Topics needing review -->
              <div v-if="topicsNeedingReview(course.id).length > 0 && !dismissedReviewCards[course.id]" class="topics-review">
                <div class="review-head">
                  <span class="review-label">
                    <i class="pi pi-exclamation-triangle"></i>
                    Repasar
                  </span>
                  <button
                    type="button"
                    class="review-dismiss"
                    aria-label="Ocultar temas para repasar"
                    @click="dismissReviewCard(course.id)"
                  >
                    <i class="pi pi-times"></i>
                  </button>
                </div>
                <div class="review-topics">
                  <span v-for="topic in topicsNeedingReview(course.id).slice(0, 2)" :key="topic.topic_id" class="review-topic-tag">
                    {{ topic.topic_title }}
                  </span>
                  <span v-if="topicsNeedingReview(course.id).length > 2" class="review-more">
                    +{{ topicsNeedingReview(course.id).length - 2 }}
                  </span>
                </div>
              </div>

              <div class="course-stats">
                <div class="course-stat">
                  <span class="course-stat__value">{{ practiceSheets(course.id).length }}</span>
                  <span class="course-stat__label">Practicas</span>
                </div>
                <div class="course-stat-divider"></div>
                <div class="course-stat">
                  <span class="course-stat__value">{{ levelTests(course.id).length }}</span>
                  <span class="course-stat__label">Pruebas</span>
                </div>
                <div class="course-stat-divider"></div>
                <div class="course-stat">
                  <span class="course-stat__value">{{ courseNotebooks[course.id]?.length || 0 }}</span>
                  <span class="course-stat__label">Cuadernos</span>
                </div>
              </div>
              <button class="btn-levels" @click="router.push(`/student/courses/${course.id}/levels`)">
                <i class="pi pi-list"></i> Ver niveles
              </button>
            </article>
          </div>
        </section>
      </template>

      <img src="@/assets/backpack.png" class="dashboard-mascot" alt="" aria-hidden="true" />
    </div>
  </StudentLayout>

  <AssistantChatModal
    :show="showAssistant"
    :student-context="assistantContext"
    @close="showAssistant = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import StudentLayout from '@/layouts/StudentLayout.vue'
import AssistantChatModal from '@/components/AssistantChatModal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { courseService } from '@/services/courses/courseService'
import { practiceSheetService } from '@/services/practiceSheets/practiceSheetService'
import { notebookService } from '@/services/notebooks/notebookService'
import { progressService } from '@/services/progress/progressService'
import { profileService } from '@/services/profile/profileService'
import { levelService } from '@/services/levels/levelService'
import type { Course, PracticeSheet, TopicProgress, Notebook } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const courses = ref<Course[]>([])
const progress = ref<TopicProgress[]>([])
const courseSheets = ref<Record<string, PracticeSheet[]>>({})
const courseNotebooks = ref<Record<string, Notebook[]>>({})
const courseCurrentLevel = ref<Record<string, number>>({})
const dismissedReviewCards = ref<Record<string, boolean>>(loadDismissedReviewCards())
const lastPracticedSheetId = ref<string>('')
const loading = ref(true)
const showAssistant = ref(false)

const firstName = computed(() => {
  const name = authStore.profile?.name || ''
  return name.split(' ')[0] || 'Estudiante'
})

const groupedProgress = computed(() => {
  const map = new Map<string, typeof progress.value[0]>()
  for (const p of progress.value) {
    const existing = map.get(p.topic_id)
    if (!existing) {
      map.set(p.topic_id, { ...p })
    } else {
      existing.mastery_score = Math.max(existing.mastery_score, p.mastery_score)
      existing.current_level = Math.max(existing.current_level, p.current_level)
      existing.total_attempts += p.total_attempts
      existing.correct_attempts += p.correct_attempts
      existing.streak_days = Math.max(existing.streak_days, p.streak_days)
    }
  }
  return Array.from(map.values())
})

const currentTopic = computed(() => groupedProgress.value[0]?.topic_title || '—')
const currentLevel = computed(() => {
  const levels = Object.values(courseCurrentLevel.value)
  return levels.length ? levels[0] : 1
})
const streakDays = computed(() => Math.max(...groupedProgress.value.map((p) => p.streak_days), 0) || 0)
const averageMastery = computed(() => {
  if (!groupedProgress.value.length) return 0
  return groupedProgress.value.reduce((acc, item) => acc + item.mastery_score, 0) / groupedProgress.value.length
})
const totalSheets = computed(() =>
  Object.values(courseSheets.value).reduce(
    (acc, items) => acc + items.filter(s => s.sheet_type !== 'level_test').length, 0
  )
)
const totalCorrect = computed(() =>
  groupedProgress.value.reduce((acc, item) => acc + item.correct_attempts, 0)
)
const totalAttempts = computed(() =>
  groupedProgress.value.reduce((acc, item) => acc + item.total_attempts, 0)
)
const goalProgress = computed(() =>
  totalAttempts.value > 0
    ? Math.min(100, Math.round((totalCorrect.value / totalAttempts.value) * 100))
    : 0
)

const assistantContext = computed(() => ({
  studentName: authStore.profile?.name,
  courses: courses.value.map(c => ({
    title: c.title,
    subject: c.subject_name || c.subject || '',
    grade: c.grade_name || '',
    currentLevel: courseCurrentLevel.value[c.id] ?? 1,
  })),
  topicProgress: groupedProgress.value.map(p => ({
    topic: p.topic_title,
    mastery: p.mastery_score,
    level: p.current_level,
    streak: p.streak_days,
  })),
}))
const featuredSheetId = computed(() => {
  // 1. If we have a last practiced sheet ID from backend, verify it exists and use it
  if (lastPracticedSheetId.value) {
    for (const course of courses.value) {
      const sheets = courseSheets.value[course.id] || []
      const found = sheets.find(s => s.id === lastPracticedSheetId.value)
      if (found) return found.id
    }
  }

  // 2. Fallback: find first practice sheet (not level test) in first course
  for (const course of courses.value) {
    const sheets = (courseSheets.value[course.id] || []).filter(s => s.sheet_type !== 'level_test')
    if (sheets.length > 0) return sheets[0].id
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
        try {
          const lvRes = await levelService.getCourseLevels(c.id)
          courseCurrentLevel.value[c.id] = lvRes.current_level
        } catch {
          courseCurrentLevel.value[c.id] = 1
        }
      }))
    }

    if (progressRes.status === 'fulfilled') {
      progress.value = progressRes.value.data || []
      lastPracticedSheetId.value = progressRes.value.last_practiced_sheet_id || ''
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

function startFeaturedPractice() {
  if (featuredSheetId.value) startPractice(featuredSheetId.value)
}

function scrollToCourses() {
  document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function loadDismissedReviewCards(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem('student-dashboard-dismissed-review-cards') || '{}')
  } catch {
    return {}
  }
}

function dismissReviewCard(courseId: string) {
  dismissedReviewCards.value = {
    ...dismissedReviewCards.value,
    [courseId]: true,
  }
  localStorage.setItem(
    'student-dashboard-dismissed-review-cards',
    JSON.stringify(dismissedReviewCards.value)
  )
}

// Progress helper functions
function getCourseProgressPercent(courseId: string): number {
  const level = courseCurrentLevel.value[courseId] || 1
  // Assume 10 levels max for percentage calculation
  const maxLevels = 10
  return Math.min(100, Math.round((level / maxLevels) * 100))
}

function topicsNeedingReview(courseId: string): typeof progress.value {
  const topicIds = new Set(
    (courseSheets.value[courseId] || [])
      .map(sheet => sheet.topic_id)
      .filter(Boolean)
  )

  if (topicIds.size === 0) return []

  return progress.value
    .filter(p => topicIds.has(p.topic_id) && p.mastery_score < 60 && p.total_attempts > 0)
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 5)
}
</script>

<style scoped>
.student-home {
  position: relative;
  padding: 24px 28px 40px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 80px;
}

/* ── Welcome banner ── */
.welcome-banner {
  position: relative;
  z-index: 2;
  padding: 28px 32px;
  border-radius: 28px;
  background: var(--gradient-card-accent);
  border: 1px solid var(--surface-elevated-strong);
  box-shadow: var(--shadow-soft);
  margin-bottom: 20px;
  backdrop-filter: blur(18px);
}

/* ── Dashboard mascot ── */
.dashboard-mascot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 580px;
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

@media (max-width: 1100px) {
  .dashboard-mascot { width: 440px; }
}

@media (max-width: 640px) {
  .dashboard-mascot { display: none; }
}

.welcome-kicker,
.section-kicker {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  color: var(--practiq-violet-dark);
  margin-bottom: 6px;
}

.welcome-title {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  line-height: 1.1;
  color: var(--text-heading);
  margin-bottom: 6px;
  font-weight: 800;
}

.welcome-subtitle {
  max-width: 560px;
  font-size: var(--text-md);
  color: var(--text-secondary);
  line-height: 1.65;
  margin-bottom: 20px;
}

.welcome-topic-card {
  background: var(--surface-elevated);
  border: 1px solid var(--surface-elevated-strong);
  border-radius: var(--radius-xl);
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
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.topic-card__name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-heading);
}

.topic-card__level {
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  background: var(--fill-primary-soft);
  color: var(--practiq-violet-dark);
  font-size: var(--text-sm);
  font-weight: 700;
  flex-shrink: 0;
}

.topic-progress {
  margin-bottom: 8px;
}

.topic-progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.welcome-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.welcome-btn {
  min-height: 44px;
  border-radius: var(--radius-lg);
  font-size: var(--text-md);
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
  border-radius: var(--radius-2xl);
  background: var(--surface-elevated);
  border: 1px solid var(--surface-elevated-strong);
  box-shadow: var(--shadow-card-lg);
  position: relative;
  z-index: 2;
}

.metric-card--goal {
  gap: 14px;
}

.metric-card__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-xl);
  display: grid;
  place-items: center;
  font-size: 22px;
  flex-shrink: 0;
}

.metric-card__icon--fire { background: var(--gradient-fire-soft); }
.metric-card__icon--star { background: var(--gradient-star-soft); }
.metric-card__icon--goal { background: var(--gradient-goal-soft); }

.metric-card__value {
  font-size: 28px;
  line-height: 1;
  font-weight: 800;
  color: var(--text-heading);
}

.metric-card__label {
  font-size: var(--text-base);
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
  font-size: var(--text-base);
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
  color: var(--text-heading);
  line-height: 1.2;
}

.mastery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.mastery-card {
  padding: 18px 20px;
  border-radius: var(--radius-2xl);
  background: var(--surface-elevated);
  border: 1px solid var(--surface-elevated-strong);
  box-shadow: var(--shadow-card);
  position: relative;
  z-index: 2;
  transition: var(--transition);
}

.mastery-card:hover,
.course-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-lg);
}

.mastery-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.mastery-topic {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.mastery-level {
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--fill-primary-subtle);
  color: var(--practiq-violet-dark);
  font-size: var(--text-xs);
  font-weight: 700;
  flex-shrink: 0;
}

.mastery-meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: 8px;
}

/* ── Courses section ── */
.empty-state {
  text-align: center;
  padding: 64px 20px;
  background: var(--surface-glass);
  border-radius: var(--radius-2xl);
  border: 1px dashed var(--surface-border);
  color: var(--text-secondary);
}

.empty-icon { font-size: 48px; margin-bottom: 14px; }
.empty-state h3 { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.empty-state p { font-size: var(--text-md); }

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.course-card {
  padding: 24px;
  border-radius: var(--radius-2xl);
  background: var(--surface-elevated);
  border: 1px solid var(--surface-elevated-strong);
  box-shadow: var(--shadow-card-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 2;
  transition: var(--transition);
}

.course-card__eyebrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.course-level-pill {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--gradient-brand);
  color: var(--color-on-primary);
  font-size: var(--text-xs);
  font-weight: 700;
}

.course-subject {
  display: inline-flex;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  background: var(--fill-primary-soft);
  color: var(--practiq-violet-dark);
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: capitalize;
}

.course-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.3;
}

/* Course Progress */
.course-progress-wrap {
  padding: 12px 0;
}

.course-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: 600;
}

.progress-value {
  font-size: var(--text-sm);
  color: var(--practiq-violet);
  font-weight: 700;
}

/* Topics needing review */
.topics-review {
  padding: 8px 10px;
  background: rgba(var(--color-warning-rgb), 0.08);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--color-warning-rgb), 0.2);
  margin-bottom: 4px;
}

.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.review-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-warning-dark);
  text-transform: uppercase;
  letter-spacing: 0.03em;
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
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.review-topic-tag {
  display: inline-flex;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background: rgba(var(--color-warning-rgb), 0.15);
  color: var(--color-warning-dark);
  font-size: 11px;
  font-weight: 600;
}

.review-more {
  font-size: var(--text-xs);
  color: var(--color-warning-dark);
  font-weight: 600;
}

.course-stats {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--surface-subtle);
  border-radius: var(--radius-lg);
  padding: 14px 0;
}

.course-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.course-stat__value {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

.course-stat__label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.course-stat-divider {
  width: 1px;
  height: 32px;
  background: var(--fill-border-muted);
}

.btn-levels {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px 16px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
  background: var(--practiq-violet-bg);
  color: var(--practiq-violet);
  font-size: var(--text-base);
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition);
  width: 100%;
}
.btn-levels:hover {
  background: var(--fill-primary-soft);
  border-color: rgba(var(--practiq-violet-rgb), 0.35);
  transform: translateY(-1px);
}

/* ── Responsive ── */

/* Tablet landscape */
@media (max-width: 1024px) {
  .student-home { padding: 20px 20px 36px; }
  .welcome-banner { gap: 20px; }
  .mastery-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  .courses-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
}

/* Tablet portrait */
@media (max-width: 900px) {
  .metrics-row { grid-template-columns: 1fr 1fr; }
  .metric-card--goal { grid-column: 1 / -1; }
  .welcome-banner { flex-direction: column; }
  .welcome-topic-card { width: 100%; }
}

/* Mobile */
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

/* Skeleton states */
.welcome-banner--skeleton {
  pointer-events: none;
}

.metric-card--skeleton {
  pointer-events: none;
}

.mastery-card--skeleton {
  pointer-events: none;
}

.course-row--skeleton {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--surface-elevated);
  border: 1px solid var(--surface-elevated-strong);
  border-radius: var(--radius-xl);
  pointer-events: none;
}
</style>
