<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { describeError } from '@/i18n/errors'
import { listAccounts, resetAccountPassword, saveAccount, unlockAccount } from '@/api/masters'
import type { AccountInput } from '@/api/masters'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useMastersStore } from '@/stores/masters'
import type { Account, Role } from '@/types'
import { csvField } from '@/utils/csv'
import { downloadText } from '@/utils/download'

const { t, tm } = useI18n()
const auth = useAuthStore()
const masters = useMastersStore()
const toast = useToast()

const accounts = ref<Account[]>([])
const pageError = ref('')
const formError = ref('')
const saving = ref(false)
const errors = reactive<Record<string, string>>({})

/** null = closed. '' = new account. An id = editing that account. */
const editingId = ref<string | null>(null)
const isNew = computed(() => editingId.value === '')
const isOpen = computed(() => editingId.value !== null)

const roleOptions = (['warehouse', 'approver', 'admin'] as Role[]).map((r) => ({
  value: r,
  label: t(`common.roles.${r}`),
}))
const warehouseOptions = computed(() =>
  masters.warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.destinationCode})` })),
)
const statusOptions = [
  { value: '有効', label: t('masters.fields.accountStatusActive') },
  { value: '停止', label: t('masters.fields.accountStatusStopped') },
]

const form = reactive({
  id: '',
  person: '',
  role: 'warehouse' as Role,
  warehouseId: '',
  mail: '',
  status: '有効' as '有効' | '停止' | 'ロック中',
})

function statusLabel(status: Account['status']): string {
  if (status === '有効') return t('masters.activeStatus')
  if (status === '停止') return t('masters.stoppedStatus')
  return t('masters.locked')
}

function roleLabel(role: Role): string {
  return t(`common.roles.${role}`)
}

function warehouseName(id: string | null): string {
  return masters.warehouses.find((w) => w.id === id)?.name ?? '―'
}

async function load(): Promise<void> {
  pageError.value = ''
  try {
    accounts.value = await listAccounts()
  } catch (err) {
    pageError.value = describeError(err, t, 'errors.unexpected')
  }
}

onMounted(async () => {
  await masters.load()
  await load()
})

function resetErrors(): void {
  Object.keys(errors).forEach((k) => delete errors[k])
}

function openNew(): void {
  Object.assign(form, {
    id: '',
    person: '',
    role: 'warehouse',
    warehouseId: masters.warehouses[0]?.id ?? '',
    mail: '',
    status: '有効',
  })
  editingId.value = ''
  formError.value = ''
  resetErrors()
}

function openEdit(a: Account): void {
  Object.assign(form, {
    id: a.id,
    person: a.person,
    role: a.role,
    warehouseId: a.warehouseId ?? '',
    mail: a.mail,
    status: a.status === 'ロック中' ? 'ロック中' : a.status,
  })
  editingId.value = a.id
  formError.value = ''
  resetErrors()
}

function close(): void {
  editingId.value = null
}

function isSelf(id: string): boolean {
  return auth.user?.id === id
}

function validate(): boolean {
  resetErrors()
  if (!/^[a-z0-9-]{3,30}$/.test(form.id.trim())) errors.id = t('masters.errors.loginId')
  else if (isNew.value && accounts.value.some((a) => a.id === form.id.trim())) {
    errors.id = t('masters.errors.loginIdTaken', { id: form.id.trim() })
  }
  if (!form.person.trim()) errors.person = t('masters.errors.personName')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.mail.trim())) errors.mail = t('masters.errors.mail')
  if (
    !isNew.value &&
    isSelf(form.id) &&
    (form.status === '停止' || form.role !== auth.user?.role)
  ) {
    formError.value = t('masters.errors.self')
  }
  return Object.keys(errors).length === 0 && !formError.value
}

async function save(): Promise<void> {
  formError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    const input: AccountInput = {
      id: form.id.trim(),
      person: form.person.trim(),
      role: form.role,
      warehouseId: form.role === 'warehouse' ? form.warehouseId : null,
      mail: form.mail.trim(),
      status: form.status === 'ロック中' ? 'ロック中' : form.status,
    }
    await saveAccount(input, isNew.value)
    await load()
    toast.show(
      t('masters.savedAccount', {
        id: input.id,
        action: isNew.value ? t('masters.created') : t('masters.updated'),
      }),
    )
    close()
  } catch (err) {
    formError.value = describeError(err, t, 'errors.unexpected')
  } finally {
    saving.value = false
  }
}

async function toggle(a: Account): Promise<void> {
  pageError.value = ''
  try {
    const next: AccountInput = {
      id: a.id,
      person: a.person,
      role: a.role,
      warehouseId: a.warehouseId,
      mail: a.mail,
      status: a.status === '有効' ? '停止' : '有効',
    }
    await saveAccount(next, false)
    await load()
    toast.show(
      t('masters.accountToggled', {
        id: a.id,
        action: a.status === '有効' ? t('masters.stopped') : t('masters.resumed'),
      }),
    )
  } catch (err) {
    pageError.value = describeError(err, t, 'errors.unexpected')
  }
}

async function resetPassword(a: Account): Promise<void> {
  pageError.value = ''
  try {
    await resetAccountPassword(a.id)
    await load()
    toast.show(t('masters.resetDone', { id: a.id, mail: a.mail }))
  } catch (err) {
    pageError.value = describeError(err, t, 'errors.unexpected')
  }
}

async function unlock(a: Account): Promise<void> {
  pageError.value = ''
  try {
    await unlockAccount(a.id)
    await load()
    toast.show(t('masters.unlockDone', { id: a.id }))
  } catch (err) {
    pageError.value = describeError(err, t, 'errors.unexpected')
  }
}

function saveCsv(): void {
  const header = (tm('masters.accountCols') as string[]).slice(0, 8).join(',')
  const rows = accounts.value.map((a) =>
    [
      a.id,
      a.person,
      roleLabel(a.role),
      warehouseName(a.warehouseId),
      a.mail,
      a.lastLogin,
      a.passwordSet ? t('masters.passwordSet') : t('masters.passwordWaiting'),
      a.status,
    ]
      .map(csvField)
      .join(','),
  )
  downloadText('アカウント一覧.csv', [header, ...rows].join('\r\n') + '\r\n')
  toast.show(t('masters.csvDone', { file: 'アカウント一覧.csv' }))
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">{{ t('masters.accountsTitle') }}</h1>
    <AppAlert v-if="pageError" tone="error">{{ pageError }}</AppAlert>

    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-400 bg-slate-100 p-3 text-sm"
    >
      <span>{{ t('masters.accountsNote', { count: accounts.length }) }}</span>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" @click="saveCsv">{{ t('masters.csv') }}</AppButton>
        <AppButton variant="accent" @click="openNew">{{ t('masters.add') }}</AppButton>
      </div>
    </div>

    <div v-if="isOpen" class="rounded-lg border border-slate-400 bg-white p-4 shadow">
      <h2 class="mb-3 font-bold">
        {{ isNew ? t('masters.formNewAccount') : t('masters.formEditAccount', { id: form.id }) }}
      </h2>
      <AppAlert v-if="formError" tone="error">{{ formError }}</AppAlert>
      <div class="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <AppInput
            id="acc-id"
            v-model="form.id"
            :label="t('masters.fields.loginId')"
            :error="errors.id"
            :disabled="!isNew"
            :placeholder="'adachi-kato'"
            required
          />
          <p class="mt-1 text-xs text-slate-600">
            {{ isNew ? t('masters.fields.loginIdNote') : t('masters.fields.loginIdLocked') }}
          </p>
        </div>
        <div>
          <AppInput
            id="acc-name"
            v-model="form.person"
            :label="t('masters.fields.personName')"
            :error="errors.person"
            required
          />
          <p class="mt-1 text-xs text-slate-600">{{ t('masters.fields.personNote') }}</p>
        </div>
        <AppSelect
          id="acc-role"
          v-model="form.role"
          :label="t('masters.fields.role')"
          :options="roleOptions"
          required
        />
        <div>
          <AppSelect
            id="acc-warehouse"
            v-model="form.warehouseId"
            :label="t('masters.fields.warehouse')"
            :options="warehouseOptions"
          />
          <p class="mt-1 text-xs text-slate-600">{{ t('masters.fields.warehouseNote') }}</p>
        </div>
        <div>
          <AppInput
            id="acc-mail"
            v-model="form.mail"
            :label="t('masters.fields.mail')"
            :error="errors.mail"
            required
          />
          <p class="mt-1 text-xs text-slate-600">{{ t('masters.fields.mailNote') }}</p>
        </div>
        <AppSelect
          id="acc-status"
          v-model="form.status"
          :label="t('masters.fields.status')"
          :options="statusOptions"
          required
        />
      </div>
      <div class="mt-4 flex flex-wrap justify-center gap-3">
        <AppButton variant="secondary" @click="close">{{ t('common.cancel') }}</AppButton>
        <AppButton variant="accent" :loading="saving" @click="save">{{
          t('common.save')
        }}</AppButton>
      </div>
    </div>

    <div class="overflow-x-auto rounded border border-slate-400 bg-white">
      <table class="w-full min-w-[1100px] border-collapse text-sm">
        <thead class="bg-slate-100">
          <tr>
            <th
              v-for="(head, index) in tm('masters.accountCols') as string[]"
              :key="index"
              class="border border-slate-300 px-2 py-2 text-left"
            >
              {{ head }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="a in accounts"
            :key="a.id"
            :class="a.status === '停止' ? 'text-slate-400' : ''"
          >
            <td class="border border-slate-300 px-2 py-2 font-mono">
              {{ a.id }}
              <span v-if="isSelf(a.id)" class="text-xs text-slate-600">{{
                t('masters.loggedInMark')
              }}</span>
            </td>
            <td class="border border-slate-300 px-2 py-2 font-bold">{{ a.person }}</td>
            <td class="border border-slate-300 px-2 py-2">{{ roleLabel(a.role) }}</td>
            <td class="border border-slate-300 px-2 py-2">{{ warehouseName(a.warehouseId) }}</td>
            <td class="border border-slate-300 px-2 py-2 font-mono text-xs">{{ a.mail }}</td>
            <td class="border border-slate-300 px-2 py-2 tabular-nums">{{ a.lastLogin }}</td>
            <td class="border border-slate-300 px-2 py-2 text-xs">
              <span v-if="a.passwordSet">{{ t('masters.passwordSet') }}</span>
              <span v-else class="font-bold text-orange-700">{{
                t('masters.passwordWaiting')
              }}</span>
              <div v-if="a.role !== 'warehouse'">{{ t('masters.twoFactor') }}</div>
            </td>
            <td
              class="border border-slate-300 px-2 py-2 text-center font-bold"
              :class="a.status === '有効' ? 'text-green-800' : 'text-red-800'"
            >
              {{ statusLabel(a.status) }}
            </td>
            <td class="border border-slate-300 px-2 py-2 text-center whitespace-nowrap">
              <div class="flex flex-wrap justify-center gap-2">
                <AppButton variant="secondary" @click="openEdit(a)">{{
                  t('masters.edit')
                }}</AppButton>
                <AppButton variant="secondary" @click="resetPassword(a)">{{
                  t('masters.resetPassword')
                }}</AppButton>
                <AppButton v-if="a.status === 'ロック中'" variant="accent" @click="unlock(a)">{{
                  t('masters.unlock')
                }}</AppButton>
                <AppButton
                  v-if="!isSelf(a.id) && a.status !== 'ロック中'"
                  variant="secondary"
                  @click="toggle(a)"
                >
                  {{ a.status === '有効' ? t('masters.stop') : t('masters.resume') }}
                </AppButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-sm text-slate-600">{{ t('masters.lockNote') }}</p>
    <div class="rounded border border-dashed border-amber-600 bg-amber-50 p-3 text-sm">
      <b>{{ t('masters.checkNote') }}</b> {{ t('masters.accountsCheck') }}
    </div>
  </section>
</template>
