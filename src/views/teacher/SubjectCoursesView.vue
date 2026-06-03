<template>
  <TeacherLayout>
    <div class="courses-page">
      <div class="hero-card">
        <div>
          <div class="hero-kicker">Materia</div>
          <h1 class="hero-title">{{ subject?.name || 'Cursos de la materia' }}</h1>
          <p class="hero-copy">
            {{ subject?.description || 'Crea cursos asociados a esta materia y asígnalos a un grado específico.' }}
          </p>
        </div>
        <div class="hero-actions">
          <button class="btn btn-secondary" type="button" @click="goBack">
            <i class="pi pi-arrow-left"></i>
            Volver a académico
          </button>
          <button class="btn btn-primary" type="button" @click="showCreateModal = true">
            <i class="pi pi-plus"></i>
            Crear curso
          </button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon stat-icon--violet"><i class="pi pi-book"></i></div>
          <div>
            <div class="stat-value">{{ filteredCourses.length }}</div>
            <div class="stat-label">{{ filteredCourses.length === 1 ? 'Curso' : 'Cursos' }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--green"><i class="pi pi-graduation-cap"></i></div>
          <div>
            <div class="stat-value">{{ gradesInUse }}</div>
            <div class="stat-label">{{ gradesInUse === 1 ? 'Grado en uso' : 'Grados en uso' }}</div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner spinner-violet"></div>
      </div>

      <div v-else-if="filteredCourses.length === 0" class="empty-state">
        <div class="empty-icon"><i class="pi pi-folder-open"></i></div>
        <h3>Aún no hay cursos para esta materia</h3>
        <p>Desde aquí podrás crear los cursos de {{ subject?.name || 'esta materia' }} por grado.</p>
        <button class="btn btn-primary" type="button" @click="showCreateModal = true">
          <i class="pi pi-plus"></i>
          Crear curso
        </button>
      </div>

      <div v-else class="courses-grid">
        <article v-for="course in filteredCourses" :key="course.id" class="course-card" @click="openCourse(course.id)">
          <div class="course-card__accent"></div>
          <div class="course-card__body">
            <div class="course-card__top">
              <span class="course-grade-badge">{{ course.grade_name || 'Sin grado' }}</span>
              <span v-if="course.level" class="course-level-badge">{{ course.level }}</span>
            </div>
            <h3 class="course-title">{{ course.title }}</h3>
            <p class="course-desc">{{ course.description || 'Sin descripción' }}</p>
            <div class="course-card__footer">
              <span class="course-date">
                <i class="pi pi-calendar"></i>
                {{ formatDate(course.created_at) }}
              </span>
              <button class="btn btn-secondary btn-sm" type="button" @click.stop="openCourse(course.id)">
                Abrir
              </button>
            </div>
          </div>
        </article>
      </div>

      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
            <div class="modal-box">
              <h3 class="modal-title">Crear curso en {{ subject?.name || 'materia' }}</h3>

              <div v-if="grades.length === 0" class="setup-notice">
                <i class="pi pi-info-circle"></i>
                <span>
                  Antes de crear un curso necesitas tener grados configurados.
                  <router-link to="/teacher/admin/academic" @click="showCreateModal = false" class="setup-link">
                    Volver a académico ->
                  </router-link>
                </span>
              </div>

              <form @submit.prevent="createCourse">
                <div class="form-group">
                  <label class="form-label">Título *</label>
                  <input v-model="newCourse.title" class="form-input" placeholder="Matemática - Primer grado" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Descripción</label>
                  <textarea v-model="newCourse.description" class="form-textarea" placeholder="Describe el curso..." rows="3"></textarea>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Materia</label>
                    <input :value="subject?.name || ''" class="form-input" disabled />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Grado</label>
                    <select v-model="newCourse.grade_id" class="form-select">
                      <option value="">Seleccionar</option>
                      <option v-for="grade in grades" :key="grade.id" :value="grade.id">{{ grade.name }}</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Nivel académico</label>
                  <input v-model="newCourse.level" class="form-input" placeholder="Primaria, Secundaria..." />
                </div>
                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" @click="showCreateModal = false">Cancelar</button>
                  <button type="submit" class="btn btn-primary" :disabled="creating">
                    <span v-if="creating" class="spinner"></span>
                    Crear curso
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </TeacherLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import { courseService } from '@/services/courses/courseService'
import { gradeService } from '@/services/grades/gradeService'
import { subjectService } from '@/services/subjects/subjectService'
import type { Course, Grade, Subject } from '@/types'

const route = useRoute()
const router = useRouter()
const subjectId = route.params.subjectId as string

const loading = ref(true)
const creating = ref(false)
const showCreateModal = ref(false)
const courses = ref<Course[]>([])
const grades = ref<Grade[]>([])
const subject = ref<Subject | null>(null)

const newCourse = reactive({
  title: '',
  description: '',
  grade_id: '',
  level: ''
})

const filteredCourses = computed(() => courses.value.filter((course) => course.subject_id === subjectId))
const gradesInUse = computed(() => new Set(filteredCourses.value.map((course) => course.grade_id).filter(Boolean)).size)

onMounted(async () => {
  await Promise.all([loadSubject(), loadCourses(), loadGrades()])
})

async function loadSubject() {
  try {
    const res = await subjectService.list()
    subject.value = (res.data || []).find((item) => item.id === subjectId) || null
  } catch (error) {
    console.error(error)
  }
}

async function loadCourses() {
  loading.value = true
  try {
    const res = await courseService.list('teacher')
    courses.value = res.data || []
  } catch (error) {
    console.error(error)
    courses.value = []
  } finally {
    loading.value = false
  }
}

async function loadGrades() {
  try {
    const res = await gradeService.list()
    grades.value = res.data || []
  } catch (error) {
    console.error(error)
  }
}

async function createCourse() {
  if (!subject.value) return
  creating.value = true
  try {
    await courseService.create({
      title: newCourse.title,
      description: newCourse.description,
      subject_id: subject.value.id,
      subject: subject.value.name,
      grade_id: newCourse.grade_id,
      level: newCourse.level
    })
    newCourse.title = ''
    newCourse.description = ''
    newCourse.grade_id = ''
    newCourse.level = ''
    showCreateModal.value = false
    await loadCourses()
  } catch (error) {
    console.error(error)
  } finally {
    creating.value = false
  }
}

function goBack() {
  router.push('/teacher/admin/academic')
}

function openCourse(id: string) {
  router.push(`/teacher/courses/${id}`)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.courses-page {
  padding: 16px 24px 32px;
  max-width: 1120px;
}

.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 20px;
  border-radius: var(--radius-lg);
  background: radial-gradient(ellipse at top left, rgba(124, 58, 237, 0.1), transparent 50%), rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 40px rgba(93, 108, 146, 0.1);
  margin-bottom: 14px;
}

.hero-kicker {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: var(--practiq-violet);
  margin-bottom: 3px;
}

.hero-title {
  margin: 0 0 4px;
  font-size: var(--font-hero);
  color: var(--text-primary);
}

.hero-copy {
  margin: 0;
  font-size: var(--text-base);
  max-width: 640px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(93, 108, 146, 0.08);
}

.stat-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  font-size: 17px;
  flex-shrink: 0;
}
.stat-icon--violet { background: rgba(124,58,237,0.1); color: #7c3aed; }
.stat-icon--green  { background: rgba(16,185,129,0.1); color: #059669; }

.stat-value {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-primary);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 80px;
}

.empty-state {
  text-align: center;
  padding: 44px 24px;
  background: rgba(255, 255, 255, 0.74);
  border-radius: var(--radius-xl);
  border: 1px dashed var(--surface-border);
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-2xl);
  background: rgba(124,58,237,0.08);
  color: var(--practiq-violet);
  font-size: 28px;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: var(--text-lg);
  color: var(--text-primary);
}

.empty-state p {
  margin: 0 auto 16px;
  max-width: 420px;
  color: var(--text-secondary);
}

.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.course-card {
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.92);
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
  height: 3px;
  background: linear-gradient(90deg, var(--practiq-violet), var(--practiq-violet-light));
}

.course-card__body {
  padding: 14px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.course-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.course-grade-badge,
.course-level-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 600;
}

.course-grade-badge {
  background: rgba(16, 185, 129, 0.12);
  color: var(--color-success-dark);
}

.course-level-badge {
  background: var(--surface-hover);
  color: var(--text-secondary);
}

.course-title {
  margin: 0;
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--text-primary);
}

.course-desc {
  margin: 0;
  font-size: var(--text-base);
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
  gap: 12px;
  padding-top: 8px;
  margin-top: auto;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.course-date {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.setup-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: #92400e;
  margin-bottom: 16px;
}

.setup-link {
  color: var(--practiq-violet);
  font-weight: 600;
  text-decoration: none;
}

.setup-link:hover {
  text-decoration: underline;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* Tablet landscape */
@media (max-width: 1024px) {
  .courses-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .form-row { grid-template-columns: 1fr 1fr; }
}

/* Tablet portrait + mobile */
@media (max-width: 768px) {
  .courses-page {
    padding: 16px 14px 28px;
  }

  .hero-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 22px 20px;
  }

  .hero-actions {
    width: 100%;
    flex-direction: column;
  }

  .stats-row,
  .form-row,
  .courses-grid {
    grid-template-columns: 1fr;
  }
}
</style>
