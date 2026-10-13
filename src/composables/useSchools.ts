import { computed, ref } from 'vue';
import { practiqApi } from '@/api/request/server';
import { SchoolService, type School } from '@/services/schools/schoolService';

const service = new SchoolService(practiqApi);

const schools = ref<School[]>([]);
const activeId = ref<string>('');
const loaded = ref(false);
let loadedAll = false;

const STORAGE_KEY = 'practiq.activeSchool';

export function useSchools() {
    const hasChoice = computed(() => schools.value.length > 1);

    const active = computed(
        () => schools.value.find((s) => s.id === activeId.value) ?? schools.value[0] ?? null,
    );

    const administersActive = computed(() => active.value?.role === 'admin');

    function setActive(id: string) {
        if (!schools.value.some((s) => s.id === id)) return;
        activeId.value = id;
        localStorage.setItem(STORAGE_KEY, id);
    }

    async function loadSchools(force = false, includeAll = false) {
        if (loaded.value && !force && (!includeAll || loadedAll)) return schools.value;
        try {
            const { data } = includeAll ? await service.list() : await service.mine();

            const selectable = data.filter((school) => school.status === 'active');
            schools.value = selectable;
            loadedAll = includeAll;

            const remembered = localStorage.getItem(STORAGE_KEY) || '';
            activeId.value = selectable.some((s) => s.id === remembered)
                ? remembered
                : (selectable[0]?.id ?? '');

            if (activeId.value) {
                localStorage.setItem(STORAGE_KEY, activeId.value);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            schools.value = [];
            activeId.value = '';
        } finally {
            loaded.value = true;
        }
        return schools.value;
    }

    function resetSchools() {
        schools.value = [];
        activeId.value = '';
        loaded.value = false;
        loadedAll = false;
        localStorage.removeItem(STORAGE_KEY);
    }

    return {
        schools,
        active,
        activeId,
        hasChoice,
        administersActive,
        loadSchools,
        setActive,
        resetSchools,
        service,
    };
}
