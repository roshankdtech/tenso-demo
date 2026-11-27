<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import AppAlert from '@/components/ui/AppAlert.vue'
import LanguageSwitch from '@/components/LanguageSwitch.vue'
import type { Role } from '@/types'

const { t } = useI18n()
const route = useRoute()
/** Shown after an automatic sign-out for inactivity. */
const idleLogout = route.query.reason === 'idle'

/** One card per role. Each goes to that role's own log in page. */
const portals: { role: Role; to: string }[] = [
  { role: 'warehouse', to: '/login/warehouse' },
  { role: 'approver', to: '/login/approver' },
  { role: 'admin', to: '/login/admin' },
]
</script>

<template>
  <main
    class="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-slate-100"
  >
    <div class="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white"
            aria-hidden="true"
          >
            t
          </span>
          <span class="text-lg font-semibold">{{ t('common.appName') }}</span>
        </div>
        <LanguageSwitch />
      </div>

      <section>
        <AppAlert v-if="idleLogout" tone="info" class="mb-4">{{ t('login.idleLogout') }}</AppAlert>
        <h1 class="text-2xl font-bold">{{ t('login.pickerTitle') }}</h1>
        <p class="mt-2 text-slate-300">{{ t('login.pickerSubtitle') }}</p>

        <div class="mt-6 grid gap-6 sm:grid-cols-3">
          <RouterLink
            v-for="portal in portals"
            :key="portal.role"
            :to="portal.to"
            class="flex flex-col items-center gap-4 rounded-xl border border-slate-400 bg-white p-6 text-center text-slate-900 shadow transition hover:border-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
          >
            <span
              class="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-blue-800"
              aria-hidden="true"
            >
              <!-- Warehouse: a building with a roof and a door -->
              <svg
                v-if="portal.role === 'warehouse'"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-10 w-10"
              >
                <path d="M3 10.5 12 4l9 6.5" />
                <path d="M5 9.5V20h14V9.5" />
                <path d="M9 20v-6h6v6" />
              </svg>
              <!-- Approver: a shield with a check mark -->
              <svg
                v-else-if="portal.role === 'approver'"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-10 w-10"
              >
                <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <!-- Administrator: a key -->
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-10 w-10"
              >
                <circle cx="8" cy="15" r="4" />
                <path d="M10.85 12.15 19 4M18 5l2 2M15 8l2 2" />
              </svg>
            </span>
            <span class="text-xl font-bold">{{ t(`login.portal.${portal.role}.name`) }}</span>
            <span class="text-sm text-slate-700">{{
              t(`login.portal.${portal.role}.description`)
            }}</span>
          </RouterLink>
        </div>
      </section>
    </div>
  </main>
</template>
