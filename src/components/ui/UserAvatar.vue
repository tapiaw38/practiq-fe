<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { avatarSvg } from '@/utils/avatar';
import type { UserAvatarProps } from './UserAvatar.types';

const props = withDefaults(defineProps<UserAvatarProps>(), { size: 48, label: '' });

const svg = ref('');
const loading = ref(false);
const initial = computed(() => props.label.trim().charAt(0).toUpperCase() || '?');

watchEffect(async () => {
    const seed = props.seed;
    if (!seed) {
        svg.value = '';
        loading.value = false;
        return;
    }
    loading.value = true;
    svg.value = '';
    try {
        const drawn = await avatarSvg(seed);

        if (props.seed === seed) svg.value = drawn;
    } catch {
        if (props.seed === seed) svg.value = '';
    } finally {
        if (props.seed === seed) loading.value = false;
    }
});
</script>

<template>
    <span
        v-if="seed && svg"
        class="user-avatar"
        :style="{ width: `${size}px`, height: `${size}px` }"
        :role="label ? 'img' : undefined"
        :aria-label="label || undefined"
        :aria-hidden="label ? undefined : 'true'"
        v-html="svg"
    ></span>

    <span
        v-else-if="seed && loading"
        class="user-avatar user-avatar--skeleton"
        :style="{ width: `${size}px`, height: `${size}px` }"
        role="status"
        aria-label="Cargando avatar"
    ></span>

    <span
        v-else
        class="user-avatar user-avatar--initial"
        :style="{
            width: `${size}px`,
            height: `${size}px`,
            fontSize: `${Math.round(size * 0.42)}px`,
        }"
        :role="label ? 'img' : undefined"
        :aria-label="label || undefined"
        :aria-hidden="label ? undefined : 'true'"
        >{{ initial }}</span
    >
</template>

<style scoped>
.user-avatar {
    display: inline-grid;
    place-items: center;
    flex: none;
    overflow: hidden;
    border-radius: 50%;
    background: var(--fill-primary-soft);
}
.user-avatar :deep(svg) {
    width: 100%;
    height: 100%;
    display: block;
}
.user-avatar--initial {
    color: var(--practiq-violet-dark);
    font-weight: 800;
}
.user-avatar--skeleton {
    background: linear-gradient(
        90deg,
        var(--fill-primary-soft) 20%,
        var(--surface-elevated-strong) 50%,
        var(--fill-primary-soft) 80%
    );
    background-size: 200% 100%;
    animation: avatar-shimmer 1.1s ease-in-out infinite;
}
@keyframes avatar-shimmer {
    to {
        background-position: -200% 0;
    }
}
@media (prefers-reduced-motion: reduce) {
    .user-avatar--skeleton {
        animation: none;
    }
}
</style>
