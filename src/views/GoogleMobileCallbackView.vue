<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import axios from 'axios';

const authBaseURL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8082';
const done = ref(false);
const countdown = ref(3);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    try {
        if (code && state) {
            await axios.post(`${authBaseURL}/auth/google/mobile/callback`, { code, state });
        }
    } catch {
    } finally {
        done.value = true;
        countdownTimer = setInterval(() => {
            countdown.value -= 1;
            if (countdown.value <= 0) {
                if (countdownTimer) clearInterval(countdownTimer);
                window.close();
            }
        }, 1000);
    }
});

onUnmounted(() => {
    if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<template>
    <main class="mobile-callback">
        <p v-if="!done">Completando el inicio de sesión…</p>
        <p v-else>Volviendo a la app en {{ countdown }}…</p>
    </main>
</template>

<style scoped>
.mobile-callback {
    display: grid;
    min-height: 100vh;
    padding: 24px;
    place-items: center;
    font-family: var(--font-body-family, sans-serif);
    text-align: center;
}
</style>
