import { practiqApi } from '@/api/request/server'
import type { LearningStrategy, CourseLearningStrategy } from '@/types'

type CourseLearningStrategyApi = Omit<CourseLearningStrategy, 'strategy'> & {
  strategy?: LearningStrategy
  strategy_name?: string
  strategy_code?: string
  strategy_description?: string
}

function normalizeCourseStrategy(item: CourseLearningStrategyApi): CourseLearningStrategy {
  return {
    ...item,
    strategy: item.strategy || {
      id: item.strategy_id,
      name: item.strategy_name || 'Estrategia',
      code: item.strategy_code || '',
      description: item.strategy_description || '',
      status: 'active',
      created_at: item.created_at || ''
    }
  }
}

export class StrategyService {
  async list(): Promise<{ data: LearningStrategy[] }> {
    const { data } = await practiqApi.get('/learning-strategies')
    return data
  }

  async get(id: string): Promise<{ data: LearningStrategy }> {
    const { data } = await practiqApi.get(`/learning-strategies/${id}`)
    return data
  }

  async create(params: {
    name: string
    code: string
    description: string
  }): Promise<{ data: LearningStrategy }> {
    const { data } = await practiqApi.post('/learning-strategies', params)
    return data
  }

  async update(id: string, params: {
    name?: string
    code?: string
    description?: string
  }): Promise<{ data: LearningStrategy }> {
    const { data } = await practiqApi.put(`/learning-strategies/${id}`, params)
    return data
  }

  async delete(id: string): Promise<void> {
    await practiqApi.delete(`/learning-strategies/${id}`)
  }

  // Course strategy assignments
  async assignToCourse(courseId: string, strategyId: string): Promise<{ data: CourseLearningStrategy }> {
    const { data } = await practiqApi.post(`/courses/${courseId}/strategies`, { strategy_id: strategyId })
    return { data: normalizeCourseStrategy(data.data) }
  }

  async getCourseStrategies(courseId: string): Promise<{ data: CourseLearningStrategy[] }> {
    const { data } = await practiqApi.get(`/courses/${courseId}/strategies`)
    return { data: (data.data || []).map(normalizeCourseStrategy) }
  }

  async removeCourseStrategy(assignmentId: string): Promise<void> {
    await practiqApi.delete(`/course-learning-strategies/${assignmentId}`)
  }
}

export const strategyService = new StrategyService()
