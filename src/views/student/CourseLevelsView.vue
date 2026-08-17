<script setup lang="ts">
  import { ref, onMounted } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import StudentLayout from "@/layouts/StudentLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import StudentLevelsList from "@/components/student/levels/StudentLevelsList.vue";
  import FileViewer from "@/components/ui/FileViewer.vue";
  import { useCourse } from "@/composables/useCourse";
  import { useLevel } from "@/composables/useLevel";
  import { useMaterial } from "@/composables/useMaterial";
  import type { CourseLevelsResponse, LevelSheetSummary, Material } from "@/types";

  const route = useRoute();
  const router = useRouter();
  const courseId = route.params.courseId as string;

  const { loadCourse } = useCourse();
  const { loadCourseLevels } = useLevel();
  const { loadMaterials, loadMaterial } = useMaterial();
  const loading = ref(true);
  const data = ref<CourseLevelsResponse | null>(null);
  const courseTitle = ref("");
  const materials = ref<Material[]>([]);

  // Text materials carry no file, so the "Abrir" button never shows for them
  // and the two-line clamp left long ones unreadable. This expands in place.
  const expanded = ref<Set<string>>(new Set());

  /** Roughly two clamped lines; below that there is nothing hidden to reveal. */
  const CLAMP_CHARS = 120;

  function canExpand(material: Material) {
    return (
      material.extracted_text_truncated ||
      (material.extracted_text?.length ?? 0) > CLAMP_CHARS
    );
  }

  async function toggleExpanded(material: Material) {
    const next = new Set(expanded.value);
    if (next.has(material.id)) {
      next.delete(material.id);
      expanded.value = next;
      return;
    }
    next.add(material.id);
    expanded.value = next;

    // The listing carries only the beginning of long texts, so expanding one is
    // the moment its rest is worth fetching. Read once: after this the material
    // holds the whole text.
    if (!material.extracted_text_truncated) return;
    const full = await loadMaterial(material.id);
    if (!full) return;
    materials.value = materials.value.map((m) =>
      m.id === material.id
        ? { ...m, extracted_text: full.extracted_text, extracted_text_truncated: false }
        : m,
    );
  }

  onMounted(async () => {
    try {
      const [levelsRes, courseRes, materialsRes] = await Promise.allSettled([
        loadCourseLevels(courseId),
        loadCourse(courseId),
        loadMaterials(courseId),
      ]);
      if (levelsRes.status === "fulfilled") data.value = levelsRes.value;
      if (courseRes.status === "fulfilled")
        courseTitle.value = courseRes.value?.title || "";
      // Materials are extra context, never a reason to fail the whole view.
      if (materialsRes.status === "fulfilled")
        materials.value = materialsRes.value || [];
    } finally {
      loading.value = false;
    }
  });

  function goLevelTest(sheet: LevelSheetSummary) {
    router.push(`/student/level-test/${sheet.id}`);
  }

  function openPractice(sheetId: string) {
    router.push(`/student/practice/${sheetId}`);
  }

  function openNotebook(notebookId: string) {
    router.push(`/student/notebook/${notebookId}`);
  }

  const MATERIAL_ICONS: Record<string, string> = {
    pdf: "pi-file-pdf",
    image: "pi-image",
    video: "pi-video",
    worksheet: "pi-file-edit",
    text: "pi-align-left",
  };

  function materialIcon(type: string) {
    return MATERIAL_ICONS[type] ?? "pi-file";
  }

  const viewing = ref<Material | null>(null);

  /** The signed URL is the only one a browser can open; the bucket is private. */
  function openableURL(material: Material) {
    return material.view_url || material.file_url || "";
  }
</script>

<template>
  <StudentLayout>
    <div class="levels-shell">
      <!-- Header -->
      <header class="levels-header">
        <button class="btn-back" @click="router.back()">
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="header-info">
          <div class="header-kicker">Mis niveles</div>
          <h1 class="header-title">{{ courseTitle }}</h1>
        </div>
        <div v-if="loading" class="current-level-badge-skeleton">
          <Skeleton width="60px" height="10px" />
          <Skeleton width="40px" height="32px" class="mt-4" />
        </div>
        <div v-else class="current-level-badge">
          <span class="cl-label">Nivel actual</span>
          <span class="cl-value">{{ data?.current_level }}</span>
        </div>
      </header>

      <!-- Loading Skeleton -->
      <template v-if="loading">
        <div class="levels-list">
          <div v-for="n in 3" :key="n" class="level-card level-card--skeleton">
            <div class="lc-header">
              <Skeleton
                variant="avatar"
                size="44px"
                :rounded="false"
                class="lc-num-skeleton"
              />
              <div
                class="lc-meta"
                style="display: flex; flex-direction: column; gap: 8px"
              >
                <Skeleton width="80px" height="16px" />
                <Skeleton width="70px" height="20px" />
              </div>
            </div>
            <div class="lc-body" style="margin-top: 16px">
              <div class="lc-section">
                <Skeleton width="80px" height="12px" />
                <div
                  class="lc-items"
                  style="display: flex; flex-direction: column; gap: 10px"
                >
                  <div
                    v-for="i in 2"
                    :key="i"
                    class="lc-item-skeleton"
                    style="
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                    "
                  >
                    <div
                      class="lc-item-info"
                      style="display: flex; flex-direction: column; gap: 6px"
                    >
                      <Skeleton width="140px" height="14px" />
                      <Skeleton width="80px" height="12px" />
                    </div>
                    <Skeleton width="16px" height="16px" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <StudentLevelsList
        v-else-if="data"
        :data="data"
        @open-practice="openPractice"
        @open-notebook="openNotebook"
        @open-level-test="goLevelTest"
      />

      <section v-if="!loading && materials.length" class="materials-section">
        <h2 class="materials-title">
          <i class="pi pi-folder-open"></i> Material del curso
        </h2>
        <ul class="materials-list">
          <li v-for="material in materials" :key="material.id" class="material-item">
            <span class="material-icon">
              <i class="pi" :class="materialIcon(material.type)"></i>
            </span>
            <div class="material-body">
              <div class="material-name">{{ material.title }}</div>
              <p
                v-if="material.extracted_text"
                class="material-text"
                :class="{ 'material-text--open': expanded.has(material.id) }"
              >
                {{ material.extracted_text }}
              </p>
              <button
                v-if="canExpand(material)"
                type="button"
                class="material-more"
                :aria-expanded="expanded.has(material.id)"
                @click="toggleExpanded(material)"
              >
                {{ expanded.has(material.id) ? "Ver menos" : "Ver más" }}
              </button>
            </div>
            <button
              v-if="material.file_url"
              type="button"
              class="material-open"
              @click="viewing = material"
            >
              Abrir <i class="pi pi-eye"></i>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <FileViewer
      :show="!!viewing"
      :url="viewing ? openableURL(viewing) : ''"
      :title="viewing?.title || 'Material'"
      @close="viewing = null"
    />
  </StudentLayout>
</template>

<style scoped>
  .materials-section {
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-card);
    padding: 18px;
  }
  .materials-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 14px;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text-heading);
  }
  .materials-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .material-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-lg);
    background: var(--surface-card);
  }
  .material-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    border-radius: var(--radius-md, 10px);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
  }
  .material-body {
    flex: 1;
    min-width: 0;
  }
  .material-name {
    font-weight: 800;
    color: var(--text-primary);
  }
  .material-text {
    margin: 2px 0 0;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .material-text--open {
    display: block;
    -webkit-line-clamp: none;
    line-clamp: none;
    overflow: visible;
  }
  .material-more {
    margin-top: 4px;
    padding: 4px 0;
    min-height: 32px;
    border: none;
    background: none;
    color: var(--practiq-violet);
    font-size: var(--text-sm);
    font-weight: 700;
    cursor: pointer;
  }
  .material-open {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    padding: 8px 12px;
    border-radius: var(--radius-lg);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet);
    font-weight: 700;
    font-size: var(--text-sm);
    text-decoration: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }
  .levels-shell {
    max-width: 760px;
    margin: 0 auto;
    padding: 24px 20px 60px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Header */
  .levels-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    background: rgba(var(--surface-card-rgb), 0.92);
    border-radius: var(--radius-2xl);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.1);
    box-shadow: 0 4px 20px rgba(var(--practiq-violet-rgb), 0.06);
  }

  .btn-back {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.2);
    background: rgba(var(--surface-card-rgb), 0.8);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .btn-back:hover {
    background: rgba(var(--practiq-violet-rgb), 0.06);
  }

  .header-info {
    flex: 1;
  }
  .header-kicker {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--practiq-violet);
    margin-bottom: 4px;
  }
  .header-title {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
  }

  .current-level-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 20px;
    background: var(--gradient-brand);
    border-radius: var(--radius-xl);
    color: var(--color-on-primary);
    flex-shrink: 0;
  }
  .cl-label {
    font-size: 10px;
    font-weight: 600;
    opacity: 0.85;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cl-value {
    font-size: 1.8rem;
    font-weight: 800;
    line-height: 1;
  }

  /* Skeleton styles */
  .current-level-badge-skeleton {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 20px;
    background: rgba(var(--practiq-violet-light-rgb), 0.1);
    border-radius: var(--radius-xl);
    flex-shrink: 0;
  }
  .level-card--skeleton .lc-num-skeleton {
    border-radius: var(--radius-lg);
  }
  .lc-item-skeleton {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: rgba(var(--surface-bg-rgb), 0.8);
    border-radius: var(--radius-md);
  }
  .mt-4 {
    margin-top: 4px;
  }

  /* Levels list */
  .levels-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .level-card {
    background: rgba(var(--surface-card-rgb), 0.9);
    border-radius: var(--radius-2xl);
    border: 1.5px solid rgba(var(--practiq-violet-rgb), 0.08);
    overflow: hidden;
    transition: box-shadow 0.15s;
  }

  /* Level card header */
  .lc-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 20px;
    border-bottom: 1.5px solid rgba(var(--practiq-violet-rgb), 0.06);
  }

  .lc-meta {
    flex: 1;
  }

  /* Level card body */
  .lc-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .lc-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .lc-items {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .lc-item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  @media (max-width: 1024px) {
    .levels-shell {
      padding: 20px 16px 48px;
    }
    .levels-header {
      padding: 16px 20px;
    }
  }

  @media (max-width: 768px) {
    .levels-shell {
      padding: 16px 12px 40px;
      gap: 14px;
    }
    .levels-header {
      padding: 14px 16px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .header-title {
      font-size: 1.1rem;
    }
    .current-level-badge {
      padding: 8px 14px;
    }
    .cl-value {
      font-size: 1.5rem;
    }
    .lc-header {
      padding: 14px 16px;
      gap: 10px;
      flex-wrap: wrap;
    }
    .lc-body {
      padding: 12px 16px;
    }
  }

  @media (max-width: 600px) {
    .levels-shell {
      padding: 12px 8px 32px;
      gap: 10px;
    }
    .levels-header {
      padding: 12px;
    }
    .lc-header {
      padding: 12px;
    }
    .lc-body {
      padding: 10px 12px;
    }

    /* Tap targets >= 44px en mobile */
    .btn-back {
      width: 44px;
      height: 44px;
    }
  }
</style>
