import type { CourseLevelsResponse, LevelSheetSummary } from '@/types'

export interface StudentLevelsListProps {
  data: CourseLevelsResponse
}

export interface StudentLevelsListEmits {
  (e: 'openPractice', sheetId: string): void
  (e: 'openNotebook', notebookId: string): void
  (e: 'openLevelTest', sheet: LevelSheetSummary): void
}
