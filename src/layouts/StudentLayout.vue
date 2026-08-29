<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, reactive, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useAuthStore } from "@/stores/authStore";
  import { useDashboard } from "@/composables/useDashboard";
  import { useLevel } from "@/composables/useLevel";
  import ChangePasswordModal from "@/components/auth/ChangePasswordModal.vue";
  import SetPasswordModal from "@/components/auth/SetPasswordModal.vue";
  import NotificationBell from "@/components/ui/NotificationBell.vue";
  import type { LevelData } from "@/types";

  interface CourseNavItem {
    id: string;
    title: string;
    currentLevel: number;
    levels: LevelData[];
    loading: boolean;
  }

  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const { loadDashboard } = useDashboard();
  const { loadCourseLevels } = useLevel();
  const profile = computed(() => authStore.profile);
  const userInitial = computed(
    () => profile.value?.name?.[0]?.toUpperCase() || "A",
  );
  const navOpen = ref(false);
  const coursesOpen = ref(false);
  const loadingCourses = ref(false);
  const coursesData = ref<CourseNavItem[]>([]);
  const openCourses = ref(new Set<string>());
  const showChangePassword = ref(false);
  const showSetPassword = ref(false);
  const lastPracticedSheetId = ref(
    localStorage.getItem("practiq-last-practice") || "",
  );
  const isGoogleUser = computed(() => authStore.authMethod === "google");
  // openLevels[courseId] = Set of open level numbers
  const openLevels = reactive<Record<string, Set<number>>>({});

  function toggleCourse(id: string) {
    const s = new Set(openCourses.value);
    if (s.has(id)) {
      s.delete(id);
    } else {
      s.add(id);
      loadCourseNavLevels(id);
    }
    openCourses.value = s;
  }

  function toggleLevel(courseId: string, level: number) {
    if (!openLevels[courseId]) openLevels[courseId] = new Set();
    const s = new Set(openLevels[courseId]);
    s.has(level) ? s.delete(level) : s.add(level);
    openLevels[courseId] = s;
  }

  async function loadCourseNavLevels(courseId: string) {
    const course = coursesData.value.find((c) => c.id === courseId);
    if (!course || course.levels.length) return;
    course.loading = true;
    try {
      const res = await loadCourseLevels(courseId);
      course.currentLevel = res.current_level;
      course.levels = res.levels;
      // Auto-open current level
      if (!openLevels[courseId]) openLevels[courseId] = new Set();
      openLevels[courseId] = new Set([res.current_level]);
    } finally {
      course.loading = false;
    }
  }

  watch(coursesOpen, async (open) => {
    if (!open || coursesData.value.length) return;
    loadingCourses.value = true;
    try {
      // The home already read these, so opening this list from there costs
      // nothing. It used to call `/courses?role=student` again, which answered
      // with grade ids, subject ids and descriptions to draw a title.
      const dashboard = await loadDashboard();
      coursesData.value = (dashboard.courses || []).map((c) => ({
        id: c.course_id,
        title: c.title,
        // The level the student is on, which the badge shows. It used to start
        // at 1 for every course until the levels call came back and corrected
        // it, so the sidebar briefly claimed everyone was on level 1.
        currentLevel: c.current_level,
        levels: [],
        loading: false,
      }));
    } catch {
      coursesData.value = [];
    } finally {
      loadingCourses.value = false;
    }
  });

  function goPractice(id: string) {
    navOpen.value = false;
    router.push(`/student/practice/${id}`);
  }

  function goLevelTest(id: string) {
    navOpen.value = false;
    router.push(`/student/level-test/${id}`);
  }

  function goNotebook(id: string) {
    navOpen.value = false;
    router.push(`/student/notebook/${id}`);
  }

  function syncDesktopState() {
    if (window.innerWidth > 920) navOpen.value = false;
  }

  function syncLastPractice(event: Event) {
    const id = (event as CustomEvent<{ id?: string }>).detail?.id || "";
    lastPracticedSheetId.value = id;
    if (id) localStorage.setItem("practiq-last-practice", id);
  }

  watch(
    () => route.fullPath,
    () => {
      navOpen.value = false;
    },
  );

  watch(navOpen, (open) => {
    window.dispatchEvent(
      new CustomEvent("student-drawer-toggled", { detail: { open } }),
    );
  });

  onMounted(() => {
    window.addEventListener("resize", syncDesktopState);
    window.addEventListener("practiq:last-practice-changed", syncLastPractice);
  });
  onUnmounted(() => {
    window.removeEventListener("resize", syncDesktopState);
    window.removeEventListener("practiq:last-practice-changed", syncLastPractice);
  });

  function logout() {
    authStore.clearAuth();
    localStorage.removeItem("practiq_profile");
    localStorage.removeItem("practiq-last-practice");
    router.push("/login");
  }
</script>

<template>
  <div class="app-shell">
    <header class="mobile-topbar">
      <button
        class="topbar-btn"
        type="button"
        aria-label="Abrir menú de navegación"
        @click="navOpen = true"
      >
        <i class="pi pi-bars"></i>
      </button>

      <div class="topbar-brand">
        <img src="@/assets/logo.png" class="topbar-logo" alt="Practiq" />
      </div>

      <div class="topbar-right">
        <NotificationBell />
        <div class="topbar-avatar">{{ userInitial }}</div>
      </div>
    </header>

    <div v-if="navOpen" class="drawer-backdrop" @click="navOpen = false"></div>

    <aside class="sidebar" :class="{ 'sidebar--open': navOpen }">
      <div class="sidebar-brand">
        <img src="@/assets/logo.png" class="sidebar-logo" alt="Practiq" />
        <button class="close-btn" type="button" @click="navOpen = false">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">Estudiante</div>
        <RouterLink
          to="/student/dashboard"
          class="nav-item"
          active-class="nav-item-active"
          @click="navOpen = false"
        >
          <span class="nav-icon"><i class="pi pi-home"></i></span>
          <span>Inicio</span>
        </RouterLink>

        <RouterLink
          v-if="lastPracticedSheetId"
          :to="`/student/practice/${lastPracticedSheetId}`"
          class="nav-item nav-item--continue"
          title="Continuar última práctica"
          aria-label="Continuar última práctica"
          @click="navOpen = false"
        >
          <span class="nav-icon"><i class="pi pi-play-circle"></i></span>
          <span>Continuar</span>
        </RouterLink>

        <RouterLink
          to="/student/progress"
          class="nav-item"
          active-class="nav-item-active"
          @click="navOpen = false"
        >
          <span class="nav-icon"><i class="pi pi-chart-line"></i></span>
          <span>Mi progreso</span>
        </RouterLink>

        <!-- Courses and levels -->
        <div class="nav-group">
          <button
            class="nav-item nav-item-btn"
            :title="coursesOpen ? 'Cerrar Mis Cursos' : 'Abrir Mis Cursos'"
            :aria-expanded="coursesOpen"
            aria-controls="student-courses-nav"
            @click="coursesOpen = !coursesOpen"
          >
            <span class="nav-icon"><i class="pi pi-book"></i></span>
            <span>Mis Cursos</span>
            <i
              class="pi nav-chevron"
              :class="coursesOpen ? 'pi-chevron-down' : 'pi-chevron-right'"
            ></i>
          </button>

          <div v-if="coursesOpen" id="student-courses-nav" class="nav-sub">
            <div v-if="loadingCourses" class="nav-sub-loading" aria-busy="true" aria-label="Cargando cursos">
              <span v-for="n in 3" :key="n" class="nav-loading-line"></span>
            </div>
            <template v-else-if="coursesData.length">
              <div
                v-for="c in coursesData"
                :key="c.id"
                class="nav-course-group"
              >
                <!-- Course header -->
                <button class="nav-course-toggle" @click="toggleCourse(c.id)">
                  <i class="pi pi-graduation-cap"></i>
                  <span class="nav-course-toggle-title">{{ c.title }}</span>
                  <i
                    class="pi nav-chevron"
                    :class="
                      openCourses.has(c.id)
                        ? 'pi-chevron-down'
                        : 'pi-chevron-right'
                    "
                  ></i>
                </button>

                <!-- Levels list -->
                <template v-if="openCourses.has(c.id)">
                  <div v-if="c.loading" class="nav-sub-loading">
                    <i class="pi pi-spin pi-spinner"></i>
                  </div>
                  <template v-else>
                    <div
                      v-for="lv in c.levels"
                      :key="lv.level"
                      class="nav-level-group"
                    >
                      <!-- Level row -->
                      <button
                        class="nav-level-row"
                        :class="{
                          'nav-level-row--current': lv.level === c.currentLevel,
                          'nav-level-row--locked': !lv.unlocked,
                        }"
                        @click="lv.unlocked && toggleLevel(c.id, lv.level)"
                        :disabled="!lv.unlocked"
                      >
                        <span
                          class="nav-level-badge"
                          :class="{ 'nav-level-badge--locked': !lv.unlocked }"
                        >
                          <i v-if="!lv.unlocked" class="pi pi-lock"></i>
                          <span v-else>{{ lv.level }}</span>
                        </span>
                        <span class="nav-level-label"
                          >Nivel {{ lv.level }}</span
                        >
                        <span
                          v-if="lv.level === c.currentLevel"
                          class="nav-level-tag"
                          >En curso</span
                        >
                        <i
                          v-if="lv.unlocked"
                          class="pi nav-chevron"
                          :class="
                            openLevels[c.id]?.has(lv.level)
                              ? 'pi-chevron-down'
                              : 'pi-chevron-right'
                          "
                        ></i>
                      </button>

                      <!-- Level content -->
                      <template
                        v-if="lv.unlocked && openLevels[c.id]?.has(lv.level)"
                      >
                        <!-- Practices -->
                        <template v-if="lv.practices?.length">
                          <div class="nav-section-tag">Prácticas</div>
                          <button
                            v-for="sheet in lv.practices"
                            :key="sheet.id"
                            class="nav-book-item nav-book-item--practice"
                            @click="goPractice(sheet.id)"
                          >
                            <i class="pi pi-pencil"></i>
                            <span>{{ sheet.title }}</span>
                          </button>
                        </template>

                        <!-- Notebooks -->
                        <template v-if="lv.notebooks?.length">
                          <div class="nav-section-tag">Cuadernos</div>
                          <button
                            v-for="nb in lv.notebooks"
                            :key="nb.id"
                            class="nav-book-item nav-book-item--notebook"
                            @click="goNotebook(nb.id)"
                          >
                            <i class="pi pi-book"></i>
                            <span>{{ nb.title }}</span>
                          </button>
                        </template>

                        <!-- Level test -->
                        <template v-if="lv.level_test">
                          <div class="nav-section-tag">Prueba de Nivel</div>
                          <button
                            class="nav-book-item nav-book-item--test"
                            @click="goLevelTest(lv.level_test!.id)"
                          >
                            <i class="pi pi-star"></i>
                            <span>{{ lv.level_test.title }}</span>
                          </button>
                        </template>

                        <div
                          v-if="
                            !lv.practices?.length &&
                            !lv.notebooks?.length &&
                            !lv.level_test
                          "
                          class="nav-sub-empty"
                        >
                          Sin contenido aún
                        </div>
                      </template>
                    </div>
                  </template>
                </template>
              </div>
            </template>
            <div v-else class="nav-sub-empty">No hay cursos</div>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-details">
            <div class="user-name">{{ profile?.name || "Alumno" }}</div>
            <div class="user-role">Estudiante</div>
          </div>
        </div>
        <div class="footer-actions">
          <!-- Desktop entry point: the topbar bell only shows on mobile. -->
          <NotificationBell class="footer-bell" />
          <button
            class="icon-btn"
            type="button"
            :title="
              isGoogleUser ? 'Establecer contraseña' : 'Cambiar contraseña'
            "
            @click="
              isGoogleUser
                ? (showSetPassword = true)
                : (showChangePassword = true)
            "
          >
            <i class="pi pi-lock"></i>
          </button>
          <button
            class="icon-btn icon-btn--logout"
            type="button"
            title="Cerrar sesión"
            @click="logout"
          >
            <i class="pi pi-sign-out"></i>
          </button>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <slot />
    </main>
  </div>

  <Teleport to="body">
    <ChangePasswordModal v-model:visible="showChangePassword" />
    <SetPasswordModal v-model:visible="showSetPassword" />
  </Teleport>
</template>

<style scoped>
  .app-shell {
    /* Fallback for views that reserve assistant desktop rail. Package writes
       same token while loaded; local declaration keeps host CSS self-contained. */
    --practiq-assistant-rail: clamp(320px, 27vw, 430px);
    min-height: 100vh;
    display: flex;
    background: var(--gradient-app-bg);
  }

  .mobile-topbar {
    display: none;
  }

  .sidebar {
    width: 280px;
    flex-shrink: 0;
    margin: 18px 0 18px 18px;
    border-radius: 32px;
    background: var(--surface-glass);
    border: 1px solid var(--surface-glass-border);
    box-shadow: var(--shadow-panel);
    backdrop-filter: blur(18px);
    display: flex;
    flex-direction: column;
    padding: 18px 14px 14px;
    position: sticky;
    top: 18px;
    height: calc(100vh - 36px);
    z-index: 25;
  }

  .sidebar-brand,
  .sidebar-brand-main,
  .user-info,
  .topbar-brand,
  .nav-item,
  .sidebar-footer {
    display: flex;
    align-items: center;
  }

  .sidebar-logo {
    width: 120px;
    display: block;
  }

  .topbar-logo {
    width: 100px;
    display: block;
  }

  .sidebar-brand {
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 4px 8px 14px;
    border-bottom: 1px solid rgba(var(--surface-border-rgb), 0.12);
  }

  .sidebar-brand-main,
  .topbar-brand,
  .user-info,
  .nav-item {
    gap: 12px;
  }

  .brand-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    background: var(--gradient-brand);
    color: var(--color-on-primary);
    display: grid;
    place-items: center;
    font-weight: 800;
    box-shadow: var(--shadow-indigo);
  }

  .brand-icon--large {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-xl);
    font-size: var(--font-stat-value);
  }

  .brand-name {
    font-size: 17px;
    font-weight: 800;
    color: var(--text-heading);
  }

  .brand-name--large {
    font-size: var(--font-stat-value);
  }

  .brand-tag {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .close-btn,
  .topbar-btn,
  .logout-btn {
    width: 44px;
    height: 44px;
    border: none;
    border-radius: var(--radius-lg);
    background: var(--surface-subtle);
    color: var(--text-secondary);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: var(--transition);
  }

  .close-btn:hover,
  .topbar-btn:hover,
  .logout-btn:hover {
    background: var(--surface-card);
    color: var(--text-primary);
  }

  .sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 16px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 4px 8px;
    scrollbar-width: thin;
  }

  .nav-section-label {
    padding: 4px 10px 6px;
    font-size: var(--text-xs);
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .nav-item {
    position: relative;
    padding: 10px 12px;
    border-radius: var(--radius-xl);
    color: var(--text-secondary);
    font-size: var(--text-md);
    font-weight: 700;
    text-decoration: none;
    transition: var(--transition);
    min-height: 46px;
  }

  .nav-item:hover {
    background: var(--surface-elevated-strong);
    color: var(--text-heading);
    transform: translateX(2px);
  }

  .nav-item-active {
    background: var(--surface-card);
    color: var(--practiq-violet-dark);
    box-shadow: var(--shadow-card);
  }

  .nav-item-active::before {
    content: "";
    position: absolute;
    left: -4px;
    top: 12px;
    bottom: 12px;
    width: 3px;
    border-radius: var(--radius-pill);
    background: var(--practiq-violet);
  }

  .nav-icon {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-md);
    display: grid;
    place-items: center;
    background: rgba(var(--surface-border-rgb), 0.12);
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .nav-item:hover .nav-icon,
  .nav-item-active .nav-icon,
  .nav-item-btn:hover .nav-icon {
    background: var(--gradient-brand);
    color: var(--color-on-primary);
  }

  .nav-group {
    display: flex;
    flex-direction: column;
  }

  .nav-item-btn {
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    justify-content: flex-start;
  }

  .nav-chevron {
    margin-left: auto;
    font-size: var(--text-xs);
    opacity: 0.6;
  }

  .nav-sub {
    margin-top: 6px;
    padding: 8px 0 4px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
    border-left: 1px solid rgba(var(--surface-border-rgb), 0.16);
  }

  .nav-sub-loading {
    display: grid;
    gap: 8px;
    padding: 8px 12px;
  }

  .nav-loading-line {
    display: block;
    height: 12px;
    width: 100%;
    border-radius: var(--radius-pill);
    background: linear-gradient(
      90deg,
      var(--surface-elevated) 25%,
      var(--surface-card) 50%,
      var(--surface-elevated) 75%
    );
    background-size: 200% 100%;
    animation: nav-loading 1.2s ease-in-out infinite;
  }

  @keyframes nav-loading {
    from { background-position: 100% 0; }
    to { background-position: -100% 0; }
  }

  .nav-sub-empty {
    padding: 6px 12px;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .nav-course-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 2px;
  }

  .nav-course-toggle {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px 11px;
    border-radius: var(--radius-lg);
    border: none;
    background: rgba(var(--surface-card-rgb), 0.42);
    cursor: pointer;
    text-align: left;
    transition: var(--transition);
    width: 100%;
  }
  .nav-course-toggle:hover {
    background: rgba(var(--practiq-violet-rgb), 0.1);
  }
  .nav-course-toggle .pi-graduation-cap {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    display: grid;
    place-items: center;
    background: var(--fill-primary-soft);
    font-size: var(--text-sm);
    color: var(--practiq-violet);
    flex-shrink: 0;
  }
  .nav-course-toggle-title {
    flex: 1;
    font-size: var(--text-md);
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Level rows */
  .nav-level-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-left: 6px;
  }

  .nav-level-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    border: none;
    background: transparent;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: var(--transition);
  }
  .nav-level-row:hover:not(:disabled) {
    background: var(--surface-elevated-strong);
  }
  .nav-level-row--current {
    background: var(--fill-primary-subtle);
  }
  .nav-level-row--locked {
    cursor: default;
    opacity: 0.5;
  }

  .nav-level-badge {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: var(--gradient-brand);
    color: var(--color-on-primary);
    font-size: var(--text-xs);
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .nav-level-badge--locked {
    background: var(--fill-border-muted);
    color: var(--text-muted);
  }

  .nav-level-label {
    flex: 1;
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--text-primary);
  }

  .nav-level-tag {
    font-size: 10px;
    font-weight: 700;
    color: var(--practiq-violet);
    background: var(--fill-primary-soft);
    padding: 2px 7px;
    border-radius: var(--radius-pill);
    flex-shrink: 0;
  }

  /* Level content items */
  .nav-section-tag {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    padding: 7px 12px 2px;
  }

  .nav-book-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px 8px 12px;
    border-radius: var(--radius-md);
    border: none;
    background: rgba(var(--surface-bg-rgb), 0.5);
    cursor: pointer;
    font-size: var(--text-sm);
    font-weight: 650;
    color: var(--text-secondary);
    text-align: left;
    width: 100%;
    transition: var(--transition);
  }

  .nav-book-item:hover {
    background: var(--fill-primary-subtle);
    color: var(--practiq-violet-dark);
  }

  .nav-book-item--practice:hover {
    background: var(--fill-success-subtle);
    color: var(--color-success-dark);
  }

  .nav-book-item--test:hover {
    background: var(--fill-warning-subtle);
    color: var(--color-warning-strong);
  }

  .nav-book-item--notebook:hover {
    background: var(--fill-primary-subtle);
    color: var(--practiq-violet);
  }

  .nav-book-item .pi {
    width: 22px;
    height: 22px;
    border-radius: var(--radius-xs);
    display: grid;
    place-items: center;
    background: rgba(var(--surface-card-rgb), 0.7);
    font-size: var(--text-xs);
    flex-shrink: 0;
  }

  .nav-book-item span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 8px 0;
    border-top: 1px solid rgba(var(--surface-border-rgb), 0.14);
  }

  .footer-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* Match the sibling icon buttons in the sidebar footer. */
  .footer-bell :deep(.bell-btn) {
    width: 44px;
    height: 44px;
  }

  .icon-btn {
    width: 44px;
    height: 44px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--surface-subtle);
    color: var(--text-secondary);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: var(--transition);
    font-size: var(--text-md);
  }
  .icon-btn:hover {
    background: var(--surface-card);
    color: var(--text-primary);
  }
  .icon-btn--logout:hover {
    color: var(--color-error);
    background: var(--color-error-bg);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
  }

  .user-avatar,
  .topbar-avatar {
    width: 46px;
    height: 46px;
    border-radius: var(--radius-xl);
    background: var(--gradient-brand);
    color: var(--color-on-primary);
    display: grid;
    place-items: center;
    font-weight: 800;
    box-shadow: var(--shadow-indigo);
    flex-shrink: 0;
  }

  .user-details {
    min-width: 0;
    /* The desktop sidebar (220-280px depending on the breakpoint) never had
       room for three 44px action buttons plus a name: at 1280px this still
       squeezed "Walter Tapia" into a 20px-wide box, unreadable rather than
       actually hidden. The 920px drawer is a flat 320px regardless of the
       viewport, wide enough to show it — re-enabled there below. */
    display: none;
  }

  .user-name {
    font-size: var(--text-md);
    font-weight: 700;
    color: var(--text-heading);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-role {
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .main-content {
    flex: 1;
    min-width: 0;
  }

  .drawer-backdrop {
    display: none;
  }

  @media (max-width: 1100px) {
    .sidebar {
      width: 250px;
      margin: 16px 0 16px 16px;
      height: calc(100vh - 32px);
    }
  }

  /* Tablet landscape */
  @media (max-width: 1024px) {
    .sidebar {
      width: 220px;
      margin: 12px 0 12px 12px;
      height: calc(100vh - 24px);
    }

    .main-content {
      padding: 16px;
    }

    /* The footer's three 44px action buttons never shrink (flex-shrink: 0),
       so at this sidebar width they ran out of room and sat on top of the
       avatar instead of next to it. */
    .sidebar-footer {
      gap: 6px;
      padding: 14px 4px 0;
    }

    .user-avatar {
      width: 38px;
      height: 38px;
      font-size: var(--text-sm);
    }

    .footer-actions {
      gap: 3px;
    }

    .icon-btn,
    .footer-bell :deep(.bell-btn) {
      width: 34px;
      height: 34px;
      font-size: var(--text-sm);
    }
  }

  /* Tablet portrait */
  @media (max-width: 768px) {
    .main-content {
      padding: 12px;
    }
  }

  @media (max-width: 920px) {
    .app-shell {
      display: block;
    }

    .mobile-topbar {
      display: flex;
      justify-content: space-between;
      padding: 14px 16px 0;
      position: sticky;
      top: 0;
      z-index: 30;
      background: var(--gradient-mobile-topbar);
      backdrop-filter: blur(16px);
    }

    .topbar-avatar {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-xl);
    }

    .drawer-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: var(--surface-scrim);
      z-index: 250;
    }

    .sidebar {
      position: fixed;
      top: 12px;
      left: 12px;
      margin: 0;
      width: min(320px, calc(100vw - 24px));
      height: calc(100vh - 24px);
      transform: translateX(-110%);
      transition: transform 0.24s ease;
      z-index: 260;
    }

    .sidebar--open {
      transform: translateX(0);
    }

    /* Drawer is a flat 320px here regardless of viewport width, wide enough
       to show the name next to the avatar again. */
    .user-details {
      display: block;
    }

    /* Tap targets >= 44px en mobile */
    .nav-item {
      min-height: 52px;
    }

    .nav-level-row,
    .nav-book-item,
    .nav-course-toggle {
      min-height: 48px;
    }
  }

  @media (min-width: 921px) {
    .close-btn {
      display: none;
    }

    /* Assistant desktop rail takes space from the right. Collapse navigation
       first, rather than scaling the student's drawing canvas. */
    :global(.practiq-assistant-focus-target--open .sidebar) {
      width: 76px;
      margin-left: 12px;
      padding: 14px 10px;
      border-radius: 24px;
    }

    /* Package only marks #app as focused. Keep its flex root at full width;
       shrinking #app made the complete student view render as a blank sheet.
       Collapsing the sidebar frees room for the assistant without scaling the
       drawing canvas. */
    :global(.practiq-assistant-focus-target--open .app-shell) {
      min-width: 0;
    }

    :global(.practiq-assistant-focus-target--open .sidebar-brand) {
      justify-content: center;
      padding: 2px 0 12px;
    }

    :global(.practiq-assistant-focus-target--open .sidebar-logo) {
      width: 40px;
      height: 40px;
      object-fit: cover;
      object-position: left center;
    }

    :global(.practiq-assistant-focus-target--open .sidebar-nav) {
      align-items: center;
      padding: 0;
    }

    :global(.practiq-assistant-focus-target--open .nav-section-label),
    :global(.practiq-assistant-focus-target--open .nav-item > span:not(.nav-icon)),
    :global(.practiq-assistant-focus-target--open .nav-chevron),
    :global(.practiq-assistant-focus-target--open .nav-sub) {
      display: none;
    }

    :global(.practiq-assistant-focus-target--open .nav-group),
    :global(.practiq-assistant-focus-target--open .nav-item) {
      width: 100%;
    }

    :global(.practiq-assistant-focus-target--open .nav-item) {
      justify-content: center;
      padding: 8px;
    }

    :global(.practiq-assistant-focus-target--open .sidebar-footer) {
      flex-direction: column;
      padding: 10px 0 0;
      gap: 8px;
    }

    :global(.practiq-assistant-focus-target--open .user-details) {
      display: none;
    }

    :global(.practiq-assistant-focus-target--open .user-info),
    :global(.practiq-assistant-focus-target--open .footer-actions) {
      flex: 0 0 auto;
    }

    :global(.practiq-assistant-focus-target--open .footer-actions) {
      flex-direction: column;
    }
  }
</style>
