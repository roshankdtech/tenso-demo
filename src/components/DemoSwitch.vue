<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { demoSignIn, listDemoAccounts } from '@/api/demo'
import type { DemoAccount } from '@/api/demo'
import { roleHome, useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

/** Shown only with the mock API. The real app never renders this. */
const enabled = import.meta.env.VITE_MOCK_API === 'true'
const { t, locale } = useI18n()

/** English: login ID and English role. Japanese: the original display name. */
function optionText(account: DemoAccount): string {
  return locale.value === 'en'
    ? `${account.id} · ${t(`common.roles.${account.role}`)}`
    : account.label
}
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const accounts = ref<DemoAccount[]>([])

onMounted(async () => {
  if (!enabled) return
  try {
    accounts.value = await listDemoAccounts()
  } catch {
    accounts.value = []
  }
})

async function onChange(event: Event): Promise<void> {
  const username = (event.target as HTMLSelectElement).value
  if (!accounts.value.some((a) => a.id === username)) return
  const user = await demoSignIn(username)
  auth.setUser(user)
  toast.show(t('login.demoToast', { name: user.label }))
  await router.push(roleHome[user.role])
}
</script>

<template>
  <label
    v-if="enabled"
    class="flex items-center gap-2 rounded border border-dashed border-amber-600 bg-amber-50 px-2 py-1 text-sm text-slate-900"
  >
    <span class="font-bold">{{ t('common.demoSwitch') }}</span>
    <span class="text-amber-900">{{ t('common.demoNote') }}</span>
    <select
      class="rounded border border-slate-400 bg-white px-1 py-0.5"
      :value="auth.user?.id"
      :aria-label="t('common.demoSwitch')"
      @change="onChange"
    >
      <option v-for="account in accounts" :key="account.id" :value="account.id">
        {{ optionText(account) }}
      </option>
    </select>
  </label>
</template>
