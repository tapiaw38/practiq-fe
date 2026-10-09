export interface UploadedFile {
    url: string;
    preview_url?: string;
    filename: string;
    content_type: string;
    kind: string;
    size: number;
}
