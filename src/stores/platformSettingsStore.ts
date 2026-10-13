import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
    AssistantSettings,
    IPlatformSettingsService,
    SiteContact,
} from '@/services/settings/platformSettingsService';

export const usePlatformSettingsStore = (service: IPlatformSettingsService) =>
    defineStore('platform-settings', () => {
        const assistant = ref<AssistantSettings | null>(null);
        const contact = ref<SiteContact | null>(null);

        const loadAssistant = async () => {
            const response = await service.getAssistant();
            assistant.value = response.data;
            return response.data;
        };

        const saveAssistant = async (input: Pick<AssistantSettings, 'base_url' | 'api_key'>) => {
            await service.saveAssistant(input);
            return loadAssistant();
        };

        const loadContact = async () => {
            const response = await service.getContact();
            contact.value = response.data;
            return response.data;
        };

        const saveContact = async (input: SiteContact) => {
            await service.saveContact(input);
            contact.value = input;
        };

        return { assistant, contact, loadAssistant, saveAssistant, loadContact, saveContact };
    });
