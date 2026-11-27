<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api'
import { listDemoAccounts } from '@/api/demo'
import type { DemoAccount } from '@/api/demo'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import LanguageSwitch from '@/components/LanguageSwitch.vue'
import { describeError } from '@/i18n/errors'
import { roleHome, useAuthStore } from '@/stores/auth'
import type { Role } from '@/types'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t, tm } = useI18n()

const props = defineProps<{ role: Role }>()

const enabled = import.meta.env.VITE_MOCK_API === 'true'

const username = ref('')
const password = ref('')
const code = ref('')
const errors = reactive<{ username: string; password: string; code: string }>({
  username: '',
  password: '',
  code: '',
})
const formError = ref('')
const submitting = ref(false)
/** 'password' = step 1. 'code' = step 2 for approvers and admins. */
const step = ref<'password' | 'code'>('password')
const sampleAccounts = ref<DemoAccount[]>([])
/** The safety notes and sample IDs are hidden until their icon is pressed. */
const openPanel = ref<'safety' | 'samples' | null>(null)

/** Pressing an icon shows only that panel; pressing the open one again closes it. */
function togglePanel(panel: 'safety' | 'samples'): void {
  openPanel.value = openPanel.value === panel ? null : panel
}

const pickedName = computed(() => username.value.trim())

/** Sample accounts for this role only. */
const roleAccounts = computed(() => sampleAccounts.value.filter((a) => a.role === props.role))

onMounted(async () => {
  if (!enabled) return
  try {
    sampleAccounts.value = await listDemoAccounts()
  } catch {
    sampleAccounts.value = []
  }
})

function redirectTarget(): string | null {
  return typeof route.query.redirect === 'string' ? route.query.redirect : null
}

async function goHome(): Promise<void> {
  const role = auth.role
  await router.push(redirectTarget() ?? (role ? roleHome[role] : '/login'))
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 && err.code === 'wrong' && err.left !== null) {
      return t('login.errors.wrong', { left: err.left })
    }
    if (err.status === 401 && err.code === 'unknown') return t('login.errors.unknown')
    if (err.status === 401 && err.code === 'otpWrong') return t('login.errors.otpWrong')
    if (err.status === 401 && err.code === 'locked') return t('login.errors.locked')
    if (err.status === 401 && err.code === 'lockedAccount') return t('login.errors.lockedAccount')
    if (err.status === 403 && err.code === 'stopped') return t('login.errors.stopped')
  }
  return describeError(err, t, 'errors.unexpected')
}

async function onSubmitPassword(): Promise<void> {
  formError.value = ''
  errors.username = username.value.trim() ? '' : t('login.errors.empty')
  errors.password = password.value ? '' : t('login.errors.empty')
  if (errors.username || errors.password) return

  submitting.value = true
  try {
    const result = await auth.login(pickedName.value, password.value)
    if (result.user.role !== props.role) {
      // Signed in with a different role: end that session and say so.
      if (result.status === 'signed-in') await auth.logout()
      formError.value = t('login.wrongRole', { role: t(`common.roles.${props.role}`) })
      password.value = ''
      return
    }
    if (result.status === 'code-sent') {
      step.value = 'code'
      code.value = ''
    } else {
      await goHome()
    }
  } catch (err) {
    formError.value = messageFor(err)
    password.value = ''
  } finally {
    submitting.value = false
  }
}

async function onSubmitCode(): Promise<void> {
  formError.value = ''
  if (!/^\d{6}$/.test(code.value.trim())) {
    errors.code = t('login.errors.otpInvalid')
    return
  }
  errors.code = ''
  submitting.value = true
  try {
    await auth.confirmCode(pickedName.value, code.value.trim())
    await goHome()
  } catch (err) {
    formError.value = messageFor(err)
    code.value = ''
  } finally {
    submitting.value = false
  }
}

function backToPassword(): void {
  step.value = 'password'
  password.value = ''
  formError.value = ''
}

function fillId(id: string): void {
  username.value = id
  password.value = ''
  formError.value = ''
}

const maskedMail = computed(() => {
  const account = sampleAccounts.value.find((a) => a.id === pickedName.value)
  return account ? account.mail.replace(/^(.).*(@.*)$/, '$1***$2') : ''
})
</script>

<template>
  <main
    class="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-slate-100"
  >
    <div class="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <div class="w-full max-w-md self-center">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
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

        <RouterLink to="/login" class="mb-4 inline-block text-sm text-blue-300 underline">
          ← {{ t('login.backToPortals') }}
        </RouterLink>

        <form
          v-if="step === 'password'"
          class="flex flex-col gap-5 rounded-xl border border-slate-400 bg-white p-8 shadow text-slate-900"
          novalidate
          @submit.prevent="onSubmitPassword"
        >
          <h1 class="text-2xl font-bold">🔑 {{ t(`login.heading.${role}`) }}</h1>
          <AppAlert v-if="formError" tone="error">{{ formError }}</AppAlert>

          <AppInput
            id="username"
            v-model="username"
            :label="t('login.userId')"
            autocomplete="username"
            required
            :error="errors.username"
          />
          <AppInput
            id="password"
            v-model="password"
            :label="t('login.password')"
            type="password"
            show-toggle
            autocomplete="current-password"
            required
            :error="errors.password"
          />

          <AppButton type="submit" variant="accent" :loading="submitting">
            {{ t('login.submit') }}
          </AppButton>
        </form>

        <form
          v-else
          class="flex flex-col gap-5 rounded-xl border border-slate-400 bg-white p-8 shadow text-slate-900"
          novalidate
          @submit.prevent="onSubmitCode"
        >
          <h1 class="text-2xl font-bold">🔐 {{ t('login.otpTitle') }}</h1>
          <AppAlert v-if="formError" tone="error">{{ formError }}</AppAlert>
          <p class="text-sm text-slate-700">
            {{ t('login.otpSent', { name: pickedName, mail: maskedMail }) }}
          </p>
          <AppInput
            id="otp-code"
            v-model="code"
            :label="t('login.otpCode')"
            inputmode="numeric"
            autocomplete="one-time-code"
            :placeholder="t('login.otpPlaceholder')"
            required
            :error="errors.code"
          />
          <AppButton type="submit" variant="accent" :loading="submitting">
            {{ t('login.otpSubmit') }}
          </AppButton>
          <AppButton variant="secondary" @click="backToPassword">{{
            t('login.otpBack')
          }}</AppButton>
          <p class="text-sm text-slate-600">{{ t('login.otpNote') }}</p>
        </form>

        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-500 bg-slate-800 text-lg hover:bg-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
            :aria-expanded="openPanel === 'safety'"
            :aria-label="t('login.safetyTitle')"
            :title="t('login.safetyTitle')"
            @click="togglePanel('safety')"
          >
            🔒
          </button>
          <button
            v-if="enabled && roleAccounts.length"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-500 bg-slate-800 text-lg hover:bg-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
            :aria-expanded="openPanel === 'samples'"
            :aria-label="t('login.sampleAccounts')"
            :title="t('login.sampleAccounts')"
            @click="togglePanel('samples')"
          >
            👥
          </button>
        </div>
        <div
          v-if="openPanel === 'safety'"
          class="mt-3 rounded border border-slate-600 bg-slate-800/70 p-4 text-sm text-slate-200"
        >
          <p class="mb-2 font-bold">{{ t('login.safetyTitle') }}</p>
          <ul class="list-disc space-y-1 pl-5">
            <li v-for="(line, index) in tm('login.safety') as string[]" :key="index">{{ line }}</li>
          </ul>
        </div>
        <ul class="mt-4 space-y-1 text-sm text-slate-300">
          <li><span aria-hidden="true">🔒</span> {{ t('login.legendSafety') }}</li>
          <li><span aria-hidden="true">👥</span> {{ t('login.legendSamples') }}</li>
        </ul>
      </div>

      <section
        v-if="enabled && roleAccounts.length && openPanel === 'samples'"
        class="w-full self-center"
      >
        <h2 class="mb-2 text-base font-bold">{{ t('login.sampleAccounts') }}</h2>
        <div class="overflow-x-auto rounded border border-slate-400 bg-white text-slate-900">
          <table class="w-full border-collapse text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="border border-slate-300 px-3 py-2 text-left">{{ t('login.userId') }}</th>
                <th class="border border-slate-300 px-3 py-2 text-left">
                  {{ t('login.colName') }}
                </th>
                <th class="border border-slate-300 px-3 py-2 text-left">
                  {{ t('login.colWarehouse') }}
                </th>
                <th class="border border-slate-300 px-3 py-2 text-left">
                  {{ t('login.colRole') }}
                </th>
                <th class="border border-slate-300 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="account in roleAccounts" :key="account.id">
                <td class="border border-slate-300 px-3 py-2 font-mono">{{ account.id }}</td>
                <td class="border border-slate-300 px-3 py-2">{{ account.person }}</td>
                <td class="border border-slate-300 px-3 py-2">{{ account.label }}</td>
                <td class="border border-slate-300 px-3 py-2">
                  {{ t(`common.roles.${account.role}`) }}
                </td>
                <td class="border border-slate-300 px-3 py-2">
                  <button
                    type="button"
                    class="font-bold text-blue-700 underline"
                    @click="fillId(account.id)"
                  >
                    {{ t('login.fill') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>
