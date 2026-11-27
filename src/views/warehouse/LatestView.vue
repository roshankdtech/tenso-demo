<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import OrderTable from '@/components/OrderTable.vue'
import { useOrderList } from '@/composables/useOrderList'
import { useMastersStore } from '@/stores/masters'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const masters = useMastersStore()
const { filtered, loading, error, search, deliveryFrom, deliveryTo } = useOrderList('latest')

const warehouseName = computed(
  () => masters.warehouses.find((w) => w.id === auth.user?.warehouseId)?.name ?? '',
)
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">{{ t('list.latestTitle', { warehouse: warehouseName }) }}</h1>
    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
    <div
      class="flex flex-wrap items-center justify-end gap-2 rounded border border-slate-400 bg-slate-100 p-3 text-sm"
    >
      <span class="font-bold">{{ t('list.filter') }}</span>
      <AppInput id="search" v-model="search" :label="t('common.search')" />
      <AppDatePicker id="delivery-from" v-model="deliveryFrom" :label="t('list.deliveryFrom')" />
      <AppDatePicker id="delivery-to" v-model="deliveryTo" :label="t('list.deliveryTo')" />
    </div>
    <p v-if="loading" class="text-slate-600">{{ t('common.loading') }}</p>
    <OrderTable v-else :orders="filtered" :empty-text="t('list.emptyLatest')" />
  </section>
</template>
