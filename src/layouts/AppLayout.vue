<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { listOrders } from '@/api/orders'
import AppButton from '@/components/ui/AppButton.vue'
import AppToast from '@/components/AppToast.vue'
import DemoSwitch from '@/components/DemoSwitch.vue'
import LanguageSwitch from '@/components/LanguageSwitch.vue'
import { useIdleLogout } from '@/composables/useIdleLogout'
import { useMailbox } from '@/composables/useMailbox'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

type MenuItem = { to: string; label: string; badge?: number; badgeLabel?: string }
type MenuGroup = { title?: string; items: MenuItem[]; primary?: { to: string; label: string } }

// Counts shown as red badges in the menu.
const returnedCount = ref(0)
const pendingCount = ref(0)
const mail = useMailbox(10000)

async function refreshCounts(): Promise<void> {
  try {
    if (auth.role === 'warehouse') {
      const mine = await listOrders('mine')
      returnedCount.value = mine.filter((o) => o.status === '差し戻し').length
    } else if (auth.role === 'approver') {
      pendingCount.value = (await listOrders('pending')).length
    }
  } catch {
    // Badges are a convenience. Ignore failures here.
  }
}

const menu = computed<MenuGroup[]>(() => {
  const role: Role | null = auth.role
  if (role === 'warehouse') {
    return [
      {
        primary: { to: '/orders/new', label: t('nav.newOrder') },
        items: [
          { to: '/orders', label: t('nav.myOrders'), badge: returnedCount.value },
          { to: '/drafts', label: t('nav.drafts') },
          { to: '/latest', label: t('nav.latest') },
          {
            to: '/mail',
            label: t('nav.mail'),
            badge: mail.unread.value,
            badgeLabel: t('nav.newMail', { count: mail.unread.value }),
          },
        ],
      },
    ]
  }
  if (role === 'approver') {
    return [
      {
        primary: { to: '/proxy', label: t('nav.proxyOrder') },
        items: [
          { to: '/pending', label: t('nav.pending'), badge: pendingCount.value },
          { to: '/received', label: t('nav.received') },
        ],
      },
      {
        items: [
          { to: '/sendlog', label: t('nav.sendLog') },
          { to: '/billing', label: t('nav.billing') },
          { to: '/csv-spec', label: t('nav.csvSpec') },
          {
            to: '/mail',
            label: t('nav.mail'),
            badge: mail.unread.value,
            badgeLabel: t('nav.newMail', { count: mail.unread.value }),
          },
        ],
      },
    ]
  }
  if (role === 'admin') {
    return [
      {
        items: [
          { to: '/sendlog', label: t('nav.sendLog') },
          { to: '/csv-spec', label: t('nav.csvSpec') },
          { to: '/billing', label: t('nav.billing') },
        ],
      },
      {
        items: [
          { to: '/items', label: t('nav.items') },
          { to: '/destinations', label: t('nav.destinations') },
          { to: '/accounts', label: t('nav.accounts') },
          {
            to: '/mail',
            label: t('nav.mail'),
            badge: mail.unread.value,
            badgeLabel: t('nav.newMail', { count: mail.unread.value }),
          },
        ],
      },
    ]
  }
  return []
})

const roleName = computed(() => (auth.role ? t(`common.roles.${auth.role}`) : ''))

watch(() => route.fullPath, refreshCounts)
watch(() => auth.role, refreshCounts)
onMounted(refreshCounts)

// Sign out after 30 minutes without activity, and say why on the sign-in page.
const { warning, secondsLeft, stayActive } = useIdleLogout(async () => {
  await auth.logout()
  await router.push({ name: 'login', query: { reason: 'idle' } })
})

async function onLogout(): Promise<void> {
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <header class="border-b border-slate-700 bg-slate-900 text-slate-100 shadow print:hidden">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <div class="text-xl font-bold">{{ t('common.appName') }}</div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <DemoSwitch />
          <LanguageSwitch />
          <span class="text-base text-slate-200">{{ auth.user?.label }} ({{ roleName }})</span>
          <AppButton variant="secondary" @click="router.push('/password')">{{
            t('common.changePassword')
          }}</AppButton>
          <AppButton variant="secondary" @click="onLogout">{{ t('common.logOut') }}</AppButton>
        </div>
      </div>
    </header>

    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
      <nav
        :aria-label="t('common.menu')"
        class="w-full shrink-0 rounded-lg bg-slate-800 p-3 text-slate-100 shadow md:w-56 print:hidden"
      >
        <div v-for="(group, index) in menu" :key="index" class="mb-6 flex flex-col gap-2">
          <RouterLink
            v-if="group.primary"
            :to="group.primary.to"
            class="rounded-md bg-blue-600 px-4 py-2 text-center font-bold text-white hover:bg-blue-500"
          >
            {{ group.primary.label }}
          </RouterLink>
          <ul class="flex flex-col gap-1 border-t border-slate-600 pt-2">
            <li v-for="item in group.items" :key="item.to">
              <RouterLink
                :to="item.to"
                class="flex items-center justify-between rounded px-3 py-2 text-base text-slate-200 hover:bg-slate-700 hover:text-white"
                active-class="bg-slate-700 font-bold text-white"
              >
                <span>{{ item.label }}</span>
                <span
                  v-if="item.badge"
                  class="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-red-800 px-2 text-sm font-bold text-white"
                  :aria-label="item.badgeLabel ?? t('nav.needAttention', { count: item.badge })"
                >
                  {{ item.badge }}
                </span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>

      <main class="min-w-0 flex-1">
        <RouterView />
      </main>
    </div>
    <div
      v-if="warning"
      role="alertdialog"
      aria-live="assertive"
      :aria-label="t('idle.title')"
      class="fixed inset-x-4 top-4 z-40 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-amber-500 bg-amber-50 p-4 text-slate-900 shadow-lg"
    >
      <span class="font-bold">{{ t('idle.warning', { seconds: secondsLeft }) }}</span>
      <AppButton variant="accent" @click="stayActive">{{ t('idle.stay') }}</AppButton>
    </div>
    <AppToast />
  </div>
</template>
