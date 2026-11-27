<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import { getBilling } from '@/api/billing'
import type { BillingMonth } from '@/api/billing'
import { describeError } from '@/i18n/errors'
import type { BillingRow } from '@/types'
import { downloadText, yen } from '@/utils/download'

const { t, tm } = useI18n()
const month = ref('2026-11')
const data = ref<BillingMonth | null>(null)
const error = ref('')
const loading = ref(false)

const title = computed(() => {
  const [y, m] = month.value.split('-').map(Number)
  const monthNames = tm('datePicker.monthNames') as string[]
  return t('billing.title', { year: y, month: monthNames[m - 1] })
})

const totals = computed(() => {
  const rows = data.value?.rows ?? []
  return rows.reduce(
    (sum, r) => ({
      count: sum.count + r.orderCount,
      material: sum.material + r.materialAmount,
      shipping: sum.shipping + r.shippingAmount,
    }),
    { count: 0, material: 0, shipping: 0 },
  )
})

async function load(): Promise<void> {
  if (!/^\d{4}-\d{2}$/.test(month.value)) return
  loading.value = true
  error.value = ''
  try {
    data.value = await getBilling(month.value)
  } catch (err) {
    error.value = describeError(err, t, 'errors.unexpected')
  } finally {
    loading.value = false
  }
}

watch(month, load, { immediate: true })

function subtotal(row: BillingRow): number {
  return row.materialAmount + row.shippingAmount
}

function saveCsv(): void {
  const rows = (data.value?.rows ?? []).map((r) =>
    [
      r.warehouseName,
      r.destinationCode,
      r.orderCount,
      r.materialAmount,
      r.shippingAmount,
      subtotal(r),
    ].join(','),
  )
  const total = totals.value
  const lines = [
    (tm('billing.csvHeader') as string[]).join(','),
    ...rows,
    [
      t('billing.csvTotal'),
      '',
      total.count,
      total.material,
      total.shipping,
      total.material + total.shipping,
    ].join(','),
  ]
  downloadText(`請求明細_${month.value}_倉庫別.csv`, lines.join('\r\n') + '\r\n')
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h1 class="text-2xl font-bold">{{ title }}</h1>
      <div class="w-full max-w-xs">
        <AppDatePicker id="billing-month" v-model="month" mode="month" :label="t('nav.billing')" />
      </div>
    </div>

    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>

    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-400 bg-slate-100 p-3 text-sm"
    >
      <span>{{ t('billing.issuer') }}</span>
      <AppButton variant="secondary" :disabled="!data" @click="saveCsv">{{
        t('billing.saveCsv')
      }}</AppButton>
    </div>

    <p v-if="loading" class="text-slate-600">{{ t('common.loading') }}</p>
    <div v-else class="overflow-x-auto rounded border border-slate-400 bg-white">
      <table class="w-full min-w-[720px] border-collapse text-sm">
        <thead class="bg-slate-100">
          <tr>
            <th
              v-for="(head, index) in tm('billing.cols') as string[]"
              :key="index"
              class="border border-slate-300 px-3 py-2 text-left"
            >
              {{ head }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data?.rows ?? []" :key="row.warehouseId">
            <td class="border border-slate-300 px-3 py-2">{{ row.warehouseName }}</td>
            <td class="border border-slate-300 px-3 py-2 font-mono">{{ row.destinationCode }}</td>
            <td class="border border-slate-300 px-3 py-2 text-right tabular-nums">
              {{ t('billing.count', { count: row.orderCount }) }}
              <div v-if="row.selfApprovedCount" class="text-xs font-bold text-purple-800">
                {{ t('billing.selfApprovedTag', { count: row.selfApprovedCount }) }}
              </div>
            </td>
            <td class="border border-slate-300 px-3 py-2 text-right tabular-nums">
              {{ yen(row.materialAmount) }}
            </td>
            <td class="border border-slate-300 px-3 py-2 text-right tabular-nums">
              {{ yen(row.shippingAmount) }}
            </td>
            <td class="border border-slate-300 px-3 py-2 text-right font-bold tabular-nums">
              {{ yen(subtotal(row)) }}
            </td>
          </tr>
          <tr class="bg-slate-50 font-bold">
            <td class="border border-slate-300 px-3 py-2">{{ t('billing.total') }}</td>
            <td class="border border-slate-300 px-3 py-2"></td>
            <td class="border border-slate-300 px-3 py-2 text-right tabular-nums">
              {{ t('billing.count', { count: totals.count }) }}
            </td>
            <td class="border border-slate-300 px-3 py-2 text-right tabular-nums">
              {{ yen(totals.material) }}
            </td>
            <td class="border border-slate-300 px-3 py-2 text-right tabular-nums">
              {{ yen(totals.shipping) }}
            </td>
            <td class="border border-slate-300 px-3 py-2 text-right tabular-nums">
              {{ yen(totals.material + totals.shipping) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-slate-600">{{ t('billing.note') }}</p>
  </section>
</template>
