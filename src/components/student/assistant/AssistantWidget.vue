<template>
  <div style="display: none" aria-hidden="true"></div>
</template>

<script setup lang="ts">
  import {
    computed,
    nextTick,
    onMounted,
    onBeforeUnmount,
    ref,
    watch,
  } from "vue";
  import { useRoute } from "vue-router";
  import { useAuthStore } from "@/stores/authStore";
  import { createAssistant, type Assistant } from "practiq-assistant-package";

  const authStore = useAuthStore();
  const route = useRoute();

  const proxyBaseUrl = `${import.meta.env.VITE_PRACTIQ_API_URL || "http://localhost:8083"}/api/assistant-proxy`;

  let assistant: Assistant | null = null;
  let activeToken: string | null = null;
  const drawerOpen = ref(false);

  function getAssistantCanvasAttachment() {
    const capture = window.__practiqAssistantCapture;
    if (typeof capture !== "function") {
      console.log(
        "[assistant-widget] no capture hook available for current view",
      );
      return null;
    }

    console.log("[assistant-widget] capture hook found, requesting attachment");
    const result = capture();

    if (result && typeof (result as Promise<unknown>).then === "function") {
      return (
        result as Promise<{
          dataUrl: string;
          filename?: string;
          contentType?: string;
        } | null>
      ).then((resolved) => {
        console.log("[assistant-widget] async capture result", {
          hasAttachment: !!resolved?.dataUrl,
          filename: resolved?.filename || null,
          contentType: resolved?.contentType || null,
        });
        return resolved;
      });
    }

    const resolved = result as {
      dataUrl: string;
      filename?: string;
      contentType?: string;
    } | null;

    console.log("[assistant-widget] sync capture result", {
      hasAttachment: !!resolved?.dataUrl,
      filename: resolved?.filename || null,
      contentType: resolved?.contentType || null,
    });
    return resolved;
  }

  function getAssistantStructuredContext() {
    const readContext = window.__practiqAssistantContext;
    if (typeof readContext !== "function") {
      console.log(
        "[assistant-widget] no structured context hook available for current view",
      );
      return null;
    }

    console.log(
      "[assistant-widget] structured context hook found, requesting context",
    );
    const result = readContext();

    if (result && typeof (result as Promise<unknown>).then === "function") {
      return (result as Promise<Record<string, unknown> | null>).then(
        (resolved) => {
          console.log("[assistant-widget] async structured context result", {
            hasStructuredContext: !!resolved,
            keys: resolved ? Object.keys(resolved) : [],
          });
          return resolved;
        },
      );
    }

    const resolved = result as Record<string, unknown> | null;
    console.log("[assistant-widget] sync structured context result", {
      hasStructuredContext: !!resolved,
      keys: resolved ? Object.keys(resolved) : [],
    });
    return resolved;
  }

  const isEnabled = computed(() =>
    Boolean(
      authStore.isAuthenticated &&
      authStore.isStudent &&
      authStore.profile?.assistant_base_url &&
      authStore.profile?.assistant_api_key &&
      authStore.token,
    ),
  );

  function destroyAssistant() {
    if (!assistant) return;
    setAssistantDrawerHidden(false);
    assistant.unmount();
    assistant = null;
    activeToken = null;
  }

  function setAssistantDrawerHidden(hidden: boolean) {
    document
      .querySelectorAll(".floating-button, .ia-chat-container")
      .forEach((el) => {
        el.classList.toggle("practiq-assistant-drawer-hidden", hidden);
        if (hidden) {
          el.setAttribute("aria-hidden", "true");
        } else {
          el.removeAttribute("aria-hidden");
        }
      });
  }

  function applyDrawerVisibility() {
    if (!assistant) return;
    const shouldHide = drawerOpen.value && window.innerWidth <= 920;
    if (shouldHide) {
      assistant.close();
      assistant.showButton();
      requestAnimationFrame(() => setAssistantDrawerHidden(true));
    } else {
      setAssistantDrawerHidden(false);
      assistant.showButton();
    }
  }

  function getCSSVar(name: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  function mountAssistant() {
    const token = authStore.token;
    if (!token || !isEnabled.value) return;
    if (assistant && activeToken === token) return;

    destroyAssistant();

    const primaryColor = getCSSVar("--practiq-violet");
    const backgroundColor = getCSSVar("--surface-card");
    const textColor = getCSSVar("--text-primary");

    assistant = createAssistant({
      apiBaseUrl: proxyBaseUrl,
      authToken: token,
      authMode: "bearer",
      conversationStorageKey: authStore.profile?.id,
      title: "Asistente",
      placeholder: "Pregúntale al asistente…",
      initialMessage: "Hola, soy tu asistente. ¿Tienes alguna duda?",
      searchImages: false,
      audioInput: true,
      audioAnswers: true,
      getImageAttachment: getAssistantCanvasAttachment,
      getStructuredContext: getAssistantStructuredContext,
      buttonOptions: {
        backgroundColor: backgroundColor,
        color: primaryColor,
        size: "large",
      },
      quickActions: [
        { label: "💡 Pista", prompt: "Dame una pista sin revelar la respuesta." },
        { label: "🧩 Explicame", prompt: "Explicame paso a paso usando el ejercicio actual." },
        { label: "✓ Revisá", prompt: "Revisá mi respuesta actual y ayudame a mejorarla." },
      ],
      theme: {
        primaryColor: primaryColor,
        textColor: textColor,
        backgroundColor: backgroundColor,
        userMessageBgColor: primaryColor,
        userMessageTextColor: "#ffffff",
        assistantMessageBgColor: getCSSVar("--surface-elevated"),
        assistantMessageTextColor: textColor,
        inputBorderColor: getCSSVar("--surface-border"),
        inputBgColor: backgroundColor,
        inputTextColor: textColor,
      },
    });

    activeToken = token;
    applyDrawerVisibility();
  }

  watch(
    () => [
      authStore.token,
      authStore.profile?.id,
      authStore.profile?.assistant_base_url,
      authStore.profile?.assistant_api_key,
      authStore.profile?.profile_type,
    ],
    () => {
      if (!isEnabled.value) {
        destroyAssistant();
        return;
      }
      mountAssistant();
    },
    { immediate: true },
  );

  watch(
    () => route.fullPath,
    async (path) => {
      await nextTick();
      console.log(
        "[assistant-widget] route changed, resetting assistant conversation",
        { path },
      );
      window.dispatchEvent(new CustomEvent("practiq:assistant:route-change"));
      assistant?.refreshContext();
      assistant?.resetConversation();
    },
  );

  function handleDrawerToggle(e: Event) {
    const customEvent = e as CustomEvent<{ open: boolean }>;
    drawerOpen.value = !!customEvent.detail.open;
    applyDrawerVisibility();
  }

  onMounted(() => {
    window.addEventListener(
      "student-drawer-toggled",
      handleDrawerToggle as EventListener,
    );
  });

  onBeforeUnmount(() => {
    window.removeEventListener(
      "student-drawer-toggled",
      handleDrawerToggle as EventListener,
    );
    destroyAssistant();
  });
</script>

<style>
  .floating-button,
  .ia-chat-container {
    transition:
      opacity 0.2s ease,
      transform 0.22s ease;
  }

  .floating-button.practiq-assistant-drawer-hidden,
  .ia-chat-container.practiq-assistant-drawer-hidden {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: translateY(18px) !important;
  }
</style>
