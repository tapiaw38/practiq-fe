import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'practiq-assistant-package': fileURLToPath(new URL('../ai-assistant-package/src/index.ts', import.meta.url))
        }
    },
    server: {
        port: 5174
    }
});
