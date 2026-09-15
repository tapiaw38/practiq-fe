import { computed, ref } from "vue";
import { practiqApi } from "@/api/request/server";
import { SchoolService, type School } from "@/services/schools/schoolService";

const service = new SchoolService(practiqApi);

/**
 * The schools the current user belongs to, and which one they are looking at.
 *
 * Module scope on purpose: the sidebar, the selector and every screen that
 * lists subjects or grades have to agree on the active school, and a per-
 * component copy would let two of them disagree.
 */
const schools = ref<School[]>([]);
const activeId = ref<string>("");
const loaded = ref(false);

const STORAGE_KEY = "practiq.activeSchool";

export function useSchools() {
  /**
   * True only when there is a choice to make. Somebody who belongs to one
   * school never sees a selector: the complexity is paid by whoever needs it.
   */
  const hasChoice = computed(() => schools.value.length > 1);

  const active = computed(
    () => schools.value.find((s) => s.id === activeId.value) ?? schools.value[0] ?? null,
  );

  /** True when the active school is one the user administers. */
  const administersActive = computed(() => active.value?.role === "admin");

  function setActive(id: string) {
    if (!schools.value.some((s) => s.id === id)) return;
    activeId.value = id;
    localStorage.setItem(STORAGE_KEY, id);
  }

  async function loadSchools(force = false, includeAll = false) {
    if (loaded.value && !force) return schools.value;
    try {
      // Platform operators choose the school they are administering. Everyone
      // else only sees schools they belong to.
      const { data } = includeAll ? await service.list() : await service.mine();
      schools.value = data;

      // A remembered school that is no longer ours must not stick: somebody
      // removed from an institution -- or signed in as somebody else on this
      // browser -- would keep pointing at it and see nothing, or worse, have
      // every write rejected because it names a school they don't administer.
      const remembered = localStorage.getItem(STORAGE_KEY) || "";
      activeId.value = data.some((s) => s.id === remembered)
        ? remembered
        : (data[0]?.id ?? "");
      // Write-through: the axios interceptor reads STORAGE_KEY directly, not
      // activeId, so a correction made here must be persisted or the header
      // keeps sending the stale id for as long as nobody opens the selector.
      if (activeId.value) {
        localStorage.setItem(STORAGE_KEY, activeId.value);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      schools.value = [];
      activeId.value = "";
    } finally {
      loaded.value = true;
    }
    return schools.value;
  }

  /** Drops the cache, for a login as somebody else. */
  function resetSchools() {
    schools.value = [];
    activeId.value = "";
    loaded.value = false;
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
