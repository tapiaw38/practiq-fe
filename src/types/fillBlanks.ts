export interface FillBlank {
    id: number;
    answer: string;
}

export interface FillBlanksConfig {
    blanks: FillBlank[];
    distractors: string[];
    layout: 'text' | 'code';
}

export type StatementSegment = { kind: 'text'; value: string } | { kind: 'blank'; id: number };
