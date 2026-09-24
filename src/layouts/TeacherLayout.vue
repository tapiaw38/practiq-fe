<script setup lang="ts">
  import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useAuthStore } from "@/stores/authStore";
  import { useSchools } from "@/composables/useSchools";
  import { usePendingReviews } from "@/composables/usePendingReviews";
  import ChangePasswordModal from "@/components/auth/ChangePasswordModal.vue";
  import SetPasswordModal from "@/components/auth/SetPasswordModal.vue";

  // Shell of every teacher screen. Markup and class names follow the
  // "Practiq Docente" design system (AppShell / AppShellMobile); the styles
  // live in assets/teacher.css.
  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const {
    schools,
    activeId,
    hasChoice,
    active,
    loadSchools,
    setActive,
    resetSchools,
    service,
  } = useSchools();
  const { count: pendingCount, hasMore: pendingHasMore, load: loadPending } =
    usePendingReviews();
  const profile = computed(() => authStore.profile);

  // The school's name is the teacher's to set: the migration could only leave
  // a placeholder, and sign-up guesses from their name.
  async function renameActive(name: string) {
    const school = active.value;
    const trimmed = name.trim();
    if (!school || !trimmed || trimmed === school.name) return;
    try {
      await service.update(school.id, { name: trimmed });
      await loadSchools(true, isSuperAdmin.value);
    } catch {
      // Left as it was; the field shows the stored name again on reload.
    }
  }
  const userInitial = computed(
    () => profile.value?.name?.[0]?.toUpperCase() || "D",
  );
  const navOpen = ref(false);
  const showChangePassword = ref(false);
  const showSetPassword = ref(false);
  const isGoogleUser = computed(() => authStore.authMethod === "google");
  // admin es el rol del profesor; superadmin, el del administrador.
  const isSuperAdmin = computed(() => {
    const roles = authStore.authUser?.roles || [];
    return roles.some((role) => role.name === "superadmin");
  });
  const roleLabel = computed(() =>
    isSuperAdmin.value ? "Administrador" : "Profesor",
  );
  const administersActive = computed(
    () => isSuperAdmin.value || active.value?.role === "admin",
  );
  const canRenameActiveSchool = computed(
    () => isSuperAdmin.value || active.value?.role === "admin",
  );
  const canManageSubscription = computed(
    () =>
      !isSuperAdmin.value &&
      active.value?.kind === "personal" &&
      active.value.role === "admin",
  );

  const pendingLabel = computed(() =>
    pendingCount.value <= 0
      ? ""
      : pendingHasMore.value
        ? "99+"
        : String(pendingCount.value),
  );

  // The four things a teacher opens every day live in the bottom bar on a
  // phone; everything else waits behind "Más" (the drawer).
  interface Tab {
    to: string;
    icon: string;
    label: string;
    badge?: string;
  }
  const tabs = computed<Tab[]>(() => {
    const list: Tab[] = [
      { to: "/teacher/dashboard", icon: "pi-home", label: "Inicio" },
      { to: "/teacher/notebook-reviews", icon: "pi-book", label: "Cuadernos" },
      {
        to: "/teacher/attempt-reviews",
        icon: "pi-paperclip",
        label: "Pruebas",
        badge: pendingLabel.value,
      },
    ];
    if (isSuperAdmin.value) {
      list.push({ to: "/teacher/admin/schools", icon: "pi-building", label: "Escuelas" });
    } else if (administersActive.value && active.value) {
      list.push({ to: "/teacher/admin/academic", icon: "pi-sitemap", label: "Académico" });
    } else if (canManageSubscription.value) {
      list.push({ to: "/teacher/subscription", icon: "pi-credit-card", label: "Suscripción" });
    }
    return list;
  });

  function isActive(to: string) {
    return route.path === to || route.path.startsWith(`${to}/`);
  }

  onMounted(() => {
    loadSchools(false, isSuperAdmin.value);
    loadPending();
    window.addEventListener("keydown", onKey);
  });
  onBeforeUnmount(() => window.removeEventListener("keydown", onKey));

  function onKey(event: KeyboardEvent) {
    if (event.key === "Escape") navOpen.value = false;
  }

  watch(
    () => route.fullPath,
    () => {
      navOpen.value = false;
    },
  );
  watch(activeId, () => loadPending());

  function logout() {
    authStore.clearAuth();
    localStorage.removeItem("practiq_profile");
    resetSchools();
    router.push("/login");
  }
</script>

<template>
  <div class="app-shell">
    <header class="mobile-topbar">
      <button
        class="topbar-btn"
        type="button"
        aria-label="Abrir menú"
        @click="navOpen = true"
      >
        <i class="pi pi-bars"></i>
      </button>

      <div class="topbar-brand">
        <img src="@/assets/logo.png" class="topbar-logo" alt="Practiq" />
        <span v-if="active" class="topbar-school" :title="active.name">{{ active.name }}</span>
      </div>

      <button
        class="avatar topbar-avatar"
        type="button"
        aria-label="Abrir menú de la cuenta"
        @click="navOpen = true"
      >{{ userInitial }}</button>
    </header>

    <div
      class="drawer-backdrop"
      :class="{ 'is-open': navOpen }"
      @click="navOpen = false"
    ></div>

    <aside
      class="sidebar"
      :class="{ 'sidebar--open': navOpen }"
      aria-label="Menú del espacio docente"
    >
      <div class="sidebar-brand">
        <img src="@/assets/logo.png" class="sidebar-logo" alt="Practiq" />
        <button
          class="icon-btn close-btn"
          type="button"
          aria-label="Cerrar menú"
          @click="navOpen = false"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>

      <section v-if="active" class="school-context" aria-label="Escuela activa">
        <span class="school-context__label">Escuela</span>
        <strong class="school-context__name" :title="active.name">{{ active.name }}</strong>
        <select
          v-if="hasChoice"
          class="school-context__select"
          :value="activeId"
          aria-label="Cambiar escuela activa"
          @change="setActive(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="school in schools" :key="school.id" :value="school.id">
            {{ school.name }}
          </option>
        </select>
        <details v-if="canRenameActiveSchool" class="school-context__settings">
          <summary>Editar nombre</summary>
          <input
            :value="active.name"
            aria-label="Nombre de la escuela"
            @change="renameActive(($event.target as HTMLInputElement).value)"
          />
        </details>
      </section>

      <nav class="sidebar-nav">
        <div class="nav-section-label">Espacio docente</div>
        <RouterLink
          to="/teacher/dashboard"
          class="nav-item"
          active-class="nav-item-active"
        >
          <i class="pi pi-home"></i>
          <span>Inicio</span>
        </RouterLink>

        <div class="nav-section-label">Revisar</div>
        <RouterLink
          to="/teacher/notebook-reviews"
          class="nav-item"
          active-class="nav-item-active"
        >
          <i class="pi pi-book"></i>
          <span>Cuadernos</span>
        </RouterLink>
        <RouterLink
          to="/teacher/attempt-reviews"
          class="nav-item"
          active-class="nav-item-active"
        >
          <i class="pi pi-paperclip"></i>
          <span>Pruebas de nivel</span>
          <span
            v-if="pendingLabel"
            class="nav-badge"
            :aria-label="`${pendingLabel} pendientes`"
          >{{ pendingLabel }}</span>
        </RouterLink>

        <template v-if="administersActive && active">
          <div class="nav-section-label">Gestión de escuela</div>
          <RouterLink
            to="/teacher/admin/school-users"
            class="nav-item"
            active-class="nav-item-active"
          >
            <i class="pi pi-users"></i>
            <span>Usuarios</span>
          </RouterLink>
          <RouterLink
            to="/teacher/admin/academic"
            class="nav-item"
            active-class="nav-item-active"
          >
            <i class="pi pi-sitemap"></i>
            <span>Académico</span>
          </RouterLink>
        </template>

        <template v-if="isSuperAdmin">
          <div class="nav-section-label">Plataforma</div>
          <RouterLink
            to="/teacher/admin/schools"
            class="nav-item"
            active-class="nav-item-active"
          >
            <i class="pi pi-building"></i>
            <span>Escuelas</span>
          </RouterLink>
          <RouterLink
            to="/teacher/admin/plans"
            class="nav-item"
            active-class="nav-item-active"
          >
            <i class="pi pi-tags"></i>
            <span>Planes</span>
          </RouterLink>
          <RouterLink
            to="/teacher/admin/site-contact"
            class="nav-item"
            active-class="nav-item-active"
          >
            <i class="pi pi-phone"></i>
            <span>Contacto landing</span>
          </RouterLink>
          <RouterLink
            to="/teacher/admin/assistant"
            class="nav-item"
            active-class="nav-item-active"
          >
            <i class="pi pi-sparkles"></i>
            <span>Asistente IA</span>
          </RouterLink>
        </template>

        <template v-if="isSuperAdmin || canManageSubscription">
          <div class="nav-section-label">Herramientas</div>
          <RouterLink
            v-if="isSuperAdmin"
            to="/teacher/strategies"
            class="nav-item"
            active-class="nav-item-active"
          >
            <i class="pi pi-cog"></i>
            <span>Estrategias</span>
          </RouterLink>
          <RouterLink
            v-if="canManageSubscription"
            to="/teacher/subscription"
            class="nav-item"
            active-class="nav-item-active"
          >
            <i class="pi pi-credit-card"></i>
            <span>Suscripción</span>
          </RouterLink>
        </template>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <span class="avatar">{{ userInitial }}</span>
          <div class="user-details">
            <div class="user-name">{{ profile?.name || "Docente" }}</div>
            <div class="user-role">{{ roleLabel }}</div>
          </div>
        </div>
        <div class="footer-actions">
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :title="isGoogleUser ? 'Establecer contraseña' : 'Cambiar contraseña'"
            @click="
              isGoogleUser
                ? (showSetPassword = true)
                : (showChangePassword = true)
            "
          >
            <i class="pi pi-lock"></i>
            Contraseña
          </button>
          <button class="btn btn-ghost btn-sm" type="button" @click="logout">
            <i class="pi pi-sign-out"></i>
            Salir
          </button>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <div class="app-content">
        <slot />
      </div>
    </main>

    <nav
      class="app-tabbar"
      :style="{ '--tabs': tabs.length + 1 }"
      aria-label="Navegación principal"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="tab-item"
        :class="{ 'tab-item-active': isActive(tab.to) }"
      >
        <span class="tab-item__icon">
          <i class="pi" :class="tab.icon"></i>
          <span v-if="tab.badge" class="tab-item__dot">{{ tab.badge }}</span>
        </span>
        <span>{{ tab.label }}</span>
      </RouterLink>
      <button class="tab-item" type="button" @click="navOpen = true">
        <span class="tab-item__icon"><i class="pi pi-ellipsis-h"></i></span>
        <span>Más</span>
      </button>
    </nav>
  </div>

  <Teleport to="body">
    <ChangePasswordModal v-model:visible="showChangePassword" />
    <SetPasswordModal v-model:visible="showSetPassword" />
  </Teleport>
</template>
