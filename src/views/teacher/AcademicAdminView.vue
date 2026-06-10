<template>
  <TeacherLayout>
    <div class="ac-root">

      <!-- Top bar -->
      <header class="ac-topbar">
        <div class="ac-topbar__left">
          <span class="ac-eyebrow">Panel del docente</span>
          <h1 class="ac-title">Académico</h1>
        </div>
        <button class="catalog-pill" @click="showSubjectCatalog = true">
          <i class="pi pi-book"></i>
          Catálogo de materias
          <span class="catalog-pill__badge">{{ subjects.length }}</span>
        </button>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="ac-loading">
        <div class="spinner"></div>
        <span>Cargando...</span>
      </div>

      <!-- Onboarding — sin grados -->
      <div v-else-if="grades.length === 0" class="onboarding">
        <div class="onboarding__card">
          <div class="onboarding__icon"><i class="pi pi-graduation-cap"></i></div>
          <h2>Configurá tu estructura académica</h2>
          <p>Seguí estos pasos para tener todo listo.</p>
          <ol class="steps-list">
            <li class="step-item">
              <span class="step-num">1</span>
              <div>
                <strong>Crear un grado</strong>
                <span>Ej: "1er grado". Cada grado agrupa sus propios cursos.</span>
              </div>
            </li>
            <li class="step-item">
              <span class="step-num">2</span>
              <div>
                <strong>Armar el catálogo de materias</strong>
                <span>Ej: "Matemática". Son globales y se reutilizan en cualquier grado.</span>
              </div>
            </li>
            <li class="step-item">
              <span class="step-num">3</span>
              <div>
                <strong>Crear cursos dentro del grado</strong>
                <span>Un curso une un grado + una materia + contenido propio.</span>
              </div>
            </li>
          </ol>
          <div class="onboarding__actions">
            <button class="btn-primary-lg" @click="openCreateGrade">
              <i class="pi pi-plus"></i> Crear primer grado
            </button>
            <button class="btn-ghost" @click="showSubjectCatalog = true">
              <i class="pi pi-book"></i> Catálogo de materias
            </button>
          </div>
        </div>
      </div>

      <!-- Layout: sidebar + contenido -->
      <div v-else class="ac-layout">

        <!-- Sidebar -->
        <aside class="grade-sidebar">
          <div class="sidebar-header">
            <span class="sidebar-label">Grados</span>
            <button class="sidebar-add-btn" type="button" @click="openCreateGrade">
              <i class="pi pi-plus"></i>
              Nuevo
            </button>
          </div>
          <nav class="grade-nav">
            <button
              v-for="grade in grades"
              :key="grade.id"
              class="grade-nav-item"
              :class="{ 'grade-nav-item--active': selectedGradeId === grade.id }"
              @click="selectedGradeId = grade.id"
            >
              <span class="grade-nav-item__dot"></span>
              <span class="grade-nav-item__name">{{ grade.name }}</span>
              <span class="grade-nav-item__count">{{ gradeCourses(grade.id).length }}</span>
            </button>
          </nav>
        </aside>

        <!-- Contenido -->
        <main class="grade-content">
          <div v-if="!selectedGrade" class="select-hint">
            <i class="pi pi-arrow-left"></i>
            <span>Seleccioná un grado</span>
          </div>

          <template v-else>
            <!-- Header del grado -->
            <div class="grade-header">
              <div>
                <h2 class="grade-header__name">{{ selectedGrade.name }}</h2>
                <p v-if="selectedGrade.description" class="grade-header__desc">{{ selectedGrade.description }}</p>
              </div>
              <div class="grade-header__actions">
                <button class="icon-btn" title="Editar grado" @click="openEditGrade(selectedGrade)">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="icon-btn icon-btn--danger" title="Eliminar grado" @click="confirmDeleteGrade(selectedGrade.id)">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </div>

            <!-- Cursos -->
            <div class="courses-area">
              <div class="courses-area__head">
                <div>
                  <h3>Cursos en <em>{{ selectedGrade.name }}</em></h3>
                  <p class="courses-area__hint">Cada curso combina este grado con una materia del catálogo.</p>
                </div>
                <button class="btn-add-course" @click="openCreateCourse">
                  <i class="pi pi-plus"></i> Nuevo curso
                </button>
              </div>

              <!-- Sin cursos -->
              <div v-if="selectedCourses.length === 0" class="courses-empty">
                <div class="courses-empty__icon"><i class="pi pi-book"></i></div>
                <p>Este grado aún no tiene cursos.</p>
                <p class="courses-empty__sub">Creá uno eligiendo una materia del catálogo.</p>
                <button class="btn-add-course" @click="openCreateCourse">
                  <i class="pi pi-plus"></i> Crear primer curso
                </button>
              </div>

              <!-- Grid -->
              <div v-else class="courses-grid">
                <article
                  v-for="course in selectedCourses"
                  :key="course.id"
                  class="course-card"
                >
                  <div class="course-card__subject-bar">
                    <i class="pi pi-book"></i>
                    {{ course.subject || 'Sin materia' }}
                    <div class="course-card__actions">
                      <button class="card-action-btn" title="Editar" @click.stop="openEditCourse(course)">
                        <i class="pi pi-pencil"></i>
                      </button>
                      <button class="card-action-btn card-action-btn--danger" title="Eliminar" @click.stop="confirmDeleteCourse(course.id)">
                        <i class="pi pi-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div class="course-card__body" @click="goToCourse(course.id)">
                    <h4 class="course-card__title">{{ course.title }}</h4>
                    <p v-if="course.description" class="course-card__desc">{{ course.description }}</p>
                  </div>
                  <div class="course-card__footer" @click="goToCourse(course.id)">
                    <span v-if="course.level" class="level-chip">{{ course.level }}</span>
                    <i class="pi pi-arrow-right course-card__go"></i>
                  </div>
                </article>
              </div>
            </div>
          </template>
        </main>
      </div>

      <!-- ── Modal: grado ── -->
      <Teleport to="body">
        <div v-if="showGradeModal" class="modal-backdrop" @click.self="closeGradeModal">
          <div class="modal-card">
            <div class="modal-head">
              <h3>{{ editingGrade ? 'Editar grado' : 'Nuevo grado' }}</h3>
              <button class="modal-close" @click="closeGradeModal">×</button>
            </div>
            <form @submit.prevent="submitGrade" class="modal-body">
              <div class="form-group">
                <label class="form-label">Nombre</label>
                <input v-model="gradeForm.name" class="form-input" placeholder="Ej: 1er grado" required />
              </div>
              <div class="form-group">
                <label class="form-label">Descripción <span class="optional">(opcional)</span></label>
                <textarea v-model="gradeForm.description" class="form-textarea" rows="2" placeholder="Descripción breve"></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-secondary" @click="closeGradeModal">Cancelar</button>
                <button type="submit" class="btn-primary" :disabled="saving">
                  {{ editingGrade ? 'Guardar cambios' : 'Crear grado' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>

      <!-- ── Modal: curso ── -->
      <Teleport to="body">
        <div v-if="showCourseModal" class="modal-backdrop" @click.self="closeCourseModal">
          <div class="modal-card modal-card--wide">
            <div class="modal-head">
              <div>
                <h3>{{ editingCourse ? 'Editar curso' : 'Nuevo curso' }}</h3>
                <p class="modal-subtitle">en <strong>{{ selectedGrade?.name }}</strong></p>
              </div>
              <button class="modal-close" @click="closeCourseModal">×</button>
            </div>

            <div v-if="subjects.length === 0" class="modal-body">
              <div class="notice notice--warning">
                <i class="pi pi-info-circle"></i>
                <div>
                  <strong>El catálogo de materias está vacío.</strong>
                  <p>Agregá materias primero y luego volvé a crear el curso.</p>
                  <button class="btn-primary notice-action" @click="closeCourseModal(); showSubjectCatalog = true">
                    <i class="pi pi-book"></i> Ir al catálogo
                  </button>
                </div>
              </div>
            </div>

            <form v-else @submit.prevent="submitCourse" class="modal-body">
              <div class="form-group">
                <label class="form-label">Materia</label>
                <select v-model="courseForm.subjectId" class="form-select" required>
                  <option value="">Seleccioná una materia</option>
                  <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Título del curso</label>
                <input v-model="courseForm.title" class="form-input" placeholder="Ej: Matemática — Primer grado" required />
              </div>
              <div class="form-group">
                <label class="form-label">Descripción <span class="optional">(opcional)</span></label>
                <textarea v-model="courseForm.description" class="form-textarea" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Nivel académico <span class="optional">(opcional)</span></label>
                <input v-model="courseForm.level" class="form-input" placeholder="Primaria, Secundaria..." />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-secondary" @click="closeCourseModal">Cancelar</button>
                <button type="submit" class="btn-primary" :disabled="saving">
                  {{ editingCourse ? 'Guardar cambios' : 'Crear curso' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>

      <!-- ── Modal: catálogo de materias ── -->
      <Teleport to="body">
        <div v-if="showSubjectCatalog" class="modal-backdrop" @click.self="showSubjectCatalog = false">
          <div class="modal-card modal-card--wide">
            <div class="modal-head">
              <div>
                <h3>Catálogo de materias</h3>
                <p class="modal-subtitle">Materias globales disponibles para todos los grados.</p>
              </div>
              <button class="modal-close" @click="showSubjectCatalog = false">×</button>
            </div>
            <div class="modal-body">
              <form class="subject-create-row" @submit.prevent="createSubject">
                <input v-model="subjectForm.name" class="form-input" placeholder="Nombre de la materia" required />
                <input v-model="subjectForm.description" class="form-input" placeholder="Descripción (opcional)" />
                <button class="btn-primary" type="submit" :disabled="saving">
                  <i class="pi pi-plus"></i> Agregar
                </button>
              </form>

              <div v-if="subjects.length === 0" class="subjects-empty">
                Aún no hay materias. Creá la primera arriba.
              </div>
              <ul v-else class="subject-list">
                <li v-for="subject in subjects" :key="subject.id" class="subject-list-item">
                  <template v-if="editingSubject?.id === subject.id">
                    <input v-model="editingSubject.name" class="form-input form-input--sm" />
                    <input v-model="editingSubject.description" class="form-input form-input--sm" placeholder="Descripción" />
                    <div class="edit-actions">
                      <button class="btn-primary btn-sm" @click="saveSubject" :disabled="saving">Guardar</button>
                      <button class="btn-ghost btn-sm" @click="editingSubject = null">Cancelar</button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="subject-list-item__info">
                      <strong>{{ subject.name }}</strong>
                      <span v-if="subject.description">{{ subject.description }}</span>
                    </div>
                    <span class="subject-usage-badge">
                      {{ subjectCourseCount(subject.id) }} {{ subjectCourseCount(subject.id) === 1 ? 'curso' : 'cursos' }}
                    </span>
                    <div class="subject-list-item__actions">
                      <button class="icon-btn icon-btn--sm" @click="startEditSubject(subject)">
                        <i class="pi pi-pencil"></i>
                      </button>
                      <button class="icon-btn icon-btn--sm icon-btn--danger" @click="confirmDeleteSubject(subject.id)">
                        <i class="pi pi-trash"></i>
                      </button>
                    </div>
                  </template>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Teleport>

    </div>

    <ConfirmModal
      v-bind="confirmState"
      @confirm="onConfirm"
      @cancel="onCancel"
    />
  </TeacherLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useConfirm } from '@/composables/useConfirm'
import { courseService } from '@/services/courses/courseService'
import { gradeService } from '@/services/grades/gradeService'
import { subjectService } from '@/services/subjects/subjectService'
import type { Course, Grade, Subject } from '@/types'

const router = useRouter()
const { confirmState, showConfirm, onConfirm, onCancel } = useConfirm()

const loading = ref(false)
const saving = ref(false)
const grades = ref<Grade[]>([])
const subjects = ref<Subject[]>([])
const courses = ref<Course[]>([])
const selectedGradeId = ref<string | null>(null)

const showGradeModal = ref(false)
const showCourseModal = ref(false)
const showSubjectCatalog = ref(false)

const editingGrade = ref<Grade | null>(null)
const editingCourse = ref<Course | null>(null)
const editingSubject = ref<{ id: string; name: string; description: string } | null>(null)

const gradeForm = reactive({ name: '', description: '' })
const courseForm = reactive({ subjectId: '', title: '', description: '', level: '' })
const subjectForm = reactive({ name: '', description: '' })

const selectedGrade = computed(() => grades.value.find(g => g.id === selectedGradeId.value) ?? null)
const selectedCourses = computed(() => courses.value.filter(c => c.grade_id === selectedGradeId.value))

function gradeCourses(gradeId: string) {
  return courses.value.filter(c => c.grade_id === gradeId)
}

function subjectCourseCount(subjectId: string) {
  return courses.value.filter(c => c.subject_id === subjectId).length
}

onMounted(loadData)

async function loadData() {
  loading.value = true
  try {
    const [gradesRes, subjectsRes, coursesRes] = await Promise.all([
      gradeService.list(),
      subjectService.list(),
      courseService.list('teacher'),
    ])
    grades.value = gradesRes.data || []
    subjects.value = subjectsRes.data || []
    courses.value = coursesRes.data || []
    if (!selectedGradeId.value && grades.value.length > 0) {
      selectedGradeId.value = grades.value[0].id
    }
  } finally {
    loading.value = false
  }
}

// ── Grados ───────────────────────────────────────────────────────────────────

function openCreateGrade() {
  editingGrade.value = null
  gradeForm.name = ''
  gradeForm.description = ''
  showGradeModal.value = true
}

function openEditGrade(grade: Grade) {
  editingGrade.value = grade
  gradeForm.name = grade.name
  gradeForm.description = grade.description || ''
  showGradeModal.value = true
}

function closeGradeModal() {
  showGradeModal.value = false
  editingGrade.value = null
}

async function submitGrade() {
  saving.value = true
  try {
    if (editingGrade.value) {
      await gradeService.update(editingGrade.value.id, { name: gradeForm.name, description: gradeForm.description })
    } else {
      const res = await gradeService.create({ name: gradeForm.name, description: gradeForm.description })
      selectedGradeId.value = res.data.id
    }
    closeGradeModal()
    await loadData()
  } finally {
    saving.value = false
  }
}

async function confirmDeleteGrade(id: string) {
  const ok = await showConfirm('¿Eliminar este grado?', {
    description: 'Los cursos asociados también se perderán.',
  })
  if (!ok) return
  if (selectedGradeId.value === id) selectedGradeId.value = null
  await gradeService.delete(id)
  await loadData()
  if (!selectedGradeId.value && grades.value.length > 0) {
    selectedGradeId.value = grades.value[0].id
  }
}

// ── Cursos ────────────────────────────────────────────────────────────────────

function openCreateCourse() {
  editingCourse.value = null
  courseForm.subjectId = ''
  courseForm.title = ''
  courseForm.description = ''
  courseForm.level = ''
  showCourseModal.value = true
}

function openEditCourse(course: Course) {
  editingCourse.value = course
  courseForm.subjectId = course.subject_id || ''
  courseForm.title = course.title
  courseForm.description = course.description || ''
  courseForm.level = course.level || ''
  showCourseModal.value = true
}

function closeCourseModal() {
  showCourseModal.value = false
  editingCourse.value = null
}

async function submitCourse() {
  if (!selectedGrade.value) return
  saving.value = true
  try {
    const subjectName = subjects.value.find(s => s.id === courseForm.subjectId)?.name || ''
    if (editingCourse.value) {
      await courseService.update(editingCourse.value.id, {
        title: courseForm.title,
        description: courseForm.description,
        subject_id: courseForm.subjectId,
        subject: subjectName,
        level: courseForm.level,
      })
    } else {
      await courseService.create({
        title: courseForm.title,
        description: courseForm.description,
        grade_id: selectedGrade.value.id,
        subject_id: courseForm.subjectId,
        subject: subjectName,
        level: courseForm.level,
      })
    }
    closeCourseModal()
    await loadData()
  } finally {
    saving.value = false
  }
}

async function confirmDeleteCourse(id: string) {
  const ok = await showConfirm('¿Eliminar este curso?')
  if (!ok) return
  await courseService.delete(id)
  await loadData()
}

function goToCourse(courseId: string) {
  router.push(`/teacher/courses/${courseId}`)
}

// ── Materias ──────────────────────────────────────────────────────────────────

async function createSubject() {
  saving.value = true
  try {
    await subjectService.create({ name: subjectForm.name, description: subjectForm.description })
    subjectForm.name = ''
    subjectForm.description = ''
    await loadData()
  } finally {
    saving.value = false
  }
}

function startEditSubject(subject: Subject) {
  editingSubject.value = { id: subject.id, name: subject.name, description: subject.description || '' }
}

async function saveSubject() {
  if (!editingSubject.value) return
  saving.value = true
  try {
    await subjectService.update(editingSubject.value.id, {
      name: editingSubject.value.name,
      description: editingSubject.value.description,
    })
    editingSubject.value = null
    await loadData()
  } finally {
    saving.value = false
  }
}

async function confirmDeleteSubject(id: string) {
  const ok = await showConfirm('¿Eliminar esta materia?', {
    description: 'Los cursos asociados a esta materia también se perderán.',
  })
  if (!ok) return
  await subjectService.delete(id)
  await loadData()
}
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────────────────────────── */
.ac-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 24px 28px 40px;
  background: transparent;
  gap: 18px;
}

/* ── Top bar ──────────────────────────────────────────────────────────────── */
.ac-topbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px;
  background: var(--gradient-card-accent);
  border: 1px solid var(--surface-elevated-strong);
  border-radius: 28px;
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(18px);
  flex-shrink: 0;
  overflow: hidden;
}

.ac-topbar::after {
  content: '';
  position: absolute;
  right: 28px;
  bottom: -48px;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: var(--gradient-brand-soft);
  pointer-events: none;
}

.ac-topbar__left,
.catalog-pill {
  position: relative;
  z-index: 1;
}

.ac-eyebrow {
  display: block;
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--practiq-violet);
  margin-bottom: 2px;
}

.ac-title {
  font-size: clamp(1.4rem, 2.4vw, 2rem);
  font-weight: 800;
  color: var(--text-heading);
  margin: 0;
}

.catalog-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
  background: var(--practiq-violet-bg);
  color: var(--practiq-violet-dark);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition-fast);
}
.catalog-pill:hover {
  background: var(--practiq-violet-pale);
  border-color: var(--practiq-violet-light);
}
.catalog-pill__badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-pill);
  background: var(--practiq-violet);
  color: var(--color-on-primary);
  font-size: var(--text-xs);
  font-weight: 800;
  display: grid;
  place-items: center;
}

/* ── Loading ──────────────────────────────────────────────────────────────── */
.ac-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: var(--text-md);
}

/* ── Onboarding ───────────────────────────────────────────────────────────── */
.onboarding {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.onboarding__card {
  background: var(--surface-elevated);
  border: 1px solid var(--surface-elevated-strong);
  border-radius: var(--radius-2xl);
  padding: 24px 28px;
  max-width: 500px;
  width: 100%;
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}

.onboarding__icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-2xl);
  background: var(--fill-primary-soft);
  color: var(--practiq-violet);
  font-size: 28px;
  display: grid;
  place-items: center;
}

.onboarding__card h2 {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-heading);
  margin: 0;
}

.onboarding__card > p {
  font-size: var(--text-md);
  color: var(--text-secondary);
  margin: 0;
}

.steps-list {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 9px 12px;
  background: var(--surface-bg);
  border: 1px solid rgba(var(--surface-border-rgb), 0.14);
  border-radius: var(--radius-lg);
}

.step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--practiq-violet);
  color: var(--color-on-primary);
  font-weight: 800;
  font-size: var(--text-sm);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.step-item div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 4px;
}

.step-item strong {
  font-size: var(--text-base);
  color: var(--text-heading);
}

.step-item span {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.onboarding__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ── Layout ───────────────────────────────────────────────────────────────── */
.ac-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 248px 1fr;
  min-height: 0;
  overflow: hidden;
  gap: 18px;
}

/* ── Sidebar ──────────────────────────────────────────────────────────────── */
.grade-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--surface-glass);
  border: 1px solid var(--surface-elevated-strong);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 12px 10px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(var(--surface-border-rgb), 0.14);
}

.sidebar-label {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.grade-nav {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.grade-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  width: 100%;
  transition: var(--transition-fast);
}
.grade-nav-item:hover {
  background: var(--fill-primary-faint);
}
.grade-nav-item--active {
  background: var(--fill-primary-soft);
}
.grade-nav-item--active .grade-nav-item__name {
  color: var(--practiq-violet-dark);
  font-weight: 700;
}
.grade-nav-item--active .grade-nav-item__dot {
  background: var(--practiq-violet);
}
.grade-nav-item--active .grade-nav-item__count {
  background: var(--fill-primary-soft);
  color: var(--practiq-violet-dark);
}

.grade-nav-item__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--surface-border);
  flex-shrink: 0;
  transition: background 0.12s;
}

.grade-nav-item__name {
  flex: 1;
  font-size: var(--text-base);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grade-nav-item__count {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-muted);
  background: var(--surface-hover);
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  flex-shrink: 0;
  transition: all 0.12s;
}

.sidebar-add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid rgba(var(--practiq-violet-rgb), 0.18);
  border-radius: var(--radius-pill);
  background: var(--fill-primary-faint);
  color: var(--practiq-violet-dark);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  transition: var(--transition-fast);
  flex-shrink: 0;
}
.sidebar-add-btn:hover {
  background: var(--fill-primary-soft);
  border-color: rgba(var(--practiq-violet-rgb), 0.28);
  color: var(--practiq-violet);
}

/* ── Grade content ────────────────────────────────────────────────────────── */
.grade-content {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: var(--surface-glass);
  border: 1px solid var(--surface-elevated-strong);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
}

.select-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: var(--text-md);
}

/* ── Grade header ─────────────────────────────────────────────────────────── */
.grade-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 16px;
  background: transparent;
  border-bottom: 1px solid rgba(var(--surface-border-rgb), 0.14);
  flex-shrink: 0;
}

.grade-header__name {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--text-heading);
  margin: 0 0 3px;
}

.grade-header__desc {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0;
}

.grade-header__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 2px;
}

/* ── Courses area ─────────────────────────────────────────────────────────── */
.courses-area {
  flex: 1;
  padding: 18px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.courses-area__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.courses-area__head h3 {
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--text-heading);
  margin: 0 0 4px;
}
.courses-area__head h3 em {
  font-style: normal;
  color: var(--practiq-violet);
}

.courses-area__hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin: 0;
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
.courses-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 20px;
  background: var(--surface-glass);
  border: 1.5px dashed rgba(var(--surface-border-rgb), 0.3);
  border-radius: var(--radius-2xl);
  text-align: center;
}
.courses-empty__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-xl);
  background: var(--fill-primary-subtle);
  color: var(--practiq-violet);
  font-size: 22px;
  display: grid;
  place-items: center;
  margin: 0 auto;
}
.courses-empty p {
  font-size: var(--text-md);
  color: var(--text-secondary);
  margin: 0;
  font-weight: 600;
}
.courses-empty__sub {
  font-size: var(--text-base);
  color: var(--text-muted) !important;
  font-weight: 400 !important;
}

/* ── Courses grid ─────────────────────────────────────────────────────────── */
.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.course-card {
  background: var(--surface-elevated);
  border: 1px solid var(--surface-elevated-strong);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: var(--transition);
}
.course-card:hover {
  border-color: rgba(var(--practiq-violet-rgb), 0.22);
  box-shadow: var(--shadow-card-lg);
  transform: translateY(-2px);
}

.course-card__subject-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  background: var(--color-info-bg);
  color: var(--color-info-dark);
  font-size: var(--text-xs);
  font-weight: 700;
  border-bottom: 1px solid rgba(var(--color-info-rgb), 0.14);
}

.course-card__actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.15s;
}
.course-card:hover .course-card__actions { opacity: 1; }

.card-action-btn {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-xs);
  border: none;
  background: rgba(var(--surface-card-rgb), 0.7);
  color: var(--color-info-dark);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: var(--text-xs);
  transition: all 0.12s;
}
.card-action-btn:hover { background: var(--surface-card); }
.card-action-btn--danger:hover { color: var(--color-error); }

.course-card__body {
  padding: 10px;
  flex: 1;
}

.course-card__title {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-heading);
  margin: 0 0 6px;
  line-height: 1.4;
}

.course-card__desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin: 0;
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
  padding: 7px 10px;
  border-top: 1px solid rgba(var(--surface-border-rgb), 0.12);
}

.level-chip {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--surface-hover);
  border-radius: var(--radius-pill);
  padding: 3px 9px;
}

.course-card__go {
  color: var(--practiq-violet-light);
  font-size: var(--text-sm);
  transition: color 0.12s, transform 0.12s;
}
.course-card:hover .course-card__go {
  color: var(--practiq-violet);
  transform: translateX(2px);
}

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.btn-add-course {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--practiq-violet);
  color: var(--color-on-primary);
  font-size: var(--text-base);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.btn-add-course:hover { opacity: 0.88; }

.btn-primary-lg {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--practiq-violet);
  color: var(--color-on-primary);
  font-weight: 700;
  font-size: var(--text-md);
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary-lg:hover { opacity: 0.88; }

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--practiq-violet);
  color: var(--color-on-primary);
  font-weight: 700;
  font-size: var(--text-md);
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary:disabled { opacity: 0.5; }
.btn-primary:hover:not(:disabled) { opacity: 0.88; }

.btn-sm { font-size: var(--text-base); padding: 7px 14px; border-radius: var(--radius-md); }

.btn-secondary {
  padding: 10px 20px;
  border: 1.5px solid rgba(var(--surface-border-rgb), 0.28);
  border-radius: var(--radius-md);
  background: var(--surface-card);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: var(--text-md);
  cursor: pointer;
  transition: border-color 0.12s;
}
.btn-secondary:hover { border-color: var(--text-muted); }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border: 1.5px solid rgba(var(--surface-border-rgb), 0.28);
  border-radius: var(--radius-md);
  background: var(--surface-card);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: var(--text-md);
  cursor: pointer;
  transition: all 0.12s;
}
.btn-ghost:hover { border-color: var(--practiq-violet); color: var(--practiq-violet); }

.btn-ghost.btn-sm { font-size: var(--text-base); padding: 7px 14px; border-radius: var(--radius-md); }

.icon-btn {
  width: 33px;
  height: 33px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(var(--surface-border-rgb), 0.18);
  background: var(--surface-card);
  color: var(--text-secondary);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: var(--text-base);
  transition: all 0.12s;
}
.icon-btn:hover { border-color: var(--practiq-violet-light); color: var(--practiq-violet); }
.icon-btn--danger:hover { border-color: rgba(var(--color-error-rgb), 0.35); color: var(--color-error); background: var(--color-error-bg); }
.icon-btn--sm { width: 28px; height: 28px; border-radius: 7px; font-size: var(--text-xs); }

/* ── Modals ───────────────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--surface-scrim);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 100;
  backdrop-filter: blur(2px);
}

.modal-card {
  background: var(--surface-card);
  border-radius: var(--radius-2xl);
  width: min(500px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  box-shadow: var(--shadow-panel);
}
.modal-card--wide { width: min(600px, 100%); }

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--surface-border);
}

.modal-head h3 {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-heading);
  margin: 0 0 3px;
}

.modal-subtitle {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0;
}

.modal-close {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--surface-hover);
  color: var(--text-secondary);
  font-size: 17px;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  line-height: 1;
}
.modal-close:hover { background: var(--surface-border); }

.modal-body {
  padding: 14px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 4px;
}

/* ── Notice ───────────────────────────────────────────────────────────────── */
.notice {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
}
.notice--warning {
  background: var(--color-warning-bg);
  border: 1px solid rgba(var(--color-warning-rgb), 0.25);
}
.notice--warning .pi { color: var(--color-warning-dark); font-size: 17px; flex-shrink: 0; margin-top: 2px; }
.notice--warning strong { display: block; color: var(--color-warning-dark); font-size: var(--text-md); margin-bottom: 4px; }
.notice--warning p { color: var(--color-warning-dark); margin: 0; }
.notice-action { margin-top: 10px; }

/* ── Subject catalog ──────────────────────────────────────────────────────── */
.subject-create-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
  align-items: end;
}

.subjects-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 20px;
  font-size: var(--text-md);
}

.subject-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.subject-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  background: var(--surface-subtle);
  border: 1px solid rgba(var(--surface-border-rgb), 0.14);
  border-radius: var(--radius-md);
}

.subject-list-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.subject-list-item__info strong {
  font-size: var(--text-md);
  color: var(--text-heading);
}
.subject-list-item__info span {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.subject-usage-badge {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-muted);
  background: var(--surface-hover);
  border-radius: var(--radius-pill);
  padding: 2px 9px;
  white-space: nowrap;
  flex-shrink: 0;
}

.subject-list-item__actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.edit-actions {
  display: flex;
  gap: 7px;
  align-items: center;
}

/* ── Forms ────────────────────────────────────────────────────────────────── */
.form-group { display: flex; flex-direction: column; gap: 6px; }

.form-label {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-secondary);
}

.optional { font-weight: 400; color: var(--text-muted); }

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 13px;
  border: 1.5px solid rgba(var(--surface-border-rgb), 0.28);
  border-radius: var(--radius-md);
  background: var(--surface-subtle);
  font: inherit;
  font-size: var(--text-md);
  color: var(--text-heading);
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}
.form-input:focus, .form-textarea:focus, .form-select:focus {
  border-color: var(--practiq-violet);
  background: var(--surface-card);
  box-shadow: var(--focus-ring-primary);
}
.form-input--sm { padding: 7px 11px; font-size: var(--text-base); border-radius: var(--radius-md); }
.form-textarea { min-height: 78px; resize: vertical; }

/* ── Responsive ───────────────────────────────────────────────────────────── */
/* Tablet landscape */
@media (max-width: 1024px) {
  .ac-layout { grid-template-columns: 200px 1fr; }
  .grade-sidebar { min-width: 0; }
  .courses-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .courses-area, .grade-header { padding: 14px; }
}

@media (max-width: 820px) {
  .ac-root { padding: 16px 14px 32px; }
  .ac-topbar { align-items: flex-start; flex-direction: column; padding: 22px 18px; border-radius: 22px; }
  .catalog-pill { align-self: flex-start; }
  .ac-layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
  .grade-sidebar {
    border-right: none;
    max-height: 180px;
  }
  .grade-nav { flex-direction: row; flex-wrap: nowrap; overflow-x: auto; padding: 4px 8px; }
  .grade-nav-item { flex-shrink: 0; }
  .subject-create-row { grid-template-columns: 1fr; }
  .ac-topbar { padding: 14px 16px; }
  .courses-area, .grade-header { padding: 16px; }
}
</style>
