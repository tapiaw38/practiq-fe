<template>
  <TeacherLayout>
    <div class="admin-shell">
      <div class="hero-card">
        <div>
          <div class="hero-kicker">Superadmin</div>
          <h1 class="hero-title">Usuarios y asignaciones</h1>
          <p class="hero-copy">Gestiona profesores, alumnos, bloqueos, grados y vínculos docente-alumno.</p>
        </div>
        <button class="btn btn-secondary" type="button" @click="loadData" :disabled="loading">
          <i class="pi pi-refresh"></i>
          Recargar
        </button>
      </div>

      <div v-if="!isSuperAdmin" class="locked-card">
        <div class="locked-icon"><i class="pi pi-lock"></i></div>
        <h2>Acceso restringido</h2>
        <p>Esta vista está pensada para superadmin o admin con funciones directivas.</p>
      </div>

      <template v-else>
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon stat-icon--teacher"><i class="pi pi-briefcase"></i></div>
            <div class="stat-value">{{ teachers.length }}</div>
            <div class="stat-label">Profesores</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon--student"><i class="pi pi-users"></i></div>
            <div class="stat-value">{{ students.length }}</div>
            <div class="stat-label">Alumnos</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-icon--pending"><i class="pi pi-clock"></i></div>
            <div class="stat-value">{{ pendingProfiles.length }}</div>
            <div class="stat-label">Sin perfil</div>
          </div>
        </div>

        <section class="toolbar-card">
          <div class="search-box">
            <i class="pi pi-search"></i>
            <input v-model.trim="searchTerm" class="search-input" placeholder="Buscar por nombre, correo o username" />
          </div>
          <div class="filter-row">
            <button
              v-for="option in statusOptions"
              :key="option.value"
              type="button"
              class="filter-chip"
              :class="{ 'filter-chip--active': statusFilter === option.value }"
              @click="statusFilter = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </section>

        <div v-if="loading" class="loading-card">
          <div class="spinner spinner-violet"></div>
        </div>

        <div v-else-if="errorMessage" class="error-card">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <section class="panel-card">
          <div class="panel-head">
            <div>
              <div class="panel-kicker">Profesores</div>
              <h2>Plantel docente</h2>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Asignados</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="teacher in filteredTeachers" :key="teacher.user.id">
                <td>{{ fullName(teacher.user) }}</td>
                <td class="cell-muted">{{ teacher.user.email }}</td>
                <td>
                  <div class="chip-row chip-row--inline">
                    <span class="soft-chip" v-for="role in teacher.user.roles" :key="role.id">{{ role.name }}</span>
                  </div>
                </td>
                <td class="cell-center">{{ teacherAssignments[practiqUserId(teacher.user)]?.length || 0 }}</td>
                <td>
                  <span class="teacher-state" :class="teacher.profile?.academic_status === 'blocked' ? 'teacher-state--blocked' : 'teacher-state--ok'">
                    {{ teacher.profile?.academic_status === 'blocked' ? 'Bloqueado' : 'Activo' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section v-if="pendingProfiles.length" class="panel-card">
          <div class="panel-head">
            <div>
              <div class="panel-kicker">Pendientes</div>
              <h2>Usuarios sin perfil en Practiq</h2>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Roles</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredPendingProfiles" :key="item.user.id" class="row--pending">
                <td>{{ fullName(item.user) }}</td>
                <td class="cell-muted">{{ item.user.email }}</td>
                <td>
                  <div class="chip-row chip-row--inline">
                    <span class="soft-chip" v-for="role in item.user.roles" :key="role.id">{{ role.name }}</span>
                  </div>
                </td>
                <td><span class="teacher-badge teacher-badge--pending">{{ practiqUserId(item.user) }}</span></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="panel-card">
          <div class="panel-head">
            <div>
              <div class="panel-kicker">Alumnos</div>
              <h2>Asignación y control</h2>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Docentes</th>
                <th>Grados</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredStudents" :key="item.user.id">
                <td>{{ fullName(item.user) }}</td>
                <td class="cell-muted">{{ item.user.email }}</td>
                <td>
                  <div class="chip-row chip-row--inline">
                    <span v-for="teacher in studentTeachers[practiqUserId(item.user)]" :key="teacher.id" class="soft-chip soft-chip--teacher">{{ teacher.name }}</span>
                    <span v-if="!studentTeachers[practiqUserId(item.user)]?.length" class="detail-empty">Sin docente</span>
                  </div>
                </td>
                <td>
                  <div class="chip-row chip-row--inline">
                    <span v-for="grade in userGrades[practiqUserId(item.user)]" :key="grade.id" class="soft-chip soft-chip--grade">{{ grade.name }}</span>
                    <span v-if="!userGrades[practiqUserId(item.user)]?.length" class="detail-empty">Sin grado</span>
                  </div>
                </td>
                <td>
                  <span class="status-pill" :class="item.profile?.academic_status === 'blocked' || !item.user.is_active ? 'status-pill--blocked' : 'status-pill--ok'">
                    {{ item.profile?.academic_status === 'blocked' || !item.user.is_active ? 'Bloqueado' : 'Activo' }}
                  </span>
                </td>
                <td class="cell-actions">
                  <button class="btn btn-secondary btn-sm" type="button" @click="openStudentEditor(item)">Editar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <div v-if="editingStudent" class="modal-backdrop" @click.self="closeStudentEditor">
          <div class="modal-card">
            <div class="modal-head">
              <div>
                <div class="panel-kicker">Alumno</div>
                <h3>{{ fullName(editingStudent.user) }}</h3>
                <p>{{ editingStudent.user.email }}</p>
              </div>
              <button class="modal-close" type="button" @click="closeStudentEditor">×</button>
            </div>

            <div class="modal-body">
              <div class="detail-card">
                <span class="detail-label">Docentes asignados</span>
                <div class="chip-row">
                  <span v-for="teacher in currentStudentTeachers" :key="teacher.id" class="soft-chip soft-chip--teacher">
                    {{ teacher.name }}
                    <button type="button" class="chip-action" @click="unassignTeacher(teacher.id, currentEditingStudentId)">×</button>
                  </span>
                  <span v-if="!currentStudentTeachers.length" class="detail-empty">Sin docente asignado</span>
                </div>
                <div class="action-row">
                  <select v-model="teacherSelection[currentEditingStudentId]" class="form-select">
                    <option value="">Asignar profesor</option>
                    <option v-for="teacher in teachers" :key="teacher.user.id" :value="practiqUserId(teacher.user)">
                      {{ fullName(teacher.user) }}
                    </option>
                  </select>
                  <button class="btn btn-secondary btn-sm" type="button" @click="assignTeacher(currentEditingStudentId)">
                    Asignar
                  </button>
                </div>
              </div>

              <div class="detail-card">
                <span class="detail-label">Grados</span>
                <div class="chip-row">
                  <span v-for="grade in currentStudentGrades" :key="grade.id" class="soft-chip soft-chip--grade">
                    {{ grade.name }}
                    <button type="button" class="chip-action" @click="removeGrade(grade.id, currentEditingStudentId)">×</button>
                  </span>
                  <span v-if="!currentStudentGrades.length" class="detail-empty">Sin grado</span>
                </div>
                <div class="action-row">
                  <select v-model="gradeSelection[currentEditingStudentId]" class="form-select">
                    <option value="">Agregar a grado</option>
                    <option v-for="grade in grades" :key="grade.id" :value="grade.id">
                      {{ grade.name }}
                    </option>
                  </select>
                  <button class="btn btn-secondary btn-sm" type="button" @click="assignGrade(currentEditingStudentId)">
                    Vincular
                  </button>
                </div>
              </div>

              <div class="action-row action-row--split">
                <button
                  class="btn"
                  :class="editingStudent.profile?.academic_status === 'blocked' || !editingStudent.user.is_active ? 'btn-secondary' : 'btn-danger'"
                  type="button"
                  @click="toggleBlocked(editingStudent)"
                >
                  {{ editingStudent.profile?.academic_status === 'blocked' || !editingStudent.user.is_active ? 'Desbloquear' : 'Bloquear' }}
                </button>
              </div>

              <div class="assistant-box">
                <div class="assistant-title">Asistente del alumno</div>
                <input
                  v-model="assistantForms[currentEditingStudentId].assistant_base_url"
                  class="form-input"
                  placeholder="Assistant Base URL"
                />
                <input
                  v-model="assistantForms[currentEditingStudentId].assistant_api_key"
                  class="form-input"
                  placeholder="Assistant API Key"
                />
                <button class="btn btn-primary btn-sm modal-save" type="button" @click="saveAssistantConfig(currentEditingStudentId)">
                  Guardar asistente
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </TeacherLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import { authAdminService } from '@/services/auth/authAdminService'
import { assignmentService } from '@/services/assignments/assignmentService'
import { gradeService } from '@/services/grades/gradeService'
import { profileService } from '@/services/profile/profileService'
import { useAuthStore } from '@/stores/authStore'
import type { AssignedUser, AuthApiUser, Grade, UserProfile } from '@/types'

type UserRow = {
  user: AuthApiUser
  profile: UserProfile | null
}

const authStore = useAuthStore()
const loading = ref(false)
const errorMessage = ref('')
const rows = ref<UserRow[]>([])
const grades = ref<Grade[]>([])
const teacherAssignments = ref<Record<string, AssignedUser[]>>({})
const studentTeachers = ref<Record<string, AssignedUser[]>>({})
const userGrades = ref<Record<string, Grade[]>>({})
const teacherSelection = ref<Record<string, string>>({})
const gradeSelection = ref<Record<string, string>>({})
const assistantForms = ref<Record<string, { assistant_base_url: string; assistant_api_key: string }>>({})
const searchTerm = ref('')
const statusFilter = ref<'all' | 'active' | 'blocked' | 'pending'>('all')
const editingStudent = ref<UserRow | null>(null)

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'blocked', label: 'Bloqueados' },
  { value: 'pending', label: 'Sin perfil' }
] as const

const isSuperAdmin = computed(() => {
  const roles = authStore.authUser?.roles || []
  return roles.some((role) => role.name === 'superadmin' || role.name === 'admin')
})

function practiqUserId(user: AuthApiUser) {
  return user.username || user.id
}

const teachers = computed(() => rows.value.filter((item) => item.profile?.profile_type === 'teacher'))
const students = computed(() => rows.value.filter((item) => item.profile?.profile_type === 'student'))
const pendingProfiles = computed(() => rows.value.filter((item) => !item.profile))

const normalizedSearch = computed(() => searchTerm.value.trim().toLowerCase())

function matchesSearch(item: UserRow) {
  const needle = normalizedSearch.value
  if (!needle) return true
  return [
    fullName(item.user),
    item.user.email,
    practiqUserId(item.user)
  ].some((value) => value.toLowerCase().includes(needle))
}

function matchesStatus(item: UserRow) {
  if (statusFilter.value === 'all') return true
  if (statusFilter.value === 'pending') return !item.profile
  const blocked = item.profile?.academic_status === 'blocked' || !item.user.is_active
  if (statusFilter.value === 'blocked') return blocked
  if (statusFilter.value === 'active') return !!item.profile && !blocked
  return true
}

const filteredTeachers = computed(() => teachers.value.filter((item) => matchesSearch(item) && matchesStatus(item)))
const filteredStudents = computed(() => students.value.filter((item) => matchesSearch(item) && matchesStatus(item)))
const filteredPendingProfiles = computed(() => pendingProfiles.value.filter((item) => matchesSearch(item) && matchesStatus(item)))
const currentEditingStudentId = computed(() => editingStudent.value ? practiqUserId(editingStudent.value.user) : '')
const currentStudentTeachers = computed(() => currentEditingStudentId.value ? (studentTeachers.value[currentEditingStudentId.value] || []) : [])
const currentStudentGrades = computed(() => currentEditingStudentId.value ? (userGrades.value[currentEditingStudentId.value] || []) : [])

onMounted(async () => {
  if (isSuperAdmin.value) {
    await loadData()
  }
})

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [usersRes, gradesRes] = await Promise.all([
      authAdminService.listUsers({ limit: 1000, offset: 0 }),
      gradeService.list()
    ])

    const userRows = await Promise.all(
      (usersRes.data || []).map(async (user) => {
        try {
          const profileRes = await profileService.getById(practiqUserId(user))
          return { user, profile: profileRes.data as UserProfile }
        } catch {
          return { user, profile: null }
        }
      })
    )

    rows.value = userRows
    grades.value = gradesRes.data || []
    syncAssistantForms()
    await loadAssignments()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo cargar la estructura de usuarios.'
  } finally {
    loading.value = false
  }
}

async function loadAssignments() {
  const teacherMap: Record<string, AssignedUser[]> = {}
  const studentMap: Record<string, AssignedUser[]> = {}
  const gradeMap: Record<string, Grade[]> = {}

  await Promise.all(teachers.value.map(async (teacher) => {
    try {
      const teacherId = practiqUserId(teacher.user)
      const res = await assignmentService.listStudents(teacherId)
      teacherMap[teacherId] = res.data || []
    } catch {
      teacherMap[practiqUserId(teacher.user)] = []
    }
  }))

  await Promise.all(students.value.map(async (student) => {
    try {
      const studentId = practiqUserId(student.user)
      const [teachersRes, gradesRes] = await Promise.all([
        assignmentService.listTeachers(studentId),
        gradeService.listUserGrades(studentId)
      ])
      studentMap[studentId] = teachersRes.data || []
      gradeMap[studentId] = gradesRes.data || []
    } catch {
      studentMap[practiqUserId(student.user)] = []
      gradeMap[practiqUserId(student.user)] = []
    }
  }))

  teacherAssignments.value = teacherMap
  studentTeachers.value = studentMap
  userGrades.value = gradeMap
}

function fullName(user: AuthApiUser) {
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
}

function syncAssistantForms() {
  const next: Record<string, { assistant_base_url: string; assistant_api_key: string }> = {}
  for (const item of rows.value) {
    next[practiqUserId(item.user)] = {
      assistant_base_url: item.profile?.assistant_base_url || '',
      assistant_api_key: item.profile?.assistant_api_key || ''
    }
  }
  assistantForms.value = next
}

function openStudentEditor(item: UserRow) {
  editingStudent.value = item
}

function closeStudentEditor() {
  editingStudent.value = null
}

async function saveAssistantConfig(userId: string) {
  try {
    const form = assistantForms.value[userId]
    const res = await profileService.updateAssistantConfigById(userId, form)
    rows.value = rows.value.map((item) => practiqUserId(item.user) === userId ? { ...item, profile: res.data } : item)
    if (editingStudent.value && practiqUserId(editingStudent.value.user) === userId) {
      editingStudent.value = { ...editingStudent.value, profile: res.data }
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo guardar la configuración del asistente.'
  }
}

async function assignTeacher(studentId: string) {
  const teacherId = teacherSelection.value[studentId]
  if (!teacherId) return
  try {
    await assignmentService.assign(teacherId, studentId)
    teacherSelection.value[studentId] = ''
    await loadAssignments()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo asignar el profesor.'
  }
}

async function unassignTeacher(teacherId: string, studentId: string) {
  try {
    await assignmentService.unassign(teacherId, studentId)
    await loadAssignments()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo desvincular el profesor.'
  }
}

async function assignGrade(userId: string) {
  const gradeId = gradeSelection.value[userId]
  if (!gradeId) return
  try {
    await gradeService.addMember(gradeId, userId)
    gradeSelection.value[userId] = ''
    await loadAssignments()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo asignar el grado.'
  }
}

async function removeGrade(gradeId: string, userId: string) {
  try {
    await gradeService.removeMember(gradeId, userId)
    await loadAssignments()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo quitar el grado.'
  }
}

async function toggleBlocked(item: UserRow) {
  const nextBlocked = !(item.profile?.academic_status === 'blocked' || !item.user.is_active)
  try {
    const practiqId = practiqUserId(item.user)
    const [authRes, profileRes] = await Promise.all([
      authAdminService.updateUser(item.user.id, { is_active: !nextBlocked }),
      profileService.updateAcademicStatusById(practiqId, { academic_status: nextBlocked ? 'blocked' : 'active' })
    ])

    rows.value = rows.value.map((row) => row.user.id === item.user.id
      ? { user: authRes.data, profile: profileRes.data }
      : row
    )
    if (editingStudent.value && editingStudent.value.user.id === item.user.id) {
      editingStudent.value = { user: authRes.data, profile: profileRes.data }
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = 'No se pudo cambiar el estado del alumno.'
  }
}
</script>

<style scoped>
.admin-shell { padding: 16px 20px 32px; display: flex; flex-direction: column; gap: 14px; }
.hero-card, .locked-card, .loading-card, .error-card, .panel-card, .stat-card, .teacher-card, .student-card, .toolbar-card {
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(255,255,255,0.92);
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-lg);
}
.hero-card, .panel-head, .student-head, .action-row, .stats-row, .chip-row, .toolbar-card, .search-box, .filter-row { display: flex; }
.hero-card, .panel-head, .student-head { justify-content: space-between; gap: 18px; align-items: flex-start; }
.hero-card, .panel-card, .teacher-card, .student-card, .stat-card { padding: 16px 20px; }
.hero-kicker, .panel-kicker { font-size: var(--text-sm); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--practiq-violet); }
.hero-title { margin: 4px 0 6px; font-size: var(--font-hero); font-weight: 800; color: var(--text-heading); }
.hero-copy { margin: 0; color: var(--text-secondary); max-width: 720px; font-size: var(--text-base); }
.stats-row { gap: 8px; }
.stat-card { flex: 1; position: relative; overflow: hidden; padding-left: 54px; }
.stat-icon {
  position: absolute;
  left: 16px;
  top: 14px;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 16px;
}
.stat-icon--teacher { background: rgba(59,130,246,0.12); color: var(--color-info-dark); }
.stat-icon--student { background: rgba(16,185,129,0.12); color: var(--color-success-dark); }
.stat-icon--pending { background: rgba(245,158,11,0.14); color: var(--color-warning-dark); }
.stat-value { font-size: var(--font-stat-value); font-weight: 800; color: var(--text-heading); }
.stat-label { color: var(--text-secondary); }
.toolbar-card {
  justify-content: space-between;
  gap: 18px;
  padding: 12px 14px;
  align-items: center;
}
.search-box {
  flex: 1;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: rgba(248,250,252,0.92);
  border: 1px solid rgba(148,163,184,0.16);
}
.search-box i { color: var(--text-secondary); }
.search-input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font: inherit;
  color: var(--text-heading);
}
.filter-row {
  gap: 8px;
  flex-wrap: wrap;
}
.filter-chip {
  border: none;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: rgba(241,245,249,0.95);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
}
.filter-chip--active {
  background: rgba(124,58,237,0.14);
  color: var(--practiq-violet-dark);
}
.panel-card { display: flex; flex-direction: column; gap: 12px; }
.panel-head h2 { margin: 2px 0 0; font-size: var(--font-section-title); font-weight: 700; color: var(--text-heading); }
.teacher-state {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 700;
}
.teacher-state--ok { background: rgba(16,185,129,0.12); color: var(--color-success-dark); }
.teacher-state--blocked { background: rgba(239,68,68,0.14); color: var(--color-error-dark); }
.teacher-badge {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: rgba(15,23,42,0.05);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 700;
}
.teacher-badge--pending { background: rgba(245,158,11,0.12); color: var(--color-warning-dark); }
.chip-row { display: flex; gap: 6px; flex-wrap: wrap; }
.chip-row--inline { margin: 0; }
.soft-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: var(--radius-pill);
  background: rgba(124,58,237,0.1); color: var(--practiq-violet-dark); font-size: var(--text-xs); font-weight: 700;
}
.soft-chip--teacher { background: rgba(59,130,246,0.12); color: var(--color-info-dark); }
.soft-chip--grade { background: rgba(16,185,129,0.12); color: var(--color-success-dark); }
.chip-action { border: none; background: transparent; color: inherit; cursor: pointer; font-weight: 800; padding: 0; }
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-base);
}
.data-table thead th {
  padding: 8px 12px;
  text-align: left;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(148,163,184,0.18);
  background: rgba(248,250,252,0.7);
}
.data-table thead th:first-child { border-radius: var(--radius-sm) 0 0 0; }
.data-table thead th:last-child { border-radius: 0 var(--radius-sm) 0 0; }
.data-table tbody tr {
  border-bottom: 1px solid rgba(148,163,184,0.1);
  transition: background 0.15s;
}
.data-table tbody tr:last-child { border-bottom: none; }
.data-table tbody tr:hover { background: rgba(124,58,237,0.04); }
.data-table tbody tr.row--pending { background: rgba(245,158,11,0.03); }
.data-table tbody tr.row--pending:hover { background: rgba(245,158,11,0.07); }
.data-table td {
  padding: 10px 12px;
  vertical-align: middle;
  color: var(--text-heading);
}
.cell-muted { color: var(--text-secondary); font-size: var(--text-sm); }
.cell-center { text-align: center; font-weight: 700; }
.cell-actions { text-align: right; white-space: nowrap; }
.detail-grid { display: grid; gap: 14px; margin-top: 14px; }
.detail-card {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(248,250,252,0.9);
  border: 1px solid rgba(148,163,184,0.14);
}
.detail-label { display: block; font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 4px; }
.detail-empty { color: var(--text-muted); font-size: var(--text-sm); }
.action-row { gap: 8px; align-items: center; margin-top: 10px; }
.action-row--split { justify-content: space-between; }
.assistant-box { display: grid; gap: 8px; margin-top: 12px; }
.assistant-title {
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
}
.form-input, .form-select {
  width: 100%; border-radius: var(--radius-sm); border: 1px solid rgba(148,163,184,0.2); background: rgba(248,250,252,0.95);
  padding: 8px 10px; font: inherit; font-size: var(--text-base); color: var(--text-heading);
}
.btn-danger { background: var(--color-error); color: white; border: none; }
.status-pill {
  display: inline-flex; align-items: center; padding: 3px 10px; border-radius: var(--radius-pill); font-size: var(--text-xs); font-weight: 700;
}
.status-pill--ok { background: rgba(16,185,129,0.12); color: var(--color-success-dark); }
.status-pill--blocked { background: rgba(239,68,68,0.14); color: var(--color-error-dark); }
.loading-card, .error-card { padding: 30px; text-align: center; }
.locked-card { padding: 56px 30px; text-align: center; }
.locked-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(239,68,68,0.08);
  color: var(--color-error-dark);
  font-size: 28px;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 50;
}
.modal-card {
  width: min(760px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 16px;
  border-radius: var(--radius-xl);
  background: rgba(255,255,255,0.98);
  box-shadow: 0 24px 80px rgba(15,23,42,0.22);
}
.modal-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}
.modal-head h3 {
  margin: 8px 0 6px;
  font-size: 18px;
  color: var(--text-heading);
}
.modal-head p {
  margin: 0;
  color: var(--text-secondary);
}
.modal-body {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}
.modal-close {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-pill);
  background: rgba(148,163,184,0.12);
  color: var(--text-primary);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}
.modal-save {
  justify-self: flex-end;
}
/* Tablet landscape */
@media (max-width: 1024px) {
  .admin-shell { padding: 20px 20px 36px; }
  .data-table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
}

/* Tablet portrait + mobile */
@media (max-width: 920px) {
  .admin-shell { padding: 16px 14px 28px; }
  .hero-card, .panel-head, .action-row--split, .toolbar-card { flex-direction: column; }
  .stats-row { flex-direction: column; }
  .modal-head { flex-direction: column; align-items: stretch; }
  .data-table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
}
</style>
