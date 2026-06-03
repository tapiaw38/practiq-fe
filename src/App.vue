<template>
  <Toast />
  <AssistantWidget />
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AssistantWidget from '@/components/AssistantWidget.vue'
</script>
