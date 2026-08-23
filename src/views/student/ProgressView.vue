<script setup lang="ts">
  import { computed, onMounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import StudentLayout from "@/layouts/StudentLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import { useDashboard } from "@/composables/useDashboard";
  import { formatRelativeTime } from "@/utils/formatters";
  import { MASTERED_AT, masteryTier, needsReview } from "@/utils/mastery";
  import type { CourseSummary } from "@/services/dashboard/dashboardService";
  import type { TopicProgress } from "@/types";

  const router = useRouter();
  // Cached read: the home already fetched this, so arriving from its "Ver todo"
  // costs nothing. A direct visit falls back to reading once.
  const { loadDashboard } = useDashboard();

  const progress = ref<TopicProgress[]>([]);
  const courses = ref<CourseSummary[]>([]);
  const loading = ref(true);
  const loadError = ref(false);

  type SortKey = "practice" | "mastery" | "recent";
  const sortKey = ref<SortKey>("practice");

  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: "practice", label: "Para practicar" },
    { key: "mastery", label: "Mejor dominio" },
    { key: "recent", label: "Más reciente" },
  ];

  // Same dedupe the home does: one topic can appear once per course.
  const groupedProgress = computed(() => {
    const map = new Map<string, TopicProgress>();
    for (const p of progress.value) {
      const existing = map.get(p.topic_id);
      if (!existing) {
        map.set(p.topic_id, { ...p });
        continue;
      }
      existing.mastery_score = Math.max(existing.mastery_score, p.mastery_score);
      existing.current_level = Math.max(existing.current_level, p.current_level);
      existing.total_attempts += p.total_attempts;
      existing.correct_attempts += p.correct_attempts;
      existing.streak_days = Math.max(existing.streak_days, p.streak_days);
    }
    return Array.from(map.values());
  });

  const sortedProgress = computed(() => {
    const items = [...groupedProgress.value];
    if (sortKey.value === "mastery") {
      return items.sort((a, b) => b.mastery_score - a.mastery_score);
    }
    if (sortKey.value === "recent") {
      return items.sort(
        (a, b) =>
          new Date(b.last_practiced_at || 0).getTime() -
          new Date(a.last_practiced_at || 0).getTime(),
      );
    }
    // Weakest first: this page exists so the student can find what to work on.
    return items.sort((a, b) => a.mastery_score - b.mastery_score);
  });

  /**
   * One section per course. A topic listed by two courses is rendered under
   * both — it genuinely belongs to each — while the counters above stay on
   * unique topics so the totals still add up.
   */
  const courseGroups = computed(() => {
    const groups = courses.value.map((course) => {
      const ids = new Set(course.topic_ids || []);
      const topics = sortedProgress.value.filter((p) => ids.has(p.topic_id));
      return {
        id: course.course_id,
        title: course.title,
        topics,
        // Only a count: the dashboard sends topic ids without titles, so an
        // untouched topic cannot be named here, only tallied.
        notStarted: Math.max(ids.size - topics.length, 0),
      };
    });

    const claimed = new Set(courses.value.flatMap((c) => c.topic_ids || []));
    const orphans = sortedProgress.value.filter((p) => !claimed.has(p.topic_id));
    if (orphans.length) {
      groups.push({
        id: "__ungrouped__",
        title: "Otros temas",
        topics: orphans,
        notStarted: 0,
      });
    }

    // The sections have to follow the chosen order too, not the order the API
    // happened to list the courses in. Sorting them by their best-ranked topic
    // reuses whichever comparator is active instead of re-deriving one per key,
    // and it is the difference between the control visibly working and looking
    // dead when a course holds a single topic. Courses with nothing started
    // have no rank, so they settle at the end.
    const rank = new Map(sortedProgress.value.map((p, i) => [p.topic_id, i]));
    const groupRank = (topics: TopicProgress[]) =>
      topics.length
        ? Math.min(...topics.map((t) => rank.get(t.topic_id) ?? Infinity))
        : Infinity;

    return groups
      .filter((g) => g.topics.length > 0 || g.notStarted > 0)
      .sort((a, b) => groupRank(a.topics) - groupRank(b.topics));
  });

  /** Counts on unique topics, so they still add up when a shared topic is
   *  drawn under two courses below. */
  const stats = computed(() => {
    const all = groupedProgress.value;
    return {
      total: all.length,
      review: all.filter(needsReview).length,
      // A topic with no attempts has no score to judge, so its zero is not
      // counted as either a failure or a mastery.
      mastered: all.filter(
        (p) => p.total_attempts > 0 && p.mastery_score >= MASTERED_AT,
      ).length,
    };
  });

  const averageMastery = computed(() => {
    if (!groupedProgress.value.length) return 0;
    const total = groupedProgress.value.reduce(
      (acc, item) => acc + item.mastery_score,
      0,
    );
    return Math.round(total / groupedProgress.value.length);
  });

  onMounted(async () => {
    try {
      const data = await loadDashboard();
      progress.value = data.progress || [];
      courses.value = data.courses || [];
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  });
</script>

<template>
  <StudentLayout>
    <div class="progress-shell">
      <header class="progress-header">
        <button
          class="btn-back"
          type="button"
          aria-label="Volver"
          @click="router.back()"
        >
          <i class="pi pi-arrow-left"></i>
        </button>
        <div class="header-info">
          <div class="header-kicker">Todos tus temas</div>
          <h1 class="header-title">Mi progreso</h1>
        </div>
        <div v-if="loading" class="header-badge-skeleton">
          <Skeleton width="60px" height="10px" />
          <Skeleton width="40px" height="32px" class="mt-4" />
        </div>
        <div v-else-if="groupedProgress.length" class="header-badge">
          <span class="hb-label">Dominio</span>
          <span class="hb-value">{{ averageMastery }}%</span>
        </div>
      </header>

      <template v-if="loading">
        <div class="mastery-grid">
          <div v-for="n in 6" :key="n" class="mastery-card">
            <Skeleton width="60%" height="16px" />
            <Skeleton width="100%" height="8px" class="mt-12" />
            <Skeleton width="45%" height="12px" class="mt-12" />
          </div>
        </div>
      </template>

      <div v-else-if="loadError" class="progress-empty">
        <i class="pi pi-exclamation-circle"></i>
        No pudimos cargar tu progreso. Probá de nuevo en un momento.
      </div>

      <div v-else-if="!groupedProgress.length" class="progress-empty">
        <i class="pi pi-chart-line"></i>
        Todavía no hay progreso para mostrar. Empezá una práctica y volvé acá.
      </div>

      <template v-else>
        <div class="stat-row">
          <div class="stat-tile">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">Temas</span>
          </div>
          <div class="stat-tile">
            <span class="stat-value">
              <span class="stat-dot stat-dot--review"></span>{{ stats.review }}
            </span>
            <span class="stat-label">Para repasar</span>
          </div>
          <div class="stat-tile">
            <span class="stat-value">
              <span class="stat-dot stat-dot--mastered"></span
              >{{ stats.mastered }}
            </span>
            <span class="stat-label">Dominados</span>
          </div>
        </div>

        <p class="metric-note">
          El <strong>dominio</strong> pesa más tus prácticas recientes que las
          viejas, así que no coincide con el total de aciertos de abajo.
        </p>

        <div class="sort-row" role="group" aria-label="Ordenar temas">
          <button
            v-for="option in sortOptions"
            :key="option.key"
            type="button"
            class="sort-chip"
            :class="{ 'sort-chip--active': sortKey === option.key }"
            :aria-pressed="sortKey === option.key"
            @click="sortKey = option.key"
          >
            {{ option.label }}
          </button>
        </div>

        <section
          v-for="group in courseGroups"
          :key="group.id"
          class="course-group"
        >
          <div class="course-head">
            <h2 class="course-title">{{ group.title }}</h2>
            <span class="course-count">
              {{ group.topics.length }}
              {{ group.topics.length === 1 ? "tema" : "temas" }}
            </span>
            <span v-if="group.notStarted" class="course-pending">
              {{ group.notStarted }} sin empezar
            </span>
          </div>

          <div v-if="group.topics.length" class="mastery-grid">
            <article
              v-for="p in group.topics"
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
                  :class="`progress-fill--${masteryTier(p.mastery_score)}`"
                  :style="{ width: p.mastery_score + '%' }"
                ></div>
              </div>
              <div class="mastery-meta">
                <span>{{ Math.round(p.mastery_score) }}% dominio</span>
                <span
                  >{{ p.correct_attempts }}/{{ p.total_attempts }} aciertos en
                  total</span
                >
              </div>
              <div class="mastery-foot">
                <span v-if="p.last_practiced_at" class="mastery-last">
                  <i class="pi pi-clock"></i>
                  {{ formatRelativeTime(p.last_practiced_at) }}
                </span>
                <span v-if="needsReview(p)" class="review-tag">
                  <i class="pi pi-refresh"></i>
                  Para repasar
                </span>
              </div>
            </article>
          </div>

          <p v-else class="course-empty">
            Todavía no empezaste ningún tema de este curso.
          </p>
        </section>
      </template>
    </div>
  </StudentLayout>
</template>

<style scoped>
  .progress-shell {
    max-width: 960px;
    margin: 0 auto;
    padding: 24px 20px 60px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .progress-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    background: var(--elevation-panel-bg);
    border-radius: var(--radius-2xl);
    box-shadow: var(--elevation-panel-shadow);
  }

  .btn-back {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    background: rgba(var(--practiq-violet-rgb), 0.08);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .btn-back:hover {
    background: rgba(var(--practiq-violet-rgb), 0.16);
  }

  .header-info {
    flex: 1;
    min-width: 0;
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

  .header-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 20px;
    background: var(--gradient-brand);
    border-radius: var(--radius-xl);
    color: var(--color-on-primary);
    flex-shrink: 0;
  }
  .hb-label {
    font-size: 10px;
    font-weight: 600;
    opacity: 0.85;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .hb-value {
    font-size: 1.8rem;
    font-weight: 800;
    line-height: 1;
  }
  .header-badge-skeleton {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 20px;
    background: rgba(var(--practiq-violet-light-rgb), 0.1);
    border-radius: var(--radius-xl);
    flex-shrink: 0;
  }

  /* Summary */
  .stat-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .stat-tile {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 14px 16px;
    border-radius: var(--radius-xl);
    background: var(--elevation-tint-bg);
    box-shadow: var(--elevation-tint-shadow);
  }
  .stat-value {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 1.6rem;
    font-weight: 800;
    line-height: 1.1;
    color: var(--text-heading);
  }
  /* Identity rides the swatch, never the digits: a light status hue is hard to
     read as text, and the number stays in ink at full contrast. */
  .stat-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--seg-color);
  }
  .stat-dot--review {
    --seg-color: var(--color-warning);
  }
  .stat-dot--mastered {
    --seg-color: var(--color-success);
  }
  .stat-label {
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
  }

  .metric-note {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-muted);
    line-height: 1.5;
  }

  .sort-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .sort-chip {
    padding: 8px 14px;
    min-height: 38px;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--elevation-tint-bg);
    box-shadow: var(--elevation-tint-shadow);
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: 700;
    cursor: pointer;
    transition: var(--transition-fast);
  }
  .sort-chip:hover {
    color: var(--practiq-violet-dark);
  }
  .sort-chip--active {
    background: var(--fill-primary-soft);
    color: var(--practiq-violet-dark);
  }

  /* Course grouping */
  .course-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .course-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 10px;
  }
  .course-title {
    font-size: var(--text-lg);
    font-weight: 800;
    color: var(--text-heading);
    margin: 0;
  }
  .course-count {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }
  .course-pending {
    padding: 3px 10px;
    border-radius: var(--radius-pill);
    background: var(--fill-primary-soft);
    color: var(--practiq-violet-dark);
    font-size: var(--text-xs);
    font-weight: 700;
  }
  .course-empty {
    padding: 16px 18px;
    border-radius: var(--radius-xl);
    background: var(--elevation-tint-bg);
    box-shadow: var(--elevation-tint-shadow);
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }

  .mastery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;
  }

  .mastery-card {
    padding: 18px 20px;
    border-radius: var(--radius-2xl);
    background: var(--elevation-tint-bg);
    box-shadow: var(--elevation-tint-shadow);
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

  .progress-bar {
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--fill-border-muted);
    overflow: hidden;
  }
  /* Colour carries the same message as the number, so "what needs work" reads
     without comparing percentages card by card. */
  .progress-fill {
    height: 100%;
    border-radius: var(--radius-pill);
    background: var(--gradient-brand);
    transition: width 0.3s ease;
  }
  /* Same three tier colours as the figure above, so a card and its segment
     always agree. */
  .progress-fill--review {
    background: var(--color-warning);
  }
  .progress-fill--progress {
    background: var(--practiq-violet);
  }
  .progress-fill--mastered {
    background: var(--color-success);
  }

  .mastery-meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    margin-top: 8px;
  }
  .mastery-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }
  .mastery-last {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-xs);
    color: var(--text-muted);
  }
  .review-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    background: rgba(var(--color-warning-rgb), 0.14);
    color: var(--color-warning-dark);
    font-size: var(--text-xs);
    font-weight: 700;
  }

  .progress-empty {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 28px 24px;
    border-radius: var(--radius-2xl);
    background: var(--elevation-tint-bg);
    box-shadow: var(--elevation-tint-shadow);
    color: var(--text-secondary);
  }

  .mt-4 {
    margin-top: 4px;
  }
  .mt-12 {
    margin-top: 12px;
  }

  @media (max-width: 768px) {
    .progress-shell {
      padding: 16px 12px 40px;
      gap: 14px;
    }
    .progress-header {
      padding: 14px 16px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .header-title {
      font-size: 1.1rem;
    }
    .header-badge {
      padding: 8px 14px;
    }
    .hb-value {
      font-size: 1.5rem;
    }
  }

  @media (max-width: 600px) {
    .mastery-grid {
      grid-template-columns: 1fr;
    }
    .btn-back {
      width: 44px;
      height: 44px;
    }
    /* Three equal columns instead of wrapping: as a flex row the third chip
       dropped to its own line, which read as an unrelated control. */
    .sort-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
    .sort-chip {
      min-height: 44px;
      padding: 8px 4px;
      text-align: center;
      font-size: var(--text-xs);
    }
  }
</style>
