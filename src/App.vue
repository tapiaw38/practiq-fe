<template>
  <Toast />
  <div v-if="showSchoolSelector" class="school-selector">
    <label for="active-school">Escuela</label>
    <select id="active-school" :value="schoolStore.activeSchoolId ?? ''" @change="selectSchool">
      <option v-for="school in schoolStore.schools" :key="school.id" :value="school.id">{{ school.name }}</option>
    </select>
  </div>
  <p v-else-if="authStore.isAuthenticated && !schoolStore.loading" class="school-required">Seleccioná una escuela para continuar.</p>
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
  import { useSchoolStore } from '@/stores/schoolStore'

  const authStore = useAuthStore()
  const schoolStore = useSchoolStore()
  const route = useRoute()
  const AssistantWidget = defineAsyncComponent(
    () => import('@/components/student/assistant/AssistantWidget.vue'),
  )
  const showAssistant = computed(
    () => authStore.isAuthenticated && authStore.isStudent,
  )
  const showSchoolSelector = computed(() => authStore.isAuthenticated && schoolStore.schools.length > 1)
  async function selectSchool(event: Event) {
    const id = (event.target as HTMLSelectElement).value
    if (id) await schoolStore.selectAndLoad(id)
  }
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
      await schoolStore.load()
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

<style scoped>
.school-selector { position: fixed; z-index: 30; top: .75rem; right: 1rem; display: flex; align-items: center; gap: .5rem; padding: .45rem .65rem; border-radius: .5rem; background: white; box-shadow: 0 2px 10px #0002; }
.school-selector select { max-width: 15rem; }
.school-required { position: fixed; z-index: 30; top: .75rem; right: 1rem; padding: .45rem .65rem; border-radius: .5rem; background: #fff4e5; color: #8a4b00; }
</style>
