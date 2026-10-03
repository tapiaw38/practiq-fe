import { practiqApi } from '@/api/request/server';
import { PlatformSettingsService } from '@/services/settings/platformSettingsService';
import { usePlatformSettingsStore } from '@/stores/platformSettingsStore';

export const usePlatformSettings = () => {
    const store = usePlatformSettingsStore(new PlatformSettingsService(practiqApi))();
    return {
        assistant: store.assistant,
        contact: store.contact,
        loadAssistant: store.loadAssistant,
        saveAssistant: store.saveAssistant,
        loadContact: store.loadContact,
        saveContact: store.saveContact,
    };
};
