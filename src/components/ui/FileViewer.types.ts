export interface FileViewerProps {
    show: boolean;
    url?: string;
    title?: string;
    contentType?: string;
}

export interface FileViewerEmits {
    (event: 'close'): void;
}
