<template>
  <div class="app-shell">
    <header class="mobile-topbar">
      <button class="topbar-btn" type="button" @click="navOpen = true">
        <i class="pi pi-bars"></i>
      </button>

      <div class="topbar-brand">
        <div class="brand-icon">P</div>
        <div>
          <div class="brand-name">Practiq</div>
          <div class="brand-tag">Modo práctica</div>
        </div>
      </div>

      <div class="topbar-avatar">{{ userInitial }}</div>
    </header>

    <div v-if="navOpen" class="drawer-backdrop" @click="navOpen = false"></div>

    <aside class="sidebar" :class="{ 'sidebar--open': navOpen }">
      <div class="sidebar-brand">
        <div class="sidebar-brand-main">
          <div class="brand-icon brand-icon--large">P</div>
          <div>
            <div class="brand-name brand-name--large">Practiq</div>
            <div class="brand-tag">Espacio del estudiante</div>
          </div>
        </div>
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
            <template v-else-if="coursesWithBooks.length">
              <div v-for="c in coursesWithBooks" :key="c.id" class="nav-course-group">
                <button class="nav-course-toggle" @click="toggleCourse(c.id)">
                  <i class="pi pi-graduation-cap"></i>
                  <span class="nav-course-toggle-title">{{ c.title }}</span>
                  <i class="pi nav-chevron" :class="openCourses.has(c.id) ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                </button>

                <template v-if="openCourses.has(c.id)">
                  <template v-if="c.sheets.filter(s => s.sheet_type !== 'level_test').length">
                    <div class="nav-section-tag">Prácticas</div>
                    <button
                      v-for="sheet in c.sheets.filter(s => s.sheet_type !== 'level_test')"
                      :key="sheet.id"
                      class="nav-book-item nav-book-item--practice"
                      @click="goPractice(sheet.id)"
                    >
                      <i class="pi pi-pencil"></i>
                      <span>{{ sheet.title }}</span>
                    </button>
                  </template>

                  <template v-if="c.sheets.filter(s => s.sheet_type === 'level_test').length">
                    <div class="nav-section-tag">Pruebas de Nivel</div>
                    <button
                      v-for="sheet in c.sheets.filter(s => s.sheet_type === 'level_test')"
                      :key="sheet.id"
                      class="nav-book-item nav-book-item--test"
                      @click="goLevelTest(sheet.id)"
                    >
                      <i class="pi pi-star"></i>
                      <span>{{ sheet.title }}</span>
                    </button>
                  </template>

                  <template v-if="c.notebooks.length">
                    <div class="nav-section-tag">Cuadernos</div>
                    <button
                      v-for="nb in c.notebooks"
                      :key="nb.id"
                      class="nav-book-item nav-book-item--notebook"
                      @click="goNotebook(nb.id)"
                    >
                      <i class="pi pi-book"></i>
                      <span>{{ nb.title }}</span>
                    </button>
                  </template>

                  <div v-if="!c.sheets.length && !c.notebooks.length" class="nav-sub-empty">Sin contenido</div>
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
        <button class="logout-btn" type="button" @click="logout">
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </aside>

    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { courseService } from '@/services/courses/courseService'
import { notebookService } from '@/services/notebooks/notebookService'
import { practiceSheetService } from '@/services/practiceSheets/practiceSheetService'
import type { Notebook, PracticeSheet } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const profile = computed(() => authStore.profile)
const userInitial = computed(() => profile.value?.name?.[0]?.toUpperCase() || 'A')
const navOpen = ref(false)
const coursesOpen = ref(false)
const loadingCourses = ref(false)
const coursesWithBooks = ref<{ id: string; title: string; sheets: PracticeSheet[]; notebooks: Notebook[] }[]>([])
const openCourses = ref(new Set<string>())

function toggleCourse(id: string) {
  const s = new Set(openCourses.value)
  s.has(id) ? s.delete(id) : s.add(id)
  openCourses.value = s
}

watch(coursesOpen, async (open) => {
  if (!open || coursesWithBooks.value.length) return
  loadingCourses.value = true
  try {
    const res = await courseService.list('student')
    const list = res.data || []
    coursesWithBooks.value = await Promise.all(
      list.map(async (c) => {
        const [sheets, notebooks] = await Promise.allSettled([
          practiceSheetService.list(c.id),
          notebookService.list(c.id)
        ])
        return {
          id: c.id,
          title: c.title,
          sheets: sheets.status === 'fulfilled' ? (sheets.value.data || []) : [],
          notebooks: notebooks.status === 'fulfilled' ? notebooks.value : []
        }
      })
    )
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
  padding: 22px 18px;
  position: sticky;
  top: 18px;
  height: calc(100vh - 36px);
  z-index: 25;
}

.sidebar-brand,
.sidebar-brand-main,
.user-info,
.topbar-brand,
.mode-card,
.nav-item,
.sidebar-footer {
  display: flex;
  align-items: center;
}

.sidebar-brand {
  justify-content: space-between;
  gap: 12px;
}

.sidebar-brand-main,
.topbar-brand,
.user-info,
.mode-card,
.nav-item {
  gap: 12px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
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
  border-radius: 16px;
  font-size: 20px;
}

.brand-name {
  font-size: 17px;
  font-weight: 800;
  color: #182136;
}

.brand-name--large {
  font-size: 20px;
}

.brand-tag {
  font-size: 12px;
  color: var(--text-secondary);
}

.close-btn,
.topbar-btn,
.logout-btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 14px;
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

.mode-card {
  margin-top: 20px;
  padding: 16px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(124, 58, 237, 0.12), transparent 55%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 243, 255, 0.88));
  border: 1px solid rgba(124, 58, 237, 0.12);
}

.mode-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 20px;
  background: rgba(124, 58, 237, 0.12);
  color: var(--practiq-violet-dark);
}

.mode-card__title {
  font-size: 14px;
  font-weight: 700;
  color: #17203a;
}

.mode-card__copy {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}

.nav-item {
  padding: 14px 16px;
  border-radius: 18px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: var(--transition);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.9);
  color: #182136;
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
  font-size: 11px;
  opacity: 0.6;
}

.nav-sub {
  margin-top: 4px;
  padding-left: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.nav-sub-loading {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.nav-sub-empty {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.nav-course-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
}

.nav-course-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 12px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: var(--transition);
}
.nav-course-toggle:hover {
  background: rgba(124, 58, 237, 0.06);
}
.nav-course-toggle .pi-graduation-cap {
  font-size: 13px;
  color: var(--practiq-violet);
  flex-shrink: 0;
}
.nav-course-toggle-title {
  flex: 1;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-section-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
  padding: 6px 12px 2px;
  opacity: 0.5;
}

.nav-book-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
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
  color: #059669;
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
  font-size: 13px;
  flex-shrink: 0;
}

.sidebar-footer {
  justify-content: space-between;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.user-info {
  min-width: 0;
  flex: 1;
}

.user-avatar,
.topbar-avatar {
  width: 46px;
  height: 46px;
  border-radius: 18px;
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
  font-size: 14px;
  font-weight: 700;
  color: #182136;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 12px;
  color: var(--text-secondary);
}

.logout-btn:hover {
  color: var(--color-error);
  background: var(--color-error-bg);
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
    border-radius: 16px;
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
