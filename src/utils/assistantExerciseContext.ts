import type { Exercise } from '@/types'

type JsonRecord = Record<string, unknown>

const teacherImageKeys = [
  'teacher_image',
  'teacherImage',
  'prompt_image',
  'promptImage',
  'question_image',
  'questionImage',
  'image',
  'image_data',
  'imageData',
  'content_data',
  'contentData',
  'canvas_data',
  'canvasData'
]

function isDataUrlImage(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/')
}

export function parseExerciseMetadata(metadata?: string): JsonRecord | null {
  if (!metadata) return null

  const trimmed = metadata.trim()
  if (!trimmed) return null
  if (isDataUrlImage(trimmed)) {
    return { image_data: trimmed }
  }

  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === 'object' ? (parsed as JsonRecord) : null
  } catch {
    return null
  }
}

export function extractTeacherImageDataUrl(exercise?: Pick<Exercise, 'question' | 'metadata'> | null): string {
  if (!exercise) return ''
  if (isDataUrlImage(exercise.question)) {
    return exercise.question
  }

  const metadata = parseExerciseMetadata(exercise.metadata)
  if (!metadata) return ''

  for (const key of teacherImageKeys) {
    const value = metadata[key]
    if (isDataUrlImage(value)) {
      return value
    }
  }

  return ''
}

export function summarizeExerciseMetadata(exercise?: Pick<Exercise, 'metadata'> | null): JsonRecord | null {
  const metadata = parseExerciseMetadata(exercise?.metadata)
  if (!metadata) return null

  const summary: JsonRecord = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (teacherImageKeys.includes(key)) {
      summary[key] = isDataUrlImage(value) ? '[teacher_image_data_url]' : value
      continue
    }
    if (typeof value === 'string') {
      summary[key] = value.length > 400 ? `${value.slice(0, 400)}...` : value
      continue
    }
    summary[key] = value
  }

  return Object.keys(summary).length > 0 ? summary : null
}

export async function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (error) => reject(error)
    img.src = dataUrl
  })
}

export async function composeTeacherAndStudentImage(params: {
  teacherDataUrl?: string
  studentDataUrl?: string
  teacherLabel?: string
  studentLabel?: string
}): Promise<string> {
  const teacherDataUrl = params.teacherDataUrl || ''
  const studentDataUrl = params.studentDataUrl || ''

  if (!teacherDataUrl) return studentDataUrl
  if (!studentDataUrl) return teacherDataUrl

  const [teacherImg, studentImg] = await Promise.all([
    loadImageFromDataUrl(teacherDataUrl),
    loadImageFromDataUrl(studentDataUrl)
  ])

  const sourceTeacherWidth = teacherImg.naturalWidth || teacherImg.width
  const sourceTeacherHeight = teacherImg.naturalHeight || teacherImg.height
  const sourceStudentWidth = studentImg.naturalWidth || studentImg.width
  const sourceStudentHeight = studentImg.naturalHeight || studentImg.height
  const width = Math.max(sourceTeacherWidth, sourceStudentWidth, 1100)
  const labelHeight = 42
  const gap = 18
  const padding = 20
  const contentWidth = width - padding * 2
  const teacherScale = contentWidth / sourceTeacherWidth
  const studentScale = contentWidth / sourceStudentWidth
  const teacherHeight = Math.round(sourceTeacherHeight * teacherScale)
  const studentHeight = Math.round(sourceStudentHeight * studentScale)
  const height =
    padding +
    labelHeight +
    teacherHeight +
    gap +
    labelHeight +
    studentHeight +
    padding

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return teacherDataUrl || studentDataUrl

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#123c52'
  ctx.font = 'bold 24px sans-serif'
  ctx.fillText(params.teacherLabel || 'Consigna del docente', padding, padding + 26)
  ctx.drawImage(teacherImg, padding, padding + labelHeight, contentWidth, teacherHeight)

  const studentTop = padding + labelHeight + teacherHeight + gap
  ctx.fillStyle = '#123c52'
  ctx.font = 'bold 24px sans-serif'
  ctx.fillText(params.studentLabel || 'Respuesta del alumno', padding, studentTop + 26)
  ctx.drawImage(studentImg, padding, studentTop + labelHeight, contentWidth, studentHeight)

  return canvas.toDataURL('image/png')
}

export async function dataUrlHasUserInk(dataUrl: string): Promise<boolean> {
  if (!dataUrl) return false

  let img: HTMLImageElement
  try {
    img = await loadImageFromDataUrl(dataUrl)
  } catch {
    return false
  }

  const sample = document.createElement('canvas')
  const maxSide = 320
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
  sample.width = Math.max(1, Math.floor((img.naturalWidth || img.width) * scale))
  sample.height = Math.max(1, Math.floor((img.naturalHeight || img.height) * scale))

  const ctx = sample.getContext('2d')
  if (!ctx) return false
  ctx.drawImage(img, 0, 0, sample.width, sample.height)

  const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data
  let darkPixels = 0
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3]
    if (alpha < 20) continue
    const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    if (gray < 140) darkPixels++
    if (darkPixels > 12) return true
  }

  return false
}

export async function pickBestStudentImage(dataUrls: Array<string | undefined | null>): Promise<string> {
  const candidates = dataUrls.filter((value): value is string => !!value)
  for (const dataUrl of candidates) {
    if (await dataUrlHasUserInk(dataUrl)) {
      return dataUrl
    }
  }
  return candidates[0] || ''
}

export async function composeAssistantWorkImage(params: {
  teacherDataUrl?: string
  studentDataUrl?: string
  teacherLabel?: string
  studentLabel?: string
}): Promise<string> {
  if (params.teacherDataUrl && params.studentDataUrl) {
    return composeTeacherAndStudentImage(params)
  }
  return params.teacherDataUrl || params.studentDataUrl || ''
}
