<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { Account } from '@/types'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { describeError } from '@/i18n/errors'
import { listAccounts, saveWarehouse } from '@/api/masters'
import { useToast } from '@/composables/useToast'
import { useMastersStore } from '@/stores/masters'
import type { Warehouse } from '@/types'
import { csvField, CUSTOMER_CODE } from '@/utils/csv'
import { downloadText, yen } from '@/utils/download'

const { t, tm } = useI18n()
const masters = useMastersStore()
const toast = useToast()

onMounted(() => void masters.load())

const statusOptions = [
  { value: '1', label: t('masters.fields.destStatusActive') },
  { value: '0', label: t('masters.fields.destStatusStopped') },
]

/** null = closed. '' = new warehouse. An id = editing that warehouse. */
const editingId = ref<string | null>(null)
const formError = ref('')
const saving = ref(false)
const pageError = ref('')
const errors = reactive<Record<string, string>>({})
const accounts = ref<Account[]>([])

/** Active sign-in IDs per warehouse, shown in the ID数 column. */
function idCount(warehouseId: string): number {
  return accounts.value.filter((a) => a.warehouseId === warehouseId && a.status === '有効').length
}

onMounted(async () => {
  try {
    accounts.value = await listAccounts()
  } catch {
    accounts.value = []
  }
})

const form = reactive({
  name: '',
  destinationCode: '',
  address: '',
  phone: '',
  receivingHours: '9:00〜16:00',
  deliveryConditions: 'パレット納品',
  answerCode: '',
  customerCode: CUSTOMER_CODE,
  shippingFee: '4000',
  active: '1',
})

const isOpen = computed(() => editingId.value !== null)
const isNew = computed(() => editingId.value === '')
const warehouseCount = computed(() => masters.warehouses.length)

function resetErrors(): void {
  Object.keys(errors).forEach((k) => delete errors[k])
}

function openNew(): void {
  Object.assign(form, {
    name: '',
    destinationCode: `T-12${String(masters.warehouses.length + 1).padStart(2, '0')}`,
    address: '',
    phone: '',
    receivingHours: '9:00〜16:00',
    deliveryConditions: 'パレット納品',
    answerCode: '',
    customerCode: CUSTOMER_CODE,
    shippingFee: '4000',
    active: '1',
  })
  editingId.value = ''
  formError.value = ''
  resetErrors()
}

function openEdit(w: Warehouse): void {
  Object.assign(form, {
    name: w.name,
    destinationCode: w.destinationCode,
    address: w.address,
    phone: w.phone,
    receivingHours: w.receivingHours,
    deliveryConditions: w.deliveryConditions,
    answerCode: w.answerCode,
    customerCode: w.customerCode,
    shippingFee: String(w.shippingFee),
    active: w.active ? '1' : '0',
  })
  editingId.value = w.id
  formError.value = ''
  resetErrors()
}

function close(): void {
  editingId.value = null
}

function validate(): boolean {
  resetErrors()
  if (!form.name.trim()) errors.name = t('masters.errors.destName')
  if (!form.destinationCode.trim()) errors.destinationCode = t('masters.errors.destCode')
  else if (
    masters.warehouses.some(
      (w) => w.destinationCode === form.destinationCode.trim() && w.id !== editingId.value,
    )
  ) {
    errors.destinationCode = t('masters.errors.destCodeTaken', {
      code: form.destinationCode.trim(),
    })
  }
  if (!form.address.trim()) errors.address = t('masters.errors.address')
  if (form.shippingFee.trim() === '' || !(Number(form.shippingFee) >= 0)) {
    errors.shippingFee = t('masters.errors.shipping')
  }
  return Object.keys(errors).length === 0
}

async function save(): Promise<void> {
  formError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    const existing = masters.warehouses.find((w) => w.id === editingId.value)
    const warehouse: Warehouse = {
      id: existing?.id ?? '',
      name: form.name.trim(),
      destinationCode: form.destinationCode.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      receivingHours: form.receivingHours.trim(),
      deliveryConditions: form.deliveryConditions.trim(),
      answerCode: form.answerCode.trim(),
      customerCode: form.customerCode.trim() || CUSTOMER_CODE,
      shippingFee: Number(form.shippingFee),
      active: form.active === '1',
    }
    await saveWarehouse(warehouse, isNew.value)
    await masters.reload()
    toast.show(
      t('masters.savedDest', {
        name: warehouse.name,
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

async function toggle(w: Warehouse): Promise<void> {
  pageError.value = ''
  try {
    await saveWarehouse({ ...w, active: !w.active }, false)
    await masters.reload()
    toast.show(
      t('masters.destToggled', {
        name: w.name,
        action: w.active ? t('masters.stopped') : t('masters.resumed'),
      }),
    )
  } catch (err) {
    pageError.value = describeError(err, t, 'errors.unexpected')
  }
}

function saveCsv(): void {
  const header = (tm('masters.destinationCols') as string[]).slice(0, 10).join(',')
  const rows = masters.warehouses.map((w) =>
    [
      w.destinationCode,
      w.name,
      w.address,
      w.phone,
      w.receivingHours,
      w.deliveryConditions,
      w.answerCode,
      w.customerCode,
      w.shippingFee,
      w.active ? t('masters.activeStatus') : t('masters.stoppedStatus'),
    ]
      .map(csvField)
      .join(','),
  )
  downloadText('届け先マスタ.csv', [header, ...rows].join('\r\n') + '\r\n')
  toast.show(t('masters.csvDone', { file: '届け先マスタ.csv' }))
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">{{ t('masters.destinationsTitle') }}</h1>
    <AppAlert v-if="pageError" tone="error">{{ pageError }}</AppAlert>

    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-400 bg-slate-100 p-3 text-sm"
    >
      <span>{{ t('masters.destinationsNote', { count: warehouseCount }) }}</span>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" @click="saveCsv">{{ t('masters.csv') }}</AppButton>
        <AppButton variant="accent" @click="openNew">{{ t('masters.add') }}</AppButton>
      </div>
    </div>

    <div v-if="isOpen" class="rounded-lg border border-slate-400 bg-white p-4 shadow">
      <h2 class="mb-3 font-bold">
        {{
          isNew
            ? t('masters.formNewDestination')
            : t('masters.formEditDestination', { name: form.name })
        }}
      </h2>
      <AppAlert v-if="formError" tone="error">{{ formError }}</AppAlert>
      <div class="mt-3 grid gap-4 md:grid-cols-2">
        <AppInput
          id="dest-name"
          v-model="form.name"
          :label="t('masters.fields.destName')"
          :error="errors.name"
          required
        />
        <div>
          <AppInput
            id="dest-code"
            v-model="form.destinationCode"
            :label="t('masters.fields.destCode')"
            :error="errors.destinationCode"
            required
          />
          <p class="mt-1 text-xs text-slate-600">{{ t('masters.fields.destCodeNote') }}</p>
        </div>
        <AppInput
          id="dest-address"
          v-model="form.address"
          :label="t('masters.fields.address')"
          :error="errors.address"
          required
        />
        <AppInput id="dest-phone" v-model="form.phone" :label="t('masters.fields.phone')" />
        <AppInput
          id="dest-hours"
          v-model="form.receivingHours"
          :label="t('masters.fields.receivingHours')"
        />
        <AppInput
          id="dest-conditions"
          v-model="form.deliveryConditions"
          :label="t('masters.fields.deliveryConditions')"
        />
        <AppInput
          id="dest-answer"
          v-model="form.answerCode"
          :label="t('masters.fields.answerDest')"
        />
        <div>
          <AppInput
            id="dest-customer"
            v-model="form.customerCode"
            :label="t('masters.fields.customerCode')"
          />
          <p class="mt-1 text-xs text-slate-600">{{ t('masters.fields.customerNote') }}</p>
        </div>
        <div>
          <AppInput
            id="dest-shipping"
            v-model="form.shippingFee"
            :label="t('masters.fields.shippingFee')"
            :error="errors.shippingFee"
            inputmode="numeric"
            required
          />
          <p class="mt-1 text-xs text-slate-600">{{ t('masters.fields.shippingNote') }}</p>
        </div>
        <AppSelect
          id="dest-status"
          v-model="form.active"
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
              v-for="(head, index) in tm('masters.destinationCols') as string[]"
              :key="index"
              class="border border-slate-300 px-2 py-2 text-left"
            >
              {{ head }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in masters.warehouses" :key="w.id" :class="w.active ? '' : 'text-slate-400'">
            <td class="border border-slate-300 px-2 py-2 font-mono">{{ w.destinationCode }}</td>
            <td class="border border-slate-300 px-2 py-2 font-bold">{{ w.name }}</td>
            <td class="border border-slate-300 px-2 py-2 text-xs">
              {{ w.address }}<br />{{ w.phone }}
            </td>
            <td class="border border-slate-300 px-2 py-2">{{ w.receivingHours }}</td>
            <td class="border border-slate-300 px-2 py-2 text-xs">{{ w.deliveryConditions }}</td>
            <td class="border border-slate-300 px-2 py-2 font-mono">{{ w.answerCode || '―' }}</td>
            <td class="border border-slate-300 px-2 py-2 font-mono">{{ w.customerCode }}</td>
            <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
              {{ yen(w.shippingFee) }}
            </td>
            <td class="border border-slate-300 px-2 py-2 text-center">{{ idCount(w.id) }}</td>
            <td
              class="border border-slate-300 px-2 py-2 text-center font-bold"
              :class="w.active ? 'text-green-800' : 'text-red-800'"
            >
              {{ w.active ? t('masters.activeStatus') : t('masters.stoppedStatus') }}
            </td>
            <td class="border border-slate-300 px-2 py-2 text-center whitespace-nowrap">
              <div class="flex justify-center gap-2">
                <AppButton variant="secondary" @click="openEdit(w)">{{
                  t('masters.edit')
                }}</AppButton>
                <AppButton variant="secondary" @click="toggle(w)">
                  {{ w.active ? t('masters.stop') : t('masters.resume') }}
                </AppButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="rounded border border-dashed border-amber-600 bg-amber-50 p-3 text-sm">
      <b>{{ t('masters.checkNote') }}</b> {{ t('masters.destinationsCheck') }}
    </div>
  </section>
</template>
