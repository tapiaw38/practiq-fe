<template>
  <div class="book-shell">
    <!-- ─── HEADER ─── -->
    <header class="book-header">
      <div class="header-left">
        <button class="icon-btn" @click="router.back()">
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="header-topic">
          <span class="header-topic-name">{{ sheet?.title || 'Cargando...' }}</span>
          <span class="header-topic-level">Nivel {{ sheet?.level || 1 }}</span>
        </div>
      </div>

      <div class="header-center">
        <div class="header-progress-track">
          <div class="header-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <span class="header-progress-label">{{ answeredCount }} de {{ exercises.length }}</span>
      </div>

      <div class="header-right">
        <div class="streak-badge">
          <span>🔥</span>
          <span class="streak-value">{{ streakDays }}</span>
          <span class="streak-label">racha</span>
        </div>
        <div class="user-chip">{{ userInitial }}</div>
      </div>
    </header>

    <!-- ─── BODY ─── -->
    <div class="book-body">
      <!-- WORKSHEET -->
      <main class="worksheet" ref="worksheetEl">
        <div v-if="loading" class="ws-loading">
          <div class="spinner spinner-violet"></div>
        </div>

        <template v-else>
          <!-- Sheet title card -->
          <div class="sheet-card">
            <div class="sheet-card__icon">
              <i class="pi pi-pencil"></i>
            </div>
            <div class="sheet-card__info">
              <div class="sheet-card__title">Ejercicio de práctica</div>
              <div class="sheet-card__subtitle">Resuelve las siguientes operaciones.</div>
            </div>
            <div class="sheet-card__actions">
              <button class="hint-btn" @click="requestGlobalHint" :disabled="aiLoading">
                <i class="pi pi-lightbulb"></i>
                Pista
              </button>
              <button class="icon-btn icon-btn--sm" @click="aiOpen = !aiOpen">
                <i class="pi pi-ellipsis-h"></i>
              </button>
            </div>
          </div>

          <!-- Exercise rows -->
          <div class="exercise-list">
            <div
              v-for="(item, idx) in exercises"
              :key="item.id"
              class="ex-row"
              :class="{
                'ex-row--active': activeIdx === idx,
                'ex-row--correct': answers[item.exercise.id]?.correct === true,
                'ex-row--incorrect': answers[item.exercise.id]?.correct === false,
              }"
              @click="setActive(idx)"
            >
              <!-- Number badge -->
              <div class="ex-num">
                <span v-if="answers[item.exercise.id]?.correct === true" class="ex-check">✓</span>
                <span v-else-if="answers[item.exercise.id]?.correct === false" class="ex-cross">✗</span>
                <span v-else>{{ idx + 1 }}</span>
              </div>

              <!-- Question -->
              <div class="ex-question">
                <span class="ex-question-text">{{ item.exercise.question }}</span>
              </div>

              <!-- Equals sign -->
              <span class="ex-eq">=</span>

              <!-- Answer area -->
              <div class="ex-answer-area" :class="{ 'ex-answer-area--filled': !!answers[item.exercise.id]?.text }">
                <!-- Canvas types: draw directly -->
                <template v-if="item.exercise.type === 'canvas' || item.exercise.type === 'handwritten'">
                  <canvas
                    :ref="el => setCanvasRef(el as HTMLCanvasElement, idx)"
                    class="ex-canvas"
                    :width="canvasW"
                    :height="canvasH"
                    @mousedown="startDraw($event, idx)"
                    @mousemove="draw($event, idx)"
                    @mouseup="endDraw(idx)"
                    @mouseleave="endDraw(idx)"
                    @touchstart.prevent="startDrawTouch($event, idx)"
                    @touchmove.prevent="drawTouch($event, idx)"
                    @touchend="endDraw(idx)"
                  ></canvas>
                </template>

                <!-- Text / equation types -->
                <template v-else>
                  <input
                    :ref="el => setInputRef(el as HTMLInputElement, idx)"
                    v-model="answers[item.exercise.id].text"
                    class="ex-input"
                    :placeholder="activeIdx === idx ? 'Escribe tu respuesta...' : ''"
                    @focus="setActive(idx)"
                    @keydown.enter="activeIdx < exercises.length - 1 ? setActive(activeIdx + 1) : null"
                  />
                </template>
              </div>
            </div>
          </div>
        </template>
      </main>

      <!-- AI CHAT PANEL -->
      <aside class="ai-panel" :class="{ 'ai-panel--open': aiOpen }">
        <div class="ai-panel-inner">
          <div class="ai-robot">🤖</div>

          <div class="ai-messages" ref="messagesEl">
            <div
              v-for="msg in aiMessages"
              :key="msg.id"
              class="ai-msg"
              :class="msg.sender === 'ai' ? 'ai-msg--ai' : 'ai-msg--user'"
            >
              <div class="ai-msg__bubble">{{ msg.content }}</div>
              <div class="ai-msg__time">{{ formatTime(msg.created_at) }}</div>
            </div>

            <div v-if="aiLoading" class="ai-msg ai-msg--ai">
              <div class="ai-msg__bubble ai-typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <div class="ai-quick-actions">
            <button class="ai-quick-btn" @click="askAI('hint')" :disabled="aiLoading">💡 Pista</button>
            <button class="ai-quick-btn" @click="askAI('explanation')" :disabled="aiLoading">📖 Explicar</button>
            <button class="ai-quick-btn" @click="askAI('similar_example')" :disabled="aiLoading">🔁 Ejemplo</button>
          </div>

          <div class="ai-input-row">
            <input
              v-model="aiDraft"
              class="ai-input"
              placeholder="Escribe tu consulta..."
              @keydown.enter="sendAIMessage"
            />
            <button class="ai-send-btn" @click="sendAIMessage" :disabled="aiLoading || !aiDraft.trim()">
              <i class="pi pi-send"></i>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- ─── BOTTOM TOOLBAR ─── -->
    <footer class="book-toolbar">
      <button class="toolbar-summary-btn" @click="showSummary = !showSummary">
        <i class="pi pi-list"></i>
        Resumen
      </button>

      <div class="toolbar-draw-tools">
        <button
          class="draw-tool"
          :class="{ active: tool === 'pen' }"
          @click="tool = 'pen'"
          title="Lápiz"
        >
          <i class="pi pi-pencil"></i>
          <span>Lápiz</span>
        </button>
        <button
          class="draw-tool"
          :class="{ active: tool === 'eraser' }"
          @click="tool = 'eraser'"
          title="Borrador"
        >
          <i class="pi pi-minus-circle"></i>
          <span>Borrador</span>
        </button>
        <button class="draw-tool" @click="undoDraw" title="Deshacer">
          <i class="pi pi-replay"></i>
          <span>Deshacer</span>
        </button>
        <button class="draw-tool" @click="redoDraw" title="Rehacer" :disabled="redoStack[activeIdx]?.length === 0">
          <i class="pi pi-refresh"></i>
          <span>Rehacer</span>
        </button>
        <button class="draw-tool draw-tool--danger" @click="clearCanvas(activeIdx)" title="Limpiar">
          <i class="pi pi-trash"></i>
          <span>Limpiar</span>
        </button>
      </div>

      <button class="submit-btn" @click="confirmSubmit" :disabled="submitting">
        <span v-if="submitting" class="spinner spinner-sm"></span>
        Revisar respuestas
      </button>
    </footer>

    <!-- Navigation bar (below toolbar) -->
    <div class="nav-bar">
      <button class="nav-btn" :disabled="activeIdx === 0" @click="setActive(activeIdx - 1)">
        <i class="pi pi-angle-left"></i>
      </button>
      <span class="nav-label">{{ activeIdx + 1 }} / {{ exercises.length }}</span>
      <button class="nav-btn" :disabled="activeIdx >= exercises.length - 1" @click="setActive(activeIdx + 1)">
        <i class="pi pi-angle-right"></i>
      </button>
    </div>

    <!-- Summary panel -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showSummary" class="modal-overlay" @click.self="showSummary = false">
          <div class="summary-box">
            <h3 class="summary-title">Resumen</h3>
            <div class="summary-grid">
              <div
                v-for="(item, idx) in exercises"
                :key="item.id"
                class="summary-dot"
                :class="{
                  'summary-dot--active': activeIdx === idx,
                  'summary-dot--answered': !!answers[item.exercise.id]?.text || !!canvasData[idx],
                }"
                @click="setActive(idx); showSummary = false"
              >
                {{ idx + 1 }}
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:16px" @click="showSummary = false">
              Cerrar
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Results modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="result" class="modal-overlay">
          <div class="result-box">
            <div class="result-icon">{{ result.should_level_up ? '🏆' : result.score >= 70 ? '⭐' : '📖' }}</div>
            <h2 class="result-score">{{ Math.round(result.score) }}%</h2>
            <p class="result-label">{{ result.correct }} de {{ result.total }} correctas</p>

            <div class="result-mastery">
              <div class="result-mastery-label">Dominio del tema</div>
              <div class="progress-bar" style="margin: 8px 0">
                <div class="progress-fill" :style="{ width: result.mastery_score + '%' }"></div>
              </div>
              <div class="result-mastery-value">{{ Math.round(result.mastery_score) }}%</div>
            </div>

            <div v-if="result.should_level_up" class="result-levelup">
              🎉 ¡Subiste al nivel {{ result.next_level }}!
            </div>

            <p class="result-rec">{{ result.recommendation }}</p>

            <div class="result-actions">
              <button class="btn btn-secondary" @click="router.back()">Volver</button>
              <button class="btn btn-primary" @click="result = null">Ver hoja</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { practiceSheetService } from '@/services/practiceSheets/practiceSheetService'
import { aiService } from '@/services/ai/aiService'
import type { PracticeSheet, PracticeSheetExercise, AIMessage, SubmitResult } from '@/types'
import {
  composeTeacherAndStudentImage,
  extractTeacherImageDataUrl,
  summarizeExerciseMetadata
} from '@/utils/assistantExerciseContext'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const sheetId = route.params.id as string
const sheet = ref<PracticeSheet | null>(null)
const loading = ref(true)
const submitting = ref(false)
const result = ref<SubmitResult | null>(null)
const showSummary = ref(false)

// Exercise state
const exercises = computed<PracticeSheetExercise[]>(() => sheet.value?.exercises ?? [])
const activeIdx = ref(0)

// Per-exercise answers (text)
const answers = ref<Record<string, { text: string; correct?: boolean }>>({})

// Per-exercise canvas data (base64)
const canvasData = ref<Record<number, string>>({})

// Canvas drawing
const canvasRefs = ref<Record<number, HTMLCanvasElement>>({})
const inputRefs = ref<Record<number, HTMLInputElement>>({})
const worksheetEl = ref<HTMLElement | null>(null)
const canvasW = 260
const canvasH = 80
const tool = ref<'pen' | 'eraser'>('pen')
const penColor = '#6d28d9'
const penSize = 3
const eraserSize = 20
const isDrawing = ref(false)
const undoStack = ref<Record<number, ImageData[]>>({})
const redoStack = ref<Record<number, ImageData[]>>({})

// AI
const aiOpen = ref(false)
const aiMessages = ref<AIMessage[]>([])
const aiDraft = ref('')
const aiLoading = ref(false)
const conversationId = ref('')
const messagesEl = ref<HTMLElement | null>(null)

// User info
const userInitial = computed(() => authStore.profile?.name?.[0]?.toUpperCase() || 'A')
const streakDays = ref(12)

// Progress
const answeredCount = computed(() => {
  return exercises.value.filter(item => {
    const hasText = !!answers.value[item.exercise.id]?.text
    const hasCanvas = !!canvasData.value[exercises.value.indexOf(item)]
    return hasText || hasCanvas
  }).length
})
const progressPct = computed(() =>
  exercises.value.length ? (answeredCount.value / exercises.value.length) * 100 : 0
)

// ── Lifecycle ──────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const res = await practiceSheetService.get(sheetId)
    sheet.value = res.data

    // Init answer map
    for (const item of res.data.exercises ?? []) {
      answers.value[item.exercise.id] = { text: '' }
    }

    // Start AI conversation
    try {
      const convRes = await aiService.createConversation({
        course_id: res.data.course_id,
        practice_sheet_id: sheetId
      })
      conversationId.value = convRes.data.id
      aiMessages.value = [{
        id: 'welcome',
        conversation_id: convRes.data.id,
        sender: 'ai',
        message_type: 'greeting',
        content: `¡Hola, ${authStore.profile?.name?.split(' ')[0] || 'estudiante'}! 😊 ¿En qué puedo ayudarte?`,
        created_at: new Date().toISOString()
      }]
    } catch {}
  } finally {
    loading.value = false
    await nextTick()
    initCanvases()
  }
})

onUnmounted(() => {
  delete window.__practiqAssistantCapture
  delete window.__practiqAssistantContext
})

watch(activeIdx, async () => {
  await nextTick()
  const type = exercises.value[activeIdx.value]?.exercise?.type
  if (type !== 'canvas' && type !== 'handwritten') {
    inputRefs.value[activeIdx.value]?.focus()
  }
})

// ── Canvas ──────────────────────────────────────────────────────────
function setCanvasRef(el: HTMLCanvasElement | null, idx: number) {
  if (el) canvasRefs.value[idx] = el
}
function setInputRef(el: HTMLInputElement | null, idx: number) {
  if (el) inputRefs.value[idx] = el
}

function initCanvases() {
  for (let i = 0; i < exercises.value.length; i++) {
    const ex = exercises.value[i]?.exercise
    if (ex?.type === 'canvas' || ex?.type === 'handwritten') {
      undoStack.value[i] = []
      redoStack.value[i] = []
    }
  }
}

function getCtx(idx: number) {
  const canvas = canvasRefs.value[idx]
  if (!canvas) return null
  return canvas.getContext('2d')
}

function saveSnapshot(idx: number) {
  const canvas = canvasRefs.value[idx]
  const ctx = getCtx(idx)
  if (!canvas || !ctx) return
  if (!undoStack.value[idx]) undoStack.value[idx] = []
  undoStack.value[idx].push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  if (redoStack.value[idx]) redoStack.value[idx] = []
}

function startDraw(e: MouseEvent, idx: number) {
  if (activeIdx.value !== idx) { setActive(idx); return }
  saveSnapshot(idx)
  isDrawing.value = true
  const ctx = getCtx(idx)
  const canvas = canvasRefs.value[idx]
  if (!ctx || !canvas) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  ctx.beginPath()
  ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY)
}

function draw(e: MouseEvent, idx: number) {
  if (!isDrawing.value || activeIdx.value !== idx) return
  const ctx = getCtx(idx)
  const canvas = canvasRefs.value[idx]
  if (!ctx || !canvas) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  applyStyle(ctx)
  ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY)
  ctx.stroke()
}

function endDraw(idx: number) {
  if (!isDrawing.value) return
  isDrawing.value = false
  captureCanvas(idx)
}

function startDrawTouch(e: TouchEvent, idx: number) {
  if (activeIdx.value !== idx) { setActive(idx); return }
  const touch = e.touches[0]
  saveSnapshot(idx)
  isDrawing.value = true
  const ctx = getCtx(idx)
  const canvas = canvasRefs.value[idx]
  if (!ctx || !canvas) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  ctx.beginPath()
  ctx.moveTo((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY)
}

function drawTouch(e: TouchEvent, idx: number) {
  if (!isDrawing.value || activeIdx.value !== idx) return
  const touch = e.touches[0]
  const ctx = getCtx(idx)
  const canvas = canvasRefs.value[idx]
  if (!ctx || !canvas) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  applyStyle(ctx)
  ctx.lineTo((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY)
  ctx.stroke()
}

function applyStyle(ctx: CanvasRenderingContext2D) {
  if (tool.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = eraserSize
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = penColor
    ctx.lineWidth = penSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }
}

function captureCanvas(idx: number) {
  const canvas = canvasRefs.value[idx]
  if (!canvas) return
  canvasData.value[idx] = canvas.toDataURL('image/png')
}

function buildCanvasDataForAssistant(idx: number) {
  const source = canvasRefs.value[idx]
  if (!source) {
    return canvasData.value[idx] || ''
  }

  const scale = 2
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.floor(source.width * scale))
  out.height = Math.max(1, Math.floor(source.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) {
    return canvasData.value[idx] || ''
  }

  ctx.fillStyle = '#ffffff'
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

function undoDraw() {
  const stack = undoStack.value[activeIdx.value]
  const canvas = canvasRefs.value[activeIdx.value]
  const ctx = getCtx(activeIdx.value)
  if (!stack?.length || !ctx || !canvas) return
  const snapshot = stack.pop()!
  if (!redoStack.value[activeIdx.value]) redoStack.value[activeIdx.value] = []
  redoStack.value[activeIdx.value].push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  ctx.putImageData(snapshot, 0, 0)
  captureCanvas(activeIdx.value)
}

function redoDraw() {
  const stack = redoStack.value[activeIdx.value]
  const canvas = canvasRefs.value[activeIdx.value]
  const ctx = getCtx(activeIdx.value)
  if (!stack?.length || !ctx || !canvas) return
  const snapshot = stack.pop()!
  if (!undoStack.value[activeIdx.value]) undoStack.value[activeIdx.value] = []
  undoStack.value[activeIdx.value].push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  ctx.putImageData(snapshot, 0, 0)
  captureCanvas(activeIdx.value)
}

function clearCanvas(idx: number) {
  const canvas = canvasRefs.value[idx]
  const ctx = getCtx(idx)
  if (!canvas || !ctx) return
  saveSnapshot(idx)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  delete canvasData.value[idx]
}

function getAssistantExerciseIndex() {
  return Math.max(0, Math.min(activeIdx.value, exercises.value.length - 1))
}

window.__practiqAssistantContext = () => {
  const index = getAssistantExerciseIndex()
  const exercise = exercises.value[index]?.exercise
  if (!sheet.value || !exercise) return null

  return {
    current_view: 'student_book',
    activity_type: 'book_sheet',
    sheet_id: sheet.value.id,
    sheet_title: sheet.value.title,
    level: sheet.value.level,
    response_mode:
      exercise.type === 'canvas' || exercise.type === 'handwritten' ? 'canvas' : 'keyboard',
    active_exercise: {
      id: exercise.id,
      number: index + 1,
      type: exercise.type,
      difficulty: exercise.difficulty,
      question: exercise.question,
      has_teacher_image: !!extractTeacherImageDataUrl(exercise),
      metadata_summary: JSON.stringify(summarizeExerciseMetadata(exercise) || {})
    },
    exercise_list: exercises.value.map((item, idx) => ({
      id: item.exercise.id,
      number: idx + 1,
      type: item.exercise.type,
      difficulty: item.exercise.difficulty,
      question: item.exercise.question,
      has_teacher_image: !!extractTeacherImageDataUrl(item.exercise)
    }))
  }
}

window.__practiqAssistantCapture = async () => {
  const index = getAssistantExerciseIndex()
  const exercise = exercises.value[index]?.exercise
  if (!exercise) return null

  const teacherDataUrl = extractTeacherImageDataUrl(exercise)
  const studentDataUrl =
    exercise.type === 'canvas' || exercise.type === 'handwritten'
      ? buildCanvasDataForAssistant(index)
      : ''

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
      console.error('[book-view] failed to compose teacher and student images', error)
      dataUrl = teacherDataUrl || studentDataUrl
    }
  } else if (teacherDataUrl) {
    dataUrl = teacherDataUrl
  }

  if (!dataUrl) return null

  return {
    dataUrl,
    filename: `book-exercise-${exercise.id}.jpg`,
    contentType: 'image/jpeg'
  }
}

// ── Navigation ──────────────────────────────────────────────────────
function setActive(idx: number) {
  activeIdx.value = idx
}

// ── AI ──────────────────────────────────────────────────────────────
async function askAI(type: 'hint' | 'explanation' | 'similar_example') {
  const ex = exercises.value[activeIdx.value]?.exercise
  if (!ex) return
  aiOpen.value = true
  aiLoading.value = true

  aiMessages.value.push({
    id: Date.now() + '-user',
    conversation_id: conversationId.value,
    sender: 'student',
    message_type: type,
    content: type === 'hint' ? 'Dame una pista' : type === 'explanation' ? 'Explícame este ejercicio' : 'Dame un ejemplo parecido',
    created_at: new Date().toISOString()
  })

  try {
    const res = await aiService.getHelp({
      exercise_id: ex.id,
      question: ex.question,
      help_type: type
    })
    aiMessages.value.push({
      id: Date.now() + '-ai',
      conversation_id: conversationId.value,
      sender: 'ai',
      message_type: type,
      content: res.data.response,
      created_at: new Date().toISOString()
    })
  } catch {
    aiMessages.value.push({
      id: Date.now() + '-ai',
      conversation_id: conversationId.value,
      sender: 'ai',
      message_type: type,
      content: 'No pude generar una respuesta ahora. Intenta de nuevo.',
      created_at: new Date().toISOString()
    })
  } finally {
    aiLoading.value = false
    await nextTick()
    scrollAI()
  }
}

async function requestGlobalHint() {
  await askAI('hint')
}

async function sendAIMessage() {
  if (!aiDraft.value.trim()) return
  const text = aiDraft.value.trim()
  aiDraft.value = ''
  aiLoading.value = true

  aiMessages.value.push({
    id: Date.now() + '-user',
    conversation_id: conversationId.value,
    sender: 'student',
    message_type: 'question',
    content: text,
    created_at: new Date().toISOString()
  })

  try {
    const res = await aiService.getHelp({
      exercise_id: exercises.value[activeIdx.value]?.exercise?.id ?? '',
      question: text,
      help_type: 'hint'
    })
    aiMessages.value.push({
      id: Date.now() + '-ai',
      conversation_id: conversationId.value,
      sender: 'ai',
      message_type: 'response',
      content: res.data.response,
      created_at: new Date().toISOString()
    })
  } catch {
    aiMessages.value.push({
      id: Date.now() + '-ai',
      conversation_id: conversationId.value,
      sender: 'ai',
      message_type: 'response',
      content: 'No pude procesar tu consulta. Intenta de nuevo.',
      created_at: new Date().toISOString()
    })
  } finally {
    aiLoading.value = false
    await nextTick()
    scrollAI()
  }
}

function scrollAI() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

// ── Submit ──────────────────────────────────────────────────────────
async function confirmSubmit() {
  submitting.value = true
  try {
    const attempts = exercises.value.map((item, idx) => ({
      exercise_id: item.exercise.id,
      answer_text: answers.value[item.exercise.id]?.text ?? '',
      canvas_data: canvasData.value[idx] ?? '',
      time_spent_seconds: 0,
      hints_used: 0
    }))

    const res = await practiceSheetService.submit(sheetId, { attempts })
    result.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    submitting.value = false
  }
}

// ── Utils ───────────────────────────────────────────────────────────
function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}
</script>

<style scoped>
/* ── Shell ─────────────────────────────────────────────────────── */
.book-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f0f0f8;
}

/* ── Header ─────────────────────────────────────────────────────── */
.book-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  height: 60px;
  background: white;
  border-bottom: 1px solid #e8eaf0;
  flex-shrink: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.header-topic { min-width: 0; }
.header-topic-name {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-topic-level {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.header-center {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-progress-track {
  flex: 1;
  height: 6px;
  border-radius: var(--radius-pill);
  background: #e8eaf0;
  overflow: hidden;
}
.header-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--practiq-violet), var(--practiq-violet-light));
  border-radius: inherit;
  transition: width 0.4s ease;
}
.header-progress-label {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.streak-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  background: rgba(251, 146, 60, 0.1);
  border: 1px solid rgba(251, 146, 60, 0.2);
}
.streak-value {
  font-size: var(--text-lg);
  font-weight: 800;
  color: #ea580c;
}
.streak-label {
  font-size: var(--text-sm);
  color: #ea580c;
}
.user-chip {
  width: 36px; height: 36px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: white;
  display: grid; place-items: center;
  font-weight: 800; font-size: var(--text-md);
}

/* ── Body ───────────────────────────────────────────────────────── */
.book-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 0;
}

/* ── Worksheet ──────────────────────────────────────────────────── */
.worksheet {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ws-loading {
  display: flex;
  justify-content: center;
  padding: 80px;
}

/* Sheet card (header card) */
.sheet-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  margin-bottom: 24px;
  background: white;
  border-radius: var(--radius-xl);
  border: 1px solid #e8eaf0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.sheet-card__icon {
  width: 44px; height: 44px;
  border-radius: var(--radius-lg);
  background: rgba(124, 58, 237, 0.1);
  color: var(--practiq-violet);
  display: grid; place-items: center;
  font-size: 18px;
  flex-shrink: 0;
}
.sheet-card__info { flex: 1; }
.sheet-card__title { font-weight: 700; font-size: var(--text-lg); color: var(--text-primary); }
.sheet-card__subtitle { font-size: var(--text-base); color: var(--text-secondary); margin-top: 2px; }
.sheet-card__actions { display: flex; align-items: center; gap: 8px; }

.hint-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  border: 1.5px solid #e8eaf0;
  background: white;
  color: var(--practiq-violet);
  font-size: var(--text-base); font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.hint-btn:hover { border-color: var(--practiq-violet); background: var(--practiq-violet-bg); }

/* Exercise rows */
.exercise-list {
  background: white;
  border-radius: var(--radius-2xl);
  border: 1px solid #e8eaf0;
  box-shadow: 0 4px 24px rgba(0,0,0,0.05);
  overflow: hidden;
}

.ex-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 28px;
  border-bottom: 1px solid #f0f0f8;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 80px;
}
.ex-row:last-child { border-bottom: none; }
.ex-row:hover { background: #fafaff; }
.ex-row--active { background: rgba(124, 58, 237, 0.04) !important; }
.ex-row--correct { background: rgba(16, 185, 129, 0.04) !important; }
.ex-row--incorrect { background: rgba(239, 68, 68, 0.04) !important; }

/* Number badge */
.ex-num {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: grid; place-items: center;
  font-size: var(--text-md); font-weight: 700;
  background: rgba(124, 58, 237, 0.1);
  color: var(--practiq-violet-dark);
  flex-shrink: 0;
}
.ex-row--correct .ex-num { background: rgba(16, 185, 129, 0.15); color: var(--color-success-dark); }
.ex-row--incorrect .ex-num { background: rgba(239, 68, 68, 0.12); color: var(--color-error-dark); }
.ex-check { color: var(--color-success-dark); font-size: 16px; }
.ex-cross { color: var(--color-error-dark); font-size: 16px; }

/* Question */
.ex-question {
  flex: 1;
  min-width: 0;
}
.ex-question-text {
  font-size: var(--font-stat-value);
  font-weight: 500;
  color: var(--text-primary);
  font-family: 'Georgia', serif;
}

.ex-eq {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
}

/* Answer area */
.ex-answer-area {
  width: 260px;
  flex-shrink: 0;
}

.ex-input {
  width: 100%;
  min-height: 52px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 2px dashed #d1d5db;
  background: #fafafa;
  font-size: 18px;
  font-weight: 600;
  color: var(--practiq-violet);
  font-family: 'Georgia', serif;
  outline: none;
  transition: all 0.2s;
  text-align: center;
}
.ex-input:focus {
  border-style: solid;
  border-color: var(--practiq-violet);
  background: white;
  box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
}
.ex-row--active .ex-input {
  border-style: solid;
  border-color: var(--practiq-violet);
  background: white;
}
.ex-row--correct .ex-input {
  border-color: var(--color-success);
  border-style: solid;
  color: var(--color-success-dark);
}
.ex-row--incorrect .ex-input {
  border-color: var(--color-error);
  border-style: solid;
  color: var(--color-error-dark);
}

.ex-canvas {
  width: 100%;
  height: 80px;
  border-radius: var(--radius-md);
  border: 2px dashed #d1d5db;
  background: #fafafa;
  cursor: crosshair;
  display: block;
  touch-action: none;
}
.ex-row--active .ex-canvas {
  border-style: solid;
  border-color: var(--practiq-violet);
  background: white;
}
.ex-answer-area--filled .ex-canvas,
.ex-answer-area--filled .ex-input {
  border-color: var(--practiq-violet-light);
  border-style: solid;
}

/* ── AI panel ───────────────────────────────────────────────────── */
.ai-panel {
  width: 0;
  overflow: hidden;
  transition: width 0.28s ease;
  background: white;
  border-left: 1px solid #e8eaf0;
  flex-shrink: 0;
}
.ai-panel--open {
  width: 320px;
}
.ai-panel-inner {
  width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
}

.ai-robot {
  font-size: 52px;
  text-align: center;
  filter: drop-shadow(0 4px 12px rgba(124,58,237,0.2));
}

.ai-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-msg { display: flex; flex-direction: column; gap: 2px; }
.ai-msg--ai { align-items: flex-start; }
.ai-msg--user { align-items: flex-end; }
.ai-msg__bubble {
  max-width: 88%;
  padding: 10px 14px;
  border-radius: var(--radius-xl);
  font-size: var(--text-base);
  line-height: 1.55;
}
.ai-msg--ai .ai-msg__bubble { background: #f3f4f6; color: var(--text-primary); border-radius: 4px 16px 16px 16px; }
.ai-msg--user .ai-msg__bubble { background: var(--practiq-violet); color: white; border-radius: var(--radius-xl) 16px 4px 16px; }
.ai-msg__time { font-size: var(--text-xs); color: var(--text-muted); padding: 0 4px; }

.ai-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
}
.ai-typing span {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #9ca3af;
  animation: bounce 1.2s infinite;
}
.ai-typing span:nth-child(2) { animation-delay: 0.2s; }
.ai-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

.ai-quick-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ai-quick-btn {
  flex: 1;
  min-width: 0;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid #e8eaf0;
  background: white;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.ai-quick-btn:hover:not(:disabled) { border-color: var(--practiq-violet); color: var(--practiq-violet); background: var(--practiq-violet-bg); }
.ai-quick-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ai-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ai-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1.5px solid #e8eaf0;
  font-size: var(--text-base);
  outline: none;
  transition: border-color 0.2s;
}
.ai-input:focus { border-color: var(--practiq-violet); }
.ai-send-btn {
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--practiq-violet);
  color: white;
  display: grid; place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
}
.ai-send-btn:hover:not(:disabled) { background: var(--practiq-violet-dark); }
.ai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Bottom toolbar ─────────────────────────────────────────────── */
.book-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  height: 60px;
  background: white;
  border-top: 1px solid #e8eaf0;
  flex-shrink: 0;
}

.toolbar-summary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid #e8eaf0;
  background: white;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.toolbar-summary-btn:hover { border-color: var(--practiq-violet); color: var(--practiq-violet); }

.toolbar-draw-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
}

.draw-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all 0.15s;
}
.draw-tool .pi { font-size: 16px; }
.draw-tool:hover { background: #f3f4f6; color: var(--text-primary); }
.draw-tool.active { background: rgba(124,58,237,0.1); color: var(--practiq-violet); }
.draw-tool--danger:hover { background: rgba(239,68,68,0.08); color: var(--color-error-dark); }
.draw-tool:disabled { opacity: 0.4; cursor: not-allowed; }

.submit-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: var(--radius-lg);
  border: none;
  background: var(--practiq-violet);
  color: white;
  font-size: var(--text-md);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(124,58,237,0.25);
}
.submit-btn:hover:not(:disabled) { background: var(--practiq-violet-dark); transform: translateY(-1px); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Nav bar ─────────────────────────────────────────────────────── */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 8px 20px 10px;
  background: white;
  border-top: 1px solid #f0f0f8;
  flex-shrink: 0;
}

.nav-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1.5px solid #e8eaf0;
  background: white;
  color: var(--text-secondary);
  display: grid; place-items: center;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 18px;
}
.nav-btn:hover:not(:disabled) { border-color: var(--practiq-violet); color: var(--practiq-violet); }
.nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.nav-label { font-size: var(--text-md); font-weight: 600; color: var(--text-secondary); min-width: 50px; text-align: center; }

/* ── Shared button ───────────────────────────────────────────────── */
.icon-btn {
  width: 36px; height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid #e8eaf0;
  background: white;
  color: var(--text-secondary);
  display: grid; place-items: center;
  cursor: pointer;
  transition: all 0.15s;
  font-size: var(--text-lg);
  flex-shrink: 0;
}
.icon-btn:hover { border-color: var(--practiq-violet); color: var(--practiq-violet); }
.icon-btn--sm { width: 32px; height: 32px; }

/* ── Summary modal ───────────────────────────────────────────────── */
.summary-box {
  background: white;
  border-radius: var(--radius-2xl);
  padding: 28px;
  width: 100%;
  max-width: 380px;
}
.summary-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--text-primary);
}
.summary-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.summary-dot {
  width: 42px; height: 42px;
  border-radius: var(--radius-md);
  display: grid; place-items: center;
  font-size: var(--text-md); font-weight: 700;
  background: #f3f4f6;
  color: var(--text-secondary);
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
}
.summary-dot:hover { border-color: var(--practiq-violet); }
.summary-dot--active { border-color: var(--practiq-violet); color: var(--practiq-violet); background: var(--practiq-violet-bg); }
.summary-dot--answered { background: rgba(124,58,237,0.1); color: var(--practiq-violet-dark); }

/* ── Results modal ───────────────────────────────────────────────── */
.result-box {
  background: white;
  border-radius: 28px;
  padding: 40px 36px;
  width: 100%;
  max-width: 420px;
  text-align: center;
}
.result-icon { font-size: 56px; margin-bottom: 12px; }
.result-score { font-size: 52px; font-weight: 900; color: var(--practiq-violet); line-height: 1; margin-bottom: 6px; }
.result-label { font-size: 16px; color: var(--text-secondary); margin-bottom: 24px; }
.result-mastery { background: var(--surface-hover); border-radius: var(--radius-xl); padding: 16px; margin-bottom: 16px; }
.result-mastery-label { font-size: var(--text-base); font-weight: 600; color: var(--text-secondary); }
.result-mastery-value { font-size: 22px; font-weight: 800; color: var(--text-primary); }
.result-levelup { background: rgba(250,204,21,0.12); border: 1px solid rgba(250,204,21,0.3); border-radius: var(--radius-md); padding: 12px; font-weight: 700; color: var(--color-warning-dark); margin-bottom: 12px; }
.result-rec { font-size: var(--text-md); color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; }
.result-actions { display: flex; gap: 12px; }
.result-actions .btn { flex: 1; justify-content: center; }

/* ── Spinner small ───────────────────────────────────────────────── */
.spinner-sm {
  width: 16px; height: 16px;
  border-width: 2px;
}

/* ── Responsive ──────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .worksheet { padding: 16px; }
  .ex-row { padding: 16px; gap: 10px; }
  .ex-question-text { font-size: 16px; }
  .ex-answer-area { width: 160px; }
  .ex-input { font-size: var(--text-lg); }
  .ai-panel--open { width: 100%; position: absolute; top: 60px; right: 0; bottom: 120px; z-index: 20; }
  .toolbar-draw-tools { gap: 0; }
  .draw-tool span { display: none; }
  .draw-tool { padding: 6px 8px; }
}
</style>
