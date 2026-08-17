<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from "vue";
  import { useRouter } from "vue-router";
  import { useAuthStore } from "@/stores/authStore";
  import { useToast } from "primevue/usetoast";
  import { practiqApi } from "@/api/request/server";
  import {
    DashboardService,
    type CourseSummary,
  } from "@/services/dashboard/dashboardService";
  import StudentLayout from "@/layouts/StudentLayout.vue";
  import AssistantChatModal from "@/components/student/assistant/AssistantChatModal.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import StudentCoursesGrid from "@/components/student/dashboard/StudentCoursesGrid.vue";
  import { useProfile } from "@/composables/useProfile";
  import type { TopicProgress } from "@/types";

  const router = useRouter();
  const authStore = useAuthStore();
  const { loadProfile } = useProfile();
  const toast = useToast();
  const dashboardService = new DashboardService(practiqApi);

  const progress = ref<TopicProgress[]>([]);
  const summaries = ref<CourseSummary[]>([]);
  // Computed by the API through the domain rule, so a streak the student
  // already broke is not shown.
  const streakFromApi = ref(0);
  const dismissedReviewCards = ref<Record<string, boolean>>(
    loadDismissedReviewCards(),
  );
  const lastPracticedSheetId = ref<string>("");
  const loading = ref(true);
  const showAssistant = ref(false);

  const firstName = computed(() => {
    const name = authStore.profile?.name || "";
    return name.split(" ")[0] || "Estudiante";
  });

  const groupedProgress = computed(() => {
    const map = new Map<string, (typeof progress.value)[0]>();
    for (const p of progress.value) {
      const existing = map.get(p.topic_id);
      if (!existing) {
        map.set(p.topic_id, { ...p });
      } else {
        existing.mastery_score = Math.max(
          existing.mastery_score,
          p.mastery_score,
        );
        existing.current_level = Math.max(
          existing.current_level,
          p.current_level,
        );
        existing.total_attempts += p.total_attempts;
        existing.correct_attempts += p.correct_attempts;
        existing.streak_days = Math.max(existing.streak_days, p.streak_days);
      }
    }
    return Array.from(map.values());
  });

  const currentTopic = computed(
    () => groupedProgress.value[0]?.topic_title || "—",
  );
  const currentLevel = computed(() => summaries.value[0]?.current_level ?? 1);
  const streakDays = computed(() => streakFromApi.value);
  const averageMastery = computed(() => {
    if (!groupedProgress.value.length) return 0;
    return (
      groupedProgress.value.reduce((acc, item) => acc + item.mastery_score, 0) /
      groupedProgress.value.length
    );
  });
  const totalSheets = computed(() =>
    summaries.value.reduce((acc, s) => acc + s.practice_sheets, 0),
  );
  const totalCorrect = computed(() =>
    groupedProgress.value.reduce((acc, item) => acc + item.correct_attempts, 0),
  );
  const totalAttempts = computed(() =>
    groupedProgress.value.reduce((acc, item) => acc + item.total_attempts, 0),
  );
  const goalProgress = computed(() =>
    totalAttempts.value > 0
      ? Math.min(
          100,
          Math.round((totalCorrect.value / totalAttempts.value) * 100),
        )
      : 0,
  );

  const assistantContext = computed(() => ({
    studentName: authStore.profile?.name,
    courses: summaries.value.map((c) => ({
      title: c.title,
      subject: c.subject,
      grade: "",
      currentLevel: c.current_level,
    })),
    topicProgress: groupedProgress.value.map((p) => ({
      topic: p.topic_title,
      mastery: p.mastery_score,
      level: p.current_level,
      streak: p.streak_days,
    })),
  }));
  // The API already resolves this, and it only offers a sheet whose course is
  // still active, so the local verification it used to do is redundant.
  const featuredSheetId = computed(() => lastPracticedSheetId.value);

  function handleDrawerToggle(e: Event) {
    const customEvent = e as CustomEvent<{ open: boolean }>;
    if (customEvent.detail.open) {
      showAssistant.value = false;
    }
  }

  onMounted(async () => {
    window.addEventListener(
      "student-drawer-toggled",
      handleDrawerToggle as EventListener,
    );

    // Not awaited: the home does not need the profile to render, and blocking
    // on it added a whole round trip before anything else even started.
    if (!authStore.profile) {
      loadProfile()
        .then((profile) => authStore.setProfile(profile))
        .catch(() => undefined);
    }

    try {
      // One request for the whole screen. This used to be about eighteen calls
      // five round trips deep — courses, then sheets, notebooks and levels once
      // per course — and the latency of those trips was the wait, not the work.
      const { data } = await dashboardService.get();

      summaries.value = data.courses || [];
      progress.value = data.progress || [];
      streakFromApi.value = data.streak_days || 0;
      lastPracticedSheetId.value = data.last_practiced_sheet_id || "";
    } catch {
      toast.add({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cargar tu inicio",
        life: 3000,
      });
    } finally {
      loading.value = false;
    }
  });

  onUnmounted(() => {
    window.removeEventListener(
      "student-drawer-toggled",
      handleDrawerToggle as EventListener,
    );
  });

  function startPractice(sheetId: string) {
    router.push(`/student/practice/${sheetId}`);
  }

  function openCourseLevels(courseId: string) {
    router.push(`/student/courses/${courseId}/levels`);
  }

  function startFeaturedPractice() {
    if (featuredSheetId.value) startPractice(featuredSheetId.value);
  }

  function scrollToCourses() {
    document
      .getElementById("courses-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function loadDismissedReviewCards(): Record<string, boolean> {
    try {
      return JSON.parse(
        localStorage.getItem("student-dashboard-dismissed-review-cards") ||
          "{}",
      );
    } catch {
      return {};
    }
  }

  function dismissReviewCard(courseId: string) {
    dismissedReviewCards.value = {
      ...dismissedReviewCards.value,
      [courseId]: true,
    };
    localStorage.setItem(
      "student-dashboard-dismissed-review-cards",
      JSON.stringify(dismissedReviewCards.value),
    );
  }

  // Progress helper functions
  function getCourseProgressPercent(courseId: string): number {
    const level =
      summaries.value.find((s) => s.course_id === courseId)?.current_level ?? 1;
    // Assume 10 levels max for percentage calculation
    const maxLevels = 10;
    return Math.min(100, Math.round((level / maxLevels) * 100));
  }

  function topicsNeedingReview(courseId: string): typeof progress.value {
    const topicIds = new Set(
      summaries.value.find((s) => s.course_id === courseId)?.topic_ids ?? [],
    );

    if (topicIds.size === 0) return [];

    return progress.value
      .filter(
        (p) =>
          topicIds.has(p.topic_id) &&
          p.mastery_score < 60 &&
          p.total_attempts > 0,
      )
      .sort((a, b) => a.mastery_score - b.mastery_score)
      .slice(0, 5);
  }
</script>

<template>
  <StudentLayout>
    <div class="student-home">
      <!-- Loading skeletons -->
      <template v-if="loading">
        <!-- Welcome skeleton -->
        <section class="welcome-banner welcome-banner--skeleton">
          <div class="welcome-copy">
            <Skeleton width="120px" height="14px" />
            <Skeleton width="200px" height="32px" />
            <Skeleton width="90%" height="16px" />
          </div>
          <div class="welcome-topic-card">
            <div class="topic-card__top">
              <div>
                <Skeleton width="80px" height="12px" />
                <Skeleton width="140px" height="20px" />
              </div>
              <Skeleton width="60px" height="24px" rounded />
            </div>
            <Skeleton width="100%" height="8px" rounded />
            <div style="display: flex; justify-content: space-between">
              <Skeleton width="100px" height="12px" />
              <Skeleton width="120px" height="12px" />
            </div>
          </div>
          <div class="welcome-actions">
            <Skeleton variant="button" width="160px" height="44px" />
            <Skeleton variant="button" width="180px" height="44px" />
          </div>
        </section>

        <!-- Metrics skeleton -->
        <section class="metrics-row">
          <div
            v-for="i in 3"
            :key="i"
            class="metric-card metric-card--skeleton"
          >
            <Skeleton variant="circle" size="40px" />
            <div>
              <Skeleton width="50px" height="24px" />
              <Skeleton width="60px" height="14px" />
            </div>
          </div>
        </section>

        <!-- Progress skeleton -->
        <section class="mastery-section">
          <div class="section-head">
            <div>
              <Skeleton width="100px" height="12px" />
              <Skeleton width="180px" height="24px" />
            </div>
          </div>
          <div class="mastery-grid">
            <div
              v-for="i in 3"
              :key="i"
              class="mastery-card mastery-card--skeleton"
            >
              <div class="mastery-card__top">
                <Skeleton width="70%" height="16px" />
                <Skeleton width="60px" height="20px" rounded />
              </div>
              <Skeleton width="100%" height="8px" rounded />
              <div style="display: flex; justify-content: space-between">
                <Skeleton width="80px" height="12px" />
                <Skeleton width="90px" height="12px" />
              </div>
            </div>
          </div>
        </section>

        <!-- Courses skeleton -->
        <section class="courses-section">
          <div class="section-head">
            <div>
              <Skeleton width="80px" height="12px" />
              <Skeleton width="140px" height="24px" />
            </div>
          </div>
          <div class="courses-list">
            <div
              v-for="i in 2"
              :key="i"
              class="course-row course-row--skeleton"
            >
              <Skeleton variant="circle" size="48px" />
              <div class="course-row__info">
                <Skeleton width="60%" height="18px" />
                <Skeleton width="40%" height="14px" />
              </div>
              <Skeleton width="80px" height="32px" rounded />
            </div>
          </div>
        </section>
      </template>

      <template v-else>
        <!-- Welcome banner -->
        <section class="welcome-banner anim-rise">
          <div class="welcome-copy">
            <div class="welcome-kicker">Tu práctica de hoy</div>
            <h1 class="welcome-title">Hola, {{ firstName }}.</h1>
            <p class="welcome-subtitle">
              Sigamos avanzando con ejercicios cortos, retroalimentación
              inmediata y ayuda paso a paso.
            </p>
          </div>

          <div class="welcome-topic-card">
            <div class="topic-card__top">
              <div>
                <div class="topic-card__label">Tema actual</div>
                <div class="topic-card__name">{{ currentTopic }}</div>
              </div>
              <div class="topic-card__level">Nivel {{ currentLevel }}</div>
            </div>
            <div class="progress-bar topic-progress">
              <div
                class="progress-fill"
                :style="{ width: averageMastery + '%' }"
              ></div>
            </div>
            <div class="topic-progress-meta">
              <span>{{ Math.round(averageMastery) }}% de dominio</span>
              <span>{{ totalSheets }} prácticas disponibles</span>
            </div>
          </div>

          <div class="welcome-actions">
            <button
              class="btn btn-primary welcome-btn"
              @click="startFeaturedPractice"
              :disabled="!featuredSheetId"
            >
              <i class="pi pi-play-circle"></i>
              Continuar práctica
            </button>
            <button
              class="btn btn-secondary welcome-btn"
              @click="showAssistant = true"
            >
              <i class="pi pi-comments"></i>
              Practicar con mi asistente
            </button>
          </div>
        </section>

        <!-- Metrics row -->
        <section class="metrics-row anim-stagger">
          <div class="metric-card">
            <div class="metric-card__icon metric-card__icon--fire">
              <img src="@/assets/burn.png" alt="" class="metric-icon-img" />
            </div>
            <div>
              <div class="metric-card__value">{{ streakDays }}</div>
              <div class="metric-card__label">Racha</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-card__icon metric-card__icon--star">
              <img src="@/assets/stars.png" alt="" class="metric-icon-img" />
            </div>
            <div>
              <div class="metric-card__value">{{ totalCorrect }}</div>
              <div class="metric-card__label">Aciertos</div>
            </div>
          </div>

          <div class="metric-card metric-card--goal">
            <div class="metric-card__icon metric-card__icon--goal">
              <img src="@/assets/target.png" alt="" class="metric-icon-img" />
            </div>
            <div class="metric-goal-body">
              <div class="metric-goal-top">
                <span class="metric-card__label">Precisión global</span>
                <span class="metric-goal-count"
                  >{{ totalCorrect }}/{{ totalAttempts }}</span
                >
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: goalProgress + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Progress section -->
        <section v-if="groupedProgress.length > 0" class="mastery-section anim-rise">
          <div class="section-head">
            <div>
              <div class="section-kicker">Resumen rápido</div>
              <h2 class="section-title">Tu progreso por tema</h2>
            </div>
          </div>

          <div class="mastery-grid anim-stagger">
            <article
              v-for="p in groupedProgress"
              :key="p.topic_id"
              class="mastery-card"
            >
              <div class="mastery-card__top">
                <div class="mastery-topic">{{ p.topic_title }}</div>
                <div class="mastery-level">Nivel {{ p.current_level }}</div>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: p.mastery_score + '%' }"
                ></div>
              </div>
              <div class="mastery-meta">
                <span>{{ Math.round(p.mastery_score) }}% dominio</span>
                <span
                  >{{ p.correct_attempts }}/{{
                    p.total_attempts
                  }}
                  aciertos</span
                >
              </div>
            </article>
          </div>
        </section>

        <StudentCoursesGrid
          :courses="summaries"
          :dismissed-review-cards="dismissedReviewCards"
          :topics-needing-review="topicsNeedingReview"
          :get-course-progress-percent="getCourseProgressPercent"
          @open-levels="openCourseLevels"
          @dismiss-review="dismissReviewCard"
        />
      </template>

      <img
        src="@/assets/backpack.png"
        class="dashboard-mascot"
        alt=""
        aria-hidden="true"
      />
    </div>
  </StudentLayout>

  <AssistantChatModal
    :show="showAssistant"
    :student-context="assistantContext"
    @close="showAssistant = false"
  />
</template>

<style scoped>
  .student-home {
    position: relative;
    padding: 24px 28px 40px;
  }

  .loading-state {
    display: flex;
    justify-content: center;
    padding: 80px;
  }

  /* Welcome banner */
  .welcome-banner {
    position: relative;
    z-index: 2;
    padding: 28px 32px;
    border-radius: 28px;
    background: var(--gradient-card-accent);
    border: 1px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-soft);
    margin-bottom: 20px;
    backdrop-filter: blur(18px);
  }

  /* Dashboard mascot */
  .dashboard-mascot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 580px;
    pointer-events: none;
    user-select: none;
    z-index: 0;
  }

  @media (max-width: 1100px) {
    .dashboard-mascot {
      width: 440px;
    }
  }

  @media (max-width: 640px) {
    .dashboard-mascot {
      display: none;
    }
  }

  .welcome-kicker,
  .section-kicker {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
    color: var(--practiq-violet-dark);
    margin-bottom: 6px;
  }

  .welcome-title {
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    line-height: 1.1;
    color: var(--text-heading);
    margin-bottom: 6px;
    font-weight: 800;
  }

  .welcome-subtitle {
    max-width: 560px;
    font-size: var(--text-md);
    color: var(--text-secondary);
    line-height: 1.65;
    margin-bottom: 20px;
  }

  .welcome-topic-card {
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-xl);
    padding: 16px 20px;
    margin-bottom: 18px;
    max-width: 600px;
  }

  .topic-card__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .topic-card__label {
    font-size: var(--text-xs);
    color: var(--text-muted);
    margin-bottom: 2px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .topic-card__name {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-heading);
  }

  .topic-card__level {
    padding: 5px 12px;
    border-radius: var(--radius-pill);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet-dark);
    font-size: var(--text-sm);
    font-weight: 700;
    flex-shrink: 0;
  }

  .topic-progress {
    margin-bottom: 8px;
  }

  .topic-progress-meta {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .welcome-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .welcome-btn {
    min-height: 48px;
    border-radius: var(--radius-lg);
    font-size: var(--text-md);
  }

  /* Metrics row */
  .metrics-row {
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: 16px;
    margin-bottom: 28px;
  }

  .metric-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 22px;
    border-radius: var(--radius-2xl);
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-card-lg);
    position: relative;
    z-index: 2;
  }

  .metric-card--goal {
    gap: 14px;
  }

  .metric-card__icon {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-xl);
    display: grid;
    place-items: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .metric-icon-img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .metric-card__icon--fire {
    background: var(--gradient-fire-soft);
  }
  .metric-card__icon--star {
    background: var(--gradient-star-soft);
  }
  .metric-card__icon--goal {
    background: var(--gradient-goal-soft);
  }

  .metric-card__value {
    font-size: 28px;
    line-height: 1;
    font-weight: 800;
    color: var(--text-heading);
  }

  .metric-card__label {
    font-size: var(--text-base);
    color: var(--text-secondary);
    margin-top: 3px;
  }

  .metric-goal-body {
    flex: 1;
    min-width: 0;
  }

  .metric-goal-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .metric-goal-count {
    font-size: var(--text-base);
    font-weight: 700;
    color: var(--text-primary);
  }

  /* Progress section */
  .mastery-section,
  .courses-section {
    margin-top: 8px;
    margin-bottom: 28px;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 22px;
    font-weight: 800;
    color: var(--text-heading);
    line-height: 1.2;
  }

  .mastery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
  }

  .mastery-card {
    padding: 18px 20px;
    border-radius: var(--radius-2xl);
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    box-shadow: var(--shadow-card);
    position: relative;
    z-index: 2;
    transition: var(--transition);
  }

  .mastery-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-card-lg);
  }

  .mastery-card__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }

  .mastery-topic {
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--text-primary);
  }

  .mastery-level {
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    background: var(--fill-primary-subtle);
    color: var(--practiq-violet-dark);
    font-size: var(--text-xs);
    font-weight: 700;
    flex-shrink: 0;
  }

  .mastery-meta {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-top: 8px;
  }

  /* Courses section */
  .empty-state {
    text-align: center;
    padding: 64px 20px;
    background: var(--surface-glass);
    border-radius: var(--radius-2xl);
    border: 1px dashed var(--surface-border);
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 14px;
  }
  .empty-state h3 {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
  }
  .empty-state p {
    font-size: var(--text-md);
  }

  /* Responsive */

  /* Tablet landscape */
  @media (max-width: 1024px) {
    .student-home {
      padding: 20px 20px 36px;
    }
    .welcome-banner {
      gap: 20px;
    }
    .mastery-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
  }

  /* Tablet portrait */
  @media (max-width: 900px) {
    .metrics-row {
      grid-template-columns: 1fr 1fr;
    }
    .metric-card--goal {
      grid-column: 1 / -1;
    }
    .welcome-banner {
      flex-direction: column;
    }
    .welcome-topic-card {
      width: 100%;
    }
  }

  /* Mobile */
  @media (max-width: 640px) {
    .student-home {
      padding: 16px 14px 28px;
    }
    .welcome-banner {
      padding: 22px 18px;
      border-radius: 22px;
    }
    .welcome-title {
      font-size: 1.6rem;
    }
    .welcome-actions {
      flex-direction: column;
    }
    .welcome-btn {
      width: 100%;
      justify-content: center;
    }
    /* Racha and Aciertos stay side by side: they are two short numbers, and
       one per row pushed the courses off the first screen. The goal card keeps
       the full width because it carries a progress bar. */
    .metrics-row {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .metric-card--goal {
      grid-column: 1 / -1;
    }
    .metric-card {
      gap: 10px;
      padding: 14px;
      min-width: 0;
    }
    .metric-card__icon {
      width: 38px;
      height: 38px;
      font-size: 18px;
    }
    /* The label is the part that would overflow a half-width card. */
    .metric-card__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mastery-grid {
      grid-template-columns: 1fr;
    }
    .section-title {
      font-size: 18px;
    }
  }

  /* Skeleton states */
  .welcome-banner--skeleton {
    pointer-events: none;
  }
  .welcome-banner--skeleton .welcome-copy {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .welcome-banner--skeleton .welcome-topic-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .welcome-banner--skeleton .topic-card__top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .welcome-banner--skeleton .topic-card__top > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .welcome-banner--skeleton .welcome-actions {
    display: flex;
    gap: 14px;
  }

  .metric-card--skeleton {
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .metric-card--skeleton > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .mastery-card--skeleton {
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .mastery-card--skeleton .mastery-card__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .course-row--skeleton {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    background: var(--surface-elevated);
    border: 1px solid var(--surface-elevated-strong);
    border-radius: var(--radius-xl);
    pointer-events: none;
  }
  .course-row--skeleton .course-row__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
