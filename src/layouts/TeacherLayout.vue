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
        <RouterLink to="/teacher/dashboard" class="nav-item" active-class="nav-item-active" @click="navOpen = false">
          <i class="pi pi-home"></i>
          <span>Inicio</span>
        </RouterLink>
        <RouterLink to="/teacher/admin/users" class="nav-item" active-class="nav-item-active" @click="navOpen = false">
          <i class="pi pi-users"></i>
          <span>Usuarios</span>
        </RouterLink>
        <RouterLink to="/teacher/admin/academic" class="nav-item" active-class="nav-item-active" @click="navOpen = false">
          <i class="pi pi-sitemap"></i>
          <span>Académico</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">{{ userInitial }}</div>
          <div class="user-details">
            <div class="user-name">{{ profile?.name || 'Docente' }}</div>
            <div class="user-role">{{ roleLabel }}</div>
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const profile = computed(() => authStore.profile)
const userInitial = computed(() => profile.value?.name?.[0]?.toUpperCase() || 'D')
const navOpen = ref(false)
const isAdmin = computed(() => {
  const roles = authStore.authUser?.roles || []
  return roles.some((role) => role.name === 'admin' || role.name === 'superadmin')
})
const roleLabel = computed(() => isAdmin.value ? 'Profesor Admin' : 'Profesor')

watch(() => route.fullPath, () => {
  navOpen.value = false
})

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
  padding: 22px 18px;
  position: sticky;
  top: 18px;
  height: calc(100vh - 36px);
  z-index: 25;
}

.sidebar-brand,
.user-info,
.topbar-brand,
.nav-item,
.sidebar-footer {
  display: flex;
  align-items: center;
}

.sidebar-brand {
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.topbar-brand,
.user-info,
.nav-item {
  gap: 12px;
}

.sidebar-logo {
  width: 120px;
  display: block;
}

.topbar-logo {
  width: 100px;
  display: block;
}

.close-btn,
.topbar-btn,
.logout-btn {
  width: 42px;
  height: 42px;
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
  gap: 8px;
  margin-top: 24px;
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
  background: var(--surface-elevated-strong);
  color: var(--text-heading);
  transform: translateX(2px);
}

.nav-item-active {
  background: var(--gradient-brand-soft);
  color: var(--practiq-violet-dark);
}

.sidebar-footer {
  justify-content: space-between;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid rgba(var(--surface-border-rgb), 0.14);
}

.user-info {
  min-width: 0;
  flex: 1;
  gap: 12px;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-xl);
  background: var(--gradient-brand-avatar);
  color: var(--practiq-violet-dark);
  display: grid;
  place-items: center;
  font-size: var(--text-lg);
  font-weight: 800;
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

.logout-btn:hover {
  color: var(--color-error);
  background: var(--color-error-bg);
}

.main-content {
  flex: 1;
  min-width: 0;
}

.topbar-avatar {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-lg);
  background: var(--fill-primary-soft);
  color: var(--practiq-violet-dark);
  display: grid;
  place-items: center;
  font-size: var(--text-lg);
  font-weight: 800;
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
    align-items: center;
    padding: 14px 16px 0;
    position: sticky;
    top: 0;
    z-index: 30;
    background: var(--gradient-mobile-topbar);
    backdrop-filter: blur(16px);
  }

  .drawer-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: var(--surface-scrim);
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
