<template>
  <TeacherLayout>
    <div class="dashboard">

      <!-- Header -->
      <div class="page-header">
        <div class="page-header__left">
          <div class="page-kicker">Panel del docente</div>
          <h1 class="page-title">Hola, {{ teacherName }}.</h1>
        </div>
        <div class="page-header__right">
          <span class="role-chip" :class="isAdmin ? 'role-chip--admin' : 'role-chip--teacher'">
            <i :class="isAdmin ? 'pi pi-shield' : 'pi pi-user'"></i>
            {{ isAdmin ? 'Admin' : 'Docente' }}
          </span>
          <button class="btn btn-ghost" @click="goToAcademicAdmin" title="Académico">
            <i class="pi pi-sitemap"></i>
            Académico
          </button>
          <button v-if="isAdmin" class="btn btn-ghost" @click="goToAdminUsers" title="Usuarios">
            <i class="pi pi-users"></i>
            Usuarios
          </button>
          <button class="btn btn-primary" @click="showCreateModal = true">
            <i class="pi pi-plus"></i>
            Nuevo curso
          </button>
        </div>
      </div>

      <!-- Stats strip -->
      <div class="stats-strip" v-if="!loading">
        <div class="stat-item">
          <i class="pi pi-book stat-item__icon stat-item__icon--violet"></i>
          <span class="stat-item__val">{{ courses.length }}</span>
          <span class="stat-item__lbl">{{ courses.length === 1 ? 'Curso' : 'Cursos' }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <i class="pi pi-graduation-cap stat-item__icon stat-item__icon--blue"></i>
          <span class="stat-item__val">{{ assignedStudents.length }}</span>
          <span class="stat-item__lbl">{{ assignedStudents.length === 1 ? 'Alumno' : 'Alumnos' }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <i class="pi pi-tag stat-item__icon stat-item__icon--green"></i>
          <span class="stat-item__val">{{ subjectCount }}</span>
          <span class="stat-item__lbl">{{ subjectCount === 1 ? 'Materia' : 'Materias' }}</span>
        </div>
        <div class="stat-divider" v-if="courses.length > 0"></div>
        <div class="stat-item" v-if="courses.length > 0">
          <i class="pi pi-calendar stat-item__icon stat-item__icon--orange"></i>
          <span class="stat-item__val">{{ latestCourseDate }}</span>
          <span class="stat-item__lbl">Último creado</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner spinner-violet"></div>
      </div>

      <template v-else>
        <!-- Courses section -->
        <section class="content-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Mis cursos</h2>
              <p class="section-subtitle">Accedé a los contenidos y ejercicios de cada curso.</p>
            </div>
            <button class="btn btn-outline btn-sm" @click="showCreateModal = true">
              <i class="pi pi-plus"></i> Nuevo
            </button>
          </div>

          <div v-if="courses.length === 0" class="empty-state">
            <div class="empty-state__icon">
              <i class="pi pi-book"></i>
            </div>
            <h3>Sin cursos aún</h3>
            <p>Creá tu primer curso para agregar temas, ejercicios y cuadernos.</p>
            <button class="btn btn-primary" @click="showCreateModal = true">
              <i class="pi pi-plus"></i> Crear primer curso
            </button>
          </div>

          <div v-else class="courses-grid">
            <div
              v-for="course in courses"
              :key="course.id"
              class="course-card"
              @click="goToCourse(course.id)"
            >
              <div class="course-card__stripe" :class="stripeClass(course.subject)"></div>
              <div class="course-card__body">
                <div class="course-card__top">
                  <span class="subject-badge" :class="stripeClass(course.subject)">
                    {{ course.subject || 'General' }}
                  </span>
                  <span v-if="course.level" class="level-badge">{{ course.level }}</span>
                </div>
                <h3 class="course-title">{{ course.title }}</h3>
                <p class="course-desc">{{ course.description || 'Sin descripción' }}</p>
                <div class="course-card__footer">
                  <span class="course-date">
                    <i class="pi pi-calendar"></i>
                    {{ formatDate(course.created_at) }}
                  </span>
                  <span class="course-cta">Ver curso <i class="pi pi-arrow-right"></i></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Students section -->
        <section v-if="assignedStudents.length" class="content-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Estudiantes asignados</h2>
              <p class="section-subtitle">Hacé click en un alumno para ver su progreso.</p>
            </div>
            <div class="grade-pills">
              <span
                v-for="group in assignedStudentsByGrade"
                :key="group.gradeKey"
                class="grade-pill"
              >
                {{ group.gradeName }} · {{ group.students.length }}
              </span>
            </div>
          </div>

          <div class="student-grid">
            <article
              v-for="student in assignedStudents"
              :key="student.id"
              class="student-card"
              @click="goToStudentProgress(student)"
            >
              <div class="student-card__avatar">
                {{ student.name.charAt(0).toUpperCase() }}
              </div>
              <div class="student-card__info">
                <div class="student-name">{{ student.name }}</div>
                <div class="student-email">{{ student.email }}</div>
                <div class="student-grades">
                  <span v-for="grade in studentGrades[student.id] || []" :key="grade.id" class="student-grade-tag">
                    {{ grade.name }}
                  </span>
                  <span v-if="!(studentGrades[student.id] || []).length" class="student-grade-tag student-grade-tag--empty">
                    Sin grado
                  </span>
                </div>
              </div>
              <i class="pi pi-angle-right student-card__arrow"></i>
            </article>
          </div>
        </section>
      </template>
    </div>

    <!-- Create Course Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
          <div class="modal-box">
            <div class="modal-head">
              <h3 class="modal-title">Nuevo curso</h3>
              <button class="icon-btn" @click="showCreateModal = false"><i class="pi pi-times"></i></button>
            </div>

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
                  <span v-if="creating" class="spinner spinner-sm"></span>
                  <template v-else><i class="pi pi-check"></i></template>
                  Crear curso
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
  const set = new Set(courses.value.map(c => c.subject || 'general'))
  return set.size
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
      if (!buckets.has('no-grade')) buckets.set('no-grade', { gradeKey: 'no-grade', gradeName: 'Sin grado', students: [] })
      buckets.get('no-grade')!.students.push(student)
      continue
    }
    for (const grade of gradesForStudent) {
      if (!buckets.has(grade.id)) buckets.set(grade.id, { gradeKey: grade.id, gradeName: grade.name, students: [] })
      buckets.get(grade.id)!.students.push(student)
    }
  }
  return Array.from(buckets.values())
})

onMounted(async () => {
  if (!authStore.profile) {
    try { const res = await profileService.get(); authStore.setProfile(res.data) } catch {}
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

function goToCourse(id: string) { router.push(`/teacher/courses/${id}`) }
function goToAdminUsers() { router.push('/teacher/admin/users') }
function goToAcademicAdmin() { router.push('/teacher/admin/academic') }

function goToStudentProgress(student: AssignedUser) {
  router.push({
    path: `/teacher/students/${student.id}/progress`,
    query: { name: encodeURIComponent(student.name), email: encodeURIComponent(student.email) }
  })
}

async function loadCatalogs() {
  try {
    const [gradesRes, subjectsRes] = await Promise.all([gradeService.list(), subjectService.list()])
    grades.value = gradesRes.data || []
    subjects.value = subjectsRes.data || []
  } catch (err) { console.error(err) }
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
        } catch { return [student.id, []] as const }
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

function stripeClass(subject?: string) {
  const s = (subject || '').toLowerCase()
  if (s.includes('matem')) return 'stripe--violet'
  if (s.includes('lectura') || s.includes('lengu')) return 'stripe--blue'
  if (s.includes('ingl')) return 'stripe--green'
  if (s.includes('ciencia')) return 'stripe--orange'
  if (s.includes('histor') || s.includes('social')) return 'stripe--red'
  return 'stripe--slate'
}
</script>

<style scoped>
.dashboard {
  padding: 16px 24px 32px;
  max-width: 1140px;
}

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 12px;
  flex-wrap: wrap;
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
  line-height: 1.15;
}

.page-header__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.role-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  font-weight: 700;
}
.role-chip--admin   { background: rgba(16,185,129,0.12); color: var(--color-success-dark); }
.role-chip--teacher { background: rgba(245,158,11,0.12); color: var(--color-warning-dark); }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(148,163,184,0.25);
  background: transparent;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-ghost:hover { background: var(--surface-hover); color: var(--text-primary); }

/* ── Stats strip ── */
.stats-strip {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(255,255,255,0.9);
  box-shadow: 0 4px 16px rgba(93,108,146,0.07);
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 4px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
}

.stat-item__icon {
  font-size: 16px;
}
.stat-item__icon--violet { color: var(--practiq-violet); }
.stat-item__icon--blue   { color: #2563eb; }
.stat-item__icon--green  { color: #059669; }
.stat-item__icon--orange { color: #d97706; }

.stat-item__val {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

.stat-item__lbl {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.stat-divider {
  width: 1px;
  height: 20px;
  background: rgba(148,163,184,0.2);
  flex-shrink: 0;
}

/* ── Content sections ── */
.content-section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.section-title {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.section-subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(124,58,237,0.25);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--practiq-violet);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn-outline:hover { background: rgba(124,58,237,0.06); }

/* ── Courses grid ── */
.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.course-card {
  position: relative;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(255,255,255,0.9);
  box-shadow: 0 4px 18px rgba(93,108,146,0.08);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}
.course-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(93,108,146,0.14);
  border-color: rgba(124,58,237,0.15);
}

.course-card__stripe {
  height: 3px;
}
.stripe--violet { background: linear-gradient(90deg, #7c3aed, #a78bfa); }
.stripe--blue   { background: linear-gradient(90deg, #2563eb, #60a5fa); }
.stripe--green  { background: linear-gradient(90deg, #059669, #34d399); }
.stripe--orange { background: linear-gradient(90deg, #d97706, #fbbf24); }
.stripe--red    { background: linear-gradient(90deg, #dc2626, #f87171); }
.stripe--slate  { background: linear-gradient(90deg, var(--text-secondary), var(--text-muted)); }

.course-card__body {
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.course-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.subject-badge {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: capitalize;
}
.subject-badge.stripe--violet { background: rgba(124,58,237,0.1); color: #7c3aed; }
.subject-badge.stripe--blue   { background: rgba(37,99,235,0.1);  color: #2563eb; }
.subject-badge.stripe--green  { background: rgba(5,150,105,0.1);  color: #059669; }
.subject-badge.stripe--orange { background: rgba(217,119,6,0.1);  color: #d97706; }
.subject-badge.stripe--red    { background: rgba(220,38,38,0.1);  color: #dc2626; }
.subject-badge.stripe--slate  { background: rgba(100,116,139,0.1); color: var(--text-secondary); }

.level-badge {
  display: inline-flex;
  padding: 3px 10px;
  background: var(--surface-hover);
  color: var(--text-secondary);
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 600;
}

.course-title {
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
  margin: 0;
}

.course-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

.course-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(148,163,184,0.1);
  margin-top: 4px;
}

.course-date {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.course-cta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--practiq-violet);
}

/* ── Students ── */
.grade-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.grade-pill {
  display: inline-flex;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  background: rgba(37,99,235,0.08);
  color: var(--color-info-dark);
  font-size: var(--text-sm);
  font-weight: 700;
}

.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.student-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(255,255,255,0.9);
  box-shadow: 0 2px 10px rgba(93,108,146,0.06);
  cursor: pointer;
  transition: all 0.15s;
}
.student-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(93,108,146,0.11);
  border-color: rgba(124,58,237,0.2);
}

.student-card__avatar {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--practiq-violet), #60a5fa);
  color: #fff;
  font-size: var(--text-md);
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.student-card__info { flex: 1; min-width: 0; }

.student-name {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-email {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-grades {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.student-grade-tag {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: rgba(16,185,129,0.1);
  color: var(--color-success-dark);
  font-size: var(--text-xs);
  font-weight: 700;
}
.student-grade-tag--empty {
  background: rgba(148,163,184,0.12);
  color: var(--text-secondary);
}

.student-card__arrow {
  color: var(--text-muted);
  font-size: var(--text-md);
  flex-shrink: 0;
}

/* ── Empty & loading ── */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 80px;
}

.empty-state {
  text-align: center;
  padding: 40px 24px;
  background: rgba(255,255,255,0.7);
  border-radius: var(--radius-2xl);
  border: 1px dashed rgba(148,163,184,0.3);
}
.empty-state__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  background: rgba(124,58,237,0.08);
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  font-size: 22px;
  color: var(--practiq-violet);
}
.empty-state h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.empty-state p {
  font-size: var(--text-md);
  color: var(--text-secondary);
  margin-bottom: 24px;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}

/* ── Modal ── */
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(148,163,184,0.25);
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.icon-btn:hover { background: var(--surface-hover); color: var(--text-primary); }

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
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: #92400e;
  margin-bottom: 16px;
}
.setup-notice .pi { color: var(--color-warning); flex-shrink: 0; margin-top: 1px; }
.setup-link { color: var(--practiq-violet); font-weight: 600; text-decoration: none; }
.setup-link:hover { text-decoration: underline; }

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

/* ── Responsive ── */

/* Tablet landscape */
@media (max-width: 1024px) {
  .dashboard { padding: 20px 20px 40px; }
  .courses-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  .student-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .stats-strip { flex-wrap: wrap; gap: var(--space-2); }
}

/* Tablet portrait */
@media (max-width: 768px) {
  .dashboard { padding: 16px 14px 32px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 10px; }
  .page-header__right { width: 100%; }
  .stats-strip { gap: 0; }
  .stat-item { padding: 6px 10px; }
  .stat-divider { display: none; }
  .courses-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  .student-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
  .form-row { grid-template-columns: 1fr; }
  .section-header { flex-direction: column; align-items: flex-start; }
}

/* Mobile */
@media (max-width: 600px) {
  .courses-grid { grid-template-columns: 1fr; }
  .student-grid { grid-template-columns: 1fr; }
}
</style>
