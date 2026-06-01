<template>
  <div class="app-shell">
    <header class="mobile-topbar">
      <button class="topbar-btn" type="button" @click="navOpen = true">
        <i class="pi pi-bars"></i>
      </button>

      <div class="topbar-brand">
        <img src="@/assets/logo.png" class="topbar-logo" alt="Practiq" />
      </div>

      <div class="topbar-avatar">{{ userInitial }}</div>
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
        <RouterLink to="/student/dashboard" class="nav-item" active-class="nav-item-active" @click="navOpen = false">
          <i class="pi pi-home"></i>
          <span>Inicio</span>
        </RouterLink>

        <!-- Mis Cursos desplegable -->
        <div class="nav-group">
          <button class="nav-item nav-item-btn" @click="coursesOpen = !coursesOpen">
            <i class="pi pi-book"></i>
            <span>Mis Cursos</span>
            <i class="pi nav-chevron" :class="coursesOpen ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
          </button>

          <div v-if="coursesOpen" class="nav-sub">
            <div v-if="loadingCourses" class="nav-sub-loading">
              <i class="pi pi-spin pi-spinner"></i>
            </div>
            <template v-else-if="coursesData.length">
              <div v-for="c in coursesData" :key="c.id" class="nav-course-group">
                <!-- Course header -->
                <button class="nav-course-toggle" @click="toggleCourse(c.id)">
                  <i class="pi pi-graduation-cap"></i>
                  <span class="nav-course-toggle-title">{{ c.title }}</span>
                  <i class="pi nav-chevron" :class="openCourses.has(c.id) ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
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
                          'nav-level-row--locked': !lv.unlocked
                        }"
                        @click="lv.unlocked && toggleLevel(c.id, lv.level)"
                        :disabled="!lv.unlocked"
                      >
                        <span class="nav-level-badge" :class="{ 'nav-level-badge--locked': !lv.unlocked }">
                          <i v-if="!lv.unlocked" class="pi pi-lock"></i>
                          <span v-else>{{ lv.level }}</span>
                        </span>
                        <span class="nav-level-label">Nivel {{ lv.level }}</span>
                        <span v-if="lv.level === c.currentLevel" class="nav-level-tag">En curso</span>
                        <i v-if="lv.unlocked" class="pi nav-chevron"
                          :class="openLevels[c.id]?.has(lv.level) ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                      </button>

                      <!-- Level content -->
                      <template v-if="lv.unlocked && openLevels[c.id]?.has(lv.level)">
                        <!-- Prácticas -->
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

                        <!-- Cuadernos -->
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

                        <!-- Prueba de nivel -->
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

                        <div v-if="!lv.practices?.length && !lv.notebooks?.length && !lv.level_test" class="nav-sub-empty">
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
            <div class="user-name">{{ profile?.name || 'Alumno' }}</div>
            <div class="user-role">Estudiante</div>
          </div>
        </div>
        <div class="footer-actions">
          <button
            class="icon-btn"
            type="button"
            :title="isGoogleUser ? 'Establecer contraseña' : 'Cambiar contraseña'"
            @click="isGoogleUser ? (showSetPassword = true) : (showChangePassword = true)"
          >
            <i class="pi pi-lock"></i>
          </button>
          <button class="icon-btn icon-btn--logout" type="button" title="Cerrar sesión" @click="logout">
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

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { courseService } from '@/services/courses/courseService'
import { levelService } from '@/services/levels/levelService'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'
import SetPasswordModal from '@/components/SetPasswordModal.vue'
import type { LevelData } from '@/types'

interface CourseNavItem {
  id: string
  title: string
  currentLevel: number
  levels: LevelData[]
  loading: boolean
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const profile = computed(() => authStore.profile)
const userInitial = computed(() => profile.value?.name?.[0]?.toUpperCase() || 'A')
const navOpen = ref(false)
const coursesOpen = ref(false)
const loadingCourses = ref(false)
const coursesData = ref<CourseNavItem[]>([])
const openCourses = ref(new Set<string>())
const showChangePassword = ref(false)
const showSetPassword = ref(false)
const isGoogleUser = computed(() => authStore.authMethod === 'google')
// openLevels[courseId] = Set of open level numbers
const openLevels = reactive<Record<string, Set<number>>>({})

function toggleCourse(id: string) {
  const s = new Set(openCourses.value)
  if (s.has(id)) {
    s.delete(id)
  } else {
    s.add(id)
    loadCourseLevels(id)
  }
  openCourses.value = s
}

function toggleLevel(courseId: string, level: number) {
  if (!openLevels[courseId]) openLevels[courseId] = new Set()
  const s = new Set(openLevels[courseId])
  s.has(level) ? s.delete(level) : s.add(level)
  openLevels[courseId] = s
}

async function loadCourseLevels(courseId: string) {
  const course = coursesData.value.find(c => c.id === courseId)
  if (!course || course.levels.length) return
  course.loading = true
  try {
    const res = await levelService.getCourseLevels(courseId)
    course.currentLevel = res.current_level
    course.levels = res.levels
    // Auto-open current level
    if (!openLevels[courseId]) openLevels[courseId] = new Set()
    openLevels[courseId] = new Set([res.current_level])
  } finally {
    course.loading = false
  }
}

watch(coursesOpen, async (open) => {
  if (!open || coursesData.value.length) return
  loadingCourses.value = true
  try {
    const res = await courseService.list('student')
    coursesData.value = (res.data || []).map(c => ({
      id: c.id,
      title: c.title,
      currentLevel: 1,
      levels: [],
      loading: false
    }))
  } finally {
    loadingCourses.value = false
  }
})

function goPractice(id: string) {
  navOpen.value = false
  router.push(`/student/practice/${id}`)
}

function goLevelTest(id: string) {
  navOpen.value = false
  router.push(`/student/level-test/${id}`)
}

function goNotebook(id: string) {
  navOpen.value = false
  router.push(`/student/notebook/${id}`)
}

function syncDesktopState() {
  if (window.innerWidth > 920) navOpen.value = false
}

watch(() => route.fullPath, () => { navOpen.value = false })

onMounted(() => { window.addEventListener('resize', syncDesktopState) })
onUnmounted(() => { window.removeEventListener('resize', syncDesktopState) })

function logout() {
  authStore.clearAuth()
  localStorage.removeItem('practiq_profile')
  router.push('/login')
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  background:
    radial-gradient(circle at top left, rgba(124, 58, 237, 0.12), transparent 16%),
    radial-gradient(circle at bottom right, rgba(96, 165, 250, 0.12), transparent 18%),
    linear-gradient(180deg, #f8fbff 0%, #f7f8ff 42%, #f6f8fc 100%);
}

.mobile-topbar {
  display: none;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  margin: 18px 0 18px 18px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 24px 52px rgba(93, 108, 146, 0.14);
  backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  padding: 12px 18px;
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
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  display: grid;
  place-items: center;
  font-weight: 800;
  box-shadow: 0 12px 22px rgba(99, 102, 241, 0.2);
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
  width: 42px;
  height: 42px;
  border: none;
  border-radius: var(--radius-lg);
  background: rgba(248, 250, 252, 0.92);
  color: var(--text-secondary);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: var(--transition);
}

.close-btn:hover,
.topbar-btn:hover,
.logout-btn:hover {
  background: white;
  color: var(--text-primary);
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  padding: 14px 16px;
  border-radius: var(--radius-xl);
  color: var(--text-secondary);
  font-size: var(--text-md);
  font-weight: 600;
  text-decoration: none;
  transition: var(--transition);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-heading);
}

.nav-item-active {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(96, 165, 250, 0.12));
  color: var(--practiq-violet-dark);
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
  margin-top: 4px;
  padding-left: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.nav-sub-loading {
  padding: 8px 12px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.nav-sub-empty {
  padding: 6px 12px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.nav-course-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}

.nav-course-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: var(--transition);
  width: 100%;
}
.nav-course-toggle:hover {
  background: rgba(124, 58, 237, 0.06);
}
.nav-course-toggle .pi-graduation-cap {
  font-size: var(--text-base);
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

/* ── Level rows ── */
.nav-level-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 8px;
}

.nav-level-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: var(--transition);
}
.nav-level-row:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.06);
}
.nav-level-row--current {
  background: rgba(124, 58, 237, 0.07);
}
.nav-level-row--locked {
  cursor: default;
  opacity: 0.5;
}

.nav-level-badge {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.nav-level-badge--locked {
  background: rgba(148, 163, 184, 0.2);
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
  background: rgba(124, 58, 237, 0.1);
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

/* ── Level content items ── */
.nav-section-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  padding: 5px 12px 1px;
  opacity: 0.5;
}

.nav-book-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  text-align: left;
  width: 100%;
  transition: var(--transition);
}

.nav-book-item:hover {
  background: rgba(124, 58, 237, 0.08);
  color: var(--practiq-violet-dark);
}

.nav-book-item--practice:hover {
  background: rgba(16, 185, 129, 0.08);
  color: var(--color-success-dark);
}

.nav-book-item--test:hover {
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
}

.nav-book-item--notebook:hover {
  background: rgba(139, 92, 246, 0.08);
  color: #7c3aed;
}

.nav-book-item .pi {
  font-size: var(--text-sm);
  flex-shrink: 0;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: rgba(248, 250, 252, 0.92);
  color: var(--text-secondary);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: var(--transition);
  font-size: var(--text-md);
}
.icon-btn:hover {
  background: white;
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
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  display: grid;
  place-items: center;
  font-weight: 800;
  box-shadow: 0 12px 22px rgba(99, 102, 241, 0.2);
  flex-shrink: 0;
}

.user-details {
  min-width: 0;
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
    background: linear-gradient(180deg, rgba(247, 248, 255, 0.96), rgba(247, 248, 255, 0.76) 75%, transparent);
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
    background: rgba(15, 23, 42, 0.34);
    z-index: 34;
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
    z-index: 40;
  }

  .sidebar--open {
    transform: translateX(0);
  }
}

@media (min-width: 921px) {
  .close-btn {
    display: none;
  }
}
</style>
