import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { NotebookService } from '@/services/notebooks/notebookService'
import { useNotebookStore } from '@/stores/notebookStore'
import { practiqApi } from '@/api/request/server'

export const useNotebook = () => {
  const toast = useToast()
  const service = new NotebookService(practiqApi)
  const store = useNotebookStore(service)()

  const { notebooks, currentNotebook, submissions, submitJob, jobStatus, loading } = storeToRefs(store)

  const loadNotebooks = async (courseId: string) => {
    try {
      return await store.fetchNotebooks(courseId)
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los cuadernos',
        life: 3000
      })
      throw error
    }
  }

  const loadNotebook = async (id: string, studentId?: string) => {
    try {
      return await store.fetchNotebook(id, studentId)
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cargar el cuaderno',
        life: 3000
      })
      throw error
    }
  }

  const createNotebook = async (courseId: string, params: { title: string; description?: string; level?: number }) => {
    try {
      const result = await store.createNotebook(courseId, params)
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Cuaderno creado correctamente',
        life: 3000
      })
      return result
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo crear el cuaderno',
        life: 3000
      })
      throw error
    }
  }

  const updateNotebook = async (id: string, params: { title: string; description?: string }) => {
    try {
      const result = await store.updateNotebook(id, params)
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Cuaderno actualizado correctamente',
        life: 3000
      })
      return result
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar el cuaderno',
        life: 3000
      })
      throw error
    }
  }

  const deleteNotebook = async (id: string) => {
    try {
      await store.deleteNotebook(id)
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Cuaderno eliminado correctamente',
        life: 3000
      })
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo eliminar el cuaderno',
        life: 3000
      })
      throw error
    }
  }

  const addPage = async (notebookId: string, params: {
    page_number: number
    title: string
    content_type: 'canvas' | 'text'
    content_data: string
    instructions: string
  }) => {
    try {
      const result = await store.addNotebookPage(notebookId, params)
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Página añadida correctamente',
        life: 3000
      })
      return result
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo añadir la página',
        life: 3000
      })
      throw error
    }
  }

  const updatePage = async (pageId: string, params: {
    title: string
    content_type: 'canvas' | 'text'
    content_data: string
    instructions: string
  }) => {
    try {
      await store.updateNotebookPage(pageId, params)
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Página actualizada correctamente',
        life: 3000
      })
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar la página',
        life: 3000
      })
      throw error
    }
  }

  const saveSubmission = async (pageId: string, params: { canvas_data?: string; answer_text?: string }) => {
    try {
      await store.savePageSubmission(pageId, params)
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Respuesta guardada correctamente',
        life: 3000
      })
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la respuesta',
        life: 3000
      })
      throw error
    }
  }

  const saveSubmissionAsync = async (pageId: string, params: { canvas_data?: string; answer_text?: string }) => {
    try {
      const result = await store.savePageSubmissionAsync(pageId, params)
      toast.add({
        severity: 'info',
        summary: 'Procesando',
        detail: 'La respuesta se está procesando',
        life: 3000
      })
      return result
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la respuesta',
        life: 3000
      })
      throw error
    }
  }

  const loadSubmissionJob = async (jobId: string) => {
    try {
      return await store.fetchSubmissionJob(jobId)
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el estado del trabajo',
        life: 3000
      })
      throw error
    }
  }

  const loadSubmissions = async (params?: {
    notebook_id?: string
    student_id?: string
    reviewed?: boolean
    course_id?: string
  }) => {
    try {
      return await store.fetchSubmissions(params)
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar las entregas',
        life: 3000
      })
      throw error
    }
  }

  const triggerAIReview = async (submissionId: string) => {
    try {
      const result = await store.triggerAIReviewForSubmission(submissionId)
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Revisión de IA iniciada correctamente',
        life: 3000
      })
      return result
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo iniciar la revisión de IA',
        life: 3000
      })
      throw error
    }
  }

  const updateManualReview = async (submissionId: string, params: {
    teacher_is_correct: boolean
    teacher_feedback: string
  }) => {
    try {
      const result = await store.updateManualReviewForSubmission(submissionId, params)
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Revisión manual actualizada correctamente',
        life: 3000
      })
      return result
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo actualizar la revisión manual',
        life: 3000
      })
      throw error
    }
  }

  return {
    notebooks,
    currentNotebook,
    submissions,
    submitJob,
    jobStatus,
    loading,
    loadNotebooks,
    loadNotebook,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    addPage,
    updatePage,
    saveSubmission,
    saveSubmissionAsync,
    loadSubmissionJob,
    loadSubmissions,
    triggerAIReview,
    updateManualReview
  }
}
