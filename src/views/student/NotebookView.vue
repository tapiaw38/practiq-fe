<template>
  <StudentLayout>
    <div class="notebook-shell">
      <!-- Header -->
      <header class="nb-header">
        <button class="btn-back" @click="router.back()">
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="nb-title-area">
          <h1 class="nb-title">{{ notebook?.title || 'Cuaderno' }}</h1>
          <span class="nb-desc">{{ notebook?.description }}</span>
        </div>
        <div class="nb-page-indicator">
          Página {{ currentPageIndex + 1 }} / {{ pages.length }}
        </div>
      </header>

      <div v-if="loading" class="nb-loading">
        <i class="pi pi-spin pi-spinner"></i> Cargando cuaderno...
      </div>

      <div v-else-if="pages.length === 0" class="nb-empty">
        <div class="empty-icon">📓</div>
        <p>Este cuaderno no tiene páginas aún.</p>
      </div>

      <template v-else>
        <!-- Page tabs -->
        <nav class="page-tabs">
          <button
            v-for="(page, idx) in pages"
            :key="page.id"
            class="page-tab"
            :class="{ 'page-tab--active': idx === currentPageIndex, 'page-tab--done': hasSubmission(page) }"
            @click="goToPage(idx)"
          >
            <span>{{ idx + 1 }}</span>
            <i v-if="hasSubmission(page)" class="pi pi-check tab-check"></i>
          </button>
        </nav>

        <!-- Notebook page -->
        <div class="notebook-page" v-if="currentPage">
          <!-- Teacher content -->
          <section class="page-content">
            <div class="page-header-row">
              <h2 class="page-title">{{ currentPage.title }}</h2>
              <span class="content-type-badge">{{ currentPage.content_type === 'canvas' ? '🖼 Imagen' : '📝 Texto' }}</span>
            </div>

            <!-- Teacher wrote image (canvas) -->
            <div v-if="currentPage.content_type === 'canvas' && currentPage.content_data" class="teacher-image-wrap">
              <img :src="currentPage.content_data" alt="Contenido del docente" class="teacher-image" />
            </div>

            <!-- Teacher wrote text -->
            <div v-else-if="currentPage.content_type === 'text' && currentPage.content_data" class="teacher-text">
              {{ currentPage.content_data }}
            </div>

            <div v-if="currentPage.instructions" class="page-instructions">
              <i class="pi pi-info-circle"></i>
              {{ currentPage.instructions }}
            </div>
          </section>

          <!-- Student answer area — always canvas -->
          <section class="answer-section">
            <div class="answer-header">
              <span class="answer-label">Tu respuesta</span>
              <div class="draw-tools">
                <button class="tool-btn" :class="{ 'tool-btn--active': tool === 'pen' }" @click="tool = 'pen'" title="Lápiz">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="tool-btn" :class="{ 'tool-btn--active': tool === 'eraser' }" @click="tool = 'eraser'" title="Borrador">
                  <i class="pi pi-times-circle"></i>
                </button>
                <button class="tool-btn" @click="undoDraw" title="Deshacer">
                  <i class="pi pi-undo"></i>
                </button>
                <button class="tool-btn" @click="clearCanvas" title="Limpiar">
                  <i class="pi pi-trash"></i>
                </button>
                <input type="color" v-model="penColor" class="color-picker" title="Color" />
                <input type="range" v-model.number="penSize" min="1" max="20" class="size-slider" title="Grosor" />
              </div>
            </div>

            <canvas
              ref="answerCanvas"
              class="answer-canvas"
              :style="{ cursor: canvasCursor }"
              @mousedown="startDraw"
              @mousemove="draw"
              @mouseup="endDraw"
              @mouseleave="endDraw"
              @touchstart.prevent="startDrawTouch"
              @touchmove.prevent="drawTouch"
              @touchend="endDraw"
            ></canvas>
          </section>

          <!-- Save bar -->
          <div class="save-bar">
            <div class="save-status" v-if="saveStatus">
              <i class="pi" :class="saveStatus === 'saved' ? 'pi-check-circle' : 'pi-spin pi-spinner'"></i>
              {{ saveStatus === 'saved' ? 'Guardado' : 'Guardando...' }}
            </div>
            <div class="page-nav">
              <button class="btn-nav" :disabled="currentPageIndex === 0" @click="goToPage(currentPageIndex - 1)">
                <i class="pi pi-chevron-left"></i> Anterior
              </button>
              <button class="btn-save" @click="saveAndNext">
                {{ currentPageIndex < pages.length - 1 ? 'Guardar y seguir →' : 'Guardar y finalizar ✓' }}
              </button>
              <button class="btn-nav" :disabled="currentPageIndex === pages.length - 1" @click="goToPage(currentPageIndex + 1)">
                Siguiente <i class="pi pi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </StudentLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import StudentLayout from '@/layouts/StudentLayout.vue'
import { notebookService } from '@/services/notebooks/notebookService'
import type { Notebook, NotebookPage } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const notebook = ref<Notebook | null>(null)
const loading = ref(true)
const currentPageIndex = ref(0)

// Drawing state
const answerCanvas = ref<HTMLCanvasElement | null>(null)
const tool = ref<'pen' | 'eraser'>('pen')
const penColor = ref('#1e1e2e')
const penSize = ref(3)
const isDrawing = ref(false)
const undoStack = ref<ImageData[]>([])

// Text state
const textAnswer = ref('')

// Save state
const saveStatus = ref<'saving' | 'saved' | ''>('')

// Per-page canvas snapshots
const canvasSnapshots = ref<Record<string, string>>({})
const textAnswers = ref<Record<string, string>>({})

const pages = computed(() => notebook.value?.pages || [])
const currentPage = computed<NotebookPage | null>(() => pages.value[currentPageIndex.value] ?? null)
const studentId = computed(() => authStore.profile?.id || authStore.authUser?.id || '')

const penCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%231e1e2e' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/%3E%3C/svg%3E") 0 24, crosshair`
const eraserCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%23666' stroke-width='1.5'/%3E%3C/svg%3E") 10 10, cell`
const canvasCursor = computed(() => tool.value === 'eraser' ? eraserCursor : penCursor)

function hasSubmission(page: NotebookPage) {
  return !!page.submission
}

onMounted(async () => {
  const id = route.params.id as string
  try {
    const res = await notebookService.get(id, studentId.value)
    notebook.value = res.data
    // Pre-fill existing submissions
    for (const page of pages.value) {
      if (page.submission?.canvas_data) canvasSnapshots.value[page.id] = page.submission.canvas_data
      if (page.submission?.answer_text) textAnswers.value[page.id] = page.submission.answer_text
    }
  } finally {
    loading.value = false
    await nextTick()
    initCanvas()
  }
})

watch(currentPageIndex, async () => {
  await nextTick()
  initCanvas()
  if (currentPage.value) {
    textAnswer.value = textAnswers.value[currentPage.value.id] || ''
  }
})

function drawNotebookBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Fondo crema
  ctx.fillStyle = '#fafaf7'
  ctx.fillRect(0, 0, w, h)
  // Línea de margen roja
  ctx.strokeStyle = 'rgba(239,68,68,0.25)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(56, 0)
  ctx.lineTo(56, h)
  ctx.stroke()
  // Líneas horizontales
  ctx.strokeStyle = 'rgba(124,58,237,0.1)'
  ctx.lineWidth = 1
  for (let y = 32; y < h; y += 32) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
}

function initCanvas() {
  const canvas = answerCanvas.value
  if (!canvas || !currentPage.value) return

  const doInit = () => {
    const w = canvas.offsetWidth || 700
    const h = canvas.offsetHeight || 300
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    drawNotebookBackground(ctx, w, h)
    undoStack.value = []

    const snap = currentPage.value?.id ? canvasSnapshots.value[currentPage.value.id] : null
    if (snap) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, w, h)
      img.src = snap
    }
  }

  // Esperar un frame para que el canvas tenga dimensiones reales
  requestAnimationFrame(doInit)
}

function getCtx() {
  return answerCanvas.value?.getContext('2d') ?? null
}

function getPoint(e: MouseEvent) {
  const canvas = answerCanvas.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  }
}

function startDraw(e: MouseEvent) {
  const ctx = getCtx()
  if (!ctx || !answerCanvas.value) return
  undoStack.value.push(ctx.getImageData(0, 0, answerCanvas.value.width, answerCanvas.value.height))
  isDrawing.value = true
  const { x, y } = getPoint(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function draw(e: MouseEvent) {
  if (!isDrawing.value) return
  const ctx = getCtx()
  if (!ctx) return
  const { x, y } = getPoint(e)
  ctx.globalCompositeOperation = tool.value === 'eraser' ? 'destination-out' : 'source-over'
  ctx.strokeStyle = penColor.value
  ctx.lineWidth = tool.value === 'eraser' ? penSize.value * 4 : penSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineTo(x, y)
  ctx.stroke()
}

function endDraw() {
  isDrawing.value = false
  getCtx()?.beginPath()
}

function startDrawTouch(e: TouchEvent) {
  const t = e.touches[0]
  startDraw({ clientX: t.clientX, clientY: t.clientY } as MouseEvent)
}

function drawTouch(e: TouchEvent) {
  const t = e.touches[0]
  draw({ clientX: t.clientX, clientY: t.clientY } as MouseEvent)
}

function undoDraw() {
  const ctx = getCtx()
  if (!ctx || !answerCanvas.value || undoStack.value.length === 0) return
  ctx.putImageData(undoStack.value.pop()!, 0, 0)
}

function clearCanvas() {
  const canvas = answerCanvas.value
  const ctx = getCtx()
  if (!canvas || !ctx) return
  undoStack.value = []
  drawNotebookBackground(ctx, canvas.width, canvas.height)
}

function captureCanvas(): string {
  return answerCanvas.value?.toDataURL('image/png') ?? ''
}

async function saveAndNext() {
  if (!currentPage.value) return
  saveStatus.value = 'saving'

  const pageId = currentPage.value.id
  const data = captureCanvas()
  canvasSnapshots.value[pageId] = data
  await notebookService.saveSubmission(pageId, { canvas_data: data })

  saveStatus.value = 'saved'
  setTimeout(() => { saveStatus.value = '' }, 2000)

  if (currentPageIndex.value < pages.value.length - 1) {
    goToPage(currentPageIndex.value + 1)
  }
}

function goToPage(idx: number) {
  currentPageIndex.value = idx
}
</script>

<style scoped>
.notebook-shell {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nb-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid rgba(124, 58, 237, 0.2);
  background: rgba(255,255,255,0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}
.btn-back:hover { background: rgba(124,58,237,0.06); }

.nb-title-area { flex: 1; }
.nb-title { font-size: 1.4rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.nb-desc { font-size: 0.85rem; color: var(--text-secondary); }
.nb-page-indicator { font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap; }

.nb-loading, .nb-empty {
  text-align: center;
  padding: 64px 24px;
  color: var(--text-secondary);
  font-size: 1rem;
}
.empty-icon { font-size: 3rem; margin-bottom: 12px; }

/* Page tabs */
.page-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px 0;
}

.page-tab {
  min-width: 40px;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  background: rgba(255,255,255,0.8);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.page-tab:hover {
  border-color: rgba(124, 58, 237, 0.3);
  color: var(--practiq-violet);
}

.page-tab--active {
  background: var(--practiq-violet);
  color: #fff;
  border-color: var(--practiq-violet);
}

.page-tab--done {
  border-color: rgba(16, 185, 129, 0.4);
  color: #059669;
}
.page-tab--done.page-tab--active {
  background: #059669;
  border-color: #059669;
  color: #fff;
}

.tab-check { font-size: 0.75rem; }

/* Notebook page card */
.notebook-page {
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1.5px solid rgba(124, 58, 237, 0.1);
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Teacher content */
.page-content {
  padding: 24px 28px 20px;
  border-bottom: 1.5px dashed rgba(124, 58, 237, 0.12);
}

.page-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.content-type-badge {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(124, 58, 237, 0.08);
  color: var(--practiq-violet);
  font-weight: 600;
}

.teacher-image-wrap {
  border-radius: 12px;
  overflow: hidden;
  border: 1.5px solid rgba(124, 58, 237, 0.1);
  background: #f8f7ff;
}
.teacher-image {
  display: block;
  max-width: 100%;
  height: auto;
}

.teacher-text {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.page-instructions {
  margin-top: 14px;
  padding: 10px 14px;
  background: rgba(245, 243, 255, 0.9);
  border-left: 3px solid var(--practiq-violet);
  border-radius: 0 8px 8px 0;
  font-size: 0.88rem;
  color: var(--text-secondary);
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

/* Answer area */
.answer-section {
  padding: 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.answer-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.draw-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tool-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  background: rgba(255,255,255,0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.tool-btn:hover { border-color: var(--practiq-violet); color: var(--practiq-violet); }
.tool-btn--active { background: var(--practiq-violet); color: #fff; border-color: var(--practiq-violet); }

.color-picker {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  padding: 2px;
  cursor: pointer;
  background: none;
}

.size-slider {
  width: 80px;
  accent-color: var(--practiq-violet);
}

.answer-canvas {
  width: 100%;
  height: 300px;
  border-radius: 12px;
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  display: block;
  touch-action: none;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.06);
}

.answer-textarea {
  width: 100%;
  min-height: 280px;
  padding: 16px 16px 16px 72px;
  border-radius: 12px;
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  font-size: 1rem;
  line-height: 2rem;
  color: #1e1e2e;
  background-color: #fafaf7;
  background-image:
    linear-gradient(rgba(124, 58, 237, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(239, 68, 68, 0.2) 1px, transparent 1px);
  background-size: 100% 2rem, 1px 100%;
  background-position: 0 2rem, 56px 0;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  font-family: 'Segoe UI', sans-serif;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.06);
}
.answer-textarea:focus { border-color: var(--practiq-violet); }

/* Save bar */
.save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  border-top: 1.5px solid rgba(124, 58, 237, 0.08);
  background: rgba(245, 243, 255, 0.5);
  gap: 12px;
  flex-wrap: wrap;
}

.save-status {
  font-size: 0.85rem;
  color: #059669;
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.btn-nav {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1.5px solid rgba(124, 58, 237, 0.2);
  background: rgba(255,255,255,0.8);
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}
.btn-nav:hover:not(:disabled) { border-color: var(--practiq-violet); color: var(--practiq-violet); }
.btn-nav:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-save {
  padding: 10px 22px;
  border-radius: 10px;
  border: none;
  background: var(--practiq-violet);
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-save:hover { opacity: 0.9; }
</style>
