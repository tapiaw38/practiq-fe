<template>
  <TeacherLayout>
    <div class="editor-shell">
      <!-- Header -->
      <header class="editor-header">
        <button class="btn-back" @click="router.back()">
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="header-info">
          <h1 class="editor-title">{{ notebook?.title || 'Cuaderno' }}</h1>
          <span class="editor-desc">{{ notebook?.description }}</span>
        </div>
        <button class="btn btn-primary btn-sm" @click="showAddPage = true">
          <i class="pi pi-plus"></i> Agregar página
        </button>
      </header>

      <div v-if="loading" class="editor-loading">
        <i class="pi pi-spin pi-spinner"></i> Cargando...
      </div>

      <div v-else class="editor-body">
        <!-- Page list sidebar -->
        <aside class="pages-sidebar">
          <div class="sidebar-title">Páginas</div>
          <div v-if="pages.length === 0" class="sidebar-empty">Sin páginas</div>
          <div
            v-for="(page, idx) in pages"
            :key="page.id"
            class="sidebar-item"
            :class="{ 'sidebar-item--active': idx === selectedIdx }"
            @click="selectPage(idx)"
          >
            <span class="sidebar-num">{{ idx + 1 }}</span>
            <div class="sidebar-info">
              <div class="sidebar-pg-title">{{ page.title || 'Sin título' }}</div>
              <div class="sidebar-pg-type">
                <i :class="page.content_type === 'canvas' ? 'pi pi-image' : 'pi pi-align-left'"></i>
                {{ page.content_type === 'canvas' ? 'Imagen' : 'Texto' }}
              </div>
            </div>
          </div>
        </aside>

        <!-- Editor main -->
        <div class="editor-main">
          <div v-if="pages.length === 0" class="editor-empty">
            <div class="empty-icon"><i class="pi pi-book"></i></div>
            <p>Agrega la primera página usando el botón de arriba.</p>
          </div>

          <template v-else-if="currentPage">
            <!-- Page meta edit -->
            <div class="page-meta-bar">
              <input
                v-model="currentPage.title"
                class="page-title-input"
                placeholder="Título de la página"
                @blur="savePage"
              />
              <select v-model="currentPage.content_type" class="type-select" @change="savePage">
                <option value="canvas">Imagen / Dibujo</option>
                <option value="text">Texto</option>
              </select>
            </div>

            <!-- Canvas content editor -->
            <div v-if="currentPage.content_type === 'canvas'" class="canvas-editor">
              <div class="canvas-toolbar">
                <button class="tool-btn" :class="{ 'tool-btn--active': tool === 'pen' }" @click="tool = 'pen'">
                  <i class="pi pi-pencil"></i> Lápiz
                </button>
                <button class="tool-btn" :class="{ 'tool-btn--active': tool === 'eraser' }" @click="tool = 'eraser'">
                  <i class="pi pi-times-circle"></i> Borrador
                </button>
                <button class="tool-btn" @click="undoDraw"><i class="pi pi-undo"></i> Deshacer</button>
                <button class="tool-btn" @click="clearCanvas"><i class="pi pi-trash"></i> Limpiar</button>
                <input type="color" v-model="penColor" class="color-picker" title="Color" />
                <input type="range" v-model.number="penSize" min="1" max="20" class="size-slider" />
                <button class="btn btn-primary btn-sm" @click="saveCanvasContent" :disabled="saving">
                  <i class="pi pi-save"></i> {{ saving ? 'Guardando...' : 'Guardar imagen' }}
                </button>
              </div>

              <!-- Load existing image -->
              <div v-if="currentPage.content_data" class="current-image-preview">
                <div class="preview-label">Imagen guardada:</div>
                <img :src="currentPage.content_data" alt="Contenido actual" class="preview-img" />
              </div>

              <canvas
                ref="editorCanvas"
                class="editor-canvas"
                :style="{ cursor: canvasCursor }"
                @mousedown="startDraw"
                @mousemove="draw"
                @mouseup="endDraw"
                @mouseleave="endDraw"
                @touchstart.prevent="startDrawTouch"
                @touchmove.prevent="drawTouch"
                @touchend="endDraw"
              ></canvas>
            </div>

            <!-- Text content editor -->
            <div v-else class="text-editor">
              <textarea
                v-model="currentPage.content_data"
                class="text-area"
                placeholder="Escribe el contenido de la página aquí. Los alumnos verán este texto y podrán escribir su respuesta debajo."
                rows="12"
                @blur="savePage"
              ></textarea>
            </div>

            <!-- Instructions -->
            <div class="instructions-row">
              <label class="inst-label">Instrucciones para el alumno</label>
              <input
                v-model="currentPage.instructions"
                class="inst-input"
                placeholder="Ej: Resuelve las siguientes operaciones con tu lápiz."
                @blur="savePage"
              />
            </div>

            <!-- Save feedback -->
            <div v-if="saveMsg" class="save-feedback">
              <i class="pi pi-check-circle"></i> {{ saveMsg }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Add page modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAddPage" class="modal-overlay" @click.self="showAddPage = false">
          <div class="modal-box">
            <h3 class="modal-title">Nueva Página</h3>
            <form @submit.prevent="addPage">
              <div class="form-group">
                <label class="form-label">Título</label>
                <input v-model="newPage.title" class="form-input" placeholder="Página 1" />
              </div>
              <div class="form-group">
                <label class="form-label">Tipo de contenido</label>
                <select v-model="newPage.content_type" class="form-input">
                  <option value="canvas">Imagen / Dibujo</option>
                  <option value="text">Texto</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Instrucciones para el alumno</label>
                <input v-model="newPage.instructions" class="form-input" placeholder="Opcional" />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" @click="showAddPage = false">Cancelar</button>
                <button type="submit" class="btn btn-primary">Agregar</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </TeacherLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import { notebookService } from '@/services/notebooks/notebookService'
import type { Notebook, NotebookPage } from '@/types'

const route = useRoute()
const router = useRouter()

const notebookId = route.params.id as string
const notebook = ref<Notebook | null>(null)
const loading = ref(true)
const saving = ref(false)
const selectedIdx = ref(0)
const showAddPage = ref(false)
const saveMsg = ref('')

// Canvas refs
const editorCanvas = ref<HTMLCanvasElement | null>(null)
const tool = ref<'pen' | 'eraser'>('pen')
const penColor = ref('#1e1e2e')
const penSize = ref(3)
const isDrawing = ref(false)
const undoStack = ref<ImageData[]>([])

const penCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%231e1e2e' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/%3E%3C/svg%3E") 0 24, crosshair`
const eraserCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%23666' stroke-width='1.5'/%3E%3C/svg%3E") 10 10, cell`
const canvasCursor = computed(() => tool.value === 'eraser' ? eraserCursor : penCursor)

const newPage = reactive({
  title: '',
  content_type: 'canvas' as 'canvas' | 'text',
  instructions: ''
})

const pages = computed(() => notebook.value?.pages || [])

// FIX: currentPage devuelve el objeto mutable del array directamente.
// Se expone como ref writeable para que v-model en el template pueda mutar
// las propiedades y savePage() lea los valores actualizados.
const currentPage = computed<NotebookPage | null>(() => pages.value[selectedIdx.value] ?? null)

onMounted(async () => {
  try {
    const res = await notebookService.get(notebookId)
    notebook.value = res.data
  } finally {
    loading.value = false
    await nextTick()
    if (currentPage.value?.content_type === 'canvas') initCanvas(true)
  }
})

watch(selectedIdx, async () => {
  undoStack.value = []
  await nextTick()
  if (currentPage.value?.content_type === 'canvas') initCanvas(true)
})

watch(() => currentPage.value?.content_type, async (type) => {
  if (type === 'canvas') {
    await nextTick()
    initCanvas(true)
  }
})

function selectPage(idx: number) {
  selectedIdx.value = idx
}

async function addPage() {
  const pageCount = pages.value.length
  await notebookService.addPage(notebookId, {
    page_number: pageCount + 1,
    title: newPage.title || `Página ${pageCount + 1}`,
    content_type: newPage.content_type,
    content_data: '',
    instructions: newPage.instructions
  })
  showAddPage.value = false
  newPage.title = ''
  newPage.instructions = ''
  newPage.content_type = 'canvas'

  const res = await notebookService.get(notebookId)
  notebook.value = res.data
  await nextTick()
  selectedIdx.value = pages.value.length - 1
  await nextTick()
  if (currentPage.value?.content_type === 'canvas') initCanvas(true)
}

async function savePage() {
  if (!currentPage.value || saving.value) return
  saving.value = true
  try {
    await notebookService.updatePage(currentPage.value.id, {
      title: currentPage.value.title || '',
      content_type: currentPage.value.content_type,
      content_data: currentPage.value.content_data || '',
      instructions: currentPage.value.instructions || ''
    })
    saveMsg.value = 'Guardado'
    setTimeout(() => { saveMsg.value = '' }, 2000)
  } finally {
    saving.value = false
  }
}

async function saveCanvasContent() {
  if (!editorCanvas.value || !currentPage.value) return
  const dataUrl = editorCanvas.value.toDataURL('image/png')
  currentPage.value.content_data = dataUrl
  await savePage()
}

function initCanvas(loadExisting = false) {
  const canvas = editorCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width || 700
  canvas.height = rect.height || 400
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  undoStack.value = []

  if (loadExisting && currentPage.value?.content_data) {
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    img.src = currentPage.value.content_data
  }
}

function getCtx() {
  return editorCanvas.value?.getContext('2d') ?? null
}

function getPoint(e: MouseEvent) {
  const canvas = editorCanvas.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  }
}

function startDraw(e: MouseEvent) {
  const ctx = getCtx()
  if (!ctx || !editorCanvas.value) return
  undoStack.value.push(ctx.getImageData(0, 0, editorCanvas.value.width, editorCanvas.value.height))
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
  startDraw({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as MouseEvent)
}

function drawTouch(e: TouchEvent) {
  draw({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as MouseEvent)
}

function undoDraw() {
  const ctx = getCtx()
  if (!ctx || !editorCanvas.value || !undoStack.value.length) return
  ctx.putImageData(undoStack.value.pop()!, 0, 0)
}

function clearCanvas() {
  const canvas = editorCanvas.value
  const ctx = getCtx()
  if (!canvas || !ctx) return
  undoStack.value = []
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (currentPage.value) currentPage.value.content_data = ''
}
</script>

<style scoped>
.editor-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  gap: 16px;
}

.editor-header {
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

.header-info { flex: 1; }
.editor-title { font-size: 1.35rem; font-weight: 700; color: var(--text-primary); margin: 0; }
.editor-desc { font-size: 0.85rem; color: var(--text-secondary); }

.editor-loading {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary);
}

.editor-body {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

/* Sidebar */
.pages-sidebar {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-xl);
  border: 1.5px solid rgba(124, 58, 237, 0.1);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
}

.sidebar-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  padding: 0 4px 8px;
  border-bottom: 1.5px solid rgba(124, 58, 237, 0.08);
  margin-bottom: 4px;
}

.sidebar-empty {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-align: center;
  padding: 24px 0;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}
.sidebar-item:hover { background: rgba(124, 58, 237, 0.06); }
.sidebar-item--active { background: rgba(124, 58, 237, 0.1); }

.sidebar-num {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--practiq-violet);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-pg-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
}
.sidebar-pg-type {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Editor main */
.editor-main {
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-2xl);
  border: 1.5px solid rgba(124, 58, 237, 0.1);
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.editor-empty {
  text-align: center;
  padding: 64px 24px;
  color: var(--text-secondary);
}
.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: rgba(124,58,237,0.08);
  color: var(--practiq-violet);
  font-size: 24px;
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
}

.page-meta-bar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.page-title-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
}
.page-title-input:focus { border-color: var(--practiq-violet); }

.type-select {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  font-size: 0.9rem;
  color: var(--text-primary);
  outline: none;
  background: white;
  cursor: pointer;
}

/* Canvas editor */
.canvas-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: rgba(245, 243, 255, 0.8);
  border-radius: var(--radius-md);
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  background: rgba(255,255,255,0.8);
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.tool-btn:hover { border-color: var(--practiq-violet); color: var(--practiq-violet); }
.tool-btn--active { background: var(--practiq-violet); color: #fff; border-color: var(--practiq-violet); }

.color-picker {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  padding: 2px;
  cursor: pointer;
  background: none;
}
.size-slider {
  width: 80px;
  accent-color: var(--practiq-violet);
}

.current-image-preview {
  padding: 12px;
  background: #f8f7ff;
  border-radius: var(--radius-md);
  border: 1.5px dashed rgba(124, 58, 237, 0.2);
}
.preview-label { font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 8px; }
.preview-img { max-height: 120px; border-radius: var(--radius-sm); }

.editor-canvas {
  width: 100%;
  height: 400px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  background: #fff;
  display: block;
  touch-action: none;
}

/* Text editor */
.text-area {
  width: 100%;
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1.5px solid rgba(124, 58, 237, 0.15);
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-primary);
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.text-area:focus { border-color: var(--practiq-violet); }

/* Instructions */
.instructions-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.inst-label {
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}
.inst-input {
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1.5px solid rgba(124, 58, 237, 0.12);
  font-size: 0.9rem;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
}
.inst-input:focus { border-color: var(--practiq-violet); }

.save-feedback {
  font-size: 0.85rem;
  color: #059669;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: white;
  border-radius: var(--radius-2xl);
  padding: 28px 32px;
  width: 420px;
  max-width: 95vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.modal-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 20px;
  color: var(--text-primary);
}
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: var(--text-secondary); }
.form-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--surface-border);
  font-size: 0.95rem;
  outline: none;
  box-sizing: border-box;
}
.form-input:focus { border-color: var(--practiq-violet); }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

/* Buttons (local) */
.btn { padding: 9px 18px; border-radius: var(--radius-sm); border: none; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
.btn-primary { background: var(--practiq-violet); color: #fff; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: var(--surface-hover); color: var(--text-primary); }
.btn-sm { padding: 7px 14px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Tablet landscape */
@media (max-width: 1024px) {
  .editor-body { grid-template-columns: 180px 1fr; }
}

/* Tablet portrait */
@media (max-width: 768px) {
  .editor-body { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
  .pages-sidebar { border-right: none; border-bottom: 1px solid var(--surface-border); max-height: 220px; overflow-y: auto; }
  .editor-main { padding: 16px; }
}

/* Mobile */
@media (max-width: 600px) {
  .pages-sidebar { max-height: 160px; }
  .editor-empty { padding: 32px; }
}
</style>
