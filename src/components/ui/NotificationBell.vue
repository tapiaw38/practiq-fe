<script setup lang="ts">
  import { onMounted, onUnmounted, ref } from "vue";
  import { useRouter } from "vue-router";
  import { useNotification } from "@/composables/useNotification";
  import type { AppNotification } from "@/types";

  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    dismissNotification,
    markAllRead,
  } = useNotification();

  const open = ref(false);
  const bellRef = ref<HTMLElement | null>(null);

  onMounted(() => {
    loadNotifications();
    document.addEventListener("click", closeOnOutsideClick);
  });

  onUnmounted(() => {
    document.removeEventListener("click", closeOnOutsideClick);
  });

  function closeOnOutsideClick(event: MouseEvent) {
    if (!open.value) return;
    if (bellRef.value && !bellRef.value.contains(event.target as Node)) {
      open.value = false;
    }
  }

  function togglePanel() {
    open.value = !open.value;
    // Refresh on open so a test scheduled while the tab was idle shows up.
    if (open.value) loadNotifications();
  }

  async function openNotification(notification: AppNotification) {
    await dismissNotification(notification.id);
    open.value = false;
    if (
      notification.resource_type === "practice_sheet" &&
      notification.resource_id
    ) {
      router.push(`/student/level-test/${notification.resource_id}`);
    }
  }

  function formatSchedule(value?: string) {
    if (!value) return "";
    return new Date(value).toLocaleString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isPast(value?: string) {
    return !!value && new Date(value) <= new Date();
  }
</script>

<template>
  <div ref="bellRef" class="bell-wrap">
    <button
      class="bell-btn"
      type="button"
      :aria-label="`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`"
      @click="togglePanel"
    >
      <i class="pi pi-bell"></i>
      <span v-if="unreadCount" class="bell-badge">
        {{ unreadCount > 9 ? "9+" : unreadCount }}
      </span>
    </button>

    <Transition name="fade">
      <div v-if="open" class="bell-panel">
        <div class="bell-head">
          <span class="bell-title">Notificaciones</span>
          <button
            v-if="unreadCount"
            class="bell-mark-all"
            type="button"
            @click="markAllRead"
          >
            Marcar todas como leídas
          </button>
        </div>

        <p v-if="loading && !notifications.length" class="bell-empty">
          Cargando…
        </p>
        <p v-else-if="!notifications.length" class="bell-empty">
          No tenés notificaciones.
        </p>

        <ul v-else class="bell-list">
          <li
            v-for="notification in notifications"
            :key="notification.id"
            class="bell-item"
            :class="{ 'bell-item--unread': !notification.read }"
            @click="openNotification(notification)"
          >
            <span class="bell-item-icon">
              <i class="pi pi-calendar-clock"></i>
            </span>
            <div class="bell-item-body">
              <div class="bell-item-title">{{ notification.title }}</div>
              <div v-if="notification.body" class="bell-item-text">
                {{ notification.body }}
              </div>
              <div v-if="notification.scheduled_at" class="bell-item-date">
                {{ formatSchedule(notification.scheduled_at) }}
                <span
                  v-if="isPast(notification.scheduled_at)"
                  class="bell-item-now"
                >
                  ¡ya podés rendirla!
                </span>
              </div>
            </div>
            <span v-if="!notification.read" class="bell-dot"></span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
  .bell-wrap {
    position: relative;
  }

  .bell-btn {
    position: relative;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-card);
    color: var(--text-primary);
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .bell-btn:hover {
    box-shadow: var(--shadow-card);
  }

  .bell-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--red-500, #dc2626);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    display: grid;
    place-items: center;
  }

  .bell-panel {
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    width: min(360px, calc(100vw - 32px));
    max-height: 70vh;
    overflow-y: auto;
    padding: 12px;
    border-radius: var(--radius-xl, 20px);
    border: 1px solid var(--surface-elevated-strong);
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
    z-index: 50;
  }

  .bell-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }

  .bell-title {
    font-weight: 800;
    color: var(--text-primary);
  }

  .bell-mark-all {
    border: none;
    background: none;
    padding: 0;
    color: var(--practiq-violet);
    font-size: var(--text-xs);
    font-weight: 700;
    cursor: pointer;
  }

  .bell-empty {
    margin: 0;
    padding: 18px 6px;
    text-align: center;
    color: var(--text-secondary);
    font-size: var(--text-sm);
  }

  .bell-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .bell-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .bell-item:hover {
    background: var(--surface-elevated);
  }

  .bell-item--unread {
    background: rgba(124, 58, 237, 0.07);
  }

  .bell-item-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: rgba(124, 58, 237, 0.12);
    color: var(--practiq-violet);
  }

  .bell-item-body {
    flex: 1;
    min-width: 0;
  }

  .bell-item-title {
    font-weight: 700;
    color: var(--text-primary);
    font-size: var(--text-sm);
  }

  .bell-item-text,
  .bell-item-date {
    color: var(--text-secondary);
    font-size: var(--text-xs);
    margin-top: 2px;
  }

  .bell-item-date {
    color: var(--practiq-violet);
    font-weight: 600;
  }

  .bell-item-now {
    margin-left: 4px;
    color: var(--green-600, #16a34a);
  }

  .bell-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--practiq-violet);
    flex: 0 0 auto;
    margin-top: 6px;
  }
</style>
