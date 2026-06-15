import type {
  LevelNotebookSummary,
  LevelSheetSummary,
  Notebook,
  PracticeSheet,
} from "@/types";

export interface TeacherLevelItem {
  level: number;
  practices: Array<LevelSheetSummary | PracticeSheet>;
  levelTest: LevelSheetSummary | PracticeSheet | null;
  notebooks: Array<LevelNotebookSummary | Notebook>;
}

export interface CourseLevelsPanelProps {
  levels: TeacherLevelItem[];
}

export interface CourseLevelsPanelEmits {
  (e: "createNextLevel"): void;
  (e: "createPractice", level: number): void;
  (e: "createLevelTest", level: number): void;
  (e: "createNotebook", level: number): void;
  (e: "openSheet", sheetId: string): void;
  (e: "openNotebook", notebookId: string): void;
}
