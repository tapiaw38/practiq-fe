<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from "vue";
  import StudentLayout from "@/layouts/StudentLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import UserAvatar from "@/components/ui/UserAvatar.vue";
  import { practiqApi } from "@/api/request/server";
  import { useDashboard } from "@/composables/useDashboard";
  import { useCountUp } from "@/composables/useCountUp";
  import { DashboardService } from "@/services/dashboard/dashboardService";
  import type { CourseLeaderboard, CourseSummary } from "@/services/dashboard/dashboardService";

  const { loadDashboard } = useDashboard();
  const service = new DashboardService(practiqApi);
  const courses = ref<CourseSummary[]>([]);
  const selectedCourseID = ref("");
  const loading = ref(true);
  const loadError = ref(false);
  const board = ref<CourseLeaderboard | null>(null);
  const boardLoading = ref(false);
  const boardError = ref(false);
  const boardDirection = ref<"next" | "previous">("next");
  let swipeStartX: number | null = null;
  const courseTabElements = new Map<string, HTMLButtonElement>();

  const selectedCourse = computed(
    () => courses.value.find((course) => course.course_id === selectedCourseID.value) || courses.value[0],
  );

  // Counts up like the XP badge on the home and progress headers, so this feels
  // like the same number rather than a different, plainer one.
  const courseXp = computed(() => (selectedCourse.value ? selectedCourse.value.course_xp : 0));
  const courseXpShown = useCountUp(courseXp);

  const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  /**
   * A podium nobody scored on is not a podium. At the start of a course every
   * student is tied on zero, so a rank of 1 is shared by the whole class:
   * four gold medals, or four rows all reading "1", both look like a bug. A
   * place is only shown once it has been earned.
   */
  const placeFor = (position: number, totalXp: number) => {
    if (totalXp <= 0) return "–";
    return MEDALS[position] || String(position);
  };

  // The top three ride a podium once someone has actually scored; on a course
  // where everyone is still at zero the flat list below is the honest picture
  // and a three-person pedestal would just be decoration.
  const showPodium = computed(() => (board.value?.data[0]?.total_xp ?? 0) > 0);
  const podium = computed(() =>
    showPodium.value ? (board.value?.data ?? []).slice(0, 3).filter((entry) => entry.total_xp > 0) : [],
  );
  const restEntries = computed(() => (board.value?.data ?? []).slice(podium.value.length));

  /** Visual order only: 2nd on the left, 1st in the middle, 3rd on the right. */
  function podiumOrder(position: number) {
    if (position === 1) return 2;
    if (position === 2) return 1;
    return 3;
  }

  async function loadBoard(courseID: string) {
    if (!courseID) return;
    boardLoading.value = true;
    boardError.value = false;
    try {
      board.value = await service.leaderboard(courseID);
    } catch {
      // The XP card above still stands on its own, so a failed ranking is a
      // missing section rather than a broken screen.
      board.value = null;
      boardError.value = true;
    } finally {
      boardLoading.value = false;
    }
  }

  async function selectCourse(courseID: string, direction: "next" | "previous" = "next") {
    if (!courseID || courseID === selectedCourseID.value) return;
    boardDirection.value = direction;
    selectedCourseID.value = courseID;
    // The ranking swipe changes the selected course too. Keep the horizontal
    // course picker centered on that same course, otherwise both areas tell
    // different visual stories on a narrow screen.
    await nextTick();
    courseTabElements.get(courseID)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  function setCourseTabRef(courseID: string, element: unknown) {
    if (element instanceof HTMLButtonElement) courseTabElements.set(courseID, element);
    else courseTabElements.delete(courseID);
  }

  function onBoardTouchStart(event: TouchEvent) {
    swipeStartX = event.changedTouches[0]?.clientX ?? null;
  }

  function onBoardTouchEnd(event: TouchEvent) {
    const startX = swipeStartX;
    swipeStartX = null;
    const endX = event.changedTouches[0]?.clientX;
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 56) return;

    const currentIndex = courses.value.findIndex((course) => course.course_id === selectedCourseID.value);
    if (currentIndex < 0) return;
    const nextIndex = endX < startX ? currentIndex + 1 : currentIndex - 1;
    const nextCourse = courses.value[nextIndex];
    if (nextCourse) selectCourse(nextCourse.course_id, nextIndex > currentIndex ? "next" : "previous");
  }

  watch(courses, (items) => {
    if (!selectedCourseID.value && items.length) selectedCourseID.value = items[0].course_id;
  });

  watch(selectedCourseID, (courseID) => loadBoard(courseID));

  onMounted(async () => {
    try {
      const dashboard = await loadDashboard();
      courses.value = dashboard.courses || [];
    } catch {
      loadError.value = true;
    } finally {
      loading.value = false;
    }
  });
</script>

<template>
  <StudentLayout>
    <div class="league-shell">
      <header class="league-header anim-rise">
        <div>
          <p class="league-kicker">Tu experiencia</p>
          <h1>Mi liga</h1>
          <p>Sumás experiencia dentro de cada curso, práctica por práctica.</p>
        </div>
        <div class="league-xp">
          <span>XP del curso</span>
          <strong>{{ courseXpShown }}</strong>
        </div>
      </header>

      <template v-if="loading">
        <div class="course-tabs course-tabs--loading">
          <Skeleton v-for="n in 3" :key="n" width="142px" height="72px" />
        </div>
        <section class="league-card league-card--skeleton">
          <Skeleton width="42px" height="42px" />
          <Skeleton width="48%" height="22px" class="mt-16" />
          <Skeleton width="75%" height="14px" class="mt-12" />
        </section>
      </template>

      <div v-else-if="loadError" class="league-empty">
        <i class="pi pi-exclamation-circle"></i>
        No pudimos cargar tus cursos. Probá de nuevo en un momento.
      </div>

      <div v-else-if="!courses.length" class="league-empty">
        <i class="pi pi-graduation-cap"></i>
        Cuando te sumes a un curso, vas a ver tu experiencia acá.
      </div>

      <template v-else>
        <div class="course-tabs anim-stagger" role="tablist" aria-label="Elegí un curso">
          <button
            v-for="course in courses"
            :key="course.course_id"
            :ref="(element) => setCourseTabRef(course.course_id, element)"
            class="course-tab"
            :class="{ 'course-tab--active': selectedCourseID === course.course_id }"
            type="button"
            role="tab"
            :aria-selected="selectedCourseID === course.course_id"
            @click="selectCourse(course.course_id, courses.findIndex((item) => item.course_id === course.course_id) > courses.findIndex((item) => item.course_id === selectedCourseID) ? 'next' : 'previous')"
          >
            <span class="course-tab__icon"><i class="pi pi-book"></i></span>
            <span class="course-tab__copy">
              <strong>{{ course.title }}</strong>
              <small>Nivel {{ course.current_level }}</small>
            </span>
          </button>
        </div>

        <section
          :key="selectedCourseID"
          class="league-card league-board anim-rise"
          :class="`league-board--slide-${boardDirection}`"
          aria-labelledby="league-board-title"
          @touchstart.passive="onBoardTouchStart"
          @touchend.passive="onBoardTouchEnd"
        >
          <h2 id="league-board-title"><i class="pi pi-trophy"></i> Tabla de posiciones</h2>

          <div v-if="boardLoading" class="board-rows">
            <Skeleton v-for="n in 5" :key="n" width="100%" height="38px" />
          </div>

          <p v-else-if="boardError" class="board-note">
            No pudimos cargar la tabla. Probá de nuevo en un momento.
          </p>

          <!-- Everyone in the course is ranked, zero included, so an empty
               table means the course has no students yet. -->
          <p v-else-if="!board?.data.length" class="board-note">
            Todavía no hay alumnos en este curso.
          </p>

          <template v-else>
            <div v-if="podium.length" class="podium" :class="`podium--${podium.length}`">
              <div
                v-for="entry in podium"
                :key="entry.position + entry.name"
                class="podium-slot"
                :class="[`podium-slot--${entry.position}`, { 'podium-slot--me': entry.is_me }]"
                :style="{ order: podiumOrder(entry.position) }"
              >
                <span class="podium-medal">{{ MEDALS[entry.position] }}</span>
                <UserAvatar
                  :seed="entry.avatar_seed || ''"
                  :size="entry.position === 1 ? 64 : 52"
                  :label="entry.name"
                />
                <span class="podium-name">{{ entry.is_me ? "Vos" : entry.name }}</span>
                <span class="podium-xp">{{ entry.total_xp }} XP</span>
                <span class="podium-step" aria-hidden="true"></span>
              </div>
            </div>

            <ol v-if="restEntries.length" class="board-rows anim-stagger">
              <li
                v-for="entry in restEntries"
                :key="entry.position + entry.name"
                class="board-row"
                :class="{ 'board-row--me': entry.is_me }"
              >
                <span class="board-pos">{{ placeFor(entry.position, entry.total_xp) }}</span>
                <UserAvatar :seed="entry.avatar_seed || ''" :size="34" :label="entry.name" />
                <span class="board-name">{{ entry.is_me ? "Vos" : entry.name }}</span>
                <span class="board-xp">{{ entry.total_xp }} XP</span>
              </li>
            </ol>

            <!-- Outside the top: shown apart so the student always finds
                 themselves without scrolling the whole course. -->
            <div v-if="board.me" class="board-rows board-rows--detached">
              <div class="board-row board-row--me">
                <span class="board-pos">{{ placeFor(board.me.position, board.me.total_xp) }}</span>
                <UserAvatar :seed="board.me.avatar_seed || ''" :size="34" :label="board.me.name" />
                <span class="board-name">Vos</span>
                <span class="board-xp">{{ board.me.total_xp }} XP</span>
              </div>
            </div>
          </template>
        </section>
      </template>
    </div>
  </StudentLayout>
</template>

<style scoped>
  .league-shell { max-width: 1200px; margin: 0 auto; padding: 24px 20px 72px; display: grid; gap: 18px; }
  .league-header { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:22px 26px; border:1px solid rgba(var(--practiq-violet-rgb),.12); border-radius:var(--radius-2xl); background:var(--elevation-tint-bg); box-shadow:var(--shadow-card); }
  .league-kicker { margin:0 0 4px; color:var(--practiq-violet); font-size:var(--text-xs); font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
  h1, h2, p { margin:0; } h1 { color:var(--text-heading); font-size:var(--font-hero); line-height:1.1; } h2 { color:var(--text-heading); font-size:17px; display:flex; align-items:center; gap:8px; } h2 i { color:var(--practiq-violet); } .league-header p:not(.league-kicker), .league-card p { margin-top:7px; color:var(--text-secondary); line-height:1.5; }
  .league-xp { min-width:120px; padding:10px 18px; border-radius:var(--radius-xl); background:var(--gradient-brand); color:var(--color-on-primary); text-align:center; }
  .league-xp span { display:block; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; opacity:.85; }.league-xp strong { font-size:1.8rem; line-height:1; }
  .course-tabs { display:flex; gap:10px; overflow-x:auto; padding:4px 2px 12px; scrollbar-width:none; scroll-snap-type:x mandatory; isolation:isolate; }.course-tabs::-webkit-scrollbar { display:none; }
  .course-tab { flex:0 0 176px; min-height:76px; display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--surface-glass-border); border-radius:var(--radius-xl); background:var(--elevation-tint-bg); color:var(--text-secondary); text-align:left; cursor:pointer; scroll-snap-align:start; font:inherit; transition:var(--transition-fast); }.course-tab:hover { border-color:rgba(var(--practiq-violet-rgb),.28); }.course-tab--active { background:var(--fill-primary-soft); border-color:var(--practiq-violet); color:var(--practiq-violet-dark); box-shadow:inset 0 0 0 1px rgba(var(--practiq-violet-rgb),.08), 0 5px 14px rgba(var(--practiq-violet-rgb),.10); }.course-tab__icon { width:38px;height:38px;display:grid;place-items:center;border-radius:var(--radius-md);background:var(--surface-card);flex:none; }.course-tab--active .course-tab__icon { background:var(--gradient-brand); color:var(--color-on-primary); }.course-tab__copy { min-width:0; display:grid; gap:3px; }.course-tab strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:var(--text-sm); }.course-tab small { font-size:var(--text-xs); color:var(--text-muted); }
  .league-card { max-width:650px; padding:24px; border-radius:var(--radius-2xl); background:var(--elevation-tint-bg); border:1px solid var(--surface-glass-border); box-shadow:var(--shadow-card); }.league-empty { min-height:190px; display:grid;place-items:center;align-content:center;gap:10px;padding:24px;text-align:center;border-radius:var(--radius-2xl);background:var(--elevation-tint-bg);color:var(--text-secondary);box-shadow:var(--elevation-tint-shadow); }.league-empty i { color:var(--practiq-violet);font-size:1.5rem; }.league-card--skeleton { display:grid; justify-items:start; }.mt-16 { margin-top:16px; }.mt-12 { margin-top:12px; }
  .league-board { width:100%; max-width:none; display:grid; gap:14px; }
  .league-board--slide-next { animation: league-board-in-next .2s ease-out both; }
  .league-board--slide-previous { animation: league-board-in-previous .2s ease-out both; }
  @keyframes league-board-in-next { from { opacity:.35; transform:translateX(18px); } to { opacity:1; transform:translateX(0); } }
  @keyframes league-board-in-previous { from { opacity:.35; transform:translateX(-18px); } to { opacity:1; transform:translateX(0); } }

  /* Podium: three columns, 1st in the middle and taller, so the eye lands on
     rank before it reads a single name. Elevation carries the hierarchy
     rather than a gold/silver/bronze palette the rest of the app doesn't have. */
  .podium { display:flex; align-items:flex-end; justify-content:center; gap:10px; padding:8px 4px 0; }
  .podium-slot { flex:1 1 0; max-width:150px; display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center; }
  .podium-medal { font-size:1.15rem; line-height:1; }
  .podium-slot--1 .podium-medal { font-size:1.4rem; }
  .podium-name { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; font-size:var(--text-sm); color:var(--text-primary); }
  .podium-xp { font-weight:800; font-size:var(--text-xs); color:var(--practiq-violet-dark); }
  .podium-step { width:100%; margin-top:6px; border-radius:var(--radius-md) var(--radius-md) 0 0; }
  .podium-slot--1 .podium-step { height:44px; background:var(--gradient-brand); }
  .podium-slot--2 .podium-step { height:30px; background:var(--fill-primary-soft); }
  .podium-slot--3 .podium-step { height:20px; background:var(--surface-subtle); }
  .podium-slot--me .podium-name { color:var(--practiq-violet-dark); }

  .board-rows { display:grid; gap:6px; margin:0; padding:0; list-style:none; }
  .board-rows--detached { margin-top:10px; padding-top:12px; border-top:1px dashed rgba(var(--surface-border-rgb),.4); }
  .board-row { display:grid; grid-template-columns:28px auto 1fr auto; align-items:center; gap:10px; padding:9px 12px; border-radius:var(--radius-xl); background:var(--surface-subtle); }
  /* The student's own row is tinted rather than just bolded: on a list of
     short similar names, weight alone is easy to miss. */
  .board-row--me { background:var(--fill-primary-soft); color:var(--practiq-violet-dark); }
  .board-pos { font-weight:800; font-size:var(--text-sm); text-align:center; color:var(--text-muted); }
  .board-row--me .board-pos { color:var(--practiq-violet-dark); }
  .board-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; font-size:var(--text-sm); }
  .board-xp { font-weight:800; font-size:var(--text-sm); color:var(--practiq-violet-dark); }
  /* Scoped past `.league-card p`, which outranks a lone class selector. */
  .league-board .board-note { margin:0; color:var(--text-muted); font-size:var(--text-sm); line-height:1.45; }
  .league-board .board-note--quiet { margin-top:10px; padding-top:10px; border-top:1px dashed rgba(var(--surface-border-rgb),.4); }

  @media (max-width: 600px) {
    .league-shell { padding:16px 12px 92px; gap:14px; }
    .league-header { padding:18px; align-items:flex-start; }
    .league-header h1 { font-size:1.35rem; }
    .league-header p:not(.league-kicker) { font-size:var(--text-sm); }
    .league-xp { min-width:80px;padding:9px 10px; }
    .league-xp strong { font-size:1.45rem; }
    .course-tab { flex-basis:150px; min-height:68px; }
    .league-card { padding:20px; }
    .podium { gap:6px; }
    .podium-slot--1 .podium-step { height:36px; }
    .podium-slot--2 .podium-step { height:26px; }
    .podium-slot--3 .podium-step { height:18px; }
    .podium-name { font-size:var(--text-xs); }
  }
</style>
