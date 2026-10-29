import type { PracticeSheetTestStyle, PracticeSheetType } from './practiceSheets';

export interface LevelSheetSummary {
    id: string;
    title: string;
    topic_id?: string;
    topic_title?: string;

    topic_order?: number;
    level: number;
    sheet_type: PracticeSheetType;
    test_style: PracticeSheetTestStyle;

    scheduled_at?: string;

    available_until?: string;
    exercises: number;
    submitted?: boolean;
    pending_review?: boolean;
    score?: number;
    passed?: boolean;
}

export interface LevelNotebookSummary {
    id: string;
    title: string;
    description: string;
    topic_id?: string;
    topic_title?: string;
    topic_order?: number;
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
