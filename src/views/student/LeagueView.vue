<script setup lang="ts">
  import { computed, onMounted, ref, watch } from "vue";
  import StudentLayout from "@/layouts/StudentLayout.vue";
  import Skeleton from "@/components/ui/Skeleton.vue";
  import { useDashboard } from "@/composables/useDashboard";
  import type { CourseSummary } from "@/services/dashboard/dashboardService";

  const { loadDashboard } = useDashboard();
  const courses = ref<CourseSummary[]>([]);
  const selectedCourseID = ref("");
  const loading = ref(true);
  const loadError = ref(false);

  const selectedCourse = computed(
    () => courses.value.find((course) => course.course_id === selectedCourseID.value) || courses.value[0],
  );

  watch(courses, (items) => {
    if (!selectedCourseID.value && items.length) selectedCourseID.value = items[0].course_id;
  });

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
      <header class="league-header">
        <div>
          <p class="league-kicker">Tu experiencia</p>
          <h1>Mi liga</h1>
          <p>Sumás experiencia dentro de cada curso, práctica por práctica.</p>
        </div>
        <div class="league-xp">
          <span>XP del curso</span>
          <strong>{{ selectedCourse ? selectedCourse.course_xp : 0 }}</strong>
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
        <div class="course-tabs" role="tablist" aria-label="Elegí un curso">
          <button
            v-for="course in courses"
            :key="course.course_id"
            class="course-tab"
            :class="{ 'course-tab--active': selectedCourseID === course.course_id }"
            type="button"
            role="tab"
            :aria-selected="selectedCourseID === course.course_id"
            @click="selectedCourseID = course.course_id"
          >
            <span class="course-tab__icon"><i class="pi pi-book"></i></span>
            <span class="course-tab__copy">
              <strong>{{ course.title }}</strong>
              <small>Nivel {{ course.current_level }}</small>
            </span>
          </button>
        </div>

        <section v-if="selectedCourse" class="league-card">
          <div class="league-card__top">
            <span class="league-course-label">{{ selectedCourse.subject || "Curso" }}</span>
            <span class="league-level">Nivel {{ selectedCourse.current_level }}</span>
          </div>
          <div class="league-medal" aria-hidden="true"><i class="pi pi-bolt"></i></div>
          <h2>Tu recorrido en {{ selectedCourse.title }}</h2>
          <p>
            Cada acierto, práctica completa y prueba de nivel aprobada suma XP.
            Tus puntos nunca bajan por equivocarte.
          </p>
          <div class="league-rewards" aria-label="Cómo se suma experiencia">
            <span><b>+1</b> ejercicio resuelto</span>
            <span><b>+10</b> acierto</span>
            <span><b>+10</b> práctica completa</span>
            <span><b>+40</b> prueba aprobada</span>
          </div>
          <div class="league-pending">
            <i class="pi pi-chart-line"></i>
            <span>Tu tabla de posiciones se habilitará cuando definamos si el curso comparte ranking entre compañeros.</span>
          </div>
        </section>
      </template>
    </div>
  </StudentLayout>
</template>

<style scoped>
  .league-shell { max-width: 1200px; margin: 0 auto; padding: 24px 20px 72px; display: grid; gap: 18px; }
  .league-header { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:22px 26px; border:1px solid rgba(var(--practiq-violet-rgb),.12); border-radius:var(--radius-2xl); background:var(--elevation-tint-bg); box-shadow:var(--shadow-card); }
  .league-kicker { margin:0 0 4px; color:var(--practiq-violet); font-size:var(--text-xs); font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
  h1, h2, p { margin:0; } h1 { color:var(--text-heading); font-size:var(--font-hero); line-height:1.1; } h2 { color:var(--text-heading); font-size:17px; } .league-header p:not(.league-kicker), .league-card p { margin-top:7px; color:var(--text-secondary); line-height:1.5; }
  .league-xp { min-width:120px; padding:10px 18px; border-radius:var(--radius-xl); background:var(--gradient-brand); color:var(--color-on-primary); text-align:center; }
  .league-xp span { display:block; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; opacity:.85; }.league-xp strong { font-size:1.8rem; line-height:1; }
  .course-tabs { display:flex; gap:10px; overflow-x:auto; padding:3px 1px 8px; scrollbar-width:none; scroll-snap-type:x mandatory; }.course-tabs::-webkit-scrollbar { display:none; }
  .course-tab { flex:0 0 176px; min-height:76px; display:flex; align-items:center; gap:10px; padding:12px; border:1px solid var(--surface-glass-border); border-radius:var(--radius-xl); background:var(--elevation-tint-bg); color:var(--text-secondary); text-align:left; cursor:pointer; scroll-snap-align:start; font:inherit; transition:var(--transition-fast); }.course-tab:hover { border-color:rgba(var(--practiq-violet-rgb),.28); }.course-tab--active { background:var(--fill-primary-soft); border-color:var(--practiq-violet); color:var(--practiq-violet-dark); box-shadow:0 8px 22px rgba(var(--practiq-violet-rgb),.14); }.course-tab__icon { width:38px;height:38px;display:grid;place-items:center;border-radius:var(--radius-md);background:var(--surface-card);flex:none; }.course-tab--active .course-tab__icon { background:var(--gradient-brand); color:var(--color-on-primary); }.course-tab__copy { min-width:0; display:grid; gap:3px; }.course-tab strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:var(--text-sm); }.course-tab small { font-size:var(--text-xs); color:var(--text-muted); }
  .league-card { max-width:650px; padding:24px; border-radius:var(--radius-2xl); background:var(--elevation-tint-bg); border:1px solid var(--surface-glass-border); box-shadow:var(--shadow-card); }.league-card__top { display:flex; align-items:center; justify-content:space-between; gap:10px; }.league-course-label,.league-level { padding:5px 10px;border-radius:var(--radius-pill);font-size:var(--text-xs);font-weight:800; }.league-course-label { color:var(--practiq-violet-dark);background:var(--fill-primary-soft); }.league-level { color:var(--text-secondary);background:var(--surface-subtle); }.league-medal { width:52px;height:52px;margin:18px 0 14px;display:grid;place-items:center;border-radius:18px;background:var(--gradient-brand);color:var(--color-on-primary);font-size:1.35rem;box-shadow:var(--shadow-indigo); }.league-rewards { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }.league-rewards span { padding:7px 10px;border-radius:var(--radius-pill);background:var(--surface-subtle);color:var(--text-secondary);font-size:var(--text-xs);font-weight:700; }.league-rewards b { color:var(--practiq-violet-dark); }.league-pending { display:flex;gap:9px;align-items:flex-start;margin-top:20px;padding-top:16px;border-top:1px solid rgba(var(--surface-border-rgb),.28);color:var(--text-muted);font-size:var(--text-sm);line-height:1.4; }.league-pending i { color:var(--practiq-violet);margin-top:2px; }.league-empty { min-height:190px; display:grid;place-items:center;align-content:center;gap:10px;padding:24px;text-align:center;border-radius:var(--radius-2xl);background:var(--elevation-tint-bg);color:var(--text-secondary);box-shadow:var(--elevation-tint-shadow); }.league-empty i { color:var(--practiq-violet);font-size:1.5rem; }.league-card--skeleton { display:grid; justify-items:start; }.mt-16 { margin-top:16px; }.mt-12 { margin-top:12px; }
  @media (max-width: 600px) { .league-shell { padding:16px 12px 92px; gap:14px; }.league-header { padding:18px; align-items:flex-start; }.league-header h1 { font-size:1.35rem; }.league-header p:not(.league-kicker) { font-size:var(--text-sm); }.league-xp { min-width:80px;padding:9px 10px; }.league-xp strong { font-size:1.45rem; }.course-tab { flex-basis:150px; min-height:68px; }.league-card { padding:20px; }.league-rewards { display:grid; grid-template-columns:1fr; }.league-rewards span { text-align:center; } }
</style>
