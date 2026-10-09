import type { XPBreakdownEntry } from '@/types/practiceSheets';

export interface XPBubblesProps {
    entries: XPBreakdownEntry[];
    total: number;
    courseTotal?: number;
}
