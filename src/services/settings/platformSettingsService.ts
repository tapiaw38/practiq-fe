import type { AxiosInstance } from 'axios';

export type AssistantSettings = {
    base_url: string;
    api_key: string;
    configured: boolean;
    updated_by: string;
};

export type SiteContact = { email: string; phone: string; whatsapp: string };

export interface IPlatformSettingsService {
    getAssistant(): Promise<{ data: AssistantSettings }>;
    saveAssistant(input: Pick<AssistantSettings, 'base_url' | 'api_key'>): Promise<void>;
    getContact(): Promise<{ data: SiteContact }>;
    saveContact(input: SiteContact): Promise<void>;
}

export class PlatformSettingsService implements IPlatformSettingsService {
    constructor(private readonly api: AxiosInstance) {}

    async getAssistant(): Promise<{ data: AssistantSettings }> {
        const { data } = await this.api.get('/gillie-settings');
        return data;
    }

    async saveAssistant(input: Pick<AssistantSettings, 'base_url' | 'api_key'>): Promise<void> {
        await this.api.put('/gillie-settings', input);
    }

    async getContact(): Promise<{ data: SiteContact }> {
        const { data } = await this.api.get('/site-contact');
        return data;
    }

    async saveContact(input: SiteContact): Promise<void> {
        await this.api.put('/site-contact', input);
    }
}
