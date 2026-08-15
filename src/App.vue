<template>
  <Toast />
  <AssistantWidget v-if="showAssistant" />
  <RouterView :key="viewKey" />
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent } from 'vue'
  import { RouterView, useRoute } from 'vue-router'
  import { useAuthStore } from '@/stores/authStore'

  const authStore = useAuthStore()
  const route = useRoute()
  const AssistantWidget = defineAsyncComponent(
    () => import('@/components/student/assistant/AssistantWidget.vue'),
  )
  const showAssistant = computed(
    () => authStore.isAuthenticated && authStore.isStudent,
  )
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
