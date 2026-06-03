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

  const width = Math.max(teacherImg.width, studentImg.width, 900)
  const labelHeight = 42
  const gap = 18
  const padding = 20
  const height =
    padding +
    labelHeight +
    teacherImg.height +
    gap +
    labelHeight +
    studentImg.height +
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
  ctx.drawImage(teacherImg, 0, padding + labelHeight, teacherImg.width, teacherImg.height)

  const studentTop = padding + labelHeight + teacherImg.height + gap
  ctx.fillStyle = '#123c52'
  ctx.font = 'bold 24px sans-serif'
  ctx.fillText(params.studentLabel || 'Respuesta del alumno', padding, studentTop + 26)
  ctx.drawImage(studentImg, 0, studentTop + labelHeight, studentImg.width, studentImg.height)

  return canvas.toDataURL('image/jpeg', 0.92)
}
