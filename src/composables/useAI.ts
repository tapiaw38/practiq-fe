import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { practiqApi } from '@/api/request/server'
import { AIService } from '@/services/ai/aiService'
import { useAIStore } from '@/stores/aiStore'

export const useAI = () => {
  const toast = useToast()
  const service = new AIService(practiqApi)
  const store = useAIStore(service)()
  const { currentConversation, messages, loading } = storeToRefs(store)

  const createConversation = async (params: {
    course_id?: string
    practice_sheet_id?: string
  }) => {
    try {
      return await store.createConversation(params)
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la conversación', life: 3000 })
      throw error
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      return await store.fetchMessages(conversationId)
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los mensajes', life: 3000 })
      throw error
    }
  }

  const getHelp = async (params: {
    exercise_id?: string
    question: string
    help_type?: 'hint' | 'explanation' | 'similar_example'
    conversation_id?: string
  }) => {
    try {
      return await store.getHelp(params)
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener ayuda', life: 3000 })
      throw error
    }
  }

  return {
    currentConversation,
    messages,
    loading,
    createConversation,
    loadMessages,
    getHelp
  }
}
