import { storeToRefs } from 'pinia'
import { useToast } from 'primevue/usetoast'
import { practiqApi } from '@/api/request/server'
import {
  StrategyService,
  type CreateStrategyParams,
  type UpdateStrategyParams
} from '@/services/strategy/strategyService'
import { useStrategyStore } from '@/stores/strategyStore'

export const useStrategy = () => {
  const toast = useToast()
  const service = new StrategyService(practiqApi)
  const store = useStrategyStore(service)()
  const { strategies, currentStrategy, courseAssignments, loading } = storeToRefs(store)

  const loadStrategies = async () => {
    try {
      return await store.fetchStrategies()
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las estrategias', life: 3000 })
      throw error
    }
  }

  const loadStrategy = async (id: string) => {
    try {
      return await store.fetchStrategy(id)
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la estrategia', life: 3000 })
      throw error
    }
  }

  const createStrategy = async (params: CreateStrategyParams) => {
    try {
      const strategy = await store.createStrategy(params)
      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Estrategia creada correctamente', life: 3000 })
      return strategy
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la estrategia', life: 3000 })
      throw error
    }
  }

  const updateStrategy = async (id: string, params: UpdateStrategyParams) => {
    try {
      const strategy = await store.updateStrategy(id, params)
      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Estrategia actualizada correctamente', life: 3000 })
      return strategy
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la estrategia', life: 3000 })
      throw error
    }
  }

  const deleteStrategy = async (id: string) => {
    try {
      await store.deleteStrategy(id)
      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Estrategia eliminada correctamente', life: 3000 })
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la estrategia', life: 3000 })
      throw error
    }
  }

  const assignStrategyToCourse = async (courseId: string, strategyId: string) => {
    try {
      const assignment = await store.assignToCourse(courseId, strategyId)
      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Estrategia asignada correctamente', life: 3000 })
      return assignment
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo asignar la estrategia', life: 3000 })
      throw error
    }
  }

  const loadCourseStrategies = async (courseId: string) => {
    try {
      return await store.fetchCourseStrategies(courseId)
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las asignaciones', life: 3000 })
      throw error
    }
  }

  const removeCourseStrategy = async (assignmentId: string) => {
    try {
      await store.removeCourseStrategy(assignmentId)
      toast.add({ severity: 'success', summary: 'Éxito', detail: 'Asignación eliminada correctamente', life: 3000 })
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar la asignación', life: 3000 })
      throw error
    }
  }

  return {
    strategies,
    currentStrategy,
    courseAssignments,
    loading,
    loadStrategies,
    loadStrategy,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    assignStrategyToCourse,
    loadCourseStrategies,
    removeCourseStrategy
  }
}
