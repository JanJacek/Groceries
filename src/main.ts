import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import { initializeTheme } from '@/composables/useTheme'
import './styles/main.scss'

initializeTheme()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const auth = useAuthStore()
auth.initialize().catch((error) => {
  console.error('Auth init failed', error)
})

app.mount('#app')
