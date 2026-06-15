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
