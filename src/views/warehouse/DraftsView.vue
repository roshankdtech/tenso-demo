<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { useOrderList } from '@/composables/useOrderList'
import { useAuthStore } from '@/stores/auth'
import { useMastersStore } from '@/stores/masters'
import { yen } from '@/utils/download'
import { shortDate } from '@/utils/dates'
import { orderAmount } from '@/utils/orders'

const { t, tm } = useI18n()
const auth = useAuthStore()
const masters = useMastersStore()
// The server returns only the signed-in user's own drafts for this scope.
const { orders, loading, error } = useOrderList('drafts')

const headers = computed(() => tm('list.draftCols') as string[])

function warehouseName(warehouseId: string): string {
  return masters.warehouses.find((w) => w.id === warehouseId)?.name ?? ''
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">
      {{ t('list.draftsTitle', { name: auth.user?.person ?? '' }) }}
    </h1>
    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
    <p v-if="loading" class="text-slate-600">{{ t('common.loading') }}</p>
    <div v-else class="overflow-x-auto rounded border border-slate-400 bg-white">
      <table class="w-full min-w-[640px] border-collapse text-sm">
        <thead class="bg-slate-100">
          <tr>
            <th
              v-for="(head, index) in headers"
              :key="index"
              class="border border-slate-300 px-2 py-2 text-left"
            >
              {{ head }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.no">
            <td class="border border-slate-300 px-2 py-2 font-mono">{{ order.no }}</td>
            <td class="border border-slate-300 px-2 py-2">
              <RouterLink
                :to="`/orders/${order.no}/edit`"
                class="font-bold text-blue-700 underline"
              >
                {{
                  t('list.orderTitle', {
                    warehouse: warehouseName(order.warehouseId),
                    due: shortDate(order.due),
                  })
                }}
              </RouterLink>
            </td>
            <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
              {{ t('common.jpy') }} {{ yen(orderAmount(order.lines, masters.items)) }}
            </td>
            <td class="border border-slate-300 px-2 py-2">
              <AppBadge>{{ t('status.下書き') }}</AppBadge>
            </td>
            <td class="border border-slate-300 px-2 py-2 text-xs">{{ order.created }}</td>
          </tr>
          <tr v-if="!orders.length">
            <td colspan="5" class="px-4 py-6 text-center text-slate-600">
              {{ t('list.emptyDrafts') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
