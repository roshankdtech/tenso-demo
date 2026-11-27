<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import OrderTable from '@/components/OrderTable.vue'
import { useOrderList } from '@/composables/useOrderList'
import { useAuthStore } from '@/stores/auth'
import { useMastersStore } from '@/stores/masters'

const { t } = useI18n()
const auth = useAuthStore()
const masters = useMastersStore()
const { orders, filtered, loading, error, search, deliveryFrom, deliveryTo } = useOrderList('mine')

const warehouseName = computed(
  () => masters.warehouses.find((w) => w.id === auth.user?.warehouseId)?.name ?? '',
)
// Orders an approver entered for this warehouse, shown as a notice.
const proxyOrders = computed(() => orders.value.filter((o) => o.proxy))
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">{{ t('list.mineTitle', { warehouse: warehouseName }) }}</h1>
      <RouterLink to="/orders/new"
        ><AppButton variant="accent">{{ t('nav.newOrder') }}</AppButton></RouterLink
      >
    </div>

    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>

    <div
      v-if="proxyOrders.length"
      class="rounded border border-purple-400 bg-purple-50 p-3 text-sm"
      role="status"
    >
      <p class="font-bold">{{ t('list.proxyNotice') }}</p>
      <ul class="mt-2 list-disc pl-5">
        <li v-for="order in proxyOrders" :key="order.no">
          <RouterLink
            :to="`/orders/${order.no}`"
            class="font-mono font-bold text-blue-700 underline"
          >
            {{ order.no }}
          </RouterLink>
          {{
            t('list.proxyNoticeReason', {
              name: order.ownerName,
              reason: order.proxyReason,
              status: t(`status.${order.status}`),
            })
          }}
        </li>
      </ul>
    </div>

    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-400 bg-slate-100 p-3 text-sm"
    >
      <span>{{ t('list.sameWarehouseNote') }}</span>
      <div class="flex items-center gap-2">
        <span class="font-bold">{{ t('list.filter') }}</span>
        <AppInput
          id="search"
          v-model="search"
          :label="t('common.search')"
          :placeholder="t('list.searchPlaceholder')"
        />
        <AppDatePicker id="delivery-from" v-model="deliveryFrom" :label="t('list.deliveryFrom')" />
        <AppDatePicker id="delivery-to" v-model="deliveryTo" :label="t('list.deliveryTo')" />
      </div>
    </div>

    <p v-if="loading" class="text-slate-600">{{ t('common.loading') }}</p>
    <OrderTable v-else :orders="filtered" :empty-text="t('list.empty')" />
  </section>
</template>
