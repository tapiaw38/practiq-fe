<template>
  <div v-if="authStore.isImpersonating" class="impersonation-bar">
    <span><i class="pi pi-eye"></i> Vista de solo lectura: {{ authStore.profile?.name || 'usuario' }}</span>
    <button type="button" @click="exitImpersonation">Volver a administración</button>
  </div>
  <Toast />
  <AssistantWidget v-if="showAssistant" />
  <RouterView :key="viewKey" />
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent, onMounted, watch } from 'vue'
  import { setUiTheme } from '@/composables/useUiTheme'
  import { RouterView, useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/authStore'
  import { practiqApi } from '@/api/request/server'
  import { ProfileService } from '@/services/profile/profileService'

  const authStore = useAuthStore()
  const route = useRoute()
  const router = useRouter()
  const AssistantWidget = defineAsyncComponent(
    () => import('@/components/student/assistant/AssistantWidget.vue'),
  )
  const showAssistant = computed(
    () => authStore.isAuthenticated && authStore.isStudent && !authStore.isImpersonating,
  )
  watch(
    () => authStore.profile,
    (profile) => setUiTheme(
      profile?.profile_type === 'teacher' ? 'teacher' : profile?.ui_theme,
    ),
    { immediate: true },
  )
  onMounted(async () => {
    if (!authStore.isAuthenticated) return
    try {
      const response = await new ProfileService(practiqApi).get()
      authStore.setProfile(response.data)
    } catch {
      // Cached profile keeps navigation usable if API is temporarily offline.
    }
  })
  function exitImpersonation() {
    if (authStore.endImpersonation()) void router.replace('/teacher/admin/users')
  }
  const viewKey = computed(() => {
    const routeName = String(route.name ?? '')
    const routesWithResourceState = new Set([
      'student-practice',
      'student-level-test',
      'student-notebook',
    ])
    return routesWithResourceState.has(routeName)
      ? `${routeName}:${route.params.id}`
      : routeName
  })
</script>

<style>
.impersonation-bar { position: sticky; z-index: 10000; top: 0; display: flex; min-height: 42px; align-items: center; justify-content: space-between; gap: 1rem; padding: .5rem max(1rem, calc((100vw - 1240px) / 2)); color: #312e81; background: #fef3c7; border-bottom: 1px solid #fcd34d; font-size: .85rem; font-weight: 700; }
.impersonation-bar button { padding: .35rem .65rem; border: 1px solid #a16207; border-radius: .45rem; color: #713f12; background: #fff; cursor: pointer; font: inherit; }
@media (max-width: 560px) { .impersonation-bar { align-items: flex-start; font-size: .75rem; } .impersonation-bar button { flex: 0 0 auto; } }
</style>
