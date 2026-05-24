<template>
  <TeacherLayout>
    <div class="dashboard">
      <!-- Welcome banner -->
      <div class="welcome-banner">
        <div class="welcome-copy">
          <div class="welcome-kicker">Panel del docente</div>
          <h1 class="welcome-title">Hola, {{ teacherName }}.</h1>
          <p class="welcome-subtitle">Gestiona tus cursos, agrega ejercicios y acompaña el progreso de tus estudiantes.</p>
          <div class="role-row">
            <span class="role-chip" :class="isAdmin ? 'role-chip--admin' : 'role-chip--teacher'">
              {{ isAdmin ? 'Acceso admin habilitado' : 'Acceso docente estándar' }}
            </span>
          </div>
        </div>
        <div class="hero-actions">
          <button class="btn btn-secondary create-btn" @click="goToAcademicAdmin">
            <i class="pi pi-sitemap"></i>
            Académico
          </button>
          <button class="btn btn-secondary create-btn" @click="goToAdminUsers">
            <i class="pi pi-users"></i>
            Usuarios
          </button>
          <button class="btn btn-primary create-btn" @click="goToAcademicAdmin">
            <i class="pi pi-plus"></i>
            Crear curso
          </button>
        </div>
      </div>

      <div class="admin-shortcut-card" :class="{ 'admin-shortcut-card--locked': !isAdmin }" @click="goToAdminUsers">
        <div class="admin-shortcut-copy">
          <div class="admin-shortcut-kicker">Acceso rápido</div>
          <h2 class="admin-shortcut-title">Administrar alumnos y perfiles</h2>
          <p class="admin-shortcut-text">
            Revisa usuarios de `auth-api`, perfiles de Practiq y la configuración del asistente por alumno.
            <span v-if="!isAdmin"> Requiere rol `admin` o `superadmin`.</span>
          </p>
        </div>
        <div class="admin-shortcut-action">
          <span>{{ isAdmin ? 'Ir a usuarios' : 'Sin acceso' }}</span>
          <i class="pi pi-arrow-right"></i>
        </div>
      </div>

      <div class="admin-shortcut-card" @click="goToAcademicAdmin">
        <div class="admin-shortcut-copy">
          <div class="admin-shortcut-kicker">Estructura</div>
          <h2 class="admin-shortcut-title">Grados, materias y cursos</h2>
          <p class="admin-shortcut-text">
            Define grados, materias y luego crea cursos alineados a esa estructura.
          </p>
        </div>
        <div class="admin-shortcut-action">
          <span>Ir a académico</span>
          <i class="pi pi-arrow-right"></i>
        </div>
      </div>

      <div v-if="assignedStudents.length" class="student-panel">
        <div class="student-panel__head">
          <div>
            <div class="student-panel__kicker">Tus alumnos</div>
            <h2 class="student-panel__title">Estudiantes asignados</h2>
            <p class="student-panel__copy">Consulta rápidamente qué alumnos acompañas y en qué grados están organizados.</p>
          </div>
          <div class="student-panel__stats">
            <span class="student-stat">{{ assignedStudents.length }} alumnos</span>
            <span class="student-stat">{{ assignedGradeCount }} grados</span>
          </div>
        </div>

        <div class="grade-summary-row">
          <div v-for="group in assignedStudentsByGrade" :key="group.gradeKey" class="grade-summary-card">
            <div class="grade-summary-name">{{ group.gradeName }}</div>
            <div class="grade-summary-count">{{ group.students.length }} alumnos</div>
          </div>
        </div>

        <div class="student-chip-grid">
          <article v-for="student in assignedStudents" :key="student.id" class="student-chip-card">
            <div class="student-chip-name">{{ student.name }}</div>
            <div class="student-chip-email">{{ student.email }}</div>
            <div class="student-chip-grades">
              <span v-for="grade in studentGrades[student.id] || []" :key="grade.id" class="student-grade-pill">
                {{ grade.name }}
              </span>
              <span v-if="!(studentGrades[student.id] || []).length" class="student-grade-pill student-grade-pill--empty">
                Sin grado
              </span>
            </div>
          </article>
        </div>
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
        <button class="btn btn-primary" @click="goToAcademicAdmin">
          <i class="pi pi-plus"></i> Crear curso desde académico
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

            <div v-if="grades.length === 0 || subjects.length === 0" class="setup-notice">
              <i class="pi pi-info-circle"></i>
              <span>
                Antes de crear un curso necesitás tener
                <template v-if="grades.length === 0 && subjects.length === 0">grados y materias</template>
                <template v-else-if="grades.length === 0">grados</template>
                <template v-else>materias</template>
                configurados.
                <router-link to="/teacher/admin/academic" @click="showCreateModal = false" class="setup-link">
                  Ir a académico →
                </router-link>
              </span>
            </div>

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
                    <option v-for="subject in subjects" :key="subject.id" :value="subject.id">{{ subject.name }}</option>
                  </select>
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
import { assignmentService } from '@/services/assignments/assignmentService'
import { courseService } from '@/services/courses/courseService'
import { gradeService } from '@/services/grades/gradeService'
import { profileService } from '@/services/profile/profileService'
import { subjectService } from '@/services/subjects/subjectService'
import type { AssignedUser, Course, Grade, Subject } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const courses = ref<Course[]>([])
const grades = ref<Grade[]>([])
const subjects = ref<Subject[]>([])
const assignedStudents = ref<AssignedUser[]>([])
const studentGrades = ref<Record<string, Grade[]>>({})
const loading = ref(true)
const showCreateModal = ref(false)
const creating = ref(false)

const newCourse = reactive({
  title: '',
  description: '',
  subject: '',
  grade_id: '',
  level: ''
})

const teacherName = computed(() => {
  const name = authStore.profile?.name || ''
  return name.split(' ')[0] || 'Docente'
})

const isAdmin = computed(() => {
  const roles = authStore.authUser?.roles || []
  return roles.some((role) => role.name === 'admin' || role.name === 'superadmin')
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

const assignedStudentsByGrade = computed(() => {
  const buckets = new Map<string, { gradeKey: string; gradeName: string; students: AssignedUser[] }>()
  for (const student of assignedStudents.value) {
    const gradesForStudent = studentGrades.value[student.id] || []
    if (!gradesForStudent.length) {
      if (!buckets.has('no-grade')) {
        buckets.set('no-grade', { gradeKey: 'no-grade', gradeName: 'Sin grado', students: [] })
      }
      buckets.get('no-grade')!.students.push(student)
      continue
    }

    for (const grade of gradesForStudent) {
      if (!buckets.has(grade.id)) {
        buckets.set(grade.id, { gradeKey: grade.id, gradeName: grade.name, students: [] })
      }
      buckets.get(grade.id)!.students.push(student)
    }
  }
  return Array.from(buckets.values())
})

const assignedGradeCount = computed(() => assignedStudentsByGrade.value.length)

onMounted(async () => {
  if (!authStore.profile) {
    try {
      const res = await profileService.get()
      authStore.setProfile(res.data)
    } catch {}
  }
  await loadCourses()
  await loadCatalogs()
  await loadAssignedStudents()
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
    const selectedSubject = subjects.value.find((item) => item.id === newCourse.subject)
    await courseService.create({
      title: newCourse.title,
      description: newCourse.description,
      subject_id: newCourse.subject,
      subject: selectedSubject?.name || '',
      grade_id: newCourse.grade_id,
      level: newCourse.level
    })
    showCreateModal.value = false
    newCourse.title = ''
    newCourse.description = ''
    newCourse.subject = ''
    newCourse.grade_id = ''
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

function goToAdminUsers() {
  router.push('/teacher/admin/users')
}

function goToAcademicAdmin() {
  router.push('/teacher/admin/academic')
}

async function loadCatalogs() {
  try {
    const [gradesRes, subjectsRes] = await Promise.all([
      gradeService.list(),
      subjectService.list()
    ])
    grades.value = gradesRes.data || []
    subjects.value = subjectsRes.data || []
  } catch (err) {
    console.error(err)
  }
}

async function loadAssignedStudents() {
  try {
    const res = await assignmentService.listMyStudents()
    assignedStudents.value = res.data || []

    const gradeEntries = await Promise.all(
      assignedStudents.value.map(async (student) => {
        try {
          const gradesRes = await gradeService.listUserGrades(student.id)
          return [student.id, gradesRes.data || []] as const
        } catch {
          return [student.id, []] as const
        }
      })
    )

    studentGrades.value = Object.fromEntries(gradeEntries)
  } catch (err) {
    console.error(err)
    assignedStudents.value = []
    studentGrades.value = {}
  }
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

.role-row {
  margin-top: 12px;
}

.role-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.role-chip--admin {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.role-chip--teacher {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.create-btn {
  flex-shrink: 0;
  padding: 12px 24px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.admin-shortcut-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 24px;
  margin-bottom: 24px;
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(96, 165, 250, 0.08)),
    rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(124, 58, 237, 0.12);
  box-shadow: 0 12px 32px rgba(93, 108, 146, 0.08);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.admin-shortcut-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 38px rgba(93, 108, 146, 0.12);
}

.admin-shortcut-card--locked {
  opacity: 0.82;
}

.admin-shortcut-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  color: var(--practiq-violet);
  margin-bottom: 6px;
}

.admin-shortcut-title {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.admin-shortcut-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.admin-shortcut-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--practiq-violet);
  font-weight: 700;
  white-space: nowrap;
}

.student-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  margin-bottom: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 32px rgba(93, 108, 146, 0.08);
}

.student-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.student-panel__kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 6px;
}

.student-panel__title {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
}

.student-panel__copy {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.student-panel__stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.student-stat {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.grade-summary-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.grade-summary-card {
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(124, 58, 237, 0.06));
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.grade-summary-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.grade-summary-count {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.student-chip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.student-chip-card {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.student-chip-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.student-chip-email {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.student-chip-grades {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.student-grade-pill {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
  font-size: 12px;
  font-weight: 700;
}

.student-grade-pill--empty {
  background: rgba(148, 163, 184, 0.14);
  color: #64748b;
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

.setup-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
  font-size: 13px;
  color: #92400e;
  margin-bottom: 16px;
}
.setup-notice .pi { color: #f59e0b; flex-shrink: 0; margin-top: 1px; }
.setup-link { color: var(--practiq-violet); font-weight: 600; text-decoration: none; }
.setup-link:hover { text-decoration: underline; }

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
  .hero-actions {
    width: 100%;
    flex-direction: column;
  }
  .student-panel__head {
    flex-direction: column;
  }
  .create-btn { width: 100%; justify-content: center; }
  .admin-shortcut-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .stats-row { grid-template-columns: 1fr; }
  .courses-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
