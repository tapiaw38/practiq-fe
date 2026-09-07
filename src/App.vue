<template>
  <Toast />
  <AssistantWidget v-if="showAssistant" />
  <RouterView :key="viewKey" />
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent, onMounted, watch } from 'vue'
  import { setUiTheme } from '@/composables/useUiTheme'
  import { RouterView, useRoute } from 'vue-router'
  import { useAuthStore } from '@/stores/authStore'
  import { practiqApi } from '@/api/request/server'
  import { ProfileService } from '@/services/profile/profileService'

  const authStore = useAuthStore()
  const route = useRoute()
  const AssistantWidget = defineAsyncComponent(
    () => import('@/components/student/assistant/AssistantWidget.vue'),
  )
  const showAssistant = computed(
    () => authStore.isAuthenticated && authStore.isStudent,
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
