export interface FileUploadFieldProps {
    modelValue?: string;
    folder?: string;
    accept?: string;
    label?: string;
}

export interface FileUploadFieldEmits {
    (event: 'update:modelValue', value: string): void;
}
