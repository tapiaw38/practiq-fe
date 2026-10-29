import type { Exercise } from '@/types';

export interface FillBlanksAnswerProps {
    exercise: Pick<Exercise, 'question' | 'metadata'>;
    modelValue?: string;
}

export interface FillBlanksAnswerEmits {
    (event: 'update:modelValue', value: string): void;
}
