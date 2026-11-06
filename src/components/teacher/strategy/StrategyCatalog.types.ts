import type { LearningStrategy } from '@/types';

export interface StrategyCatalogProps {
    strategies: LearningStrategy[];
    isSuperAdmin: boolean;
    usageCounts?: Record<string, number>;
}

export interface StrategyCatalogEmits {
    (e: 'create'): void;
    (e: 'edit', strategy: LearningStrategy): void;
    (e: 'delete', strategy: LearningStrategy): void;
}
