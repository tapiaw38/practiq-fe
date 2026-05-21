<template>
  <TeacherLayout>
    <div class="course-detail">
      <div class="course-header">
        <button class="btn btn-ghost btn-sm" @click="router.back()">
          <i class="pi pi-arrow-left"></i> Volver
        </button>
        <div v-if="course">
          <h1 class="page-title">{{ course.title }}</h1>
          <div class="course-badges">
            <span class="badge badge-violet">{{ course.subject || 'General' }}</span>
            <span class="badge" style="background: var(--surface-hover); color: var(--text-secondary)">{{ course.level || 'Sin nivel' }}</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button v-for="tab in tabs" :key="tab.id" class="tab" :class="{ 'tab-active': activeTab === tab.id }" @click="activeTab = tab.id">
          <i :class="tab.icon"></i> {{ tab.label }}
        </button>
      </div>

      <!-- TAB: Temas -->
      <div v-if="activeTab === 'topics'" class="tab-content">
        <div class="section-header">
          <h2>Temas del curso</h2>
          <button class="btn btn-primary btn-sm" @click="showTopicModal = true">
            <i class="pi pi-plus"></i> Nuevo Tema
          </button>
        </div>
        <div v-if="topics.length === 0" class="empty-inline">Aún no hay temas. Crea el primero.</div>
        <div class="items-list">
          <div v-for="topic in topics" :key="topic.id" class="list-item">
            <div class="item-info">
              <span class="item-order">{{ topic.order_index + 1 }}</span>
              <div>
                <div class="item-title">{{ topic.title }}</div>
                <div class="item-subtitle">{{ topic.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: Ejercicios -->
      <div v-if="activeTab === 'exercises'" class="tab-content">
        <div class="section-header">
          <div class="flex gap-3 items-center">
            <h2>Ejercicios</h2>
            <select v-model="selectedTopicId" class="form-select" style="width: 200px; padding: 6px 10px">
              <option value="">Seleccionar tema</option>
              <option v-for="t in topics" :key="t.id" :value="t.id">{{ t.title }}</option>
            </select>
          </div>
          <button class="btn btn-primary btn-sm" :disabled="!selectedTopicId" @click="showExerciseModal = true">
            <i class="pi pi-plus"></i> Nuevo Ejercicio
          </button>
        </div>
        <div v-if="!selectedTopicId" class="empty-inline">Selecciona un tema para ver sus ejercicios.</div>
        <div v-else-if="exercises.length === 0" class="empty-inline">No hay ejercicios en este tema.</div>
        <div class="items-list">
          <div v-for="ex in exercises" :key="ex.id" class="list-item">
            <div class="item-info">
              <div class="difficulty-badge" :style="{ background: diffColor(ex.difficulty) }">{{ ex.difficulty }}</div>
              <div>
                <div class="item-title">{{ ex.question }}</div>
                <div class="item-subtitle">{{ ex.type }} · Respuesta: {{ ex.correct_answer || 'N/A' }}</div>
              </div>
            </div>
            <button class="btn btn-ghost btn-sm" @click="deleteExercise(ex.id)">
              <i class="pi pi-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- TAB: Materiales -->
      <div v-if="activeTab === 'materials'" class="tab-content">
        <div class="section-header">
          <h2>Materiales</h2>
          <button class="btn btn-primary btn-sm" @click="showMaterialModal = true">
            <i class="pi pi-plus"></i> Agregar Material
          </button>
        </div>
        <div v-if="materials.length === 0" class="empty-inline">No hay materiales aún.</div>
        <div class="items-list">
          <div v-for="mat in materials" :key="mat.id" class="list-item">
            <div class="item-info">
              <i :class="matIcon(mat.type)" style="font-size: 20px; color: var(--practiq-violet)"></i>
              <div>
                <div class="item-title">{{ mat.title }}</div>
                <div class="item-subtitle">{{ mat.type }} · {{ mat.status }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: Alumnos -->
      <div v-if="activeTab === 'students'" class="tab-content">
        <div class="section-header">
          <h2>Alumnos inscritos</h2>
        </div>
        <div v-if="students.length === 0" class="empty-inline">No hay alumnos inscritos.</div>
        <div class="items-list">
          <div v-for="s in students" :key="s.id" class="list-item">
            <div class="item-info">
              <div class="student-avatar">{{ s.name[0] }}</div>
              <div>
                <div class="item-title">{{ s.name }}</div>
                <div class="item-subtitle">{{ s.email }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: Hojas de Práctica -->
      <div v-if="activeTab === 'sheets'" class="tab-content">
        <div class="section-header">
          <h2>Hojas de Práctica</h2>
          <button class="btn btn-primary btn-sm" @click="showSheetModal = true">
            <i class="pi pi-plus"></i> Nueva Hoja
          </button>
        </div>
        <div v-if="sheets.length === 0" class="empty-inline">No hay hojas de práctica.</div>
        <div class="items-list">
          <div v-for="sheet in sheets" :key="sheet.id" class="list-item">
            <div class="item-info">
              <div class="level-badge">Nivel {{ sheet.level }}</div>
              <div>
                <div class="item-title">{{ sheet.title }}</div>
                <div class="item-subtitle">{{ sheet.exercises?.length || 0 }} ejercicios · {{ sheet.created_by }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: Cuadernos -->
      <div v-if="activeTab === 'notebooks'" class="tab-content">
        <div class="section-header">
          <h2>Cuadernos de Tareas</h2>
          <button class="btn btn-primary btn-sm" @click="showNotebookModal = true">
            <i class="pi pi-plus"></i> Nuevo Cuaderno
          </button>
        </div>
        <div v-if="notebooks.length === 0" class="empty-inline">No hay cuadernos aún.</div>
        <div class="items-list">
          <div
            v-for="nb in notebooks"
            :key="nb.id"
            class="list-item list-item--link"
            @click="router.push(`/teacher/courses/${courseId}/notebooks/${nb.id}`)"
          >
            <div class="item-info">
              <i class="pi pi-book" style="font-size: 20px; color: var(--practiq-violet)"></i>
              <div>
                <div class="item-title">{{ nb.title }}</div>
                <div class="item-subtitle">{{ nb.description || 'Sin descripción' }} · {{ nb.pages?.length || 0 }} páginas</div>
              </div>
            </div>
            <i class="pi pi-chevron-right" style="color: var(--text-secondary)"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Topic Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showTopicModal" class="modal-overlay" @click.self="showTopicModal = false">
          <div class="modal-box">
            <h3 class="modal-title">Nuevo Tema</h3>
            <form @submit.prevent="createTopic">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input v-model="newTopic.title" class="form-input" placeholder="Fracciones" required />
              </div>
              <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea v-model="newTopic.description" class="form-textarea" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Orden</label>
                <input v-model.number="newTopic.order_index" type="number" class="form-input" min="0" />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" @click="showTopicModal = false">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear Tema</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Exercise Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showExerciseModal" class="modal-overlay" @click.self="showExerciseModal = false">
          <div class="modal-box">
            <h3 class="modal-title">Nuevo Ejercicio</h3>
            <form @submit.prevent="createExercise">
              <div class="form-group">
                <label class="form-label">Pregunta *</label>
                <textarea v-model="newExercise.question" class="form-textarea" placeholder="¿Cuánto es 1/2 + 1/4?" required rows="2"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Tipo *</label>
                <select v-model="newExercise.type" class="form-select" required>
                  <option value="open_text">Texto abierto</option>
                  <option value="equation">Ecuación</option>
                  <option value="multiple_choice">Opción múltiple</option>
                  <option value="canvas">Canvas/Dibujo</option>
                  <option value="handwritten">Escrito a mano</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Respuesta correcta</label>
                <input v-model="newExercise.correct_answer" class="form-input" placeholder="3/4" />
              </div>
              <div class="form-group">
                <label class="form-label">Explicación</label>
                <textarea v-model="newExercise.explanation" class="form-textarea" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Dificultad (1-10)</label>
                <input v-model.number="newExercise.difficulty" type="number" class="form-input" min="1" max="10" />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" @click="showExerciseModal = false">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear Ejercicio</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Material Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showMaterialModal" class="modal-overlay" @click.self="showMaterialModal = false">
          <div class="modal-box">
            <h3 class="modal-title">Agregar Material</h3>
            <form @submit.prevent="createMaterial">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input v-model="newMaterial.title" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">Tipo *</label>
                <select v-model="newMaterial.type" class="form-select" required>
                  <option value="text">Texto</option>
                  <option value="pdf">PDF</option>
                  <option value="image">Imagen</option>
                  <option value="video">Video</option>
                  <option value="worksheet">Hoja de trabajo</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Contenido</label>
                <textarea v-model="newMaterial.extracted_text" class="form-textarea" rows="4" placeholder="Escribe el contenido del material..."></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" @click="showMaterialModal = false">Cancelar</button>
                <button type="submit" class="btn btn-primary">Agregar</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Practice Sheet Modal -->
    <Teleport to="body">
      <!-- Notebook Modal -->
      <Transition name="fade">
        <div v-if="showNotebookModal" class="modal-overlay" @click.self="showNotebookModal = false">
          <div class="modal-box">
            <h3 class="modal-title">Nuevo Cuaderno</h3>
            <form @submit.prevent="createNotebook">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input v-model="newNotebook.title" class="form-input" placeholder="Cuaderno de Matemáticas" required />
              </div>
              <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea v-model="newNotebook.description" class="form-textarea" rows="2" placeholder="Descripción opcional"></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" @click="showNotebookModal = false">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear Cuaderno</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div v-if="showSheetModal" class="modal-overlay" @click.self="showSheetModal = false">
          <div class="modal-box">
            <h3 class="modal-title">Nueva Hoja de Práctica</h3>
            <form @submit.prevent="createSheet">
              <div class="form-group">
                <label class="form-label">Título *</label>
                <input v-model="newSheet.title" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">Tema</label>
                <select v-model="newSheet.topic_id" class="form-select" @change="loadTopicExercises">
                  <option value="">Sin tema específico</option>
                  <option v-for="t in topics" :key="t.id" :value="t.id">{{ t.title }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tipo</label>
                <select v-model="newSheet.sheet_type" class="form-input">
                  <option value="practice">📝 Hoja de Práctica</option>
                  <option value="level_test">🏆 Prueba de Nivel</option>
                </select>
              </div>
              <div v-if="newSheet.sheet_type === 'level_test'" class="form-group">
                <label class="form-label">Estilo de respuesta</label>
                <select v-model="newSheet.test_style" class="form-input">
                  <option value="keyboard">⌨️ Teclado (texto)</option>
                  <option value="canvas">✏️ Hoja (dibujar)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Nivel</label>
                <input v-model.number="newSheet.level" type="number" class="form-input" min="1" />
              </div>
              <div class="form-group">
                <label class="form-label">Ejercicios (seleccionar)</label>
                <div class="exercise-selector">
                  <div v-if="sheetExercises.length === 0" class="empty-inline" style="padding: 12px 0">Selecciona un tema para ver los ejercicios</div>
                  <label v-for="ex in sheetExercises" :key="ex.id" class="exercise-checkbox">
                    <input type="checkbox" :value="ex.id" v-model="newSheet.exercise_ids" />
                    <span>{{ ex.question.slice(0, 60) }}...</span>
                  </label>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" @click="showSheetModal = false">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear Hoja</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </TeacherLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import { courseService } from '@/services/courses/courseService'
import { topicService } from '@/services/topics/topicService'
import { exerciseService } from '@/services/exercises/exerciseService'
import { materialService } from '@/services/materials/materialService'
import { practiceSheetService } from '@/services/practiceSheets/practiceSheetService'
import { notebookService } from '@/services/notebooks/notebookService'
import type { Course, Topic, Exercise, Material, PracticeSheet, Student, Notebook } from '@/types'

const route = useRoute()
const router = useRouter()
const courseId = route.params.id as string

const course = ref<Course | null>(null)
const topics = ref<Topic[]>([])
const exercises = ref<Exercise[]>([])
const materials = ref<Material[]>([])
const students = ref<Student[]>([])
const sheets = ref<PracticeSheet[]>([])
const notebooks = ref<Notebook[]>([])
const selectedTopicId = ref('')
const sheetExercises = ref<Exercise[]>([])

const activeTab = ref('topics')
const tabs = [
  { id: 'topics', label: 'Temas', icon: 'pi pi-list' },
  { id: 'exercises', label: 'Ejercicios', icon: 'pi pi-pencil' },
  { id: 'materials', label: 'Materiales', icon: 'pi pi-file' },
  { id: 'students', label: 'Alumnos', icon: 'pi pi-users' },
  { id: 'sheets', label: 'Hojas de Práctica', icon: 'pi pi-copy' },
  { id: 'notebooks', label: 'Cuadernos', icon: 'pi pi-book' }
]

const showTopicModal = ref(false)
const showExerciseModal = ref(false)
const showMaterialModal = ref(false)
const showSheetModal = ref(false)
const showNotebookModal = ref(false)

const newTopic = reactive({ title: '', description: '', order_index: 0 })
const newExercise = reactive({ question: '', type: 'open_text' as Exercise['type'], correct_answer: '', explanation: '', difficulty: 1 })
const newMaterial = reactive({ title: '', type: 'text' as Material['type'], extracted_text: '' })
const newSheet = reactive({ title: '', topic_id: '', level: 1, sheet_type: 'practice', test_style: 'keyboard', exercise_ids: [] as string[] })
const newNotebook = reactive({ title: '', description: '' })

onMounted(async () => {
  const [courseRes, topicsRes, materialsRes, studentsRes, sheetsRes, notebooksRes] = await Promise.allSettled([
    courseService.get(courseId),
    topicService.list(courseId),
    materialService.list(courseId),
    courseService.getStudents(courseId),
    practiceSheetService.list(courseId),
    notebookService.list(courseId)
  ])

  if (courseRes.status === 'fulfilled') course.value = courseRes.value.data
  if (topicsRes.status === 'fulfilled') topics.value = topicsRes.value.data || []
  if (materialsRes.status === 'fulfilled') materials.value = materialsRes.value.data || []
  if (studentsRes.status === 'fulfilled') students.value = studentsRes.value.data || []
  if (sheetsRes.status === 'fulfilled') sheets.value = sheetsRes.value.data || []
  if (notebooksRes.status === 'fulfilled') notebooks.value = notebooksRes.value || []
})

watch(selectedTopicId, async (id) => {
  if (!id) { exercises.value = []; return }
  try {
    const res = await exerciseService.list(id)
    exercises.value = res.data || []
  } catch { exercises.value = [] }
})

async function loadTopicExercises() {
  if (!newSheet.topic_id) { sheetExercises.value = []; return }
  try {
    const res = await exerciseService.list(newSheet.topic_id)
    sheetExercises.value = res.data || []
  } catch { sheetExercises.value = [] }
}

async function createTopic() {
  await topicService.create(courseId, newTopic)
  showTopicModal.value = false
  const res = await topicService.list(courseId)
  topics.value = res.data || []
  newTopic.title = ''; newTopic.description = ''; newTopic.order_index = 0
}

async function createExercise() {
  await exerciseService.create(selectedTopicId.value, newExercise)
  showExerciseModal.value = false
  const res = await exerciseService.list(selectedTopicId.value)
  exercises.value = res.data || []
}

async function createMaterial() {
  await materialService.create(courseId, newMaterial)
  showMaterialModal.value = false
  const res = await materialService.list(courseId)
  materials.value = res.data || []
}

async function createSheet() {
  await practiceSheetService.create(courseId, { ...newSheet })
  showSheetModal.value = false
  const res = await practiceSheetService.list(courseId)
  sheets.value = res.data || []
}

async function createNotebook() {
  const res = await notebookService.create(courseId, { ...newNotebook })
  showNotebookModal.value = false
  newNotebook.title = ''; newNotebook.description = ''
  router.push(`/teacher/courses/${courseId}/notebooks/${res.data.id}`)
}

async function deleteExercise(id: string) {
  if (!confirm('¿Eliminar este ejercicio?')) return
  await exerciseService.delete(id)
  exercises.value = exercises.value.filter(e => e.id !== id)
}

function diffColor(d: number) {
  if (d <= 3) return '#dcfce7'
  if (d <= 6) return '#fef9c3'
  return '#fee2e2'
}

function matIcon(type: string) {
  const icons: Record<string, string> = {
    pdf: 'pi pi-file-pdf',
    image: 'pi pi-image',
    video: 'pi pi-video',
    text: 'pi pi-align-left',
    worksheet: 'pi pi-copy'
  }
  return icons[type] || 'pi pi-file'
}
</script>

<style scoped>
.course-detail { padding: 32px; max-width: 1000px; }
.course-header { margin-bottom: 28px; display: flex; flex-direction: column; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); }
.course-badges { display: flex; gap: 8px; margin-top: 8px; }
.tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--surface-border); margin-bottom: 28px; }
.tab {
  padding: 10px 18px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 6px;
}
.tab:hover { color: var(--text-primary); }
.tab-active { color: var(--practiq-violet); border-bottom-color: var(--practiq-violet); }
.tab-content { animation: fade-in 0.2s ease; }
@keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-header h2 { font-size: 17px; font-weight: 600; }
.empty-inline { color: var(--text-muted); font-size: 14px; padding: 20px 0; }
.items-list { display: flex; flex-direction: column; gap: 8px; }
.list-item {
  background: white;
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: var(--transition);
}
.list-item:hover { box-shadow: var(--shadow-sm); }
.list-item--link { cursor: pointer; }
.list-item--link:hover { border-color: rgba(124, 58, 237, 0.25); box-shadow: 0 4px 12px rgba(124, 58, 237, 0.08); }
.item-info { display: flex; align-items: center; gap: 14px; }
.item-order {
  width: 28px;
  height: 28px;
  background: var(--practiq-violet-pale);
  color: var(--practiq-violet);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.item-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.item-subtitle { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.difficulty-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.student-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--practiq-violet-pale);
  color: var(--practiq-violet);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
}
.level-badge {
  background: var(--practiq-violet-pale);
  color: var(--practiq-violet);
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}
.exercise-selector {
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  padding: 8px;
  max-height: 180px;
  overflow-y: auto;
}
.exercise-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
</style>
