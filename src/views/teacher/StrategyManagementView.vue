<template>
  <TeacherLayout>
    <div class="strategy-dashboard">
      <!-- Header -->
      <div class="page-header">
        <div class="page-header__left">
          <div class="page-kicker">Configuracion avanzada</div>
          <h1 class="page-title">Estrategias de Aprendizaje</h1>
        </div>
        <div class="page-header__right">
          <button v-if="isAdmin" class="btn btn-primary" @click="openCreateModal">
            <i class="pi pi-plus"></i>
            Nueva estrategia
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner spinner-violet"></div>
      </div>

      <template v-else>
        <!-- Strategies Section -->
        <section class="content-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Estrategias disponibles</h2>
              <p class="section-subtitle">Configura como los estudiantes aprenden y progresan en cada curso.</p>
            </div>
          </div>

          <div v-if="strategies.length === 0" class="empty-state">
            <div class="empty-icon">
              <i class="pi pi-cog"></i>
            </div>
            <h3>Sin estrategias</h3>
            <p>No hay estrategias de aprendizaje configuradas.</p>
            <button v-if="isAdmin" class="btn btn-primary" @click="openCreateModal">
              <i class="pi pi-plus"></i> Crear estrategia
            </button>
          </div>

          <div v-else class="strategies-grid">
            <article
              v-for="strategy in strategies"
              :key="strategy.id"
              class="strategy-card"
            >
              <div class="strategy-header">
                <h3 class="strategy-name">{{ strategy.name }}</h3>
                <div v-if="isAdmin" class="strategy-actions-mini">
                  <button class="icon-btn" @click="editStrategy(strategy)" title="Editar">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button class="icon-btn icon-btn--danger" @click="confirmDeleteStrategy(strategy)" title="Eliminar">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </div>
              <p class="strategy-description">{{ strategy.description || 'Sin descripcion' }}</p>
              <div class="strategy-meta">
                <span class="meta-item">
                  <i class="pi pi-hashtag"></i>
                  {{ strategy.code }}
                </span>
                <span class="meta-item">
                  <i class="pi pi-calendar"></i>
                  Creada {{ formatDate(strategy.created_at) }}
                </span>
              </div>
            </article>
          </div>
        </section>

        <!-- Course Assignments Section -->
        <section class="content-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Asignaciones por curso</h2>
              <p class="section-subtitle">Asigna estrategias a tus cursos para personalizar el aprendizaje.</p>
            </div>
          </div>

          <div v-if="courses.length === 0" class="empty-state">
            <p>No tienes cursos para asignar estrategias.</p>
          </div>

          <div v-else class="courses-assignments">
            <div
              v-for="course in courses"
              :key="course.id"
              class="course-assignment-card"
            >
              <div class="course-info">
                <h4 class="course-name">{{ course.title }}</h4>
                <span class="course-subject-badge">{{ course.subject || 'General' }}</span>
              </div>

              <div class="assigned-strategies">
                <div
                  v-for="assignment in getCourseAssignments(course.id)"
                  :key="assignment.id"
                  class="assigned-strategy"
                >
                  <span class="strategy-tag">
                    <i class="pi pi-cog"></i>
                    {{ assignment.strategy.name }}
                  </span>
                  <button class="btn-remove" @click="removeAssignment(course.id, assignment.id)" title="Quitar">
                    <i class="pi pi-times"></i>
                  </button>
                </div>
                <span v-if="getCourseAssignments(course.id).length === 0" class="no-strategies">
                  Sin estrategias asignadas
                </span>
              </div>

              <div class="assignment-actions">
                <select
                  v-model="selectedStrategyForCourse[course.id]"
                  class="strategy-select"
                >
                  <option value="">Seleccionar estrategia...</option>
                  <option
                    v-for="strategy in getAvailableStrategies(course.id)"
                    :key="strategy.id"
                    :value="strategy.id"
                  >
                    {{ strategy.name }}
                  </option>
                </select>
                <button
                  class="btn btn-sm btn-secondary"
                  :disabled="!selectedStrategyForCourse[course.id] || assigning[course.id]"
                  @click="assignStrategy(course.id)"
                >
                  <i v-if="assigning[course.id]" class="pi pi-spin pi-spinner"></i>
                  <i v-else class="pi pi-plus"></i>
                  Asignar
                </button>
              </div>
            </div>
          </div>
        </section>
      </template>

      <!-- Create/Edit Strategy Modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showStrategyModal" class="modal-overlay" @click.self="closeStrategyModal">
            <div class="modal-box">
              <div class="modal-head">
                <h3 class="modal-title">{{ editingStrategy ? 'Editar estrategia' : 'Nueva estrategia' }}</h3>
                <button class="icon-btn" @click="closeStrategyModal"><i class="pi pi-times"></i></button>
              </div>

              <form @submit.prevent="saveStrategy">
                <div class="form-group">
                  <label class="form-label">Nombre *</label>
                  <input
                    v-model="strategyForm.name"
                    class="form-input"
                    placeholder="Ej: Aprendizaje adaptativo"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Código *</label>
                  <input
                    v-model="strategyForm.code"
                    class="form-input"
                    placeholder="Ej: adaptive_practice"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Descripcion</label>
                  <textarea
                    v-model="strategyForm.description"
                    class="form-textarea"
                    placeholder="Describe como funciona esta estrategia..."
                    rows="3"
                  ></textarea>
                </div>
                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" @click="closeStrategyModal">Cancelar</button>
                  <button type="submit" class="btn btn-primary" :disabled="saving">
                    <span v-if="saving" class="spinner spinner-sm"></span>
                    <i v-else class="pi pi-check"></i>
                    {{ editingStrategy ? 'Guardar cambios' : 'Crear estrategia' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Delete Confirmation Modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="deletingStrategy" class="modal-overlay" @click.self="deletingStrategy = null">
            <div class="modal-box">
              <h3 class="modal-title">Eliminar estrategia</h3>
              <p class="submit-copy">
                ¿Estas seguro de eliminar la estrategia <strong>{{ deletingStrategy.name }}</strong>?
                Esta accion no se puede deshacer.
              </p>
              <div class="modal-actions">
                <button class="btn btn-secondary" @click="deletingStrategy = null">Cancelar</button>
                <button class="btn btn-danger" :disabled="deleting" @click="deleteStrategy">
                  <span v-if="deleting" class="spinner spinner-sm"></span>
                  <i v-else class="pi pi-trash"></i>
                  Eliminar
                </button>
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
import { strategyService } from '@/services/strategy/strategyService'
import { courseService } from '@/services/courses/courseService'
import { useAuthStore } from '@/stores/authStore'
import type { LearningStrategy, CourseLearningStrategy, Course } from '@/types'

const authStore = useAuthStore()

const loading = ref(true)
const strategies = ref<LearningStrategy[]>([])
const courses = ref<Course[]>([])
const courseAssignments = ref<Record<string, CourseLearningStrategy[]>>({})
const selectedStrategyForCourse = ref<Record<string, string>>({})
const assigning = ref<Record<string, boolean>>({})

const showStrategyModal = ref(false)
const editingStrategy = ref<LearningStrategy | null>(null)
const saving = ref(false)

const deletingStrategy = ref<LearningStrategy | null>(null)
const deleting = ref(false)

const strategyForm = reactive({
  name: '',
  code: '',
  description: '',
})

const isAdmin = computed(() => {
  const roles = authStore.authUser?.roles || []
  return roles.some(role => role.name === 'admin' || role.name === 'superadmin')
})

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const [strategiesRes, coursesRes] = await Promise.all([
      strategyService.list(),
      courseService.list('teacher')
    ])

    strategies.value = strategiesRes.data || []
    courses.value = coursesRes.data || []

    // Load assignments for each course
    for (const course of courses.value) {
      try {
        const assignmentsRes = await strategyService.getCourseStrategies(course.id)
        courseAssignments.value[course.id] = assignmentsRes.data || []
      } catch {
        courseAssignments.value[course.id] = []
      }
      selectedStrategyForCourse.value[course.id] = ''
    }
  } catch (err) {
    console.error('Failed to load data:', err)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getCourseAssignments(courseId: string): CourseLearningStrategy[] {
  return courseAssignments.value[courseId] || []
}

function getAvailableStrategies(courseId: string): LearningStrategy[] {
  const assigned = getCourseAssignments(courseId).map(a => a.strategy_id)
  return strategies.value.filter(s => !assigned.includes(s.id))
}

async function assignStrategy(courseId: string) {
  const strategyId = selectedStrategyForCourse.value[courseId]
  if (!strategyId) return

  assigning.value[courseId] = true
  try {
    const res = await strategyService.assignToCourse(courseId, strategyId)
    if (!courseAssignments.value[courseId]) {
      courseAssignments.value[courseId] = []
    }
    courseAssignments.value[courseId].push(res.data)
    selectedStrategyForCourse.value[courseId] = ''
  } catch (err) {
    console.error('Failed to assign strategy:', err)
  } finally {
    assigning.value[courseId] = false
  }
}

async function removeAssignment(courseId: string, assignmentId: string) {
  try {
    await strategyService.removeCourseStrategy(assignmentId)
    courseAssignments.value[courseId] = courseAssignments.value[courseId].filter(
      a => a.id !== assignmentId
    )
  } catch (err) {
    console.error('Failed to remove assignment:', err)
  }
}

function openCreateModal() {
  editingStrategy.value = null
  strategyForm.name = ''
  strategyForm.code = ''
  strategyForm.description = ''
  showStrategyModal.value = true
}

function editStrategy(strategy: LearningStrategy) {
  editingStrategy.value = strategy
  strategyForm.name = strategy.name
  strategyForm.code = strategy.code
  strategyForm.description = strategy.description
  showStrategyModal.value = true
}

function closeStrategyModal() {
  showStrategyModal.value = false
  editingStrategy.value = null
}

async function saveStrategy() {
  saving.value = true
  try {
    if (editingStrategy.value) {
      await strategyService.update(editingStrategy.value.id, {
        name: strategyForm.name,
        code: strategyForm.code,
        description: strategyForm.description,
      })
    } else {
      await strategyService.create({
        name: strategyForm.name,
        code: strategyForm.code,
        description: strategyForm.description,
      })
    }

    closeStrategyModal()
    await loadData()
  } catch (err) {
    console.error('Failed to save strategy:', err)
  } finally {
    saving.value = false
  }
}

function confirmDeleteStrategy(strategy: LearningStrategy) {
  deletingStrategy.value = strategy
}

async function deleteStrategy() {
  if (!deletingStrategy.value) return

  deleting.value = true
  try {
    await strategyService.delete(deletingStrategy.value.id)
    strategies.value = strategies.value.filter(s => s.id !== deletingStrategy.value!.id)
    deletingStrategy.value = null
  } catch (err) {
    console.error('Failed to delete strategy:', err)
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.strategy-dashboard {
  padding: 24px 28px 40px;
  max-width: 1200px;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
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

/* Loading & Empty */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 80px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  background: var(--surface-glass);
  border-radius: var(--radius-2xl);
  border: 1px dashed rgba(var(--surface-border-rgb), 0.3);
}

.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: var(--fill-primary-subtle);
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  font-size: 24px;
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
  margin-bottom: 20px;
}

/* Sections */
.content-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.section-subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

/* Strategies Grid */
.strategies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.strategy-card {
  background: var(--surface-elevated);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--surface-elevated-strong);
  box-shadow: var(--shadow-card);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strategy-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.strategy-name {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.strategy-actions-mini {
  display: flex;
  gap: 6px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--surface-border-rgb), 0.2);
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.icon-btn:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.icon-btn--danger:hover {
  background: rgba(var(--color-error-rgb), 0.1);
  color: var(--color-error);
  border-color: rgba(var(--color-error-rgb), 0.3);
}

.strategy-description {
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.strategy-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.strategy-config {
  padding: 12px;
  background: var(--surface-subtle);
  border-radius: var(--radius-md);
}

.config-label {
  display: block;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.config-preview {
  display: block;
  font-size: var(--text-sm);
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
}

/* Course Assignments */
.courses-assignments {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-assignment-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--surface-elevated);
  border-radius: var(--radius-xl);
  border: 1px solid var(--surface-elevated-strong);
  box-shadow: var(--shadow-card);
  flex-wrap: wrap;
}

.course-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;
}

.course-name {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.course-subject-badge {
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--fill-primary-soft);
  color: var(--practiq-violet);
  font-size: var(--text-xs);
  font-weight: 700;
}

.assigned-strategies {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.assigned-strategy {
  display: flex;
  align-items: center;
  gap: 4px;
}

.strategy-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--color-success-bg);
  color: var(--color-success-dark);
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  font-weight: 600;
}

.btn-remove {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(var(--color-error-rgb), 0.1);
  color: var(--color-error);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 10px;
  transition: all 0.15s;
}

.btn-remove:hover {
  background: var(--color-error);
  color: white;
}

.no-strategies {
  font-size: var(--text-sm);
  color: var(--text-muted);
  font-style: italic;
}

.assignment-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.strategy-select {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--surface-elevated-strong);
  min-width: 180px;
}

.btn-sm {
  padding: 8px 14px;
  font-size: var(--text-sm);
}

/* Modal */
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.form-textarea--code {
  font-family: monospace;
  font-size: var(--text-sm);
}

.form-error {
  display: block;
  color: var(--color-error);
  font-size: var(--text-sm);
  margin-top: 4px;
}

.btn-danger {
  background: var(--color-error);
  color: white;
  border: none;
}

.btn-danger:hover {
  opacity: 0.9;
}

/* Responsive */
@media (max-width: 1024px) {
  .strategy-dashboard {
    padding: 20px 16px 40px;
  }

  .strategies-grid {
    grid-template-columns: 1fr;
  }

  .course-assignment-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .course-info {
    width: 100%;
  }

  .assigned-strategies {
    width: 100%;
  }

  .assignment-actions {
    width: 100%;
  }

  .strategy-select {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }
}
</style>
