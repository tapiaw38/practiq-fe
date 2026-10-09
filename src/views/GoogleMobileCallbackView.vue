<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';

const authBaseURL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8082';
const done = ref(false);

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
    }
});
</script>

<template>
    <main class="mobile-callback">
        <p>{{ done ? 'Ya podés volver a la app.' : 'Completando el inicio de sesión…' }}</p>
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
