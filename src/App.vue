<template>
  <Toast />
  <AssistantWidget v-if="showAssistant" />
  <RouterView />
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent } from 'vue'
  import { RouterView } from 'vue-router'
  import { useAuthStore } from '@/stores/authStore'

  const authStore = useAuthStore()
  const AssistantWidget = defineAsyncComponent(
    () => import('@/components/student/assistant/AssistantWidget.vue'),
  )
  const showAssistant = computed(
    () => authStore.isAuthenticated && authStore.isStudent,
  )
</script>
