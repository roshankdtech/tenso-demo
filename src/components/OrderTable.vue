<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/ui/AppBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useMastersStore } from '@/stores/masters'
import type { Order } from '@/types'
import { shortDate } from '@/utils/dates'
import { yen } from '@/utils/download'
import { APPROVER_NAME } from '@/utils/constants'
import { itemNames, lastComment, orderAmount, statusTone } from '@/utils/orders'

const props = withDefaults(
  defineProps<{
    orders: Order[]
    /** Show a checkbox column (approver's daily batch). */
    selectable?: boolean
    selected?: string[]
    emptyText?: string
  }>(),
  { selectable: false, selected: () => [], emptyText: '' },
)

const emit = defineEmits<{ toggle: [no: string]; toggleAll: [] }>()

const { t } = useI18n()
const auth = useAuthStore()
const masters = useMastersStore()

const allSelected = computed(
  () => props.orders.length > 0 && props.orders.every((o) => props.selected.includes(o.no)),
)

function warehouseName(order: Order): string {
  return masters.warehouses.find((w) => w.id === order.warehouseId)?.name ?? order.warehouseId
}

function amount(order: Order): string {
  return yen(orderAmount(order.lines, masters.items))
}

function applicantText(order: Order): string {
  const name = warehouseName(order)
  if (order.proxy) return name
  const person = order.ownerName.replace(`${name} `, '')
  const you = auth.user?.id === order.ownerId ? t('list.you') : ''
  return `${name} ${person}${you}`
}

function progressText(order: Order): string {
  if (order.status === '進行中')
    return `${t('list.progressApprover', { name: APPROVER_NAME })}${t('list.progressPending')}`
  if (order.status === '決裁済') {
    return `${t('list.progressCsvSent')}${order.csvSent ? t('list.sent') : t('list.sendFailed')}`
  }
  return ''
}
</script>

<template>
  <div class="overflow-x-auto rounded border border-slate-400 bg-white">
    <table class="w-full min-w-[860px] border-collapse text-sm">
      <thead class="bg-slate-100">
        <tr>
          <th v-if="selectable" class="w-10 border border-slate-300 px-2 py-2">
            <input
              type="checkbox"
              :checked="allSelected"
              :aria-label="t('list.colCheck')"
              @change="emit('toggleAll')"
            />
          </th>
          <th class="w-36 border border-slate-300 px-2 py-2 text-left">{{ t('list.colNo') }}</th>
          <th class="border border-slate-300 px-2 py-2 text-left">{{ t('list.colTitle') }}</th>
          <th class="w-44 border border-slate-300 px-2 py-2 text-left">
            {{ t('list.colApplicant') }}
          </th>
          <th class="w-28 border border-slate-300 px-2 py-2 text-right">
            {{ t('list.colAmount') }}
          </th>
          <th class="w-20 border border-slate-300 px-2 py-2 text-center">{{ t('list.colDue') }}</th>
          <th class="w-44 border border-slate-300 px-2 py-2 text-center">
            {{ t('list.colStatus') }}
          </th>
          <th class="border border-slate-300 px-2 py-2 text-left">{{ t('list.colComment') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.no" class="align-top">
          <td v-if="selectable" class="border border-slate-300 px-2 py-2 text-center">
            <input
              type="checkbox"
              :checked="selected.includes(order.no)"
              :aria-label="`${order.no} ${t('list.colCheck')}`"
              @change="emit('toggle', order.no)"
            />
          </td>
          <td class="border border-slate-300 px-2 py-2 font-mono text-slate-600">
            {{ order.no }}
            <div v-if="order.round > 1" class="text-xs text-orange-700">
              {{ t('list.rerequest') }}
            </div>
            <div v-if="order.proxy" class="text-xs font-bold text-purple-800">
              {{ order.selfApproved ? t('list.selfApprovedTag') : t('list.proxyTag') }}
            </div>
          </td>
          <td class="border border-slate-300 px-2 py-2">
            <RouterLink :to="`/orders/${order.no}`" class="font-bold text-blue-700 underline">
              {{
                t('list.orderTitle', { warehouse: warehouseName(order), due: shortDate(order.due) })
              }}
            </RouterLink>
            <div class="text-xs text-slate-600">{{ itemNames(order, masters.items) }}</div>
          </td>
          <td class="border border-slate-300 px-2 py-2">
            {{ applicantText(order) }}
            <div v-if="order.proxy" class="text-xs font-bold text-purple-800">
              {{ t('list.proxyEntered', { name: order.ownerName }) }}
            </div>
          </td>
          <td
            class="border border-slate-300 px-2 py-2 text-right font-bold tabular-nums text-blue-800"
          >
            {{ t('common.jpy') }} {{ amount(order) }}
          </td>
          <td
            class="border border-slate-300 px-2 py-2 text-center font-bold tabular-nums text-red-700"
          >
            {{ shortDate(order.due) }}
          </td>
          <td class="border border-slate-300 px-2 py-2 text-center">
            <AppBadge :tone="statusTone(order.status)">{{ t(`status.${order.status}`) }}</AppBadge>
            <div v-if="progressText(order)" class="mt-1 text-xs text-slate-600">
              {{ progressText(order) }}
            </div>
          </td>
          <td class="border border-slate-300 px-2 py-2 text-xs text-slate-700">
            <template v-if="lastComment(order)">
              <b>{{ lastComment(order)?.by }}:</b> {{ lastComment(order)?.reason }}
            </template>
          </td>
        </tr>
        <tr v-if="!orders.length">
          <td :colspan="selectable ? 8 : 7" class="px-4 py-6 text-center text-slate-600">
            {{ emptyText || t('common.noData') }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
