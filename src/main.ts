import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Toast from 'primevue/toast'

import App from './App.vue'
import router from './router'
import { primeVueConfig } from './primevue-config'
import './assets/main.css'
import 'katex/dist/katex.min.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin)
app.use(PrimeVue, primeVueConfig)
app.use(ToastService)

app.component('Toast', Toast)

app.mount('#app')
