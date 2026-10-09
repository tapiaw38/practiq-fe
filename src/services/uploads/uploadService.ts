import type { AxiosInstance } from 'axios';
import type { UploadedFile } from '@/types/uploads';

export interface IUploadService {
    upload(file: File | Blob, filename?: string, folder?: string): Promise<UploadedFile>;
}

export class UploadService implements IUploadService {
    constructor(private readonly api: AxiosInstance) {}

    async upload(
        file: File | Blob,
        filename?: string,
        folder = 'attachments',
    ): Promise<UploadedFile> {
        const form = new FormData();
        const name = filename ?? (file instanceof File ? file.name : 'archivo');
        form.append('file', file, name);
        form.append('folder', folder);

        const { data } = await this.api.post('/uploads', form, {
            headers: { 'Content-Type': undefined },
        });
        return data.data;
    }
}
