import type {
  PracticeSheetTestStyle,
  PracticeSheetType,
} from "./practiceSheets";

export interface LevelSheetSummary {
  id: string;
  title: string;
  level: number;
  sheet_type: PracticeSheetType;
  test_style: PracticeSheetTestStyle;
  /** UTC ISO string. Absent when the sheet has no scheduled date. */
  scheduled_at?: string;
  /** UTC ISO string. Absent means the sheet stays open once it opens. */
  available_until?: string;
  exercises: number;
}

export interface LevelNotebookSummary {
  id: string;
  title: string;
  description: string;
  level: number;
  pages: number;
}

export interface LevelData {
  level: number;
  unlocked: boolean;
  practices: LevelSheetSummary[];
  level_test: LevelSheetSummary | null;
  notebooks: LevelNotebookSummary[];
}

export interface CourseLevelsResponse {
  current_level: number;
  levels: LevelData[];
}
