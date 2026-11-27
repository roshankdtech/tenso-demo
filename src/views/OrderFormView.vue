<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { createOrder, deleteDraft, getOrder, updateOrder } from '@/api'
import type { OrderInput } from '@/api/orders'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { describeError } from '@/i18n/errors'
import { useAuthStore } from '@/stores/auth'
import { useMastersStore } from '@/stores/masters'
import { useToast } from '@/composables/useToast'
import type { Order } from '@/types'
import { addDays, todayIso } from '@/utils/dates'
import { yen } from '@/utils/download'
import { lineError, orderAmount } from '@/utils/orders'
import type { LotMode } from '@/utils/orders'

type FormLine = { code: string; qty: string }

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
const masters = useMastersStore()
const toast = useToast()

const isProxy = computed(() => route.name === 'proxy-order')
/** Order number when editing a draft or a returned order. */
const editingNo = ref<string | null>((route.params.no as string | undefined) ?? null)
const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)
const formError = ref('')
const lotMode = ref<LotMode>('multiple')

const form = reactive({
  warehouseId: '',
  due: addDays(todayIso(), 7),
  note: '',
  reason: '',
  autoApprove: false,
  lines: [] as FormLine[],
})
const dueError = ref('')

const title = computed(() => {
  if (isProxy.value) return t('form.title.proxy')
  if (editingNo.value && returned.value) return t('form.title.resubmit', { no: editingNo.value })
  if (editingNo.value) return t('form.title.draft', { no: editingNo.value })
  return t('form.title.new')
})
const returned = ref(false)
const returnReason = ref('')

const warehouseOptions = computed(() =>
  masters.warehouses
    .filter((w) => w.active || w.id === form.warehouseId)
    .map((w) => ({
      value: w.id,
      label: t('form.warehouseOption', { name: w.name, code: w.destinationCode }),
    })),
)
const selectedWarehouse = computed(
  () => masters.warehouses.find((w) => w.id === form.warehouseId) ?? null,
)
const itemOptions = (code: string) =>
  masters.items
    .filter((i) => i.active || i.code === code)
    .map((i) => ({ value: i.code, label: `${i.code} ${i.name}` }))

function itemOf(code: string) {
  return masters.items.find((i) => i.code === code)
}

function lineErrorOf(line: FormLine): string {
  return lineError(line, itemOf(line.code), lotMode.value, t)
}

const validLines = computed(() =>
  form.lines.filter((l) => !lineErrorOf(l)).map((l) => ({ code: l.code, qty: Number(l.qty) })),
)
const total = computed(() => orderAmount(validLines.value, masters.items))
const hasLineError = computed(() => form.lines.some((l) => lineErrorOf(l)))

const formBad = computed(
  () =>
    !form.lines.length ||
    hasLineError.value ||
    !form.due ||
    form.due < todayIso() ||
    (isProxy.value && !form.reason.trim()),
)

const formMessage = computed(() => {
  if (!form.lines.length || hasLineError.value) return t('form.lotError')
  if (isProxy.value && !form.reason.trim()) return t('form.reasonError')
  return ''
})

watch(
  () => form.due,
  (due) => {
    dueError.value = due && due < todayIso() ? t('form.pastDate') : ''
  },
)

function sanitizeQty(value: string): string {
  return value.replace(/[^\d]/g, '')
}

function addLine(): void {
  form.lines.push({ code: 'BG-PEM', qty: '' })
}

function removeLine(index: number): void {
  form.lines.splice(index, 1)
}

function applyOrder(order: Order): void {
  form.warehouseId = order.warehouseId
  form.due = order.due
  form.note = order.note
  form.lines = order.lines.map((l) => ({ code: l.code, qty: String(l.qty) }))
  returned.value = order.status === '差し戻し'
  returnReason.value = order.reason
}

onMounted(async () => {
  try {
    await masters.load()
    if (editingNo.value) {
      const order = await getOrder(editingNo.value)
      applyOrder(order)
    } else {
      form.warehouseId = isProxy.value
        ? (masters.warehouses.find((w) => w.active)?.id ?? '')
        : (auth.user?.warehouseId ?? '')
      form.lines = isProxy.value
        ? [{ code: 'DB-080', qty: '500' }]
        : [
            { code: 'DB-060', qty: '500' },
            { code: 'LB-TH1', qty: '50000' },
          ]
    }
  } catch (err) {
    loadError.value = describeError(err, t, 'errors.unexpected')
  } finally {
    loading.value = false
  }
})

function payload(draft: boolean): OrderInput {
  const body: OrderInput = {
    due: form.due,
    note: form.note,
    lines: validLines.value,
    draft,
  }
  if (!isProxy.value) body.warehouseId = form.warehouseId || undefined
  if (isProxy.value) {
    body.warehouseId = form.warehouseId
    body.proxy = { reason: form.reason.trim(), autoApprove: form.autoApprove }
  }
  return body
}

async function save(draft: boolean): Promise<Order> {
  const body = payload(draft)
  if (editingNo.value) return updateOrder(editingNo.value, body)
  return createOrder(body)
}

async function onSaveDraft(): Promise<void> {
  formError.value = ''
  submitting.value = true
  try {
    const saved = await save(true)
    editingNo.value = saved.no
    toast.show(t('form.draftSaved', { no: saved.no }))
  } catch (err) {
    formError.value = describeError(err, t, 'errors.unexpected')
  } finally {
    submitting.value = false
  }
}

async function onSubmit(): Promise<void> {
  if (formBad.value) return
  formError.value = ''
  submitting.value = true
  try {
    const order = await save(false)
    const warehouseName = selectedWarehouse.value?.name ?? ''
    if (isProxy.value && form.autoApprove) {
      toast.show(t('form.proxyApproved', { warehouse: warehouseName, no: order.no }))
      await router.push(`/orders/${order.no}`)
    } else if (isProxy.value) {
      toast.show(t('form.proxySubmitted', { warehouse: warehouseName, no: order.no }))
      await router.push('/pending')
    } else {
      toast.show(t('form.submitted', { no: order.no }))
      await router.push('/orders')
    }
  } catch (err) {
    formError.value = describeError(err, t, 'errors.unexpected')
  } finally {
    submitting.value = false
  }
}

/** Only a saved draft (not a returned order) can be deleted from this form. */
const canDeleteDraft = computed(() => !isProxy.value && !!editingNo.value && !returned.value)

async function onDeleteDraft(): Promise<void> {
  if (!editingNo.value) return
  if (!window.confirm(t('form.deleteDraftConfirm'))) return
  submitting.value = true
  formError.value = ''
  try {
    await deleteDraft(editingNo.value)
    toast.show(t('form.draftDeleted'))
    await router.push('/drafts')
  } catch (err) {
    formError.value = describeError(err, t, 'errors.unexpected')
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  void router.push(isProxy.value ? '/pending' : '/drafts')
}

function onQtyInput(index: number, event: Event): void {
  const input = event.target as HTMLInputElement
  form.lines[index].qty = sanitizeQty(input.value)
  input.value = form.lines[index].qty
}

const lineAmount = (line: FormLine): string => {
  const item = itemOf(line.code)
  return item && !lineErrorOf(line)
    ? `${yen(item.price * Number(line.qty))}${t('form.yenSuffix')}`
    : '―'
}

const notifyText = computed(() =>
  t('form.notifyText', { warehouse: selectedWarehouse.value?.name ?? '' }),
)

const applicantLabel = computed(() => auth.user?.label ?? '')
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">{{ title }}</h1>

    <AppAlert v-if="loadError" tone="error">{{ loadError }}</AppAlert>
    <p v-else-if="loading" class="text-slate-600">{{ t('common.loading') }}</p>

    <template v-else>
      <AppAlert v-if="returned" tone="error">
        {{ t('form.returnReason', { reason: returnReason }) }}
      </AppAlert>
      <AppAlert v-if="isProxy" tone="info">{{ t('form.proxyNote') }}</AppAlert>
      <AppAlert v-if="formError" tone="error">{{ formError }}</AppAlert>

      <div class="rounded-lg border border-slate-400 bg-white p-4 shadow-sm">
        <h2 class="mb-3 border-b-2 border-blue-700 pb-1 font-bold text-blue-800">
          📄 {{ t('detail.sectionApp') }}
        </h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-bold">{{ t('form.formName') }}</span>
            <span>{{ t('form.formValue') }}</span>
          </div>

          <div class="flex flex-col gap-1">
            <template v-if="isProxy">
              <AppSelect
                id="proxy-warehouse"
                v-model="form.warehouseId"
                :label="t('form.destinationSelect')"
                :options="warehouseOptions"
                required
              />
              <span class="text-xs text-slate-600">{{ t('form.destinationSelectNote') }}</span>
            </template>
            <template v-else>
              <span class="text-sm font-bold">{{ t('form.destination') }}</span>
              <span>
                {{ selectedWarehouse?.name }} ({{ t('form.destination') }}
                <span class="font-mono">{{ selectedWarehouse?.destinationCode }}</span>)
              </span>
              <span class="text-xs text-slate-600">{{ t('form.destinationNote') }}</span>
            </template>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-sm font-bold">{{
              isProxy ? t('form.proxyEntry') : t('form.applicant')
            }}</span>
            <span>
              {{ applicantLabel }} ({{ auth.user?.id }})
              <span v-if="isProxy" class="font-bold text-purple-800">{{ t('form.proxyTag') }}</span>
            </span>
            <span v-if="isProxy" class="text-xs text-slate-600">{{
              t('form.proxyEntryNote')
            }}</span>
          </div>

          <div v-if="isProxy" class="flex flex-col gap-1">
            <AppInput
              id="proxy-reason"
              v-model="form.reason"
              :label="t('form.reason')"
              :placeholder="t('form.reasonPlaceholder')"
              required
            />
          </div>

          <div v-if="isProxy" class="flex flex-col gap-1 md:col-span-2">
            <span class="text-sm font-bold">{{ t('form.notify') }}</span>
            <span>{{ notifyText }}</span>
          </div>

          <label v-if="isProxy" class="flex items-center gap-2 md:col-span-2">
            <input v-model="form.autoApprove" type="checkbox" />
            <span>{{ t('form.autoApproveLabel') }}</span>
            <span class="text-xs text-slate-600">{{ t('form.autoApproveNote') }}</span>
          </label>

          <AppDatePicker
            id="due-date"
            v-model="form.due"
            :label="t('form.dueDate')"
            :error="dueError"
            required
          />

          <AppInput
            id="note"
            v-model="form.note"
            :label="t('form.note')"
            :placeholder="t('form.notePlaceholder')"
          />
        </div>
      </div>

      <div class="rounded-lg border border-slate-400 bg-white p-4 shadow-sm">
        <h2 class="mb-3 border-b-2 border-blue-700 pb-1 font-bold text-blue-800">
          {{ t('form.lines') }}
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] border-collapse text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="border border-slate-300 px-2 py-2 text-left">{{ t('form.colItem') }}</th>
                <th class="border border-slate-300 px-2 py-2 text-center">
                  {{ t('form.colLot') }}
                </th>
                <th class="border border-slate-300 px-2 py-2 text-right">
                  {{ t('form.colPrice') }}
                </th>
                <th class="border border-slate-300 px-2 py-2 text-left">{{ t('form.colQty') }}</th>
                <th class="border border-slate-300 px-2 py-2 text-right">
                  {{ t('form.colSubtotal') }}
                </th>
                <th class="border border-slate-300 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in form.lines" :key="index" class="align-top">
                <td class="border border-slate-300 px-2 py-2">
                  <AppSelect
                    :id="`line-item-${index}`"
                    v-model="line.code"
                    :label="t('form.colItem')"
                    :options="itemOptions(line.code)"
                  />
                </td>
                <td class="border border-slate-300 px-2 py-2 text-center tabular-nums">
                  {{
                    itemOf(line.code)
                      ? t('form.lotLabel', {
                          lot: itemOf(line.code)?.lot.toLocaleString('ja-JP'),
                          unit: itemOf(line.code)?.unit,
                        })
                      : ''
                  }}
                </td>
                <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
                  {{
                    itemOf(line.code)
                      ? `${itemOf(line.code)?.price.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}${t('form.yenSuffix')}`
                      : ''
                  }}
                </td>
                <td class="border border-slate-300 px-2 py-2">
                  <input
                    :id="`line-qty-${index}`"
                    :value="line.qty"
                    type="text"
                    inputmode="numeric"
                    :aria-label="t('form.colQty')"
                    class="w-28 rounded border-2 px-2 py-1 text-right tabular-nums"
                    :class="lineErrorOf(line) ? 'border-red-700 bg-red-50' : 'border-slate-500'"
                    @input="onQtyInput(index, $event)"
                  />
                  <div v-if="lineErrorOf(line)" class="mt-1 text-xs font-bold text-red-800">
                    {{ lineErrorOf(line) }}
                  </div>
                </td>
                <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
                  {{ lineAmount(line) }}
                </td>
                <td class="border border-slate-300 px-2 py-2 text-center">
                  <AppButton variant="secondary" @click="removeLine(index)">{{
                    t('form.removeLine')
                  }}</AppButton>
                </td>
              </tr>
              <tr class="bg-slate-50 font-bold">
                <td colspan="4" class="border border-slate-300 px-2 py-2 text-right">
                  {{ t('form.total') }}
                </td>
                <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
                  {{ yen(total) }}{{ t('form.yenSuffix') }}
                </td>
                <td class="border border-slate-300"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <AppButton variant="secondary" @click="addLine">{{ t('form.addLine') }}</AppButton>
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-bold">{{ t('form.lotRuleTitle') }}</span>
            <span>{{ t('form.lotRuleText') }}</span>
            <span class="inline-flex" role="group" :aria-label="t('form.lotGroup')">
              <button
                type="button"
                class="border border-slate-500 px-3 py-1"
                :aria-pressed="lotMode === 'multiple'"
                :class="lotMode === 'multiple' ? 'bg-blue-100 font-bold' : 'bg-white'"
                @click="lotMode = 'multiple'"
              >
                {{ t('form.lotMultiple') }}
              </button>
              <button
                type="button"
                class="border-y border-r border-slate-500 px-3 py-1"
                :aria-pressed="lotMode === 'min'"
                :class="lotMode === 'min' ? 'bg-blue-100 font-bold' : 'bg-white'"
                @click="lotMode = 'min'"
              >
                {{ t('form.lotMin') }}
              </button>
            </span>
          </div>
        </div>
        <p
          v-if="isProxy"
          class="mt-3 rounded border border-dashed border-amber-600 bg-amber-50 p-2 text-sm"
        >
          {{ t('form.proxyQuestion') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <span class="text-sm font-bold text-red-800">{{ formMessage }}</span>
        <AppButton variant="secondary" @click="onCancel">{{ t('common.cancel') }}</AppButton>
        <AppButton v-if="!isProxy" variant="secondary" :disabled="submitting" @click="onSaveDraft">
          {{ t('form.saveDraft') }}
        </AppButton>
        <AppButton
          v-if="canDeleteDraft"
          variant="danger"
          :disabled="submitting"
          @click="onDeleteDraft"
        >
          {{ t('form.deleteDraft') }}
        </AppButton>
        <AppButton
          variant="accent"
          :disabled="formBad || submitting"
          :loading="submitting"
          @click="onSubmit"
        >
          {{
            isProxy
              ? form.autoApprove
                ? t('form.proxySubmitApprove')
                : t('form.proxySubmit')
              : returned
                ? t('form.resubmit')
                : t('form.submit')
          }}
        </AppButton>
      </div>
    </template>
  </section>
</template>
