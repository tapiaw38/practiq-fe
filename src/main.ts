import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Toast from 'primevue/toast'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ProgressBar from 'primevue/progressbar'

import App from './App.vue'
import router from './router'
import { primeVueConfig } from './primevue-config'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin)
app.use(PrimeVue, primeVueConfig)
app.use(ToastService)

app.component('Toast', Toast)
app.component('Dialog', Dialog)
app.component('Button', Button)
app.component('InputText', InputText)
app.component('Textarea', Textarea)
app.component('Select', Select)
app.component('ProgressBar', ProgressBar)

app.mount('#app')
