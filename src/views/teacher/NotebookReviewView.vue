<template>
  <TeacherLayout>
    <div class="review-dashboard">
      <!-- Header -->
      <div class="page-header">
        <div class="page-header__left">
          <div class="page-kicker">Revision de cuadernos</div>
          <h1 class="page-title">Entregas de estudiantes</h1>
        </div>
        <div class="page-header__right">
          <button class="btn btn-secondary" @click="refreshSubmissions">
            <i class="pi pi-refresh"></i>
            Actualizar
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-group">
          <label class="filter-label">Curso</label>
          <select v-model="filters.courseId" class="filter-select" @change="onCourseChange">
            <option value="" disabled>Selecciona un curso</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.title }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Estado de revision</label>
          <select v-model="filters.reviewedStatus" class="filter-select" @change="loadSubmissions">
            <option value="unreviewed">Sin revisar (IA)</option>
            <option value="reviewed">Revisadas (IA)</option>
            <option value="">Todas del curso</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Estudiante</label>
          <select v-model="filters.studentId" class="filter-select" :disabled="studentsLoading || students.length === 0" @change="loadSubmissions">
            <option value="">Todos los alumnos del curso</option>
            <option v-for="student in students" :key="student.id" :value="student.id">
              {{ student.name }} · {{ student.email }}
            </option>
          </select>
        </div>
        <div class="filter-group filter-group--search">
          <label class="filter-label">Buscar en resultados</label>
          <input v-model="filters.studentSearch" type="text" class="filter-input" placeholder="Nombre o email..." />
        </div>
      </div>

      <div v-if="!filters.courseId && !loading" class="scope-hint">
        <i class="pi pi-filter"></i>
        Selecciona un curso para ver entregas. Esto evita cargar entregas de todos los alumnos.
      </div>

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div class="submissions-grid">
          <article v-for="n in 4" :key="n" class="submission-card submission-card--skeleton">
            <div class="submission-header">
              <div class="student-info">
                <Skeleton variant="avatar" size="42px" />
                <div class="student-details">
                  <Skeleton width="120px" height="16px" />
                  <Skeleton width="160px" height="14px" class="mt-4" />
                </div>
              </div>
              <Skeleton variant="badge" width="80px" />
            </div>
            <div class="submission-meta">
              <Skeleton width="100px" height="14px" />
              <Skeleton width="80px" height="14px" />
              <Skeleton width="120px" height="14px" />
            </div>
            <Skeleton width="100%" height="180px" class="preview-skel" />
            <div class="submission-actions">
              <Skeleton width="100px" height="36px" />
              <Skeleton width="140px" height="36px" />
            </div>
          </article>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else-if="filteredSubmissions.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="pi pi-inbox"></i>
        </div>
        <h3>Sin entregas</h3>
        <p>No hay entregas de cuadernos que coincidan con los filtros seleccionados.</p>
      </div>

      <!-- Submissions Grid -->
      <div v-else class="submissions-grid">
        <article
          v-for="submission in filteredSubmissions"
          :key="submission.id"
          class="submission-card"
          :class="{
            'submission-card--correct': submission.ai_is_correct === true,
            'submission-card--incorrect': submission.ai_is_correct === false,
            'submission-card--pending': submission.ai_is_correct === undefined
          }"
        >
          <div class="submission-header">
            <div class="student-info">
              <div class="student-avatar">{{ getInitial(submission.student_name) }}</div>
              <div class="student-details">
                <div class="student-name">{{ submission.student_name || 'Estudiante' }}</div>
                <div class="student-email">{{ submission.student_email }}</div>
              </div>
            </div>
            <div class="submission-badges">
              <span v-if="submission.ai_is_correct === true" class="badge badge--success">
                <i class="pi pi-check"></i> Correcto
              </span>
              <span v-else-if="submission.ai_is_correct === false" class="badge badge--error">
                <i class="pi pi-times"></i> Incorrecto
              </span>
              <span v-else class="badge badge--pending">
                <i class="pi pi-clock"></i> Pendiente
              </span>
              <span v-if="submission.teacher_reviewed_at" class="badge badge--teacher">
                <i class="pi pi-user"></i> Revisado
              </span>
            </div>
          </div>

          <div class="submission-meta">
            <span class="meta-item">
              <i class="pi pi-book"></i>
              {{ submission.notebook_title || 'Cuaderno' }}
            </span>
            <span class="meta-item">
              <i class="pi pi-file"></i>
              Pagina {{ submission.page_number }}
            </span>
            <span class="meta-item">
              <i class="pi pi-calendar"></i>
              {{ formatDate(submission.created_at) }}
            </span>
          </div>

          <!-- Canvas Preview -->
          <div class="canvas-preview" v-if="submission.canvas_data">
            <img
              :src="submission.canvas_data"
              :alt="`Respuesta de ${submission.student_name}`"
              class="preview-image"
              @click="openPreview(submission)"
            />
          </div>

          <!-- AI Feedback -->
          <div v-if="submission.ai_feedback" class="ai-feedback-box">
            <div class="feedback-header">
              <i class="pi pi-android"></i>
              <span>Feedback IA</span>
            </div>
            <p class="feedback-text">{{ submission.ai_feedback }}</p>
          </div>

          <!-- Teacher Review Section -->
          <div v-if="submission.teacher_feedback" class="teacher-feedback-box">
            <div class="feedback-header">
              <i class="pi pi-user"></i>
              <span>Tu revision</span>
            </div>
            <p class="feedback-text">{{ submission.teacher_feedback }}</p>
            <span class="review-badge" :class="submission.teacher_is_correct ? 'review-badge--correct' : 'review-badge--incorrect'">
              {{ submission.teacher_is_correct ? 'Marcado correcto' : 'Marcado incorrecto' }}
            </span>
          </div>

          <!-- Actions -->
          <div class="submission-actions">
            <button
              v-if="submission.ai_is_correct === undefined"
              class="btn btn-sm btn-secondary"
              :disabled="reviewingIds.has(submission.id)"
              @click="triggerAIReview(submission.id)"
            >
              <i v-if="reviewingIds.has(submission.id)" class="pi pi-spin pi-spinner"></i>
              <i v-else class="pi pi-android"></i>
              {{ reviewingIds.has(submission.id) ? 'Evaluando...' : 'Evaluar con IA' }}
            </button>
            <button
              class="btn btn-sm btn-primary"
              @click="openReviewModal(submission)"
            >
              <i class="pi pi-pencil"></i>
              Revisar manualmente
            </button>
          </div>
        </article>
      </div>

      <!-- Preview Modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="previewSubmission" class="modal-overlay" @click.self="previewSubmission = null">
            <div class="modal-box modal-box--large">
              <div class="modal-head">
                <h3 class="modal-title">{{ previewSubmission.student_name }} - Pagina {{ previewSubmission.page_number }}</h3>
                <button class="icon-btn" @click="previewSubmission = null"><i class="pi pi-times"></i></button>
              </div>
              <div class="preview-content">
                <img :src="previewSubmission.canvas_data" alt="Vista previa" class="full-preview-image" />
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Review Modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="reviewingSubmission" class="modal-overlay" @click.self="closeReviewModal">
            <div class="modal-box">
              <div class="modal-head">
                <h3 class="modal-title">Revision manual</h3>
                <button class="icon-btn" @click="closeReviewModal"><i class="pi pi-times"></i></button>
              </div>

              <div class="review-form">
                <div class="review-student-info">
                  <div class="student-avatar">{{ getInitial(reviewingSubmission.student_name) }}</div>
                  <div>
                    <div class="student-name">{{ reviewingSubmission.student_name }}</div>
                    <div class="meta-item">
                      {{ reviewingSubmission.notebook_title }} - Pagina {{ reviewingSubmission.page_number }}
                    </div>
                  </div>
                </div>

                <div v-if="reviewingSubmission.canvas_data" class="review-preview">
                  <img :src="reviewingSubmission.canvas_data" alt="Respuesta" class="preview-image" />
                </div>

                <div v-if="reviewingSubmission.ai_feedback" class="ai-feedback-mini">
                  <strong>IA dice:</strong> {{ reviewingSubmission.ai_feedback }}
                </div>

                <div class="form-group">
                  <label class="form-label">Es correcto?</label>
                  <div class="correctness-toggle">
                    <button
                      type="button"
                      class="toggle-btn"
                      :class="{ 'toggle-btn--active': reviewForm.isCorrect === true }"
                      @click="reviewForm.isCorrect = true"
                    >
                      <i class="pi pi-check"></i> Correcto
                    </button>
                    <button
                      type="button"
                      class="toggle-btn toggle-btn--danger"
                      :class="{ 'toggle-btn--active': reviewForm.isCorrect === false }"
                      @click="reviewForm.isCorrect = false"
                    >
                      <i class="pi pi-times"></i> Incorrecto
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Comentarios</label>
                  <textarea
                    v-model="reviewForm.feedback"
                    class="form-textarea"
                    rows="4"
                    placeholder="Escribe tu feedback para el estudiante..."
                  ></textarea>
                </div>

                <div class="modal-actions">
                  <button class="btn btn-secondary" @click="closeReviewModal">Cancelar</button>
                  <button
                    class="btn btn-primary"
                    :disabled="reviewForm.isCorrect === null || savingReview"
                    @click="saveManualReview"
                  >
                    <span v-if="savingReview" class="spinner spinner-sm"></span>
                    <i v-else class="pi pi-check"></i>
                    Guardar revision
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </TeacherLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { notebookService } from '@/services/notebooks/notebookService'
import { courseService } from '@/services/courses/courseService'
import type { NotebookSubmissionFull, Course, Student } from '@/types'

const loading = ref(true)
const submissions = ref<NotebookSubmissionFull[]>([])
const courses = ref<Course[]>([])
const students = ref<Student[]>([])
const reviewingIds = ref<Set<string>>(new Set())
const previewSubmission = ref<NotebookSubmissionFull | null>(null)
const reviewingSubmission = ref<NotebookSubmissionFull | null>(null)
const savingReview = ref(false)
const studentsLoading = ref(false)

const filters = reactive({
  courseId: '',
  studentId: '',
  reviewedStatus: '',
  studentSearch: ''
})

const reviewForm = reactive({
  isCorrect: null as boolean | null,
  feedback: ''
})

const filteredSubmissions = computed(() => {
  let result = [...submissions.value]

  if (filters.studentSearch.trim()) {
    const search = filters.studentSearch.toLowerCase()
    result = result.filter(s =>
      (s.student_name?.toLowerCase() || '').includes(search) ||
      (s.student_email?.toLowerCase() || '').includes(search)
    )
  }

  return result
})

onMounted(async () => {
  await loadCourses()
  if (filters.courseId) {
    await Promise.all([loadStudentsForCourse(), loadSubmissions()])
  } else {
    loading.value = false
  }
})

async function loadCourses() {
  try {
    const res = await courseService.list('teacher')
    courses.value = res.data || []
    filters.courseId = courses.value[0]?.id || ''
  } catch (err) {
    console.error('Failed to load courses:', err)
  }
}

async function loadSubmissions() {
  if (!filters.courseId) {
    submissions.value = []
    loading.value = false
    return
  }

  loading.value = true
  try {
    const params: Record<string, string | boolean | undefined> = {}
    params.course_id = filters.courseId
    if (filters.studentId) params.student_id = filters.studentId
    if (filters.reviewedStatus === 'reviewed') params.reviewed = true
    if (filters.reviewedStatus === 'unreviewed') params.reviewed = false

    const res = await notebookService.getSubmissions(params)
    submissions.value = res.data || []
  } catch (err) {
    console.error('Failed to load submissions:', err)
    submissions.value = []
  } finally {
    loading.value = false
  }
}

async function loadStudentsForCourse() {
  if (!filters.courseId) {
    students.value = []
    return
  }

  studentsLoading.value = true
  try {
    const res = await courseService.getStudents(filters.courseId)
    students.value = res.data || []
  } catch (err) {
    console.error('Failed to load students:', err)
    students.value = []
  } finally {
    studentsLoading.value = false
  }
}

async function onCourseChange() {
  filters.studentId = ''
  await Promise.all([loadStudentsForCourse(), loadSubmissions()])
}

async function refreshSubmissions() {
  await loadSubmissions()
}

function getInitial(name?: string) {
  return (name || 'E').charAt(0).toUpperCase()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function openPreview(submission: NotebookSubmissionFull) {
  previewSubmission.value = submission
}

function openReviewModal(submission: NotebookSubmissionFull) {
  reviewingSubmission.value = submission
  reviewForm.isCorrect = submission.teacher_is_correct ?? null
  reviewForm.feedback = submission.teacher_feedback || ''
}

function closeReviewModal() {
  reviewingSubmission.value = null
  reviewForm.isCorrect = null
  reviewForm.feedback = ''
}

async function triggerAIReview(submissionId: string) {
  reviewingIds.value.add(submissionId)
  try {
    await notebookService.triggerAIReview(submissionId)
    // Poll for result or reload after delay
    setTimeout(loadSubmissions, 3000)
  } catch (err) {
    console.error('Failed to trigger AI review:', err)
  } finally {
    reviewingIds.value.delete(submissionId)
  }
}

async function saveManualReview() {
  if (!reviewingSubmission.value || reviewForm.isCorrect === null) return

  savingReview.value = true
  try {
    await notebookService.updateManualReview(reviewingSubmission.value.id, {
      teacher_is_correct: reviewForm.isCorrect,
      teacher_feedback: reviewForm.feedback
    })

    // Update local state
    const idx = submissions.value.findIndex(s => s.id === reviewingSubmission.value!.id)
    if (idx >= 0) {
      submissions.value[idx] = {
        ...submissions.value[idx],
        teacher_is_correct: reviewForm.isCorrect,
        teacher_feedback: reviewForm.feedback,
        teacher_reviewed_at: new Date().toISOString()
      }
    }

    closeReviewModal()
  } catch (err) {
    console.error('Failed to save review:', err)
  } finally {
    savingReview.value = false
  }
}
</script>

<style scoped>
.review-dashboard {
  padding: 24px 28px 40px;
  max-width: 1280px;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  padding: 24px 28px;
  border-radius: 28px;
  background: var(--gradient-card-accent);
  border: 1px solid var(--surface-elevated-strong);
  box-shadow: var(--shadow-soft);
}

.page-kicker {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: var(--practiq-violet);
  margin-bottom: 2px;
}

.page-title {
  font-size: var(--font-hero);
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
}

/* Filters */
.filters-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 20px;
  background: var(--surface-elevated);
  border-radius: var(--radius-xl);
  border: 1px solid var(--surface-elevated-strong);
  margin-bottom: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.filter-group--search {
  flex: 1;
  min-width: 220px;
}

.filter-label {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.filter-select,
.filter-input {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  font-size: var(--text-base);
  color: var(--text-primary);
  background: var(--surface-elevated-strong);
  outline: none;
  transition: border-color 0.15s;
}

.filter-select:focus,
.filter-input:focus {
  border-color: var(--practiq-violet);
}

.filter-select:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.scope-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  margin-bottom: 20px;
  border-radius: var(--radius-lg);
  background: var(--fill-primary-subtle);
  color: var(--text-secondary);
  font-size: var(--text-base);
  font-weight: 600;
}

.scope-hint i {
  color: var(--practiq-violet);
}

/* Skeleton styles */
.submission-card--skeleton { pointer-events: none; }
.preview-skel { border-radius: var(--radius-lg); }
.mt-4 { margin-top: 4px; }

.empty-state {
  text-align: center;
  padding: 64px 24px;
  background: var(--surface-glass);
  border-radius: var(--radius-2xl);
  border: 1px dashed rgba(var(--surface-border-rgb), 0.3);
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: var(--fill-primary-subtle);
  display: grid;
  place-items: center;
  margin: 0 auto 20px;
  font-size: 28px;
  color: var(--practiq-violet);
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: var(--text-md);
  color: var(--text-secondary);
}

/* Submissions Grid */
.submissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

.submission-card {
  background: var(--surface-elevated);
  border-radius: var(--radius-2xl);
  border: 1.5px solid var(--surface-elevated-strong);
  box-shadow: var(--shadow-card);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: var(--transition);
}

.submission-card:hover {
  box-shadow: var(--shadow-card-lg);
}

.submission-card--correct {
  border-color: rgba(var(--color-success-rgb), 0.3);
}

.submission-card--incorrect {
  border-color: rgba(var(--color-error-rgb), 0.3);
}

.submission-card--pending {
  border-color: rgba(var(--color-warning-rgb), 0.3);
}

.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.student-avatar {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-lg);
  background: var(--gradient-brand);
  color: var(--color-on-primary);
  font-weight: 800;
  font-size: var(--text-lg);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.student-details {
  min-width: 0;
}

.student-name {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
}

.student-email {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.submission-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 700;
}

.badge--success {
  background: var(--color-success-bg);
  color: var(--color-success-dark);
}

.badge--error {
  background: var(--color-error-bg);
  color: var(--color-error-dark);
}

.badge--pending {
  background: var(--color-warning-bg);
  color: var(--color-warning-dark);
}

.badge--teacher {
  background: var(--fill-primary-soft);
  color: var(--practiq-violet);
}

.submission-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.meta-item i {
  font-size: 14px;
  color: var(--text-muted);
}

/* Canvas Preview */
.canvas-preview {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid rgba(var(--surface-border-rgb), 0.15);
  cursor: pointer;
}

.preview-image {
  width: 100%;
  height: 180px;
  object-fit: contain;
  background: #fafaf7;
  display: block;
}

/* Feedback Boxes */
.ai-feedback-box,
.teacher-feedback-box {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.ai-feedback-box {
  background: var(--fill-primary-faint);
  border: 1px solid rgba(var(--practiq-violet-rgb), 0.15);
}

.teacher-feedback-box {
  background: var(--color-success-bg);
  border: 1px solid rgba(var(--color-success-rgb), 0.2);
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: var(--practiq-violet);
  margin-bottom: 6px;
}

.teacher-feedback-box .feedback-header {
  color: var(--color-success-dark);
}

.feedback-text {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.5;
}

.review-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 700;
}

.review-badge--correct {
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success-dark);
}

.review-badge--incorrect {
  background: rgba(var(--color-error-rgb), 0.15);
  color: var(--color-error-dark);
}

/* Actions */
.submission-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
}

.btn-sm {
  padding: 8px 14px;
  font-size: var(--text-sm);
}

/* Modal */
.modal-box--large {
  max-width: 800px;
  width: 90vw;
}

.preview-content {
  padding: 20px;
  background: #fafaf7;
  border-radius: var(--radius-md);
}

.full-preview-image {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

/* Review Form */
.review-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-student-info {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: var(--surface-subtle);
  border-radius: var(--radius-lg);
}

.review-preview {
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid rgba(var(--surface-border-rgb), 0.15);
}

.review-preview .preview-image {
  height: 200px;
}

.ai-feedback-mini {
  padding: 10px 14px;
  background: var(--fill-primary-faint);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.correctness-toggle {
  display: flex;
  gap: 10px;
}

.toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 2px solid rgba(var(--color-success-rgb), 0.3);
  background: transparent;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-success-dark);
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn:hover {
  background: rgba(var(--color-success-rgb), 0.08);
}

.toggle-btn--active {
  background: var(--color-success);
  color: white;
  border-color: var(--color-success);
}

.toggle-btn--danger {
  border-color: rgba(var(--color-error-rgb), 0.3);
  color: var(--color-error-dark);
}

.toggle-btn--danger:hover {
  background: rgba(var(--color-error-rgb), 0.08);
}

.toggle-btn--danger.toggle-btn--active {
  background: var(--color-error);
  border-color: var(--color-error);
}

/* Responsive */
@media (max-width: 1024px) {
  .review-dashboard {
    padding: 20px 16px 40px;
  }

  .submissions-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }

  .filters-bar {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }

  .submission-header {
    flex-direction: column;
  }

  .submission-badges {
    width: 100%;
  }

  .correctness-toggle {
    flex-direction: column;
  }
}
</style>
