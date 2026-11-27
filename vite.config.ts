import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { mockApi } from './vite.mock.ts'
import vueDevtools from 'vite-plugin-vue-devtools'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMock = env.VITE_MOCK_API === 'true'

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [vue(), tailwindcss(), ...(useMock ? [mockApi()] : []), vueDevtools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
