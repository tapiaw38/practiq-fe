import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { LevelService } from '@/services/levels/levelService'
import { useLevelStore } from '@/stores/levelStore'
import { practiqApi } from '@/api/request/server'

export const useLevel = () => {
  const toast = useToast()
  const service = new LevelService(practiqApi)
  const store = useLevelStore(service)()

  const { courseLevels, loading } = storeToRefs(store)

  const loadCourseLevels = async (courseId: string) => {
    try {
      return await store.fetchCourseLevels(courseId)
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudieron cargar los niveles del curso',
        life: 3000
      })
      throw error
    }
  }

  return {
    courseLevels,
    loading,
    loadCourseLevels
  }
}
