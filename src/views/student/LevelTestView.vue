<template>
  <StudentLayout>
    <div class="test-shell">
      <!-- Header -->
      <header class="test-header">
        <button class="btn-back" type="button" aria-label="Salir de prueba" @click="confirmExit" title="Salir">
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="test-header-info">
          <div class="level-badge">Nivel {{ sheet?.level }}</div>
          <h1 class="test-title">{{ sheet?.title }}</h1>
          <span class="test-subtitle">Prueba de Nivel — respondé correctamente el 75% para avanzar</span>
        </div>
        <div class="timer" :class="{ 'timer--warning': timeLeft < 120 }">
          <i class="pi pi-clock"></i>
          {{ formattedTime }}
        </div>
      </header>

      <div v-if="loading" class="test-loading">
        <i class="pi pi-spin pi-spinner"></i> Cargando prueba...
      </div>

      <template v-else-if="sheet && !submitted">
        <!-- Progress bar -->
        <div class="test-progress-bar">
          <div class="test-progress-fill" :style="{ width: answeredPercent + '%' }"></div>
        </div>
        <div class="test-progress-label">{{ answeredCount }} / {{ exercises.length }} respondidas</div>

        <!-- Canvas toolbar (only in canvas mode) -->
        <div v-if="isCanvas" class="draw-tools-bar">
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

        <!-- Exercises -->
        <div class="exercises-list">
          <div
            v-for="(ex, idx) in exercises"
            :key="ex.id"
            class="ex-card"
            :class="{ 'ex-card--answered': isAnswered(ex.exercise.id) }"
          >
            <div class="ex-num">{{ idx + 1 }}</div>
            <div class="ex-body">
              <div class="ex-question">{{ ex.exercise.question }}</div>

              <!-- Keyboard mode -->
              <input
                v-if="!isCanvas"
                v-model="answers[ex.exercise.id]"
                class="ex-input"
                :placeholder="ex.exercise.type === 'equation' ? 'Respuesta...' : 'Escribe tu respuesta...'"
                @keydown.enter="focusNext(idx)"
              />

              <!-- Canvas mode -->
              <div v-else class="canvas-wrap">
                <div class="canvas-header">
                  <span class="canvas-label">Tu respuesta</span>
                  <button class="btn-clear-canvas" type="button" @click="clearCanvas(ex.exercise.id)" title="Borrar todo" aria-label="Limpiar respuesta">
                    <i class="pi pi-trash"></i> Limpiar
                  </button>
                </div>
                <canvas
                  :ref="el => setCanvasRef(ex.exercise.id, el as HTMLCanvasElement | null)"
                  class="ex-canvas"
                  :style="{ cursor: canvasCursor }"
                  @mousedown="startDraw($event, ex.exercise.id)"
                  @mousemove="draw($event, ex.exercise.id)"
                  @mouseup="endDraw(ex.exercise.id)"
                  @mouseleave="endDraw(ex.exercise.id)"
                  @touchstart.prevent="startDrawTouch($event, ex.exercise.id)"
                  @touchmove.prevent="drawTouch($event, ex.exercise.id)"
                  @touchend="endDraw(ex.exercise.id)"
                ></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="test-footer">
          <span class="footer-hint">{{ unansweredCount }} sin responder</span>
          <button class="btn-submit" :disabled="submitting" @click="submit">
            <i class="pi pi-send"></i>
            {{ submitting ? 'Evaluando con IA...' : 'Entregar prueba' }}
          </button>
        </div>
      </template>

      <!-- Results -->
      <div v-else-if="result" class="results-panel">
        <div class="result-card" :class="result.should_level_up ? 'result-card--pass' : 'result-card--fail'">
          <div class="result-icon">{{ result.should_level_up ? '🏆' : '📚' }}</div>
          <h2 class="result-heading">
            {{ result.should_level_up ? '¡Aprobaste!' : 'No pasaste esta vez' }}
          </h2>

          <div class="score-ring">
            <svg viewBox="0 0 120 120" class="ring-svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface-border)" stroke-width="10"/>
              <circle
                cx="60" cy="60" r="50" fill="none"
                :stroke="result.should_level_up ? 'var(--color-success)' : 'var(--color-warning)'"
                stroke-width="10"
                stroke-linecap="round"
                stroke-dasharray="314"
                :stroke-dashoffset="314 - (314 * result.score / 100)"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div class="ring-label">
              <div class="ring-score">{{ Math.round(result.score) }}%</div>
              <div class="ring-sub">{{ result.correct }}/{{ result.total }}</div>
            </div>
          </div>

          <div v-if="result.should_level_up" class="level-up-badge">
            Nivel {{ result.next_level }} desbloqueado 🎉
          </div>

          <p class="result-rec">{{ result.recommendation }}</p>

          <div v-if="result.ai_feedback" class="result-ai-feedback">
            <strong>Comentario del Asistente:</strong> {{ result.ai_feedback }}
          </div>

          <div class="result-actions">
            <button class="btn-secondary" @click="router.push('/student/dashboard')">
              Ir al inicio
            </button>
            <button v-if="!result.should_level_up" class="btn-retry" @click="retry">
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    </div>
  </StudentLayout>

  <ConfirmModal
    v-bind="confirmState"
    @confirm="onConfirm"
    @cancel="onCancel"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StudentLayout from '@/layouts/StudentLayout.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useConfirm } from '@/composables/useConfirm'
import { practiceSheetService } from '@/services/practiceSheets/practiceSheetService'
import { useAuthStore } from '@/stores/authStore'
import type { PracticeSheet, PracticeSheetExercise, SubmitResult } from '@/types'
import {
  composeTeacherAndStudentImage,
  extractTeacherImageDataUrl,
  summarizeExerciseMetadata
} from '@/utils/assistantExerciseContext'

const route = useRoute()
const router = useRouter()
const { confirmState, showConfirm, onConfirm, onCancel } = useConfirm()
const authStore = useAuthStore()

const sheet = ref<PracticeSheet | null>(null)
const loading = ref(true)
const submitted = ref(false)
const submitting = ref(false)
const result = ref<SubmitResult | null>(null)
const answers = ref<Record<string, string>>({})

// Canvas state
const canvasRefs: Record<string, HTMLCanvasElement | null> = {}
const initializedIds = new Set<string>()
const canvasData = ref<Record<string, string>>({})
const undoStacks: Record<string, ImageData[]> = {}
const isDrawing: Record<string, boolean> = {}
const activeId = ref<string>('')
const tool = ref<'pen' | 'eraser'>('pen')
const penColor = ref(cssVar('--text-primary', '#1e293b'))
const penSize = ref(3)

const penCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%231e1e2e' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/%3E%3C/svg%3E") 0 24, crosshair`
const eraserCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%23666' stroke-width='1.5'/%3E%3C/svg%3E") 10 10, cell`
const canvasCursor = computed(() => tool.value === 'eraser' ? eraserCursor : penCursor)

function cssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

// Timer — 30 min
const TEST_DURATION_SECONDS = 30 * 60
const timeLeft = ref(TEST_DURATION_SECONDS)
let timer: ReturnType<typeof setInterval> | null = null

function startTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (timeLeft.value <= 0) {
      clearInterval(timer!)
      timer = null
      submit()
    } else {
      timeLeft.value--
    }
  }, 1000)
}

const exercises = computed<PracticeSheetExercise[]>(() => sheet.value?.exercises || [])
const isCanvas = computed(() => sheet.value?.test_style === 'canvas')

function isAnswered(exerciseId: string) {
  if (isCanvas.value) return !!canvasData.value[exerciseId]
  return (answers.value[exerciseId] || '').trim() !== ''
}

const answeredCount = computed(() => exercises.value.filter(ex => isAnswered(ex.exercise.id)).length)
const unansweredCount = computed(() => exercises.value.length - answeredCount.value)
const answeredPercent = computed(() =>
  exercises.value.length ? Math.round((answeredCount.value / exercises.value.length) * 100) : 0
)
const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60).toString().padStart(2, '0')
  const s = (timeLeft.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

// ── Canvas helpers ────────────────────────────────────────────────────────────

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
  ctx.strokeStyle = `rgba(${cssVar('--color-error-rgb', '239, 68, 68')}, 0.25)`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(56, 0)
  ctx.lineTo(56, h)
  ctx.stroke()
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
    const w = canvas.offsetWidth || 680
    const h = canvas.offsetHeight || 220
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    drawBackground(ctx, w, h)
    undoStacks[id] = []
  })
}

function getPoint(e: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  }
}

function startDraw(e: MouseEvent, id: string) {
  const canvas = canvasRefs[id]
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  // save undo state
  if (!undoStacks[id]) undoStacks[id] = []
  undoStacks[id].push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  isDrawing[id] = true
  activeId.value = id
  const { x, y } = getPoint(e, canvas)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function draw(e: MouseEvent, id: string) {
  if (!isDrawing[id]) return
  const canvas = canvasRefs[id]
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const { x, y } = getPoint(e, canvas)
  ctx.globalCompositeOperation = tool.value === 'eraser' ? 'destination-out' : 'source-over'
  ctx.strokeStyle = penColor.value
  ctx.lineWidth = tool.value === 'eraser' ? penSize.value * 4 : penSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineTo(x, y)
  ctx.stroke()
}

function endDraw(id: string) {
  if (!isDrawing[id]) return
  isDrawing[id] = false
  const canvas = canvasRefs[id]
  if (!canvas) return
  canvas.getContext('2d')!.beginPath()
  // snapshot for answeredCount tracking (non-reactive — won't trigger re-render of canvases)
  canvasData.value = { ...canvasData.value, [id]: canvas.toDataURL('image/png') }
}

function startDrawTouch(e: TouchEvent, id: string) {
  const t = e.touches[0]
  startDraw({ clientX: t.clientX, clientY: t.clientY } as MouseEvent, id)
}

function drawTouch(e: TouchEvent, id: string) {
  const t = e.touches[0]
  draw({ clientX: t.clientX, clientY: t.clientY } as MouseEvent, id)
}

function undoActive() {
  const id = activeId.value
  if (!id) return
  const canvas = canvasRefs[id]
  const stack = undoStacks[id]
  if (!canvas || !stack || stack.length === 0) return
  canvas.getContext('2d')!.putImageData(stack.pop()!, 0, 0)
  if (!canvas.toDataURL().includes('data:image/png')) {
    const copy = { ...canvasData.value }
    delete copy[id]
    canvasData.value = copy
  }
}

function clearCanvas(id: string) {
  const canvas = canvasRefs[id]
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  undoStacks[id] = []
  drawBackground(ctx, canvas.width, canvas.height)
  const copy = { ...canvasData.value }
  delete copy[id]
  canvasData.value = copy
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  const id = route.params.id as string
  try {
    const res = await practiceSheetService.get(id)
    sheet.value = res.data
    for (const ex of exercises.value) {
      answers.value[ex.exercise.id] = ''
    }
    startTimer()
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  delete window.__practiqAssistantCapture
  delete window.__practiqAssistantContext
})

function focusNext(idx: number) {
  const inputs = document.querySelectorAll<HTMLInputElement>('.ex-input')
  inputs[idx + 1]?.focus()
}

async function confirmExit() {
  const ok = await showConfirm('¿Salir de la prueba?', {
    description: 'Tu progreso no se guardará.',
    confirmLabel: 'Salir',
    danger: false,
  })
  if (ok) router.back()
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  if (timer) clearInterval(timer)

  const elapsedSeconds = TEST_DURATION_SECONDS - timeLeft.value
  const perExerciseSeconds = exercises.value.length
    ? Math.round(elapsedSeconds / exercises.value.length)
    : 0

  const attempts = exercises.value.map(ex => ({
    exercise_id: ex.exercise.id,
    answer_text: isCanvas.value ? '' : (answers.value[ex.exercise.id] || ''),
    canvas_data: isCanvas.value ? buildCanvasDataForOCR(ex.exercise.id) : '',
    time_spent_seconds: perExerciseSeconds,
    hints_used: 0
  }))

  try {
    const start = await practiceSheetService.submitAsync(sheet.value!.id, { attempts })
    const jobId = start.data.job_id
    let jobDone = false

    while (!jobDone) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      const job = await practiceSheetService.getSubmitJob(jobId)
      if (job.data.status === 'processing') {
        continue
      }
      if (job.data.status === 'failed') {
        throw new Error(job.data.message || 'No se pudo evaluar la prueba')
      }
      result.value = job.data.result?.data || null
      jobDone = true
    }

    if (!result.value) {
      throw new Error('No se recibió resultado de evaluación')
    }
    submitted.value = true
  } catch (err) {
    console.error(err)
  } finally {
    submitting.value = false
  }
}

function buildCanvasDataForOCR(exerciseId: string) {
  const source = canvasRefs[exerciseId]
  if (!source) {
    return canvasData.value[exerciseId] || ''
  }

  const scale = 2
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.floor(source.width * scale))
  out.height = Math.max(1, Math.floor(source.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) {
    return canvasData.value[exerciseId] || ''
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
  if (activeId.value && canvasData.value[activeId.value]) {
    return activeId.value
  }

  const answeredId = Object.keys(canvasData.value)[0]
  if (answeredId) return answeredId

  return exercises.value[0]?.exercise.id || ''
}

function getAssistantExerciseIndex(exerciseId: string) {
  return exercises.value.findIndex((item) => item.exercise.id === exerciseId)
}

window.__practiqAssistantContext = () => {
  if (!sheet.value) return null

  const activeExerciseId = getAssistantExerciseId()
  const activeExerciseIndex = getAssistantExerciseIndex(activeExerciseId)
  const activeExercise =
    activeExerciseIndex >= 0 ? exercises.value[activeExerciseIndex]?.exercise : null

  return {
    current_view: 'student_level_test',
    activity_type: 'level_test',
    sheet_id: sheet.value.id,
    sheet_title: sheet.value.title,
    level: sheet.value.level,
    response_mode: isCanvas.value ? 'canvas' : 'keyboard',
    exercise_count: exercises.value.length,
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
    exercise_list: exercises.value.map((item, idx) => ({
      id: item.exercise.id,
      number: idx + 1,
      type: item.exercise.type,
      difficulty: item.exercise.difficulty,
      question: item.exercise.question,
      has_teacher_image: !!extractTeacherImageDataUrl(item.exercise)
    })),
    answered_exercise_ids: isCanvas.value
      ? Object.keys(canvasData.value)
      : Object.entries(answers.value)
          .filter(([, answer]) => answer.trim() !== '')
          .map(([exerciseId]) => exerciseId)
  }
}

window.__practiqAssistantCapture = async () => {
  if (!isCanvas.value) return null

  const exerciseId = getAssistantExerciseId()
  if (!exerciseId) return null
  const exerciseIndex = getAssistantExerciseIndex(exerciseId)
  const exercise =
    exerciseIndex >= 0 ? exercises.value[exerciseIndex]?.exercise : null

  const studentDataUrl = buildCanvasDataForOCR(exerciseId)
  const teacherDataUrl = extractTeacherImageDataUrl(exercise)
  let dataUrl = studentDataUrl

  if (teacherDataUrl && studentDataUrl) {
    try {
      dataUrl = await composeTeacherAndStudentImage({
        teacherDataUrl,
        studentDataUrl,
        teacherLabel: 'Consigna del docente',
        studentLabel: 'Respuesta del alumno'
      })
    } catch (error) {
      console.error('[level-test-view] failed to compose teacher and student images', error)
      dataUrl = teacherDataUrl || studentDataUrl
    }
  } else if (teacherDataUrl) {
    dataUrl = teacherDataUrl
  }

  if (!dataUrl) return null

  return {
    dataUrl,
    filename: `level-test-${exerciseId}.jpg`,
    contentType: 'image/jpeg'
  }
}

function retry() {
  submitted.value = false
  result.value = null
  timeLeft.value = TEST_DURATION_SECONDS
  canvasData.value = {}
  for (const key in answers.value) answers.value[key] = ''
  // Re-init canvases after DOM updates
  nextTick(() => {
    for (const id of initializedIds) {
      initializedIds.delete(id)
    }
  })
  startTimer()
}
</script>

<style scoped>
.test-shell {
  max-width: 780px;
  margin: 0 auto;
  padding: 24px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--gradient-app-bg);
}

/* Header */
.test-header {
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

.test-header-info { flex: 1; }

.level-badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: var(--radius-2xl);
  background: var(--gradient-brand);
  color: var(--color-on-primary);
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.test-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.test-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.timer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--gradient-brand-soft);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}
.timer--warning { color: var(--color-error-dark); background: var(--color-error-bg); }

/* Progress */
.test-progress-bar {
  height: 6px;
  background: var(--fill-primary-soft);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.test-progress-fill {
  height: 100%;
  background: var(--gradient-brand);
  border-radius: var(--radius-pill);
  transition: width 0.3s ease;
}
.test-progress-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: right;
}

/* Draw toolbar */
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

/* Exercises */
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

.ex-card--answered .ex-num {
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success-dark);
}

.ex-body { flex: 1; display: flex; flex-direction: column; gap: 10px; }

.ex-question {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
}

.ex-input {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  font-size: 1rem;
  color: var(--text-primary);
  background: var(--surface-elevated-strong);
  outline: none;
  transition: border-color 0.15s;
}
.ex-input:focus { border-color: var(--practiq-violet); }

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
  height: 220px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.15);
  display: block;
  touch-action: none;
  box-shadow: var(--shadow-card);
}

/* Footer */
.test-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--surface-elevated-strong);
  border-radius: var(--radius-xl);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
  position: sticky;
  bottom: 16px;
}

.footer-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
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
.btn-submit:hover:not(:disabled) { opacity: 0.9; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

/* Loading */
.test-loading {
  text-align: center;
  padding: 80px;
  color: var(--text-secondary);
}

/* Results */
.results-panel {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.result-card {
  background: var(--surface-elevated-strong);
  border-radius: 28px;
  padding: 40px 48px;
  text-align: center;
  max-width: 460px;
  width: 100%;
  box-shadow: var(--shadow-panel);
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.result-card--pass { border-color: rgba(var(--color-success-rgb), 0.3); }
.result-card--fail { border-color: rgba(var(--color-warning-rgb), 0.3); }

.result-icon { font-size: 3rem; line-height: 1; }

.result-heading {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
}

.score-ring {
  position: relative;
  width: 140px;
  height: 140px;
}

.ring-svg {
  width: 140px;
  height: 140px;
  transform: scaleX(-1);
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-score {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

.ring-sub {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.level-up-badge {
  padding: 8px 20px;
  border-radius: var(--radius-pill);
  background: linear-gradient(135deg, var(--color-success), var(--color-success-dark));
  color: var(--color-on-primary);
  font-weight: 700;
  font-size: 0.95rem;
}

.result-rec {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.result-ai-feedback {
  background: var(--fill-primary-faint);
  border: 1px solid rgba(var(--practiq-violet-rgb), 0.15);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.5;
  width: 100%;
  text-align: left;
}

.result-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-secondary {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
  background: var(--surface-elevated-strong);
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
}
.btn-secondary:hover { border-color: var(--practiq-violet); }

.btn-retry {
  padding: 10px 22px;
  border-radius: var(--radius-md);
  border: none;
  background: linear-gradient(135deg, var(--color-warning), var(--color-warning-strong));
  color: var(--color-on-primary);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-retry:hover { opacity: 0.9; }

@media (max-width: 1024px) {
  .test-shell {
    padding: 20px 16px 48px;
  }
  .test-header {
    padding: 16px 20px;
  }
}

@media (max-width: 768px) {
  .test-shell {
    padding: 16px 12px 40px;
    gap: 12px;
  }
  .test-header {
    padding: 14px 16px;
    gap: 10px;
    flex-wrap: wrap;
  }
  .test-title {
    font-size: 1.1rem;
  }
  .test-subtitle {
    font-size: 0.78rem;
  }
  .timer {
    font-size: 0.95rem;
    padding: 6px 12px;
  }
  .ex-card {
    padding: 14px 16px;
    gap: 12px;
  }
  .draw-tools-bar {
    padding: 8px 12px;
  }
  .test-footer {
    padding: 12px 16px;
  }
  .btn-submit {
    padding: 10px 20px;
    font-size: 0.88rem;
  }
  .result-card {
    padding: 28px 24px;
  }
}

@media (max-width: 600px) {
  .test-shell {
    padding: 10px 8px 32px;
    gap: 10px;
  }
  .test-header {
    padding: 12px;
  }
  .ex-card {
    padding: 12px;
    flex-direction: column;
    gap: 8px;
  }
  .ex-num {
    width: 28px;
    height: 28px;
    font-size: 0.82rem;
  }
  .ex-canvas {
    height: 180px;
  }
  .test-footer {
    padding: 10px 12px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .btn-submit {
    width: 100%;
    justify-content: center;
  }
  .result-card {
    padding: 20px 16px;
  }
  .result-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .btn-secondary,
  .btn-retry {
    text-align: center;
  }
}
</style>
