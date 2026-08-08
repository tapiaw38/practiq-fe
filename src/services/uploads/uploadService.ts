import type { AxiosInstance } from "axios";

export interface UploadedFile {
  url: string;
  filename: string;
  content_type: string;
  kind: string;
  size: number;
}

export interface IUploadService {
  upload(file: File | Blob, filename?: string): Promise<UploadedFile>;
}

export class UploadService implements IUploadService {
  constructor(private readonly api: AxiosInstance) {}

  async upload(file: File | Blob, filename?: string): Promise<UploadedFile> {
    const form = new FormData();
    const name = filename ?? (file instanceof File ? file.name : "archivo");
    form.append("file", file, name);
    form.append("folder", "attachments");

    const { data } = await this.api.post("/uploads", form, {
      // Let the browser set the multipart boundary.
      headers: { "Content-Type": undefined },
    });
    return data.data;
  }
}
