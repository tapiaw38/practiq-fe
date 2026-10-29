import type { Exercise } from '@/types';
import type { UploadedFile } from '@/types/uploads';

export interface AttachmentAnswerProps {
    exercise: Pick<Exercise, 'metadata'>;
    modelValue?: UploadedFile | null;
}

export interface AttachmentAnswerEmits {
    (event: 'update:modelValue', value: UploadedFile | null): void;
    (event: 'update:uploading', value: boolean): void;
}
