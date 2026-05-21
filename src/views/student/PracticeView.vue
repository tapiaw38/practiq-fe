<template>
  <div class="practice-root">
    <div v-if="loading" class="practice-loading">
      <div class="spinner spinner-violet"></div>
      <p>Cargando hoja de práctica...</p>
    </div>

    <template v-else-if="sheet">
      <header class="practice-header">
        <div class="practice-header__left">
          <button class="practice-icon-btn" @click="router.back()">
            <i class="pi pi-arrow-left"></i>
          </button>
          <div class="header-info">
            <div class="practice-topic">{{ sheet.title }}</div>
            <div class="practice-level">Ejercicio {{ currentIdx + 1 }} de {{ totalCount }}</div>
          </div>
        </div>

        <div class="header-center">
          <div class="practice-stage">Nivel {{ sheet.level }}</div>
          <div class="header-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="header-metrics">
          <div class="header-chip">
            <span class="header-chip__icon">🔥</span>
            <div>
              <div class="header-chip__value">{{ streakCount }}</div>
              <div class="header-chip__label">racha</div>
            </div>
          </div>
          <div class="header-avatar">{{ studentInitial }}</div>
        </div>
      </header>

      <div class="practice-body">
        <main class="practice-area">
          <div class="worksheet-shell">
            <section class="worksheet-card">
              <div class="worksheet-header">
                <div class="worksheet-badge">
                  <span class="worksheet-badge__icon">✏️</span>
                  <div>
                    <div class="worksheet-badge__title">Ejercicio de práctica</div>
                    <div class="worksheet-badge__subtitle">Resuelve las siguientes operaciones.</div>
                  </div>
                </div>
                <div class="worksheet-actions">
                  <button class="sheet-action-btn" @click="requestHint">
                    <i class="pi pi-lightbulb"></i>
                    Pista
                  </button>
                </div>
              </div>

              <div class="exercise-stack">
                <article
                  v-for="(pse, idx) in sheet.exercises"
                  :key="pse.id"
                  class="exercise-row"
                  :class="{ 'exercise-row--active': currentIdx === idx }"
                  @click="currentIdx = idx"
                >
                  <div class="exercise-index" :class="{ 'exercise-index--done': isAnswered(pse.exercise.id) }">
                    {{ idx + 1 }}
                  </div>
                  <div class="exercise-content">
                    <div class="exercise-mainline">
                      <span class="exercise-equation">{{ pse.exercise.question }}</span>
                      <span
                        v-if="results[pse.exercise.id] === true"
                        class="exercise-status exercise-status--ok"
                      >✓</span>
                    </div>

                    <template v-if="currentIdx !== idx">
                      <div class="answer-preview" :class="{ 'answer-preview--filled': isAnswered(pse.exercise.id) }">
                        {{
                          isAnswered(pse.exercise.id)
                            ? (pse.exercise.type === 'canvas' || pse.exercise.type === 'handwritten'
                              ? '✓'
                              : answers[pse.exercise.id].answer)
                            : '?'
                        }}
                      </div>
                    </template>

                    <template v-if="currentIdx === idx">
                      <div class="active-answer-shell">
                        <template v-if="pse.exercise.type !== 'canvas' && pse.exercise.type !== 'handwritten'">
                          <input
                            v-model="currentAnswer"
                            class="equation-input"
                            placeholder="?"
                            @input="saveAnswer"
                          />
                        </template>

                        <template v-else>
                          <div class="canvas-container">
                            <canvas
                              ref="canvasRef"
                              class="practice-canvas"
                              @mousedown="startDrawing"
                              @mousemove="draw"
                              @mouseup="stopDrawing"
                              @mouseleave="stopDrawing"
                              @touchstart.prevent="startDrawingTouch"
                              @touchmove.prevent="drawTouch"
                              @touchend="stopDrawing"
                            ></canvas>
                            <div class="canvas-tools">
                              <button class="tool-btn" :class="{ 'tool-active': tool === 'pen' }" @click="tool = 'pen'" title="Lápiz">✏️</button>
                              <button class="tool-btn" :class="{ 'tool-active': tool === 'eraser' }" @click="tool = 'eraser'" title="Borrador">⌫</button>
                              <button class="tool-btn" @click="undoStroke" title="Deshacer">↩</button>
                              <button class="tool-btn" @click="clearCanvas" title="Limpiar">🗑️</button>
                              <input type="color" v-model="penColor" class="color-picker" title="Color" />
                              <input type="range" v-model.number="penSize" min="1" max="20" class="size-slider" title="Tamaño" />
                            </div>
                          </div>
                        </template>

                        <div class="answer-meta">
                          <span class="time-display">⏱ {{ formatTime(timers[pse.exercise.id] || 0) }}</span>
                          <span v-if="hints[pse.exercise.id]" class="hint-count">
                            💡 {{ hints[pse.exercise.id] }} pista{{ hints[pse.exercise.id] > 1 ? 's' : '' }}
                          </span>
                          <span class="difficulty-pill" :style="{ '--difficulty-color': diffColor(pse.exercise.difficulty) }">
                            Dificultad {{ pse.exercise.difficulty }}
                          </span>
                        </div>
                      </div>
                    </template>
                  </div>
                </article>
              </div>

              <div class="worksheet-footer">
                <div class="tool-dock">
                  <button class="dock-btn" :class="{ 'dock-btn--active': tool === 'pen' }" @click="tool = 'pen'">
                    <i class="pi pi-pencil"></i>
                    <span>Lápiz</span>
                  </button>
                  <button class="dock-btn" :class="{ 'dock-btn--active': tool === 'eraser' }" @click="tool = 'eraser'">
                    <i class="pi pi-eraser"></i>
                    <span>Borrador</span>
                  </button>
                  <button class="dock-btn" @click="undoStroke">
                    <i class="pi pi-undo"></i>
                    <span>Deshacer</span>
                  </button>
                  <button class="dock-btn" @click="clearCanvas">
                    <i class="pi pi-trash"></i>
                    <span>Limpiar</span>
                  </button>
                </div>

                <button class="btn btn-primary submit-sheet-btn" @click="showSubmitConfirm = true">
                  Revisar respuestas
                </button>
              </div>
            </section>
          </div>
        </main>

        <aside class="ai-panel" :class="{ 'ai-panel--collapsed': !showAI }">
          <div class="ai-panel-header">
            <div class="ai-header-info">
              <span class="ai-avatar">🤖</span>
              <div v-if="showAI">
                <div class="ai-name">Asistente Practiq</div>
                <div class="ai-status">● En línea</div>
              </div>
            </div>
            <button class="practice-icon-btn practice-icon-btn--small" @click="toggleAI">
              <i :class="showAI ? 'pi pi-angle-right' : 'pi pi-angle-left'"></i>
            </button>
          </div>

          <template v-if="showAI">
            <div class="ai-mascot">🤖</div>

            <div class="ai-messages" ref="messagesContainer">
              <div class="ai-bubble ai-msg">
                <p>¡Hola! Estoy aquí para ayudarte con pasos, pistas y ejemplos parecidos.</p>
              </div>

              <div v-for="msg in aiMessages" :key="msg.id" class="ai-bubble-wrapper" :class="msg.sender === 'student' ? 'user-side' : 'ai-side'">
                <div class="ai-bubble" :class="msg.sender === 'student' ? 'user-msg' : 'ai-msg'">
                  <p>{{ msg.content }}</p>
                  <span class="msg-time">{{ formatMsgTime(msg.created_at) }}</span>
                </div>
              </div>

              <div v-if="aiLoading" class="ai-bubble ai-msg ai-typing">
                <span></span><span></span><span></span>
              </div>
            </div>

            <div class="ai-input-area">
              <div class="ai-quick-actions">
                <button class="quick-btn" @click="sendQuick('hint')">💡 Pista</button>
                <button class="quick-btn" @click="sendQuick('explanation')">📖 Explicar</button>
                <button class="quick-btn" @click="sendQuick('similar_example')">🔍 Ejemplo</button>
              </div>
              <div class="ai-input-row">
                <input
                  v-model="aiInput"
                  class="form-input ai-input"
                  placeholder="Escribe tu consulta..."
                  @keydown.enter.prevent="sendAIMessage"
                />
                <button class="send-btn" @click="sendAIMessage" :disabled="!aiInput.trim() || aiLoading">
                  <i class="pi pi-send"></i>
                </button>
              </div>
            </div>
          </template>
        </aside>
      </div>

      <button
        class="ai-fab"
        :class="{ 'ai-fab--notify': aiHasMessage }"
        type="button"
        @click="toggleAI"
      >
        <span>🤖</span>
      </button>

      <Teleport to="body">
        <Transition name="fade">
          <div v-if="showSubmitConfirm" class="modal-overlay" @click.self="showSubmitConfirm = false">
            <div class="modal-box">
              <h3 class="modal-title">Revisar y enviar</h3>
              <p class="submit-copy">
                Respondiste <strong>{{ answeredCount }}</strong> de <strong>{{ totalCount }}</strong> ejercicios.
                ¿Deseas enviar tus respuestas?
              </p>
              <div class="modal-actions">
                <button class="btn btn-secondary" @click="showSubmitConfirm = false">Cancelar</button>
                <button class="btn btn-primary" :disabled="submitting" @click="submitAnswers">
                  <span v-if="submitting" class="spinner"></span>
                  Enviar respuestas
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { practiceSheetService } from '@/services/practiceSheets/practiceSheetService'
import { aiService } from '@/services/ai/aiService'
import type { PracticeSheet, AIMessage, SubmitResult } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const sheetId = route.params.id as string

const sheet = ref<PracticeSheet | null>(null)
const loading = ref(true)
const currentIdx = ref(0)

const answers = ref<Record<string, { answer: string; timeStart: number; hints: number }>>({})
const results = ref<Record<string, boolean>>({})
const timers = ref<Record<string, number>>({})
const hints = ref<Record<string, number>>({})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const tool = ref<'pen' | 'eraser'>('pen')
const penColor = ref('#1e293b')
const penSize = ref(3)
const isDrawing = ref(false)
const strokes = ref<ImageData[]>([])
let lastX = 0
let lastY = 0

const showAI = ref(false)
const aiMessages = ref<AIMessage[]>([])
const aiInput = ref('')
const aiLoading = ref(false)
const aiHasMessage = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
let conversationId = ''

const showSubmitConfirm = ref(false)
const showResults = ref(false)
const submitting = ref(false)
const result = ref<SubmitResult | null>(null)

let timerInterval: ReturnType<typeof setInterval>

function syncAIVisibility() {
  showAI.value = window.innerWidth > 1180
}

const currentExercise = computed(() =>
  sheet.value?.exercises?.[currentIdx.value]?.exercise ?? null
)

const currentAnswer = computed({
  get: () => answers.value[currentExercise.value?.id || '']?.answer ?? '',
  set: (val) => {
    if (currentExercise.value) {
      const id = currentExercise.value.id
      if (!answers.value[id]) answers.value[id] = { answer: '', timeStart: Date.now(), hints: 0 }
      answers.value[id].answer = val
    }
  }
})

const answeredCount = computed(() =>
  Object.values(answers.value).filter((a) => a.answer).length
)

const totalCount = computed(() => sheet.value?.exercises?.length ?? 0)

const progressPct = computed(() =>
  totalCount.value ? Math.round((answeredCount.value / totalCount.value) * 100) : 0
)

const streakCount = computed(() => Math.max(4, Math.ceil(progressPct.value / 8)))
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
      timers.value[pse.exercise.id] = 0
    }

    startTimer()
    syncAIVisibility()
    window.addEventListener('resize', syncAIVisibility)

    try {
      const convRes = await aiService.createConversation({ practice_sheet_id: sheetId })
      conversationId = convRes.data.id
    } catch {}
  } finally {
    loading.value = false
  }

  await nextTick()
  initCanvas()
})

onUnmounted(() => {
  clearInterval(timerInterval)
  window.removeEventListener('resize', syncAIVisibility)
})

watch(currentIdx, async () => {
  await nextTick()
  if (currentExercise.value?.type === 'canvas' || currentExercise.value?.type === 'handwritten') {
    initCanvas()
  }
})

function startTimer() {
  timerInterval = setInterval(() => {
    if (currentExercise.value) {
      timers.value[currentExercise.value.id] = (timers.value[currentExercise.value.id] ?? 0) + 1
    }
  }, 1000)
}

function saveAnswer() {}

function isAnswered(exerciseId: string) {
  return !!answers.value[exerciseId]?.answer
}

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = canvas.offsetWidth || 600
  canvas.height = canvas.offsetHeight || 300
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  strokes.value = []
}

function getPos(e: MouseEvent | Touch, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function startDrawing(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  isDrawing.value = true
  const pos = getPos(e, canvas)
  lastX = pos.x
  lastY = pos.y
  saveStroke()
}

function draw(e: MouseEvent) {
  if (!isDrawing.value) return
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const pos = getPos(e, canvas)

  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(pos.x, pos.y)
  ctx.strokeStyle = tool.value === 'eraser' ? 'white' : penColor.value
  ctx.lineWidth = tool.value === 'eraser' ? 20 : penSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()

  lastX = pos.x
  lastY = pos.y
}

function startDrawingTouch(e: TouchEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  isDrawing.value = true
  const pos = getPos(e.touches[0], canvas)
  lastX = pos.x
  lastY = pos.y
  saveStroke()
}

function drawTouch(e: TouchEvent) {
  if (!isDrawing.value) return
  const fakeEvent = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as MouseEvent
  draw(fakeEvent)
}

function stopDrawing() {
  isDrawing.value = false
  if (currentExercise.value) {
    const canvas = canvasRef.value
    if (canvas) {
      const id = currentExercise.value.id
      if (!answers.value[id]) answers.value[id] = { answer: '', timeStart: Date.now(), hints: 0 }
      answers.value[id].answer = canvas.toDataURL()
    }
  }
}

function saveStroke() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  strokes.value.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
}

function undoStroke() {
  const canvas = canvasRef.value
  if (!canvas || strokes.value.length === 0) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  strokes.value.pop()
  if (strokes.value.length > 0) {
    ctx.putImageData(strokes.value[strokes.value.length - 1], 0, 0)
  } else {
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
}

function clearCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  strokes.value = []
  if (currentExercise.value) {
    answers.value[currentExercise.value.id].answer = ''
  }
}

function toggleAI() {
  showAI.value = !showAI.value
  aiHasMessage.value = false
  if (showAI.value) nextTick(() => scrollMessages())
}

async function requestHint() {
  if (!currentExercise.value) return
  const id = currentExercise.value.id
  if (!hints.value[id]) hints.value[id] = 0
  hints.value[id]++
  if (answers.value[id]) answers.value[id].hints = hints.value[id]

  showAI.value = true
  aiLoading.value = true

  const question = `Necesito una pista para: ${currentExercise.value.question}`
  addUserMessage(question)

  try {
    const res = await aiService.getHelp({
      exercise_id: id,
      question,
      help_type: 'hint'
    })
    addAIMessage(res.data.response)
  } catch {
    addAIMessage('Lo siento, no pude obtener una pista en este momento. ¡Inténtalo de nuevo!')
  } finally {
    aiLoading.value = false
  }
}

async function sendAIMessage() {
  if (!aiInput.value.trim() || aiLoading.value) return
  const question = aiInput.value.trim()
  aiInput.value = ''
  aiLoading.value = true
  addUserMessage(question)

  try {
    const res = await aiService.getHelp({
      exercise_id: currentExercise.value?.id,
      question,
      help_type: 'explanation'
    })
    addAIMessage(res.data.response)
  } catch {
    addAIMessage('Hubo un error. Por favor inténtalo nuevamente.')
  } finally {
    aiLoading.value = false
  }
}

async function sendQuick(type: 'hint' | 'explanation' | 'similar_example') {
  aiLoading.value = true
  const questions: Record<string, string> = {
    hint: '¿Puedes darme una pista?',
    explanation: '¿Puedes explicarme este concepto?',
    similar_example: '¿Puedes mostrarme un ejemplo similar?'
  }
  const question = questions[type]
  addUserMessage(question)

  try {
    const res = await aiService.getHelp({
      exercise_id: currentExercise.value?.id,
      question,
      help_type: type
    })
    addAIMessage(res.data.response)
  } catch {
    addAIMessage('No pude responder en este momento.')
  } finally {
    aiLoading.value = false
  }
}

function addUserMessage(content: string) {
  const msg: AIMessage = {
    id: Date.now().toString(),
    conversation_id: conversationId,
    sender: 'student',
    message_type: 'text',
    content,
    created_at: new Date().toISOString()
  }
  aiMessages.value.push(msg)
  nextTick(scrollMessages)
}

function addAIMessage(content: string) {
  const msg: AIMessage = {
    id: (Date.now() + 1).toString(),
    conversation_id: conversationId,
    sender: 'ai',
    message_type: 'text',
    content,
    created_at: new Date().toISOString()
  }
  aiMessages.value.push(msg)
  if (!showAI.value) aiHasMessage.value = true
  nextTick(scrollMessages)
}

function scrollMessages() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function submitAnswers() {
  submitting.value = true
  try {
    const attempts = Object.entries(answers.value).map(([exerciseId, data]) => ({
      exercise_id: exerciseId,
      answer_text: data.answer,
      time_spent_seconds: timers.value[exerciseId] || 0,
      hints_used: data.hints || 0
    }))

    const res = await practiceSheetService.submit(sheetId, { attempts })
    result.value = res.data
    showSubmitConfirm.value = false
    showResults.value = true

    for (const pse of sheet.value?.exercises ?? []) {
      const ans = answers.value[pse.exercise.id]
      if (ans && pse.exercise.correct_answer) {
        results.value[pse.exercise.id] = ans.answer.trim().toLowerCase() === pse.exercise.correct_answer.trim().toLowerCase()
      }
    }
  } catch (err) {
    console.error(err)
  } finally {
    submitting.value = false
  }
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatMsgTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function diffColor(d: number) {
  if (d <= 3) return '#10b981'
  if (d <= 6) return '#f59e0b'
  return '#ef4444'
}

function scoreColor(score: number) {
  if (score >= 90) return '#10b981'
  if (score >= 70) return '#f59e0b'
  return '#ef4444'
}
</script>

<style scoped>
.practice-root {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(124, 58, 237, 0.12), transparent 18%),
    radial-gradient(circle at bottom right, rgba(96, 165, 250, 0.12), transparent 22%),
    linear-gradient(180deg, #f8fbff 0%, #f7f8ff 45%, #f6f8fc 100%);
  display: flex;
  flex-direction: column;
}

.practice-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}

.practice-header {
  padding: 18px 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.practice-header__left,
.header-center,
.header-metrics {
  display: flex;
  align-items: center;
  gap: 16px;
}

.practice-icon-btn {
  width: 58px;
  height: 58px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 22px;
  box-shadow: 0 12px 28px rgba(93, 108, 146, 0.12);
  display: grid;
  place-items: center;
  color: #111827;
  cursor: pointer;
}

.practice-icon-btn--small {
  width: 42px;
  height: 42px;
  border-radius: 16px;
}

.practice-topic {
  font-size: 28px;
  font-weight: 700;
  color: #19233a;
}

.practice-level {
  font-size: 15px;
  color: var(--text-secondary);
}

.practice-stage {
  font-size: 16px;
  font-weight: 700;
  color: #223055;
}

.header-progress {
  min-width: 340px;
}

.header-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 12px 28px rgba(93, 108, 146, 0.12);
}

.header-chip__icon {
  font-size: 26px;
}

.header-chip__value {
  font-size: 22px;
  line-height: 1;
  font-weight: 800;
  color: #101828;
}

.header-chip__label {
  font-size: 13px;
  color: var(--text-secondary);
}

.header-avatar {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  display: grid;
  place-items: center;
  color: white;
  font-weight: 800;
  font-size: 22px;
  box-shadow: 0 14px 28px rgba(99, 102, 241, 0.2);
}

.practice-body {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
  padding: 0 26px 26px;
}

.practice-area {
  min-width: 0;
}

.worksheet-shell {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 38px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 24px 52px rgba(93, 108, 146, 0.14);
  padding: 14px;
}

.worksheet-card {
  background: rgba(255, 255, 255, 0.84);
  border-radius: 30px;
  padding: 22px 22px 18px;
  min-height: calc(100vh - 180px);
  display: flex;
  flex-direction: column;
}

.worksheet-header,
.worksheet-actions,
.exercise-mainline,
.worksheet-footer,
.tool-dock {
  display: flex;
  align-items: center;
}

.worksheet-header,
.worksheet-footer {
  justify-content: space-between;
  gap: 16px;
}

.worksheet-badge {
  display: flex;
  align-items: center;
  gap: 14px;
}

.worksheet-badge__icon {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  display: grid;
  place-items: center;
  font-size: 24px;
}

.worksheet-badge__title {
  font-size: 15px;
  font-weight: 700;
}

.worksheet-badge__subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.worksheet-actions {
  gap: 10px;
}

.sheet-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid rgba(124, 58, 237, 0.18);
  background: white;
  color: var(--practiq-violet-dark);
  border-radius: 16px;
  cursor: pointer;
  font-weight: 600;
}

.exercise-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px 0;
  flex: 1;
}

.exercise-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  padding: 10px 6px;
  border-radius: 20px;
  transition: var(--transition);
}

.exercise-row--active {
  background: linear-gradient(180deg, rgba(245, 243, 255, 0.7), rgba(255,255,255,0.85));
}

.exercise-index {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(124, 58, 237, 0.1);
  color: var(--practiq-violet-dark);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 18px;
  margin-top: 8px;
}

.exercise-index--done {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(16, 185, 129, 0.18));
}

.exercise-content {
  min-width: 0;
}

.exercise-mainline {
  gap: 16px;
  flex-wrap: wrap;
}

.exercise-equation {
  font-size: clamp(1.6rem, 2.4vw, 2.9rem);
  font-weight: 600;
  color: #1b2140;
  line-height: 1.35;
}

.exercise-status {
  font-size: 36px;
  font-weight: 800;
}

.exercise-status--ok {
  color: #22c55e;
}

.answer-preview {
  margin-top: 16px;
  width: 118px;
  min-height: 92px;
  border: 2px dashed rgba(139, 92, 246, 0.22);
  border-radius: 22px;
  display: grid;
  place-items: center;
  font-size: 42px;
  color: rgba(99, 102, 241, 0.45);
  background: rgba(255, 255, 255, 0.72);
}

.answer-preview--filled {
  color: var(--practiq-violet-dark);
  border-style: solid;
  border-color: rgba(124, 58, 237, 0.18);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 18px rgba(124, 58, 237, 0.08);
}

.active-answer-shell {
  margin-top: 16px;
}

.equation-input {
  width: 118px;
  height: 92px;
  border: 2px dashed rgba(139, 92, 246, 0.32);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
  font-size: 44px;
  text-align: center;
  color: var(--practiq-violet-dark);
  outline: none;
  transition: var(--transition);
}

.equation-input:focus {
  border-color: rgba(124, 58, 237, 0.6);
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
}

.canvas-container {
  border: 2px solid var(--surface-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: white;
}

.practice-canvas {
  width: 100%;
  height: 280px;
  display: block;
  cursor: crosshair;
  touch-action: none;
}

.canvas-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--surface-bg);
  border-top: 1px solid var(--surface-border);
}

.tool-btn {
  width: 36px;
  height: 36px;
  border: 1.5px solid var(--surface-border);
  border-radius: var(--radius-sm);
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.tool-active {
  border-color: var(--practiq-violet);
  background: var(--practiq-violet-pale);
}

.color-picker {
  width: 36px;
  height: 36px;
  border: none;
  padding: 2px;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.size-slider {
  flex: 1;
  max-width: 100px;
}

.answer-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 14px;
}

.time-display {
  font-variant-numeric: tabular-nums;
}

.hint-count {
  color: var(--color-warning);
}

.difficulty-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--difficulty-color) 12%, white);
  color: var(--difficulty-color);
  font-weight: 700;
}

.worksheet-footer {
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  flex-wrap: wrap;
}

.tool-dock {
  gap: 10px;
  padding: 10px 14px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 12px 28px rgba(93, 108, 146, 0.08);
  flex-wrap: wrap;
}

.dock-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 14px;
  cursor: pointer;
  font-weight: 600;
}

.dock-btn--active {
  background: rgba(124, 58, 237, 0.1);
  color: var(--practiq-violet-dark);
}

.submit-sheet-btn {
  min-width: 240px;
  min-height: 52px;
  border-radius: 18px;
}

.ai-panel {
  min-width: 0;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 34px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 22px 46px rgba(93, 108, 146, 0.14);
  padding: 18px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 140px);
}

.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ai-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(96, 165, 250, 0.12));
  font-size: 22px;
}

.ai-name {
  font-size: 14px;
  font-weight: 700;
}

.ai-status {
  font-size: 11px;
  color: var(--color-success);
}

.ai-mascot {
  width: 140px;
  height: 140px;
  margin: 8px auto 14px;
  border-radius: 36px;
  background: radial-gradient(circle at top, rgba(255,255,255,0.9), rgba(237,233,254,0.8) 45%, rgba(196,181,253,0.56) 100%);
  display: grid;
  place-items: center;
  font-size: 72px;
  box-shadow: 0 18px 30px rgba(124, 58, 237, 0.12);
}

.ai-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}

.ai-bubble-wrapper {
  display: flex;
}

.user-side {
  justify-content: flex-end;
}

.ai-side {
  justify-content: flex-start;
}

.ai-bubble {
  max-width: 90%;
  padding: 14px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.5;
}

.user-msg {
  background: linear-gradient(135deg, var(--practiq-violet), var(--practiq-violet-light));
  color: white;
  border-bottom-right-radius: 8px;
  box-shadow: var(--shadow-violet);
}

.ai-msg {
  background: white;
  color: var(--text-primary);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-bottom-left-radius: 8px;
}

.msg-time {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.75;
  text-align: right;
}

.ai-typing span {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 4px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: blink 1.2s infinite;
}

.ai-typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.ai-typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; }
  40% { opacity: 1; }
}

.ai-input-area {
  margin-top: 14px;
}

.ai-quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.quick-btn {
  padding: 8px 12px;
  border-radius: 100px;
  border: 1px solid rgba(124, 58, 237, 0.12);
  background: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.ai-input-row {
  display: flex;
  gap: 8px;
}

.ai-input {
  flex: 1;
  border-radius: 18px;
  min-height: 48px;
}

.send-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--practiq-violet), var(--practiq-violet-light));
  color: white;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: var(--shadow-violet);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-panel--collapsed {
  width: 92px;
  padding: 16px 12px;
}

.ai-panel--collapsed .ai-panel-header {
  justify-content: center;
}

.ai-panel--collapsed .ai-avatar,
.ai-panel--collapsed .ai-name,
.ai-panel--collapsed .ai-status {
  display: none;
}

.ai-fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: 62px;
  height: 62px;
  border: none;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--practiq-violet), var(--practiq-violet-light));
  color: white;
  box-shadow: 0 18px 32px rgba(99, 102, 241, 0.24);
  display: none;
  place-items: center;
  font-size: 26px;
  cursor: pointer;
  z-index: 15;
}

.ai-fab--notify::after {
  content: '';
  position: absolute;
  top: 10px;
  right: 10px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.18);
}

.submit-copy {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.results-box {
  max-width: 620px;
}

.results-header {
  text-align: center;
  margin-bottom: 18px;
}

.results-emoji {
  font-size: 42px;
  margin-bottom: 8px;
}

.results-title {
  font-size: 24px;
}

.results-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}

.stat-card {
  background: rgba(245, 243, 255, 0.72);
  border-radius: 20px;
  padding: 18px 14px;
  text-align: center;
}

.stat-value {
  font-size: 30px;
  font-weight: 800;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.results-recommendation {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-radius: 20px;
  background: rgba(248, 250, 252, 0.9);
}

.rec-icon {
  font-size: 28px;
}

.level-up-badge {
  margin-top: 16px;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
  font-weight: 700;
  text-align: center;
}

@media (max-width: 1180px) {
  .practice-body {
    grid-template-columns: 1fr;
  }

  .ai-panel {
    min-height: auto;
  }

  .ai-fab {
    display: grid;
  }
}

@media (max-width: 860px) {
  .practice-header {
    padding: 16px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .header-center {
    order: 3;
    width: 100%;
  }

  .header-progress {
    min-width: 0;
    width: 100%;
  }

  .practice-body {
    padding: 0 16px 18px;
  }

  .worksheet-card {
    padding: 18px 16px;
    min-height: auto;
  }

  .worksheet-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .sheet-action-btn {
    width: 100%;
    justify-content: center;
  }

  .exercise-equation {
    font-size: 2rem;
  }

  .equation-input {
    width: 100px;
    height: 82px;
    font-size: 38px;
  }

  .worksheet-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .submit-sheet-btn {
    width: 100%;
    min-width: 0;
  }

  .results-stats {
    grid-template-columns: 1fr;
  }

  .ai-panel {
    border-radius: 26px;
  }
}

@media (max-width: 640px) {
  .practice-header__left,
  .header-metrics {
    width: 100%;
    justify-content: space-between;
  }

  .practice-topic {
    font-size: 22px;
  }

  .practice-stage,
  .practice-level {
    font-size: 14px;
  }

  .worksheet-shell {
    padding: 10px;
    border-radius: 28px;
  }

  .worksheet-card {
    border-radius: 24px;
    padding: 16px 14px;
  }

  .exercise-row {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 12px 0;
  }

  .exercise-index {
    margin-top: 0;
  }

  .exercise-mainline {
    justify-content: space-between;
  }

  .exercise-equation {
    font-size: 1.6rem;
  }

  .answer-preview,
  .equation-input {
    width: 92px;
    min-height: 76px;
    height: 76px;
    font-size: 34px;
  }

  .tool-dock {
    width: 100%;
    justify-content: center;
  }

  .dock-btn {
    flex: 1 1 42%;
    justify-content: center;
  }

  .ai-panel {
    padding: 14px;
  }

  .ai-mascot {
    width: 108px;
    height: 108px;
    font-size: 54px;
  }
}
</style>
