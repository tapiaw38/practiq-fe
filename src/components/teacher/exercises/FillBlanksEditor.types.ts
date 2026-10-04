import type { FillBlanksConfig } from '@/types/fillBlanks';

export interface FillBlanksEditorProps {
    statement: string;
    modelValue: FillBlanksConfig;
}

export interface FillBlanksEditorEmits {
    (event: 'update:modelValue', value: FillBlanksConfig): void;
    (event: 'insert-blank', marker: string): void;
}
