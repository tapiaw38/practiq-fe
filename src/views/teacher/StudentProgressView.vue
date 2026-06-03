<template>
  <TeacherLayout>
    <div class="sp-page">

      <!-- Back + header -->
      <div class="sp-header">
        <button class="back-btn" @click="router.back()">
          <i class="pi pi-arrow-left"></i> Volver
        </button>
        <div class="sp-title-block">
          <div class="sp-kicker">Perfil del alumno</div>
          <h1 class="sp-title">{{ studentName }}</h1>
          <p class="sp-subtitle">{{ studentEmail }}</p>
        </div>
      </div>

      <!-- Loading global -->
      <div v-if="loadingAll" class="loading-center">
        <div class="spinner spinner-violet"></div>
      </div>

      <template v-else>
        <!-- Summary cards -->
        <div class="summary-row">
          <div class="summary-card summary-card--blue">
            <div class="summary-icon"><i class="pi pi-book"></i></div>
            <div>
              <div class="summary-value">{{ totalTopics }}</div>
              <div class="summary-label">Temas practicados</div>
            </div>
          </div>
          <div class="summary-card summary-card--violet">
            <div class="summary-icon"><i class="pi pi-chart-bar"></i></div>
            <div>
              <div class="summary-value">{{ avgMastery }}%</div>
              <div class="summary-label">Dominio promedio</div>
            </div>
          </div>
          <div class="summary-card summary-card--green">
            <div class="summary-icon"><i class="pi pi-check-circle"></i></div>
            <div>
              <div class="summary-value">{{ totalCorrect }}</div>
              <div class="summary-label">Respuestas correctas</div>
            </div>
          </div>
          <div class="summary-card summary-card--orange">
            <div class="summary-icon"><i class="pi pi-replay"></i></div>
            <div>
              <div class="summary-value">{{ totalAttempts }}</div>
              <div class="summary-label">Intentos totales</div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tab-bar">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ 'tab-btn--active': activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            <i :class="tab.icon"></i>
            {{ tab.label }}
          </button>
        </div>

        <!-- TAB: Progreso por tema -->
        <div v-if="activeTab === 'progress'" class="tab-content">
          <div v-if="!groupedProgress.length" class="empty-block">
            <i class="pi pi-chart-bar empty-icon"></i>
            <p>Este alumno aún no ha realizado ninguna práctica.</p>
          </div>
          <div v-else class="progress-grid">
            <div
              v-for="p in groupedProgress"
              :key="p.topic_id"
              class="progress-card"
              :class="masteryClass(p.mastery_score)"
            >
              <div class="progress-card__top">
                <span class="topic-title">{{ p.topic_title || 'Tema sin nombre' }}</span>
                <span class="mastery-badge" :class="masteryClass(p.mastery_score)">
                  {{ p.mastery_score.toFixed(0) }}%
                </span>
              </div>
              <div class="progress-bar-wrap">
                <div
                  class="progress-bar-fill"
                  :style="{ width: Math.min(p.mastery_score, 100) + '%' }"
                  :class="masteryClass(p.mastery_score)"
                ></div>
              </div>
              <div class="progress-meta">
                <span><i class="pi pi-check"></i> {{ p.correct_attempts }}/{{ p.total_attempts }} correctas</span>
                <span><i class="pi pi-trophy"></i> Nivel {{ p.current_level }}</span>
                <span v-if="p.last_practiced_at"><i class="pi pi-calendar"></i> {{ formatDate(p.last_practiced_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: Por curso -->
        <div v-if="activeTab === 'courses'" class="tab-content">
          <div v-if="loadingCourseProgress" class="loading-center">
            <div class="spinner spinner-violet"></div>
          </div>
          <div v-else-if="!courses.length" class="empty-block">
            <i class="pi pi-sitemap empty-icon"></i>
            <p>Sin cursos asignados.</p>
          </div>
          <div v-else class="course-progress-list">
            <div v-for="c in courses" :key="c.id" class="course-progress-item">
              <div class="course-progress-header">
                <span class="course-title">{{ c.title }}</span>
                <span class="course-topic-count">
                  {{ (courseProgressMap[c.id] || []).length }} temas practicados
                </span>
              </div>
              <div v-if="(courseProgressMap[c.id] || []).length" class="course-topic-list">
                <div
                  v-for="p in courseProgressMap[c.id]"
                  :key="p.topic_id"
                  class="course-topic-row"
                >
                  <span class="course-topic-name">{{ p.topic_title || 'Tema sin nombre' }}</span>
                  <div class="course-topic-bar-wrap">
                    <div
                      class="course-topic-bar-fill"
                      :class="masteryClass(p.mastery_score)"
                      :style="{ width: Math.min(p.mastery_score, 100) + '%' }"
                    ></div>
                  </div>
                  <span class="course-topic-score" :class="masteryClass(p.mastery_score)">
                    {{ p.mastery_score.toFixed(0) }}%
                  </span>
                  <span class="course-topic-level">Nivel {{ p.current_level }}</span>
                </div>
              </div>
              <div v-else class="course-topic-empty">Sin actividad en este curso.</div>
            </div>
          </div>
        </div>

        <!-- TAB: Hojas de práctica (por curso) -->
        <div v-if="activeTab === 'sheets'" class="tab-content">
          <!-- Course selector -->
          <div class="filter-row">
            <label class="filter-label">Filtrar por curso</label>
            <select v-model="selectedCourseId" class="form-select" @change="onCourseChange">
              <option value="">Todos los cursos</option>
              <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.title }}</option>
            </select>
          </div>

          <div v-if="loadingSheets" class="loading-center">
            <div class="spinner spinner-violet"></div>
          </div>
          <div v-else-if="!filteredSheets.length" class="empty-block">
            <i class="pi pi-file empty-icon"></i>
            <p>No hay hojas de práctica disponibles.</p>
          </div>
          <div v-else class="sheets-list">
            <div
              v-for="sheet in filteredSheets"
              :key="sheet.id"
              class="sheet-card"
              :class="sheet.sheet_type === 'level_test' ? 'sheet-card--test' : 'sheet-card--practice'"
            >
              <div class="sheet-card__left">
                <span class="sheet-type-badge" :class="sheet.sheet_type">
                  {{ sheet.sheet_type === 'level_test' ? 'Prueba de nivel' : 'Práctica' }}
                </span>
                <div class="sheet-title">{{ sheet.title }}</div>
                <div class="sheet-meta">
                  Nivel {{ sheet.level }} &bull; {{ sheet.exercises.length }} ejercicios &bull;
                  Estilo: {{ sheet.test_style === 'canvas' ? 'Canvas' : 'Teclado' }}
                </div>
              </div>
              <button
                class="btn btn-secondary btn-sm"
                @click="viewAttempts(sheet)"
                :disabled="loadingAttempts && selectedSheet?.id === sheet.id"
              >
                <span v-if="loadingAttempts && selectedSheet?.id === sheet.id" class="spinner spinner-sm"></span>
                <template v-else><i class="pi pi-eye"></i> Ver intentos</template>
              </button>
            </div>
          </div>

          <!-- Attempts drawer -->
          <Transition name="slide-up">
            <div v-if="selectedSheet && attempts.length > 0" class="attempts-panel">
              <div class="attempts-panel__head">
                <div>
                  <div class="attempts-kicker">Intentos del alumno</div>
                  <h3 class="attempts-title">{{ selectedSheet.title }}</h3>
                </div>
                <button class="icon-btn" @click="selectedSheet = null; attempts = []">
                  <i class="pi pi-times"></i>
                </button>
              </div>

              <!-- Score summary -->
              <div class="attempt-summary-row">
                <div class="attempt-stat">
                  <span class="attempt-stat__val">{{ attempts.length }}</span>
                  <span class="attempt-stat__lbl">Intentos</span>
                </div>
                <div class="attempt-stat">
                  <span class="attempt-stat__val">{{ attemptsCorrect }}</span>
                  <span class="attempt-stat__lbl">Correctas</span>
                </div>
                <div class="attempt-stat">
                  <span class="attempt-stat__val">{{ attemptScore }}%</span>
                  <span class="attempt-stat__lbl">Score</span>
                </div>
              </div>

              <div class="attempts-table-wrap">
                <table class="attempts-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Respuesta</th>
                      <th>Correcto</th>
                      <th>Comentario IA</th>
                      <th>Puntaje</th>
                      <th>Tiempo (s)</th>
                      <th>Pistas</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(a, i) in attempts" :key="a.id" :class="a.is_correct ? 'row--correct' : 'row--incorrect'">
                      <td>{{ i + 1 }}</td>
                      <td class="answer-cell">
                        <template v-if="getAttemptImageSrc(a)">
                          <button class="btn btn-secondary btn-sm" @click="openAttemptImage(getAttemptImageSrc(a)!)">
                            <i class="pi pi-image"></i> Ver imagen
                          </button>
                        </template>
                        <template v-else>
                          {{ a.answer_text || '—' }}
                        </template>
                      </td>
                      <td>
                        <span class="result-chip" :class="a.is_correct ? 'result-chip--ok' : 'result-chip--fail'">
                          {{ a.is_correct ? 'Sí' : 'No' }}
                        </span>
                      </td>
                      <td>{{ formatAIFeedback(a.ai_feedback) }}</td>
                      <td>{{ (a.score * 100).toFixed(0) }}%</td>
                      <td>{{ a.time_spent_seconds }}</td>
                      <td>{{ a.hints_used }}</td>
                      <td>{{ formatDate(a.created_at) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-else-if="selectedSheet && !loadingAttempts && attempts.length === 0" class="attempts-panel">
              <div class="attempts-panel__head">
                <div>
                  <div class="attempts-kicker">Intentos del alumno</div>
                  <h3 class="attempts-title">{{ selectedSheet.title }}</h3>
                </div>
                <button class="icon-btn" @click="selectedSheet = null">
                  <i class="pi pi-times"></i>
                </button>
              </div>
              <div class="empty-block">
                <i class="pi pi-inbox empty-icon"></i>
                <p>El alumno aún no ha realizado esta hoja.</p>
              </div>
            </div>
          </Transition>
        </div>

        <!-- TAB: Cuadernos -->
        <div v-if="activeTab === 'notebooks'" class="tab-content">
          <div class="filter-row">
            <label class="filter-label">Filtrar por curso</label>
            <select v-model="selectedCourseIdNB" class="form-select" @change="onCourseChangeNB">
              <option value="">Todos los cursos</option>
              <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.title }}</option>
            </select>
          </div>

          <div v-if="loadingNB" class="loading-center">
            <div class="spinner spinner-violet"></div>
          </div>
          <div v-else-if="!filteredNotebooks.length" class="empty-block">
            <i class="pi pi-book empty-icon"></i>
            <p>No hay cuadernos disponibles.</p>
          </div>
          <div v-else class="notebooks-list">
            <div
              v-for="nb in filteredNotebooks"
              :key="nb.id"
              class="notebook-card"
              @click="viewNotebook(nb.id)"
            >
              <div class="notebook-card__icon"><i class="pi pi-book"></i></div>
              <div class="notebook-card__body">
                <div class="notebook-title">{{ nb.title }}</div>
                <div class="notebook-meta">
                  Nivel {{ nb.level }} &bull; {{ nb.pages?.length ?? 0 }} páginas
                </div>
                <div class="notebook-desc" v-if="nb.description">{{ nb.description }}</div>
              </div>
              <div class="notebook-card__action">
                <i class="pi pi-angle-right"></i>
              </div>
            </div>
          </div>

          <!-- Notebook pages viewer -->
          <Transition name="slide-up">
            <div v-if="selectedNotebook" class="notebook-viewer">
              <div class="nb-viewer-head">
                <div>
                  <div class="attempts-kicker">Respuestas del alumno</div>
                  <h3 class="attempts-title">{{ selectedNotebook.title }}</h3>
                </div>
                <button class="icon-btn" @click="selectedNotebook = null">
                  <i class="pi pi-times"></i>
                </button>
              </div>

              <div v-if="loadingNBDetail" class="loading-center">
                <div class="spinner spinner-violet"></div>
              </div>
              <div v-else>
                <div class="nb-pages-summary">
                  <span>{{ submittedPages }} / {{ selectedNotebook.pages?.length ?? 0 }} páginas completadas</span>
                </div>
                <div class="nb-pages-grid">
                  <div
                    v-for="page in selectedNotebook.pages"
                    :key="page.id"
                    class="nb-page-card"
                    :class="page.submission ? 'nb-page-card--done' : 'nb-page-card--empty'"
                  >
                    <div class="nb-page-header">
                      <span class="nb-page-num">Pág. {{ page.page_number }}</span>
                      <span class="nb-page-title">{{ page.title || 'Sin título' }}</span>
                      <span class="nb-page-status" :class="page.submission ? 'status--done' : 'status--pending'">
                        {{ page.submission ? 'Entregado' : 'Pendiente' }}
                      </span>
                    </div>

                    <div class="nb-page-content">
                      <!-- Teacher content -->
                      <div class="nb-content-block">
                        <div class="nb-content-label">Contenido del docente</div>
                        <template v-if="page.content_type === 'canvas' && page.content_data">
                          <img :src="page.content_data" class="nb-canvas-img" alt="Contenido" />
                        </template>
                        <template v-else>
                          <p class="nb-text-content">{{ page.content_data || '—' }}</p>
                        </template>
                        <p v-if="page.instructions" class="nb-instructions">
                          <i class="pi pi-info-circle"></i> {{ page.instructions }}
                        </p>
                      </div>

                      <!-- Student submission -->
                      <div class="nb-content-block" v-if="page.submission">
                        <div class="nb-content-label nb-content-label--student">Respuesta del alumno</div>
                        <div v-if="page.submission.ai_is_correct !== undefined" class="nb-ai-row">
                          <span class="nb-ai-badge" :class="page.submission.ai_is_correct ? 'nb-ai-badge--ok' : 'nb-ai-badge--fail'">
                            {{ page.submission.ai_is_correct ? 'Asistente: Correcto' : 'Asistente: Incorrecto' }}
                          </span>
                          <span v-if="page.submission.ai_reviewed_at" class="nb-ai-date">{{ formatDate(page.submission.ai_reviewed_at) }}</span>
                        </div>
                        <template v-if="page.submission.canvas_data">
                          <img :src="page.submission.canvas_data" class="nb-canvas-img" alt="Respuesta del alumno" />
                        </template>
                        <template v-else-if="page.submission.answer_text">
                          <p class="nb-text-content">{{ page.submission.answer_text }}</p>
                        </template>
                        <p v-else class="nb-text-content nb-text-content--empty">Sin respuesta guardada</p>
                        <p v-if="formatAIFeedback(page.submission.ai_feedback)" class="nb-ai-feedback">{{ formatAIFeedback(page.submission.ai_feedback) }}</p>
                      </div>
                      <div class="nb-content-block nb-content-block--empty" v-else>
                        <div class="nb-content-label">Respuesta del alumno</div>
                        <p class="nb-text-content nb-text-content--empty">El alumno no ha completado esta página.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </template>
      <div v-if="attemptImageModalSrc" class="image-modal-overlay" @click.self="closeAttemptImage">
        <div class="image-modal-card">
          <div class="image-modal-head">
            <h3>Imagen del intento</h3>
            <button class="icon-btn" @click="closeAttemptImage">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="image-modal-controls">
            <button class="btn btn-secondary btn-sm" @click="zoomOutAttemptImage" :disabled="attemptImageZoom <= 0.5">
              <i class="pi pi-search-minus"></i>
            </button>
            <span>{{ Math.round(attemptImageZoom * 100) }}%</span>
            <button class="btn btn-secondary btn-sm" @click="zoomInAttemptImage" :disabled="attemptImageZoom >= 3">
              <i class="pi pi-search-plus"></i>
            </button>
            <button class="btn btn-secondary btn-sm" @click="resetAttemptImageZoom" :disabled="attemptImageZoom === 1">
              Reset
            </button>
          </div>
          <div class="image-modal-viewport" @wheel.prevent="onAttemptImageWheel">
            <img
              :src="attemptImageModalSrc"
              class="image-modal-img image-modal-img--zoomable"
              :style="{ transform: `translate(${attemptImageOffsetX}px, ${attemptImageOffsetY}px) scale(${attemptImageZoom})` }"
              @pointerdown="onAttemptImagePointerDown"
              @pointermove="onAttemptImagePointerMove"
              @pointerup="onAttemptImagePointerUp"
              @pointercancel="onAttemptImagePointerUp"
              @pointerleave="onAttemptImagePointerUp"
              alt="Respuesta del intento"
            />
          </div>
        </div>
      </div>
    </div>
  </TeacherLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import { progressService } from '@/services/progress/progressService'
import { practiceSheetService } from '@/services/practiceSheets/practiceSheetService'
import { notebookService } from '@/services/notebooks/notebookService'
import { courseService } from '@/services/courses/courseService'
import type { TopicProgress, PracticeSheet, StudentAttempt, Course, Notebook } from '@/types'

const route = useRoute()
const router = useRouter()

const studentId = route.params.studentId as string
const studentName = decodeURIComponent((route.query.name as string) || 'Alumno')
const studentEmail = decodeURIComponent((route.query.email as string) || '')

// --- state ---
const loadingAll = ref(true)
const allProgress = ref<TopicProgress[]>([])
const courses = ref<Course[]>([])

const activeTab = ref<'progress' | 'courses' | 'sheets' | 'notebooks'>('progress')
const tabs = [
  { key: 'progress',  label: 'Progreso por tema', icon: 'pi pi-chart-bar' },
  { key: 'courses',   label: 'Por curso',          icon: 'pi pi-sitemap'   },
  { key: 'sheets',    label: 'Hojas de práctica',  icon: 'pi pi-file'      },
  { key: 'notebooks', label: 'Cuadernos',          icon: 'pi pi-book'      },
] as const

// Courses tab
const loadingCourseProgress = ref(false)
const courseProgressMap = ref<Record<string, import('@/types').TopicProgress[]>>({})

// Sheets tab
const selectedCourseId = ref('')
const loadingSheets = ref(false)
const allSheets = ref<PracticeSheet[]>([])
const selectedSheet = ref<PracticeSheet | null>(null)
const loadingAttempts = ref(false)
const attempts = ref<StudentAttempt[]>([])
const attemptImageModalSrc = ref<string | null>(null)
const attemptImageZoom = ref(1)
const attemptImageOffsetX = ref(0)
const attemptImageOffsetY = ref(0)
const attemptImageDragging = ref(false)
const attemptImageDragStartX = ref(0)
const attemptImageDragStartY = ref(0)

// Notebooks tab
const selectedCourseIdNB = ref('')
const loadingNB = ref(false)
const allNotebooks = ref<Notebook[]>([])
const selectedNotebook = ref<Notebook | null>(null)
const loadingNBDetail = ref(false)

// --- computed summary ---
const groupedProgress = computed(() => {
  const map = new Map<string, TopicProgress>()
  for (const p of allProgress.value) {
    const existing = map.get(p.topic_id)
    if (!existing) {
      map.set(p.topic_id, { ...p })
    } else {
      existing.correct_attempts += p.correct_attempts
      existing.total_attempts += p.total_attempts
      existing.mastery_score = existing.total_attempts > 0
        ? (existing.correct_attempts / existing.total_attempts) * 100
        : 0
      existing.current_level = Math.max(existing.current_level, p.current_level)
      if (p.last_practiced_at > existing.last_practiced_at) {
        existing.last_practiced_at = p.last_practiced_at
      }
    }
  }
  return Array.from(map.values())
})

const totalTopics  = computed(() => groupedProgress.value.length)
const avgMastery   = computed(() => {
  if (!groupedProgress.value.length) return 0
  const sum = groupedProgress.value.reduce((acc, p) => acc + p.mastery_score, 0)
  return (sum / groupedProgress.value.length).toFixed(0)
})
const totalCorrect  = computed(() => groupedProgress.value.reduce((a, p) => a + p.correct_attempts, 0))
const totalAttempts = computed(() => groupedProgress.value.reduce((a, p) => a + p.total_attempts, 0))

const filteredSheets = computed(() => {
  if (!selectedCourseId.value) return allSheets.value
  return allSheets.value.filter(s => s.course_id === selectedCourseId.value)
})

const filteredNotebooks = computed(() => {
  if (!selectedCourseIdNB.value) return allNotebooks.value
  return allNotebooks.value.filter(n => n.course_id === selectedCourseIdNB.value)
})

const attemptsCorrect = computed(() => attempts.value.filter(a => a.is_correct).length)
const attemptScore    = computed(() => {
  if (!attempts.value.length) return 0
  return ((attemptsCorrect.value / attempts.value.length) * 100).toFixed(0)
})

const submittedPages = computed(() =>
  selectedNotebook.value?.pages?.filter(p => p.submission).length ?? 0
)

// --- lifecycle ---
onMounted(async () => {
  loadingAll.value = true
  try {
    const [progressRes, coursesRes] = await Promise.all([
      progressService.getStudentProgress(studentId),
      courseService.list('teacher'),
    ])
    allProgress.value = progressRes.data || []
    courses.value = coursesRes.data || []

    // Preload all sheets and notebooks
    await Promise.all([loadAllSheets(), loadAllNotebooks()])
  } catch (e) {
    console.error(e)
  } finally {
    loadingAll.value = false
  }
})

watch(activeTab, (tab) => {
  if (tab === 'courses' && !Object.keys(courseProgressMap.value).length) {
    loadCourseProgress()
  }
})

async function loadAllSheets() {
  loadingSheets.value = true
  try {
    const results = await Promise.all(
      courses.value.map(c => practiceSheetService.list(c.id).catch(() => ({ data: [] as PracticeSheet[] })))
    )
    allSheets.value = results.flatMap(r => r.data || [])
  } finally {
    loadingSheets.value = false
  }
}

async function loadAllNotebooks() {
  loadingNB.value = true
  try {
    const results = await Promise.all(
      courses.value.map(c => notebookService.list(c.id).catch(() => [] as Notebook[]))
    )
    allNotebooks.value = results.flat()
  } finally {
    loadingNB.value = false
  }
}

async function loadCourseProgress() {
  if (loadingCourseProgress.value) return
  loadingCourseProgress.value = true
  try {
    const entries = await Promise.all(
      courses.value.map(async c => {
        try {
          const res = await progressService.getStudentCourseProgress(studentId, c.id)
          return [c.id, res.data || []] as const
        } catch {
          return [c.id, []] as const
        }
      })
    )
    const map: Record<string, import('@/types').TopicProgress[]> = {}
    for (const [id, data] of entries) {
      const topicMap = new Map<string, import('@/types').TopicProgress>()
      for (const p of data) {
        const ex = topicMap.get(p.topic_id)
        if (!ex) {
          topicMap.set(p.topic_id, { ...p })
        } else {
          ex.correct_attempts += p.correct_attempts
          ex.total_attempts += p.total_attempts
          ex.mastery_score = ex.total_attempts > 0
            ? (ex.correct_attempts / ex.total_attempts) * 100
            : 0
          ex.current_level = Math.max(ex.current_level, p.current_level)
          if (p.last_practiced_at > ex.last_practiced_at) ex.last_practiced_at = p.last_practiced_at
        }
      }
      map[id] = Array.from(topicMap.values())
    }
    courseProgressMap.value = map
  } finally {
    loadingCourseProgress.value = false
  }
}

async function onCourseChange() {
  selectedSheet.value = null
  attempts.value = []
}

async function onCourseChangeNB() {
  selectedNotebook.value = null
}

async function viewAttempts(sheet: PracticeSheet) {
  selectedSheet.value = sheet
  attempts.value = []
  loadingAttempts.value = true
  try {
    const res = await progressService.getStudentAttempts(studentId, sheet.id)
    attempts.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loadingAttempts.value = false
  }
}

async function viewNotebook(notebookId: string) {
  selectedNotebook.value = null
  loadingNBDetail.value = true
  try {
    const res = await notebookService.get(notebookId, studentId)
    selectedNotebook.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loadingNBDetail.value = false
  }
}

function getAttemptImageSrc(attempt: StudentAttempt): string | null {
  const answer = (attempt.answer_text || '').trim()
  if (!answer) return null
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(answer)) return answer
  if (!/^[A-Za-z0-9+/=\s]+$/.test(answer) || answer.length < 120) return null
  const compact = answer.replace(/\s+/g, '')
  if (compact.startsWith('iVBORw0KGgo')) return `data:image/png;base64,${compact}`
  if (compact.startsWith('/9j/')) return `data:image/jpeg;base64,${compact}`
  if (compact.startsWith('R0lGOD')) return `data:image/gif;base64,${compact}`
  return null
}

function openAttemptImage(src: string) {
  attemptImageModalSrc.value = src
  attemptImageZoom.value = 1
  attemptImageOffsetX.value = 0
  attemptImageOffsetY.value = 0
  attemptImageDragging.value = false
}

function closeAttemptImage() {
  attemptImageModalSrc.value = null
  attemptImageZoom.value = 1
  attemptImageOffsetX.value = 0
  attemptImageOffsetY.value = 0
  attemptImageDragging.value = false
}

function zoomInAttemptImage() {
  attemptImageZoom.value = Math.min(3, Number((attemptImageZoom.value + 0.25).toFixed(2)))
}

function zoomOutAttemptImage() {
  attemptImageZoom.value = Math.max(0.5, Number((attemptImageZoom.value - 0.25).toFixed(2)))
}

function resetAttemptImageZoom() {
  attemptImageZoom.value = 1
  attemptImageOffsetX.value = 0
  attemptImageOffsetY.value = 0
}

function onAttemptImageWheel(event: WheelEvent) {
  if (event.deltaY < 0) {
    zoomInAttemptImage()
    return
  }
  zoomOutAttemptImage()
}

function onAttemptImagePointerDown(event: PointerEvent) {
  if (attemptImageZoom.value <= 1) return
  const target = event.currentTarget as HTMLElement | null
  target?.setPointerCapture(event.pointerId)
  attemptImageDragging.value = true
  attemptImageDragStartX.value = event.clientX - attemptImageOffsetX.value
  attemptImageDragStartY.value = event.clientY - attemptImageOffsetY.value
}

function onAttemptImagePointerMove(event: PointerEvent) {
  if (!attemptImageDragging.value || attemptImageZoom.value <= 1) return
  attemptImageOffsetX.value = event.clientX - attemptImageDragStartX.value
  attemptImageOffsetY.value = event.clientY - attemptImageDragStartY.value
}

function onAttemptImagePointerUp(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null
  if (target?.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  attemptImageDragging.value = false
}

// --- helpers ---
function masteryClass(score: number) {
  if (score >= 80) return 'mastery--high'
  if (score >= 50) return 'mastery--mid'
  return 'mastery--low'
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatAIFeedback(value?: string) {
  const feedback = (value || '').trim()
  if (!feedback) return 'Sin observaciones de IA'
  if (feedback.includes('UNREADABLE')) return 'Sin observaciones de IA'
  if (feedback === 'Gillie: respuesta no legible (UNREADABLE)') return 'Sin observaciones de IA'
  if (feedback === 'Asistente: respuesta no legible (UNREADABLE)') return 'Sin observaciones de IA'
  return feedback
}
</script>

<style scoped>
.sp-page {
  padding: 16px 24px 32px;
  max-width: 1100px;
}

/* Header */
.sp-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 14px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: transparent;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  margin-top: 4px;
  transition: all 0.15s;
}
.back-btn:hover { background: var(--surface-hover); color: var(--text-primary); }

.sp-kicker {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 700;
  color: var(--practiq-violet);
  margin-bottom: 4px;
}
.sp-title {
  font-size: clamp(1.1rem, 2vw, 1.3rem);
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.sp-subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

/* Summary cards */
.summary-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(255,255,255,0.9);
  box-shadow: 0 6px 20px rgba(93,108,146,0.08);
}
.summary-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 16px;
  flex-shrink: 0;
}
.summary-card--blue  .summary-icon { background: rgba(37,99,235,0.1);  color: #2563eb; }
.summary-card--violet .summary-icon { background: rgba(124,58,237,0.1); color: #7c3aed; }
.summary-card--green .summary-icon { background: rgba(16,185,129,0.1); color: #059669; }
.summary-card--orange .summary-icon { background: rgba(245,158,11,0.1); color: #d97706; }

.summary-value {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
}
.summary-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: 2px;
}

/* Tabs */
.tab-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(148,163,184,0.25);
  background: rgba(255,255,255,0.7);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn:hover { background: var(--surface-hover); color: var(--text-primary); }
.tab-btn--active {
  background: var(--practiq-violet);
  color: #fff;
  border-color: var(--practiq-violet);
}

/* Tab content */
.tab-content { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* Course progress tab */
.course-progress-list { display: flex; flex-direction: column; gap: 16px; }
.course-progress-item {
  background: rgba(255,255,255,0.88);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255,255,255,0.9);
  box-shadow: 0 4px 16px rgba(93,108,146,0.07);
  padding: 10px 14px;
}
.course-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.course-title { font-size: var(--text-lg); font-weight: 700; color: var(--text-primary); }
.course-topic-count { font-size: var(--text-sm); color: var(--text-muted); }
.course-topic-list { display: flex; flex-direction: column; gap: 8px; }
.course-topic-row {
  display: grid;
  grid-template-columns: 180px 1fr 52px 70px;
  align-items: center;
  gap: 10px;
}
.course-topic-name { font-size: var(--text-base); font-weight: 500; color: var(--text-primary); }
.course-topic-bar-wrap {
  height: 6px; border-radius: var(--radius-pill);
  background: rgba(148,163,184,0.18); overflow: hidden;
}
.course-topic-bar-fill {
  height: 100%; border-radius: var(--radius-pill); transition: width 0.4s ease;
}
.mastery--high .course-topic-bar-fill { background: var(--color-success); }
.mastery--mid  .course-topic-bar-fill { background: var(--color-warning); }
.mastery--low  .course-topic-bar-fill { background: var(--color-error); }
.course-topic-score { font-size: var(--text-sm); font-weight: 700; text-align: right; }
.mastery--high .course-topic-score { color: var(--color-success-dark); }
.mastery--mid  .course-topic-score { color: var(--color-warning-dark); }
.mastery--low  .course-topic-score { color: #dc2626; }
.course-topic-level { font-size: var(--text-sm); color: var(--text-muted); text-align: right; }
.course-topic-empty { font-size: var(--text-base); color: var(--text-muted); padding: 4px 0; }

/* Progress grid */
.progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.progress-card {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(255,255,255,0.9);
  box-shadow: 0 4px 16px rgba(93,108,146,0.07);
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.progress-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.topic-title {
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
}
.mastery-badge {
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-sm);
  font-weight: 700;
}
.mastery--high .mastery-badge, .mastery-badge.mastery--high { background: rgba(16,185,129,0.12); color: var(--color-success-dark); }
.mastery--mid  .mastery-badge, .mastery-badge.mastery--mid  { background: rgba(245,158,11,0.12);  color: var(--color-warning-dark); }
.mastery--low  .mastery-badge, .mastery-badge.mastery--low  { background: rgba(239,68,68,0.1);    color: #dc2626; }

.progress-bar-wrap {
  height: 6px;
  border-radius: var(--radius-pill);
  background: rgba(148,163,184,0.18);
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width 0.4s ease;
}
.mastery--high .progress-bar-fill { background: var(--color-success); }
.mastery--mid  .progress-bar-fill { background: var(--color-warning); }
.mastery--low  .progress-bar-fill { background: var(--color-error); }

.progress-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.progress-meta span { display: inline-flex; align-items: center; gap: 4px; }

/* Filter row */
.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.filter-label {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* Sheets */
.sheets-list { display: flex; flex-direction: column; gap: 8px; }

.sheet-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(255,255,255,0.9);
  box-shadow: 0 4px 12px rgba(93,108,146,0.07);
}
.sheet-card--test  { border-left: 3px solid #7c3aed; }
.sheet-card--practice { border-left: 3px solid #2563eb; }

.sheet-type-badge {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 700;
  margin-bottom: 6px;
}
.sheet-type-badge.level_test { background: rgba(124,58,237,0.1); color: #7c3aed; }
.sheet-type-badge.practice   { background: rgba(37,99,235,0.1);  color: #2563eb; }

.sheet-title {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.sheet-meta { font-size: var(--text-sm); color: var(--text-secondary); }

/* Attempts panel */
.attempts-panel {
  margin-top: 24px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(124,58,237,0.15);
  box-shadow: 0 8px 28px rgba(93,108,146,0.1);
}

.attempts-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.attempts-kicker {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
  color: var(--practiq-violet);
  margin-bottom: 4px;
}
.attempts-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
}

.attempt-summary-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.attempt-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: rgba(124,58,237,0.06);
  border: 1px solid rgba(124,58,237,0.1);
  min-width: 64px;
}
.attempt-stat__val { font-size: 17px; font-weight: 800; color: var(--practiq-violet); }
.attempt-stat__lbl { font-size: var(--text-xs); color: var(--text-secondary); margin-top: 2px; }

.attempts-table-wrap { overflow-x: auto; }
.attempts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-base);
}
.attempts-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  border-bottom: 2px solid rgba(148,163,184,0.15);
}
.attempts-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(148,163,184,0.1);
  color: var(--text-primary);
}
.row--correct { background: rgba(16,185,129,0.03); }
.row--incorrect { background: rgba(239,68,68,0.03); }

.answer-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.image-modal-card {
  width: min(920px, 100%);
  max-height: calc(100vh - 40px);
  background: #fff;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(148, 163, 184, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.image-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.image-modal-head h3 {
  margin: 0;
  font-size: var(--text-md);
  color: var(--text-primary);
}

.image-modal-img {
  width: 100%;
  height: auto;
  object-fit: contain;
  max-height: calc(100vh - 120px);
  background: #f8fafc;
}

.image-modal-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.image-modal-controls span {
  min-width: 52px;
  text-align: center;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-secondary);
}

.image-modal-viewport {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: #f8fafc;
  padding: 12px;
}

.image-modal-img--zoomable {
  width: auto;
  max-width: 100%;
  transform-origin: top center;
  transition: transform 0.12s ease;
  max-height: none;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.image-modal-img--zoomable:active {
  cursor: grabbing;
}

.result-chip {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 700;
}
.result-chip--ok   { background: rgba(16,185,129,0.12);  color: var(--color-success-dark); }
.result-chip--fail { background: rgba(239,68,68,0.1);    color: #dc2626; }

/* Notebooks */
.notebooks-list { display: flex; flex-direction: column; gap: 12px; }

.notebook-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(255,255,255,0.9);
  box-shadow: 0 4px 12px rgba(93,108,146,0.07);
  cursor: pointer;
  transition: all 0.15s;
}
.notebook-card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(93,108,146,0.12); }

.notebook-card__icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 16px;
  background: rgba(124,58,237,0.08);
  color: var(--practiq-violet);
  flex-shrink: 0;
}
.notebook-card__body { flex: 1; }
.notebook-title { font-size: var(--text-md); font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.notebook-meta  { font-size: var(--text-sm); color: var(--text-secondary); }
.notebook-desc  { font-size: var(--text-sm); color: var(--text-secondary); margin-top: 4px; }
.notebook-card__action { color: var(--text-muted); }

/* Notebook viewer */
.notebook-viewer {
  margin-top: 24px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(124,58,237,0.15);
  box-shadow: 0 8px 28px rgba(93,108,146,0.1);
}
.nb-viewer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.nb-pages-summary {
  font-size: var(--text-base);
  color: var(--text-secondary);
  font-weight: 600;
  margin-bottom: 18px;
  padding: 8px 14px;
  background: rgba(124,58,237,0.06);
  border-radius: var(--radius-sm);
  display: inline-block;
}
.nb-pages-grid { display: flex; flex-direction: column; gap: 20px; }

.nb-page-card {
  border-radius: var(--radius-xl);
  border: 1px solid rgba(148,163,184,0.2);
  overflow: hidden;
}
.nb-page-card--done  { border-color: rgba(16,185,129,0.3); }
.nb-page-card--empty { border-color: rgba(148,163,184,0.2); }

.nb-page-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(248,250,252,0.9);
  border-bottom: 1px solid rgba(148,163,184,0.15);
}
.nb-page-num   { font-size: var(--text-sm); font-weight: 700; color: var(--text-muted); }
.nb-page-title { flex: 1; font-size: var(--text-base); font-weight: 600; color: var(--text-primary); }
.nb-page-status { font-size: var(--text-xs); font-weight: 700; padding: 3px 10px; border-radius: var(--radius-pill); }
.status--done    { background: rgba(16,185,129,0.12); color: var(--color-success-dark); }
.status--pending { background: rgba(148,163,184,0.14); color: var(--text-secondary); }

.nb-page-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}
.nb-content-block {
  padding: 16px;
  border-right: 1px solid rgba(148,163,184,0.12);
}
.nb-content-block:last-child { border-right: none; }
.nb-content-block--empty { background: rgba(248,250,252,0.5); }

.nb-content-label {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  margin-bottom: 10px;
}
.nb-content-label--student { color: #2563eb; }

.nb-canvas-img {
  max-width: 100%;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(148,163,184,0.2);
}
.nb-text-content {
  font-size: var(--text-base);
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}
.nb-text-content--empty { color: var(--text-muted); font-style: italic; }

.nb-instructions {
  margin-top: 8px;
  font-size: var(--text-sm);
  color: #2563eb;
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.nb-ai-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.nb-ai-badge {
  display: inline-flex;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 700;
}

.nb-ai-badge--ok { background: rgba(16,185,129,0.12); color: var(--color-success-dark); }
.nb-ai-badge--fail { background: rgba(239,68,68,0.1); color: #dc2626; }

.nb-ai-date {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.nb-ai-feedback {
  margin: 8px 0 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Shared */
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
  flex-shrink: 0;
}
.icon-btn:hover { background: var(--surface-hover); color: var(--text-primary); }

.loading-center {
  display: flex;
  justify-content: center;
  padding: 48px;
}

.empty-block {
  text-align: center;
  padding: 56px 24px;
  color: var(--text-secondary);
}
.empty-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 14px;
  opacity: 0.4;
}

/* Slide-up transition */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.25s ease; }
.slide-up-enter-from { opacity: 0; transform: translateY(16px); }
.slide-up-leave-to   { opacity: 0; transform: translateY(8px); }

/* Responsive */
/* Tablet landscape */
@media (max-width: 1024px) {
  .sp-page { padding: 12px 16px 28px; }
  .summary-row { grid-template-columns: repeat(2, 1fr); }
  .course-topic-row { grid-template-columns: 140px 1fr 52px 60px; }
  .progress-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  .nb-page-content { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 768px) {
  .sp-page { padding: 20px 16px 40px; }
  .sp-header { flex-direction: column; }
  .nb-page-content { grid-template-columns: 1fr; }
  .nb-content-block { border-right: none; border-bottom: 1px solid rgba(148,163,184,0.12); }
  .nb-content-block:last-child { border-bottom: none; }
  .sheet-card { flex-direction: column; align-items: flex-start; }
}
</style>
