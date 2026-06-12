<template>
  <StudentLayout>
    <div class="practice-shell">
      <!-- Header -->
      <header class="practice-header">
        <button class="btn-back" type="button" aria-label="Volver" @click="router.back()">
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="practice-header-info">
          <div class="level-badges">
            <div class="level-badge">Nivel {{ sheet?.level }}</div>
            <div v-if="sheet?.sheet_type === 'level_test'" class="level-test-badge">
              <i class="pi pi-star"></i> Prueba de Nivel
            </div>
            <div v-if="sheet?.test_style === 'keyboard'" class="input-mode-badge">
              <i class="pi pi-keyboard"></i> Teclado
            </div>
          </div>
          <h1 class="practice-title">{{ sheet?.title }}</h1>
          <span class="practice-subtitle">
            {{ sheet?.sheet_type === 'level_test'
              ? 'Responde correctamente el 75% para avanzar al siguiente nivel'
              : 'Resuelve los siguientes ejercicios a tu propio ritmo' }}
          </span>
        </div>
        <div class="header-right">
          <div class="streak-chip">
            <span>🔥</span>
            <div>
              <div class="streak-val">{{ streakCount }}</div>
              <div class="streak-lbl">racha</div>
            </div>
          </div>
          <div class="student-avatar">{{ studentInitial }}</div>
        </div>
      </header>

      <div v-if="loading" class="practice-loading">
        <i class="pi pi-spin pi-spinner"></i> Cargando práctica...
      </div>

      <template v-else-if="sheet">
        <!-- Progress bar -->
        <div class="practice-progress-bar">
          <div class="practice-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <div class="practice-progress-label">{{ answeredCount }} / {{ totalCount }} respondidas</div>

        <div class="practice-body">
          <!-- Exercises + footer -->
          <main class="practice-area">
            <!-- Canvas toolbar (only in canvas mode) -->
            <div v-if="hasCanvasExercises" class="draw-tools-bar">
              <button class="tool-btn" type="button" aria-label="Usar lápiz" :class="{ 'tool-btn--active': tool === 'pen' }" @click="tool = 'pen'" title="Lápiz">
                <i class="pi pi-pencil"></i>
              </button>
              <button class="tool-btn" type="button" aria-label="Usar borrador" :class="{ 'tool-btn--active': tool === 'eraser' }" @click="tool = 'eraser'" title="Borrador">
                <i class="pi pi-times-circle"></i>
              </button>
              <button class="tool-btn" type="button" aria-label="Deshacer trazo" @click="undoActive" title="Deshacer">
                <i class="pi pi-undo"></i>
              </button>
              <div class="tool-sep"></div>
              <input type="color" v-model="penColor" class="color-picker" title="Color" aria-label="Color del lápiz" />
              <input type="range" v-model.number="penSize" min="1" max="20" class="size-slider" title="Grosor" aria-label="Grosor del lápiz" />
              <span class="size-val">{{ penSize }}px</span>
            </div>

            <!-- Exercise cards -->
            <div class="exercises-list">
              <div
                v-for="(pse, idx) in sheet.exercises"
                :key="pse.id"
                class="ex-card"
                :class="{ 'ex-card--answered': isAnswered(pse.exercise.id) }"
              >
                <div class="ex-num" :class="{ 'ex-num--done': isAnswered(pse.exercise.id) }">
                  {{ idx + 1 }}
                </div>
                <div class="ex-body">
                  <div class="ex-meta">
                    <span class="difficulty-pill" :style="{ '--difficulty-color': diffColor(pse.exercise.difficulty) }">
                      Dificultad {{ pse.exercise.difficulty }}
                    </span>
                    <span class="time-display">⏱ {{ formatTime(timers[pse.exercise.id] || 0) }}</span>
                    <span v-if="hints[pse.exercise.id]" class="hint-count">
                      💡 {{ hints[pse.exercise.id] }} pista{{ hints[pse.exercise.id] > 1 ? 's' : '' }}
                    </span>
                  </div>

                  <div
                    v-if="pse.exercise.type === 'equation'"
                    class="ex-question ex-question--math"
                    v-html="renderContent(pse.exercise.question)"
                  ></div>
                  <div
                    v-else-if="pse.exercise.type !== 'handwritten' || !extractTeacherImageDataUrl(pse.exercise)"
                    class="ex-question"
                  >
                    {{ pse.exercise.question }}
                  </div>
                  <img
                    v-if="extractTeacherImageDataUrl(pse.exercise)"
                    :src="extractTeacherImageDataUrl(pse.exercise)"
                    class="teacher-handwritten-image"
                    alt="Consigna manuscrita del profesor"
                  />

                  <!-- Keyboard mode input -->
                  <div v-if="pse.exercise.type === 'multiple_choice'" class="choice-options">
                    <label
                      v-for="option in exerciseOptions(pse.exercise.metadata)"
                      :key="option"
                      class="choice-option"
                      :class="{ 'choice-option--selected': keyboardAnswers[pse.exercise.id] === option }"
                    >
                      <input
                        v-model="keyboardAnswers[pse.exercise.id]"
                        type="radio"
                        :name="`exercise-${pse.exercise.id}`"
                        :value="option"
                      />
                      <span>{{ option }}</span>
                    </label>
                    <textarea
                      v-if="exerciseOptions(pse.exercise.metadata).length === 0"
                      v-model="keyboardAnswers[pse.exercise.id]"
                      class="ex-textarea"
                      :placeholder="getPlaceholder(pse.exercise.type)"
                      rows="4"
                    ></textarea>
                  </div>

                  <!-- Keyboard mode input -->
                  <div v-else-if="!exerciseUsesCanvas(pse.exercise.type)" class="keyboard-input-wrap">
                    <textarea
                      v-model="keyboardAnswers[pse.exercise.id]"
                      class="ex-textarea"
                      :placeholder="getPlaceholder(pse.exercise.type)"
                      rows="4"
                    ></textarea>
                  </div>

                  <!-- Canvas mode input -->
                  <div v-else class="canvas-wrap">
                    <div class="canvas-header">
                      <span class="canvas-label">Tu respuesta</span>
                      <button class="btn-clear-canvas" type="button" @click="clearCanvas(pse.exercise.id)" title="Borrar todo" aria-label="Limpiar respuesta">
                        <i class="pi pi-trash"></i> Limpiar
                      </button>
                    </div>
                    <canvas
                      :ref="el => setCanvasRef(pse.exercise.id, el as HTMLCanvasElement | null)"
                      class="ex-canvas"
                      @mousedown="startDrawing($event, pse.exercise.id, idx)"
                      @mousemove="draw($event, pse.exercise.id)"
                      @mouseup="stopDrawing(pse.exercise.id)"
                      @mouseleave="stopDrawing(pse.exercise.id)"
                      @touchstart.prevent="startDrawingTouch($event, pse.exercise.id, idx)"
                      @touchmove.prevent="drawTouch($event, pse.exercise.id)"
                      @touchend="stopDrawing(pse.exercise.id)"
                    ></canvas>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sticky footer -->
            <div class="practice-footer">
              <div class="footer-left">
                <span class="footer-hint">{{ totalCount - answeredCount }} sin responder</span>
                <span v-if="hasDraft" class="draft-indicator">
                  <i class="pi pi-save"></i> Borrador guardado
                </span>
              </div>
              <div class="footer-actions">
                <button v-if="isCanvasMode" class="btn-draft" @click="saveDraft">
                  <i class="pi pi-save"></i>
                  Guardar borrador
                </button>
                <button class="btn-submit" @click="showSubmitConfirm = true">
                  <i class="pi pi-send"></i>
                  Revisar respuestas
                </button>
              </div>
            </div>
          </main>
        </div>
      </template>

      <!-- Restore draft modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showRestoreModal" class="modal-overlay">
            <div class="modal-box">
              <h3 class="modal-title">
                <i class="pi pi-save"></i> Borrador encontrado
              </h3>
              <p class="submit-copy">
                Encontramos un borrador guardado de esta practica.
                ¿Deseas restaurar tu progreso anterior?
              </p>
              <div class="modal-actions">
                <button class="btn btn-secondary" @click="discardDraft">Descartar</button>
                <button class="btn btn-primary" @click="restoreDraft">
                  <i class="pi pi-refresh"></i> Restaurar
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Submit confirm modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showSubmitConfirm" class="modal-overlay" @click.self="closeSubmitConfirm()">
            <div class="modal-box">
              <h3 class="modal-title">Revisar y enviar</h3>
              <p class="submit-copy">
                Respondiste <strong>{{ answeredCount }}</strong> de <strong>{{ totalCount }}</strong> ejercicios.
                ¿Deseas enviar tus respuestas?
              </p>
              <div class="modal-actions">
                <button class="btn btn-secondary" :disabled="submitting" @click="closeSubmitConfirm()">Cancelar</button>
                <button class="btn btn-primary" :disabled="submitting" @click="submitAnswers">
                  <span v-if="submitting" class="spinner"></span>
                  {{ submitting ? 'Evaluando con IA...' : 'Enviar respuestas' }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Results modal -->
      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showResults && result" class="modal-overlay">
            <div class="modal-box results-box">
              <div class="results-header">
                <div class="results-emoji">{{ result.score >= 90 ? '🏆' : result.score >= 70 ? '🌟' : '💪' }}</div>
                <h3 class="results-title">{{ result.score >= 90 ? '¡Excelente!' : result.score >= 70 ? '¡Buen trabajo!' : '¡Sigue practicando!' }}</h3>
              </div>
              <div class="results-stats">
                <div class="stat-card">
                  <div class="stat-value" :style="{ color: scoreColor(result.score) }">{{ Math.round(result.score) }}%</div>
                  <div class="stat-label">Puntaje</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">{{ result.correct }}/{{ result.total }}</div>
                  <div class="stat-label">Correctas</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" :style="{ color: scoreColor(result.mastery_score) }">{{ Math.round(result.mastery_score) }}%</div>
                  <div class="stat-label">Dominio</div>
                </div>
              </div>
              <div class="results-recommendation">
                <div class="rec-icon">{{ result.should_level_up ? '⬆️' : result.should_repeat ? '🔄' : '▶️' }}</div>
                <p>{{ result.recommendation }}</p>
              </div>
              <div v-if="result.ai_feedback" class="results-ai-feedback">
                <strong>Comentario IA:</strong> {{ result.ai_feedback }}
              </div>
              <div v-if="result.should_level_up" class="level-up-badge">
                🎉 ¡Subiste al Nivel {{ result.next_level }}!
              </div>
              <div class="modal-actions">
                <button class="btn btn-secondary" @click="router.back()">Volver al inicio</button>
                <button class="btn btn-primary" @click="showResults = false">Ver mis respuestas</button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </StudentLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import StudentLayout from '@/layouts/StudentLayout.vue'
import { practiceSheetService } from '@/services/practiceSheets/practiceSheetService'
import { progressService } from '@/services/progress/progressService'
import type { PracticeSheet, SubmitResult, TopicProgress } from '@/types'
import {
  composeAssistantWorkImage,
  extractTeacherImageDataUrl,
  parseExerciseMetadata,
  pickBestStudentImage,
  summarizeExerciseMetadata
} from '@/utils/assistantExerciseContext'
import { renderContent } from '@/composables/useContentRenderer'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const sheetId = route.params.id as string

const sheet = ref<PracticeSheet | null>(null)
const loading = ref(true)
const currentIdx = ref(0)

const answers = ref<Record<string, { answer: string; timeStart: number; hints: number }>>({})
const keyboardAnswers = ref<Record<string, string>>({})
const timers = ref<Record<string, number>>({})
const hints = ref<Record<string, number>>({})

// Canvas — multiple refs, one per exercise
const canvasRefs: Record<string, HTMLCanvasElement | null> = {}
const initializedIds = new Set<string>()
const undoStacks: Record<string, ImageData[]> = {}
const isDrawingMap: Record<string, boolean> = {}
const lastPos: Record<string, { x: number; y: number }> = {}
const tool = ref<'pen' | 'eraser'>('pen')
const penColor = ref(cssVar('--text-primary', '#1e293b'))
const penSize = ref(3)
const activeCanvasId = ref('')

const showSubmitConfirm = ref(false)
const showResults = ref(false)
const submitting = ref(false)
const result = ref<SubmitResult | null>(null)
const hasDraft = ref(false)
const showRestoreModal = ref(false)

function cssVar(name: string, fallback: string, depth = 0): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!value) return fallback
  const varMatch = value.match(/^var\((--[^,\s)]+)(?:,\s*(.+))?\)$/)
  if (varMatch && depth < 4) {
    return cssVar(varMatch[1], varMatch[2]?.trim() || fallback, depth + 1)
  }
  return value
}

let timerInterval: ReturnType<typeof setInterval>

const hasCanvasExercises = computed(() =>
  !!sheet.value?.exercises?.some((pse) => exerciseUsesCanvas(pse.exercise.type))
)
const isCanvasMode = computed(() => sheet.value?.test_style !== 'keyboard')

const currentExercise = computed(() =>
  sheet.value?.exercises?.[currentIdx.value]?.exercise ?? null
)

const answeredCount = computed(() => {
  return sheet.value?.exercises?.filter((pse) => isAnswered(pse.exercise.id)).length ?? 0
})

const totalCount = computed(() => sheet.value?.exercises?.length ?? 0)

const progressPct = computed(() =>
  totalCount.value ? Math.round((answeredCount.value / totalCount.value) * 100) : 0
)

const topicProgress = ref<TopicProgress[]>([])

const streakCount = computed(() => {
  const topicId = sheet.value?.topic_id
  const match = topicId ? topicProgress.value.find((p) => p.topic_id === topicId) : undefined
  if (match) return match.streak_days
  return Math.max(...topicProgress.value.map((p) => p.streak_days), 0)
})
const studentInitial = computed(() => {
  const name = authStore.profile?.name?.trim() || 'Estudiante'
  return name.charAt(0).toUpperCase()
})

onMounted(async () => {
  try {
    const res = await practiceSheetService.get(sheetId)
    sheet.value = res.data

    for (const pse of sheet.value.exercises ?? []) {
      answers.value[pse.exercise.id] = { answer: '', timeStart: Date.now(), hints: 0 }
      keyboardAnswers.value[pse.exercise.id] = ''
      timers.value[pse.exercise.id] = 0
    }

    startTimer()
    loadTopicProgress()

    // Check for saved draft after canvases are initialized
    setTimeout(() => {
      checkForDraft()
    }, 500)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  clearInterval(timerInterval)
  if ((window as any).__practiqAssistantHookSource === 'practice') {
    delete window.__practiqAssistantCapture
    delete window.__practiqAssistantContext
    delete (window as any).__practiqAssistantHookSource
  }
})

function startTimer() {
  timerInterval = setInterval(() => {
    if (currentExercise.value) {
      timers.value[currentExercise.value.id] = (timers.value[currentExercise.value.id] ?? 0) + 1
    }
  }, 1000)
}

function isAnswered(exerciseId: string) {
  const exercise = sheet.value?.exercises?.find((pse) => pse.exercise.id === exerciseId)?.exercise
  if (exercise && exerciseUsesCanvas(exercise.type)) {
    return !!answers.value[exerciseId]?.answer
  }
  return !!(keyboardAnswers.value[exerciseId]?.trim())
}

function exerciseUsesCanvas(exerciseType: string) {
  return isCanvasMode.value || exerciseType === 'handwritten' || exerciseType === 'canvas'
}

function exerciseOptions(metadata?: string) {
  const options = parseExerciseMetadata(metadata)?.options
  return Array.isArray(options) ? options.map((option) => String(option)).filter(Boolean) : []
}

function getPlaceholder(exerciseType: string) {
  switch (exerciseType) {
    case 'equation':
      return 'Escribe la ecuacion o resultado...'
    case 'multiple_choice':
      return 'Escribe la opcion correcta (A, B, C, D)...'
    default:
      return 'Escribe tu respuesta aqui...'
  }
}

// ── Canvas ────────────────────────────────────────────────────────────────────

function setCanvasRef(id: string, el: HTMLCanvasElement | null) {
  if (!el) {
    canvasRefs[id] = null
    initializedIds.delete(id)
    return
  }
  canvasRefs[id] = el
  if (!initializedIds.has(id)) {
    initializedIds.add(id)
    initCanvas(id, el)
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = cssVar('--surface-bg-soft', '#fafaf7')
  ctx.fillRect(0, 0, w, h)
  // Red margin line
  ctx.strokeStyle = `rgba(${cssVar('--color-error-rgb', '239, 68, 68')}, 0.25)`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(56, 0)
  ctx.lineTo(56, h)
  ctx.stroke()
  // Horizontal ruled lines
  ctx.strokeStyle = `rgba(${cssVar('--practiq-violet-rgb', '124, 58, 237')}, 0.1)`
  ctx.lineWidth = 1
  for (let y = 32; y < h; y += 32) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
}

function initCanvas(id: string, canvas: HTMLCanvasElement) {
  requestAnimationFrame(() => {
    const w = canvas.offsetWidth || 600
    const h = canvas.offsetHeight || 280
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    drawBackground(ctx, w, h)
    undoStacks[id] = []
  })
}

function getPos(e: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  }
}

function startDrawing(e: MouseEvent, id: string, idx: number) {
  const canvas = canvasRefs[id]
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  if (!undoStacks[id]) undoStacks[id] = []
  undoStacks[id].push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  isDrawingMap[id] = true
  activeCanvasId.value = id
  currentIdx.value = idx
  const pos = getPos(e, canvas)
  lastPos[id] = pos
  ctx.beginPath()
  ctx.moveTo(pos.x, pos.y)
}

function draw(e: MouseEvent, id: string) {
  if (!isDrawingMap[id]) return
  const canvas = canvasRefs[id]
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const pos = getPos(e, canvas)
  ctx.globalCompositeOperation = tool.value === 'eraser' ? 'destination-out' : 'source-over'
  ctx.strokeStyle = penColor.value
  ctx.lineWidth = tool.value === 'eraser' ? penSize.value * 4 : penSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
  lastPos[id] = pos
}

function stopDrawing(id: string) {
  if (!isDrawingMap[id]) return
  isDrawingMap[id] = false
  const canvas = canvasRefs[id]
  if (!canvas) return
  canvas.getContext('2d')!.beginPath()
  answers.value[id].answer = canvas.toDataURL('image/png')
}

function startDrawingTouch(e: TouchEvent, id: string, idx: number) {
  const t = e.touches[0]
  startDrawing({ clientX: t.clientX, clientY: t.clientY } as MouseEvent, id, idx)
}

function drawTouch(e: TouchEvent, id: string) {
  const t = e.touches[0]
  draw({ clientX: t.clientX, clientY: t.clientY } as MouseEvent, id)
}

function undoActive() {
  const id = activeCanvasId.value
  if (!id) return
  const canvas = canvasRefs[id]
  const stack = undoStacks[id]
  if (!canvas || !stack || stack.length === 0) return
  canvas.getContext('2d')!.putImageData(stack.pop()!, 0, 0)
}

function clearCanvas(id: string) {
  const canvas = canvasRefs[id]
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  undoStacks[id] = []
  drawBackground(ctx, canvas.width, canvas.height)
  answers.value[id].answer = ''
}

// ── Submit ────────────────────────────────────────────────────────────────────

async function submitAnswers() {
  submitting.value = true
  try {
    const attempts = sheet.value?.exercises.map((pse) => {
      const exerciseId = pse.exercise.id
      const data = answers.value[exerciseId]
      if (exerciseUsesCanvas(pse.exercise.type)) {
        return {
          exercise_id: exerciseId,
          answer_text: data?.answer || '',
          canvas_data: data?.answer?.startsWith('data:image/') ? buildCanvasDataForOCR(exerciseId) : '',
          time_spent_seconds: timers.value[exerciseId] || 0,
          hints_used: data?.hints || 0
        }
      } else {
        return {
          exercise_id: exerciseId,
          answer_text: keyboardAnswers.value[exerciseId] || '',
          canvas_data: '',
          time_spent_seconds: timers.value[exerciseId] || 0,
          hints_used: data?.hints || 0
        }
      }
    }) ?? []
    const start = await practiceSheetService.submitAsync(sheetId, { attempts })
    const jobId = start.data.job_id
    let jobDone = false

    while (!jobDone) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      const job = await practiceSheetService.getSubmitJob(jobId)
      if (job.data.status === 'processing') {
        continue
      }
      if (job.data.status === 'failed') {
        throw new Error(job.data.message || 'No se pudo evaluar la práctica')
      }
      result.value = job.data.result?.data || null
      jobDone = true
    }

    if (!result.value) {
      throw new Error('No se recibió resultado de evaluación')
    }
    showSubmitConfirm.value = false
    showResults.value = true
    loadTopicProgress()
    clearDraft() // Clear draft on successful submit
  } catch (err) {
    console.error(err)
  } finally {
    submitting.value = false
  }
}

async function loadTopicProgress() {
  const courseId = sheet.value?.course_id
  if (!courseId) return
  try {
    const res = await progressService.getCourseProgress(courseId)
    topicProgress.value = res.data ?? []
  } catch {
    topicProgress.value = []
  }
}

// ── Draft Save/Restore ─────────────────────────────────────────────────────

function getDraftKey(): string {
  return `practiq-draft-${sheetId}`
}

function saveDraft() {
  if (!sheet.value) return

  const draftData: Record<string, { canvasData: string; keyboardAnswer: string; timestamp: number }> = {}

  for (const pse of sheet.value.exercises || []) {
    const exerciseId = pse.exercise.id
    const canvas = canvasRefs[exerciseId]
    draftData[exerciseId] = {
      canvasData: canvas ? canvas.toDataURL('image/png') : '',
      keyboardAnswer: keyboardAnswers.value[exerciseId] || '',
      timestamp: Date.now()
    }
  }

  localStorage.setItem(getDraftKey(), JSON.stringify({
    sheetId,
    data: draftData,
    savedAt: Date.now()
  }))

  hasDraft.value = true
}

function checkForDraft() {
  const key = getDraftKey()
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.sheetId === sheetId && parsed.data) {
        // Check if draft is less than 24 hours old
        const hoursSinceSave = (Date.now() - parsed.savedAt) / (1000 * 60 * 60)
        if (hoursSinceSave < 24) {
          hasDraft.value = true
          showRestoreModal.value = true
          return parsed
        } else {
          // Draft too old, remove it
          localStorage.removeItem(key)
        }
      }
    } catch {
      localStorage.removeItem(key)
    }
  }
  return null
}

function restoreDraft() {
  const key = getDraftKey()
  const saved = localStorage.getItem(key)
  if (!saved) return

  try {
    const parsed = JSON.parse(saved)
    const draftData = parsed.data

    for (const exerciseId in draftData) {
      const draft = draftData[exerciseId]

      // Restore keyboard answers
      if (draft.keyboardAnswer) {
        keyboardAnswers.value[exerciseId] = draft.keyboardAnswer
      }

      // Restore canvas data
      const exercise = sheet.value?.exercises.find((pse) => pse.exercise.id === exerciseId)?.exercise
      if (draft.canvasData && exercise && exerciseUsesCanvas(exercise.type)) {
        const canvas = canvasRefs[exerciseId]
        if (canvas) {
          const img = new Image()
          img.onload = () => {
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0)
              // Update answers record
              answers.value[exerciseId] = {
                ...answers.value[exerciseId],
                answer: draft.canvasData
              }
            }
          }
          img.src = draft.canvasData
        }
      }
    }

    showRestoreModal.value = false
  } catch (err) {
    console.error('Failed to restore draft:', err)
  }
}

function discardDraft() {
  localStorage.removeItem(getDraftKey())
  hasDraft.value = false
  showRestoreModal.value = false
}

function clearDraft() {
  localStorage.removeItem(getDraftKey())
  hasDraft.value = false
}

function buildCanvasDataForOCR(exerciseId: string) {
  const source = canvasRefs[exerciseId]
  if (!source) {
    return answers.value[exerciseId]?.answer || ''
  }

  const scale = 2
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.floor(source.width * scale))
  out.height = Math.max(1, Math.floor(source.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) {
    return answers.value[exerciseId]?.answer || ''
  }

  ctx.fillStyle = cssVar('--surface-card', '#ffffff')
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, 0, 0, out.width, out.height)

  const image = ctx.getImageData(0, 0, out.width, out.height)
  const pixels = image.data
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const alpha = pixels[i + 3]

    if (alpha < 8) {
      pixels[i] = 255
      pixels[i + 1] = 255
      pixels[i + 2] = 255
      pixels[i + 3] = 255
      continue
    }

    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    const value = gray > 205 ? 255 : 0
    pixels[i] = value
    pixels[i + 1] = value
    pixels[i + 2] = value
    pixels[i + 3] = 255
  }
  ctx.putImageData(image, 0, 0)

  return out.toDataURL('image/jpeg', 0.92)
}

function getAssistantExerciseId() {
  if (activeCanvasId.value && answers.value[activeCanvasId.value]?.answer) {
    return activeCanvasId.value
  }

  const answeredId = Object.entries(answers.value).find(([, data]) =>
    data.answer?.startsWith('data:image/')
  )?.[0]
  if (answeredId) return answeredId

  return sheet.value?.exercises?.[currentIdx.value]?.exercise.id || ''
}

function getAssistantExerciseIndex(exerciseId: string) {
  return sheet.value?.exercises.findIndex((pse) => pse.exercise.id === exerciseId) ?? -1
}

;(window as any).__practiqAssistantHookSource = 'practice'

window.__practiqAssistantContext = () => {
  if (!sheet.value) return null

  const activeExerciseId = getAssistantExerciseId()
  const activeExerciseIndex = getAssistantExerciseIndex(activeExerciseId)
  const activeExercise =
    activeExerciseIndex >= 0 ? sheet.value.exercises[activeExerciseIndex]?.exercise : null

  return {
    current_view: 'student_practice',
    activity_type: 'practice_sheet',
    sheet_id: sheet.value.id,
    sheet_title: sheet.value.title,
    level: sheet.value.level,
    response_mode: 'canvas',
    exercise_count: sheet.value.exercises.length,
    active_exercise: activeExercise
      ? {
          id: activeExercise.id,
          number: activeExerciseIndex + 1,
          type: activeExercise.type,
          difficulty: activeExercise.difficulty,
          question: activeExercise.question,
          has_teacher_image: !!extractTeacherImageDataUrl(activeExercise),
          metadata_summary: JSON.stringify(summarizeExerciseMetadata(activeExercise) || {})
        }
      : null,
    exercise_list: sheet.value.exercises.map((pse, idx) => ({
      id: pse.exercise.id,
      number: idx + 1,
      type: pse.exercise.type,
      difficulty: pse.exercise.difficulty,
      question: pse.exercise.question,
      has_teacher_image: !!extractTeacherImageDataUrl(pse.exercise)
    })),
    answered_exercise_ids: Object.entries(answers.value)
      .filter(([, data]) => !!data.answer)
      .map(([exerciseId]) => exerciseId)
  }
}

window.__practiqAssistantCapture = async () => {
  const exerciseId = getAssistantExerciseId()
  if (!exerciseId) return null
  const exerciseIndex = getAssistantExerciseIndex(exerciseId)
  const exercise =
    exerciseIndex >= 0 ? sheet.value?.exercises?.[exerciseIndex]?.exercise : null

  const studentDataUrl = await pickBestStudentImage([
    buildCanvasDataForOCR(exerciseId),
    answers.value[exerciseId]?.answer
  ])
  const teacherDataUrl = extractTeacherImageDataUrl(exercise)
  const dataUrl = await composeAssistantWorkImage({
    teacherDataUrl,
    studentDataUrl,
    teacherLabel: 'Consigna del docente',
    studentLabel: 'Respuesta del alumno'
  })

  if (!dataUrl) return null

  return {
    dataUrl,
    filename: `practice-${exerciseId}.jpg`,
    contentType: 'image/jpeg'
  }
}

function closeSubmitConfirm() {
  if (submitting.value) return
  showSubmitConfirm.value = false
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function diffColor(d: number) {
  if (d <= 3) return 'var(--color-success)'
  if (d <= 6) return 'var(--color-warning)'
  return 'var(--color-error)'
}

function scoreColor(score: number) {
  if (score >= 90) return 'var(--color-success)'
  if (score >= 70) return 'var(--color-warning)'
  return 'var(--color-error)'
}
</script>

<style scoped>
.practice-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px 80px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--gradient-app-bg);
}

/* Header */
.practice-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px;
  background: var(--gradient-card-accent);
  border-radius: var(--radius-2xl);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.12);
  box-shadow: var(--shadow-card);
}

.btn-back {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
  background: var(--surface-elevated-strong);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.btn-back:hover { background: var(--fill-primary-faint); }

.practice-header-info { flex: 1; }

.level-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 12px;
  border-radius: var(--radius-2xl);
  background: var(--gradient-brand);
  color: var(--color-on-primary);
  font-size: 0.75rem;
  font-weight: 700;
}

.level-test-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 12px;
  border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, var(--color-warning), var(--color-warning-strong));
  color: var(--color-on-primary);
  font-size: 0.75rem;
  font-weight: 700;
}

.input-mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 12px;
  border-radius: var(--radius-2xl);
  background: rgba(var(--practiq-violet-rgb), 0.15);
  color: var(--practiq-violet);
  font-size: 0.75rem;
  font-weight: 700;
}

.practice-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.practice-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.streak-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-lg);
  background: var(--gradient-brand-soft);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
}

.streak-val {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

.streak-lbl {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.student-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-on-primary);
  font-weight: 800;
  font-size: 1.1rem;
}

/* Progress */
.practice-progress-bar {
  height: 6px;
  background: var(--fill-primary-soft);
  border-radius: 99px;
  overflow: hidden;
}
.practice-progress-fill {
  height: 100%;
  background: var(--gradient-brand);
  border-radius: 99px;
  transition: width 0.3s ease;
}
.practice-progress-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: right;
}

/* Loading */
.practice-loading {
  text-align: center;
  padding: 80px;
  color: var(--text-secondary);
}

/* Body layout */
.practice-body {
  display: block;
}

.practice-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Canvas toolbar */
.draw-tools-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--surface-elevated-strong);
  border-radius: var(--radius-lg);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
  flex-wrap: wrap;
}

.tool-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  background: var(--surface-elevated);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.tool-btn:hover { border-color: var(--practiq-violet); color: var(--practiq-violet); }
.tool-btn--active { background: var(--practiq-violet); color: var(--color-on-primary); border-color: var(--practiq-violet); }

.tool-sep {
  width: 1px;
  height: 28px;
  background: rgba(var(--practiq-violet-rgb), 0.15);
  margin: 0 4px;
}

.color-picker {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  padding: 2px;
  cursor: pointer;
  background: none;
}

.size-slider {
  width: 80px;
  accent-color: var(--practiq-violet);
}

.size-val {
  font-size: 0.8rem;
  color: var(--text-secondary);
  min-width: 28px;
}

/* Exercise cards */
.exercises-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ex-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 18px 20px;
  background: var(--surface-elevated-strong);
  border-radius: var(--radius-xl);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.08);
  transition: border-color 0.15s;
}

.ex-card--answered {
  border-color: rgba(var(--color-success-rgb), 0.3);
  background: var(--color-success-bg);
}

.ex-num {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--fill-primary-soft);
  color: var(--practiq-violet);
  font-weight: 800;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ex-num--done {
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success-dark);
}

.ex-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ex-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.difficulty-pill {
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--difficulty-color) 12%, var(--surface-card));
  color: var(--difficulty-color);
  font-size: 0.75rem;
  font-weight: 700;
}

.time-display {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.hint-count {
  font-size: 0.78rem;
  color: var(--color-warning);
}

.ex-question {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
}

.ex-question--math {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--surface-bg-soft);
  border: 1px solid rgba(var(--practiq-violet-rgb), 0.12);
}

.teacher-handwritten-image {
  width: 100%;
  max-height: 280px;
  object-fit: contain;
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  border-radius: var(--radius-md);
  background: #ffffff;
  box-shadow: var(--shadow-card);
}

.ex-input {
  padding: 10px 14px 10px 62px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  font-size: 1rem;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
  min-height: 96px;
  background-color: var(--surface-bg-soft);
  background-image:
    linear-gradient(to right, rgba(var(--color-error-rgb), 0.25) 1.5px, transparent 1.5px),
    repeating-linear-gradient(
      to bottom,
      transparent,
      transparent 31px,
      rgba(var(--practiq-violet-rgb), 0.1) 31px,
      rgba(var(--practiq-violet-rgb), 0.1) 32px
    );
  background-size: 56px 32px;
  background-position: 0 0;
  line-height: 32px;
  box-shadow: var(--shadow-card);
}
.ex-input:focus { border-color: var(--practiq-violet); }

/* Keyboard input textarea */
.keyboard-input-wrap {
  width: 100%;
}

.ex-textarea {
  width: 100%;
  padding: 14px 16px 14px 62px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  font-size: 1rem;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
  min-height: 120px;
  background-color: var(--surface-bg-soft);
  background-image:
    linear-gradient(to right, rgba(var(--color-error-rgb), 0.25) 1.5px, transparent 1.5px),
    repeating-linear-gradient(
      to bottom,
      transparent,
      transparent 31px,
      rgba(var(--practiq-violet-rgb), 0.1) 31px,
      rgba(var(--practiq-violet-rgb), 0.1) 32px
    );
  background-size: 56px 32px;
  background-position: 0 0;
  line-height: 32px;
  box-shadow: var(--shadow-card);
  resize: vertical;
  font-family: inherit;
}
.ex-textarea:focus { border-color: var(--practiq-violet); }

.choice-options {
  display: grid;
  gap: 10px;
}

.choice-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.14);
  border-radius: var(--radius-md);
  background: var(--surface-bg-soft);
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.choice-option:hover,
.choice-option--selected {
  border-color: rgba(var(--practiq-violet-rgb), 0.36);
  background: var(--fill-primary-faint);
}

.choice-option input {
  width: 18px;
  height: 18px;
  accent-color: var(--practiq-violet);
  flex: 0 0 auto;
}

/* Canvas */
.canvas-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.canvas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.canvas-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.btn-clear-canvas {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--color-error-rgb), 0.2);
  background: var(--surface-elevated-strong);
  color: var(--color-error);
  cursor: pointer;
  font-size: 0.78rem;
  transition: all 0.15s;
}
.btn-clear-canvas:hover { background: rgba(var(--color-error-rgb), 0.08); }

.ex-canvas {
  width: 100%;
  height: 240px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  display: block;
  touch-action: none;
  cursor: crosshair;
  box-shadow: var(--shadow-card);
}

/* Sticky footer */
.practice-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: var(--surface-elevated-strong);
  border-radius: var(--radius-xl);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
  position: sticky;
  bottom: 16px;
  box-shadow: var(--shadow-card-lg);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.footer-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.draft-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(var(--color-success-rgb), 0.12);
  color: var(--color-success-dark);
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 600;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-draft {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
  background: var(--surface-elevated-strong);
  color: var(--practiq-violet);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-draft:hover {
  background: var(--fill-primary-faint);
  border-color: rgba(var(--practiq-violet-rgb), 0.35);
}

.btn-submit {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--gradient-brand);
  color: var(--color-on-primary);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: var(--shadow-indigo);
  transition: opacity 0.15s;
}
.btn-submit:hover { opacity: 0.9; }

/* Modals */
.submit-copy {
  color: var(--text-secondary);
  font-size: 0.88rem;
  margin-bottom: 20px;
}

.results-box { max-width: 520px; }

.results-header { text-align: center; margin-bottom: 16px; }
.results-emoji { font-size: 40px; margin-bottom: 8px; }
.results-title { font-size: 1.4rem; }

.results-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--gradient-brand-soft);
  border-radius: var(--radius-xl);
  padding: 16px 12px;
  text-align: center;
}
.stat-value { font-size: 1.7rem; font-weight: 800; }
.stat-label { font-size: 0.75rem; color: var(--text-secondary); }

.results-recommendation {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: var(--radius-xl);
  background: var(--surface-subtle);
}
.rec-icon { font-size: 24px; }

.results-ai-feedback {
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--fill-primary-subtle);
  color: var(--practiq-violet-dark);
  font-size: 0.9rem;
}

.level-up-badge {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  background: var(--fill-success-subtle);
  color: var(--color-success-dark);
  font-weight: 700;
  text-align: center;
}

/* Responsive */
@media (max-width: 1180px) {
  .practice-shell { padding: 18px 14px 90px; }
}

@media (max-width: 680px) {
  .practice-shell { padding: 16px 14px 80px; }
  .practice-header { padding: 16px; flex-wrap: wrap; }
  .header-right { width: 100%; justify-content: flex-end; }
  .results-stats { grid-template-columns: 1fr; }
}
</style>
