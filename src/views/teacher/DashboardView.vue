<template>
  <TeacherLayout>
    <div class="dashboard">
      <!-- Welcome banner -->
      <div class="welcome-banner">
        <div class="welcome-copy">
          <div class="welcome-kicker">Panel del docente</div>
          <h1 class="welcome-title">Hola, {{ teacherName }}.</h1>
          <p class="welcome-subtitle">Gestiona tus cursos, agrega ejercicios y acompaña el progreso de tus estudiantes.</p>
        </div>
        <button class="btn btn-primary create-btn" @click="showCreateModal = true">
          <i class="pi pi-plus"></i>
          Crear Curso
        </button>
      </div>

      <!-- Stats row -->
      <div v-if="courses.length > 0" class="stats-row">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-value">{{ courses.length }}</div>
          <div class="stat-label">{{ courses.length === 1 ? 'Curso' : 'Cursos' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-value">{{ subjectCount }}</div>
          <div class="stat-label">{{ subjectCount === 1 ? 'Materia' : 'Materias' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🗓️</div>
          <div class="stat-value">{{ latestCourseDate }}</div>
          <div class="stat-label">Último creado</div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner spinner-violet"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="courses.length === 0" class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>No tienes cursos aún</h3>
        <p>Crea tu primer curso para comenzar a agregar temas y ejercicios.</p>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <i class="pi pi-plus"></i> Crear Curso
        </button>
      </div>

      <!-- Courses grid -->
      <div v-else class="courses-grid">
        <div
          v-for="course in courses"
          :key="course.id"
          class="course-card"
          :class="'course-card--' + (course.subject || 'general')"
          @click="goToCourse(course.id)"
        >
          <div class="course-card__accent"></div>
          <div class="course-card__body">
            <div class="course-card__top">
              <span class="course-subject-badge">{{ course.subject || 'General' }}</span>
              <span class="course-level-badge" v-if="course.level">{{ course.level }}</span>
            </div>
            <h3 class="course-title">{{ course.title }}</h3>
            <p class="course-desc">{{ course.description || 'Sin descripción' }}</p>
            <div class="course-card__footer">
              <span class="course-date">
                <i class="pi pi-calendar"></i>
                {{ formatDate(course.created_at) }}
              </span>
              <button class="btn btn-secondary btn-sm" @click.stop="goToCourse(course.id)">
                Ver curso <i class="pi pi-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Course Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
          <div class="modal-box">
            <h3 class="modal-title">Crear nuevo curso</h3>
            <form @submit.prevent="createCourse">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input v-model="newCourse.title" class="form-input" placeholder="Matemáticas 7mo Grado" required />
              </div>
              <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea v-model="newCourse.description" class="form-textarea" placeholder="Describe el curso..." rows="3"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Materia</label>
                  <select v-model="newCourse.subject" class="form-select">
                    <option value="">Seleccionar</option>
                    <option value="matematica">Matemáticas</option>
                    <option value="lectura">Lectura</option>
                    <option value="ingles">Inglés</option>
                    <option value="ciencias">Ciencias</option>
                    <option value="historia">Historia</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Nivel</label>
                  <select v-model="newCourse.level" class="form-select">
                    <option value="">Seleccionar</option>
                    <option value="primaria">Primaria</option>
                    <option value="secundaria">Secundaria</option>
                    <option value="preparatoria">Preparatoria</option>
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" @click="showCreateModal = false">Cancelar</button>
                <button type="submit" class="btn btn-primary" :disabled="creating">
                  <span v-if="creating" class="spinner"></span>
                  Crear Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </TeacherLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import { courseService } from '@/services/courses/courseService'
import { profileService } from '@/services/profile/profileService'
import type { Course } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const courses = ref<Course[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const creating = ref(false)

const newCourse = reactive({
  title: '',
  description: '',
  subject: '',
  level: ''
})

const teacherName = computed(() => {
  const name = authStore.profile?.name || ''
  return name.split(' ')[0] || 'Docente'
})

const subjectCount = computed(() => {
  const subjects = new Set(courses.value.map(c => c.subject || 'general'))
  return subjects.size
})

const latestCourseDate = computed(() => {
  if (!courses.value.length) return '-'
  const sorted = [...courses.value].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return new Date(sorted[0].created_at).toLocaleDateString('es', { month: 'short', day: 'numeric' })
})

onMounted(async () => {
  if (!authStore.profile) {
    try {
      const res = await profileService.get()
      authStore.setProfile(res.data)
    } catch {}
  }
  await loadCourses()
})

async function loadCourses() {
  loading.value = true
  try {
    const res = await courseService.list('teacher')
    courses.value = res.data || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function createCourse() {
  creating.value = true
  try {
    await courseService.create({
      title: newCourse.title,
      description: newCourse.description,
      subject: newCourse.subject,
      level: newCourse.level
    })
    showCreateModal.value = false
    newCourse.title = ''
    newCourse.description = ''
    newCourse.subject = ''
    newCourse.level = ''
    await loadCourses()
  } catch (err) {
    console.error(err)
  } finally {
    creating.value = false
  }
}

function goToCourse(id: string) {
  router.push(`/teacher/courses/${id}`)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.dashboard {
  padding: 28px 32px 40px;
  max-width: 1100px;
}

/* ── Welcome banner ── */
.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
  border-radius: 24px;
  background:
    radial-gradient(ellipse at top left, rgba(124, 58, 237, 0.1), transparent 50%),
    rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 40px rgba(93, 108, 146, 0.1);
  margin-bottom: 24px;
}

.welcome-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: var(--practiq-violet);
  margin-bottom: 6px;
}

.welcome-title {
  font-size: clamp(1.4rem, 3vw, 1.8rem);
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 6px;
}

.welcome-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 500px;
}

.create-btn {
  flex-shrink: 0;
  padding: 12px 24px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
}

/* ── Stats row ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(93, 108, 146, 0.08);
}

.stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 22px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(96, 165, 250, 0.08));
  flex-shrink: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ── Loading & empty ── */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 80px;
}

.empty-state {
  text-align: center;
  padding: 72px 24px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 24px;
  border: 1px dashed var(--surface-border);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}

/* ── Courses grid ── */
.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.course-card {
  position: relative;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 28px rgba(93, 108, 146, 0.1);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.course-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 36px rgba(93, 108, 146, 0.16);
  border-color: var(--practiq-violet-light);
}

.course-card__accent {
  height: 4px;
  background: linear-gradient(90deg, var(--practiq-violet), var(--practiq-violet-light));
}

.course-card--matematica .course-card__accent { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.course-card--lectura .course-card__accent { background: linear-gradient(90deg, #2563eb, #60a5fa); }
.course-card--ingles .course-card__accent { background: linear-gradient(90deg, #059669, #34d399); }
.course-card--ciencias .course-card__accent { background: linear-gradient(90deg, #d97706, #fbbf24); }
.course-card--historia .course-card__accent { background: linear-gradient(90deg, #dc2626, #f87171); }
.course-card--otros .course-card__accent { background: linear-gradient(90deg, #64748b, #94a3b8); }

.course-card__body {
  padding: 22px 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.course-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.course-subject-badge {
  display: inline-flex;
  padding: 4px 12px;
  background: var(--practiq-violet-pale);
  color: var(--practiq-violet);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.course-level-badge {
  display: inline-flex;
  padding: 4px 10px;
  background: var(--surface-hover);
  color: var(--text-secondary);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
}

.course-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.course-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  margin-top: auto;
}

.course-date {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-muted);
}

/* ── Modal ── */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .dashboard { padding: 20px 16px 32px; }
  .welcome-banner {
    flex-direction: column;
    align-items: flex-start;
    padding: 22px 20px;
  }
  .create-btn { width: 100%; justify-content: center; }
  .stats-row { grid-template-columns: 1fr; }
  .courses-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
