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

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
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

.sidebar-footer {
  justify-content: space-between;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.user-info {
  min-width: 0;
  flex: 1;
  gap: 12px;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(96, 165, 250, 0.2));
  color: var(--practiq-violet-dark);
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 800;
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

.topbar-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(124, 58, 237, 0.12);
  color: var(--practiq-violet-dark);
  display: grid;
  place-items: center;
  font-size: 15px;
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
    background: linear-gradient(180deg, rgba(247, 248, 255, 0.96), rgba(247, 248, 255, 0.76) 75%, transparent);
    backdrop-filter: blur(16px);
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
