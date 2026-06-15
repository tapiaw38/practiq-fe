import type { Course, Notebook, PracticeSheet, TopicProgress } from '@/types'

export interface StudentCoursesGridProps {
  courses: Course[]
  courseCurrentLevel: Record<string, number>
  courseSheets: Record<string, PracticeSheet[]>
  courseNotebooks: Record<string, Notebook[]>
  dismissedReviewCards: Record<string, boolean>
  topicsNeedingReview: (courseId: string) => TopicProgress[]
  getCourseProgressPercent: (courseId: string) => number
}

export interface StudentCoursesGridEmits {
  (e: 'openLevels', courseId: string): void
  (e: 'dismissReview', courseId: string): void
}
