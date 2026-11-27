import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { setUnauthorizedHandler } from './api'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)

// If the session expires while the user is working, send them back to login.
setUnauthorizedHandler(() => {
  const auth = useAuthStore(pinia)
  if (!auth.isLoggedIn) return
  auth.clear()
  const current = router.currentRoute.value
  void router.push({ name: 'login', query: { redirect: current.fullPath } })
})

app.mount('#app')
