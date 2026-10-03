export interface UiModalProps {
    visible?: boolean;
    label?: string;
    dismissable?: boolean;
}

export interface UiModalEmits {
    (event: 'update:visible', value: boolean): void;
    (event: 'close'): void;
}
