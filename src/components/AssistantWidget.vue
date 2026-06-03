<template>
  <div style="display: none" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import robotAvatarUrl from '@/assets/robot.png'
import { useAuthStore } from '@/stores/authStore'
import { createAssistant, type Assistant } from 'practiq-assistant-package'

const authStore = useAuthStore()
const route = useRoute()

const proxyBaseUrl = `${import.meta.env.VITE_PRACTIQ_API_URL || 'http://localhost:8083'}/api/assistant-proxy`

let assistant: Assistant | null = null
let activeToken: string | null = null

function getAssistantCanvasAttachment() {
  const capture = window.__practiqAssistantCapture
  if (typeof capture !== 'function') {
    console.log('[assistant-widget] no capture hook available for current view')
    return null
  }

  console.log('[assistant-widget] capture hook found, requesting attachment')
  const result = capture()

  if (result && typeof (result as Promise<unknown>).then === 'function') {
    return (result as Promise<{
      dataUrl: string
      filename?: string
      contentType?: string
    } | null>).then((resolved) => {
      console.log('[assistant-widget] async capture result', {
        hasAttachment: !!resolved?.dataUrl,
        filename: resolved?.filename || null,
        contentType: resolved?.contentType || null
      })
      return resolved
    })
  }

  const resolved = result as {
    dataUrl: string
    filename?: string
    contentType?: string
  } | null

  console.log('[assistant-widget] sync capture result', {
    hasAttachment: !!resolved?.dataUrl,
    filename: resolved?.filename || null,
    contentType: resolved?.contentType || null
  })
  return resolved
}

function getAssistantStructuredContext() {
  const readContext = window.__practiqAssistantContext
  if (typeof readContext !== 'function') {
    console.log('[assistant-widget] no structured context hook available for current view')
    return null
  }

  console.log('[assistant-widget] structured context hook found, requesting context')
  const result = readContext()

  if (result && typeof (result as Promise<unknown>).then === 'function') {
    return (result as Promise<Record<string, unknown> | null>).then((resolved) => {
      console.log('[assistant-widget] async structured context result', {
        hasStructuredContext: !!resolved,
        keys: resolved ? Object.keys(resolved) : []
      })
      return resolved
    })
  }

  const resolved = result as Record<string, unknown> | null
  console.log('[assistant-widget] sync structured context result', {
    hasStructuredContext: !!resolved,
    keys: resolved ? Object.keys(resolved) : []
  })
  return resolved
}

const isEnabled = computed(() =>
  Boolean(
    authStore.isAuthenticated &&
    authStore.isStudent &&
    authStore.profile?.assistant_base_url &&
    authStore.profile?.assistant_api_key &&
    authStore.token
  )
)

function destroyAssistant() {
  if (!assistant) return
  assistant.unmount()
  assistant = null
  activeToken = null
}

function mountAssistant() {
  const token = authStore.token
  if (!token || !isEnabled.value) return
  if (assistant && activeToken === token) return

  destroyAssistant()

  assistant = createAssistant({
    apiBaseUrl: proxyBaseUrl,
    authToken: token,
    authMode: 'bearer',
    title: 'Asistente',
    placeholder: 'Pregúntale al asistente sobre tu práctica',
    initialMessage: 'Hola, soy tu asistente. ¿Tienes alguna duda?',
    audioInput: true,
    audioAnswers: true,
    getImageAttachment: getAssistantCanvasAttachment,
    getStructuredContext: getAssistantStructuredContext,
    buttonOptions: {
      avatarUrl: robotAvatarUrl,
      backgroundColor: '#ffffff',
      color: '#123c52',
      size: 'large'
    },
    theme: {
      primaryColor: '#123c52',
      textColor: '#16394c',
      backgroundColor: '#ffffff',
      userMessageBgColor: '#123c52',
      userMessageTextColor: '#ffffff',
      assistantMessageBgColor: '#eef7fb',
      assistantMessageTextColor: '#16394c',
      inputBorderColor: '#cfe4ee',
      inputBgColor: '#ffffff',
      inputTextColor: '#16394c'
    }
  })

  activeToken = token
}

watch(
  () => [authStore.token, authStore.profile?.id, authStore.profile?.assistant_base_url, authStore.profile?.assistant_api_key, authStore.profile?.profile_type],
  () => {
    if (!isEnabled.value) {
      destroyAssistant()
      return
    }
    mountAssistant()
  },
  { immediate: true }
)

watch(
  () => route.fullPath,
  async (path) => {
    await nextTick()
    console.log('[assistant-widget] route changed, resetting assistant conversation', { path })
    window.dispatchEvent(new CustomEvent('practiq:assistant:route-change'))
    assistant?.refreshContext()
    assistant?.resetConversation()
  }
)

onBeforeUnmount(() => {
  destroyAssistant()
})
</script>
