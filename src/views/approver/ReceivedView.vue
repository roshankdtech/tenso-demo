<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppInput from '@/components/ui/AppInput.vue'
import OrderTable from '@/components/OrderTable.vue'
import { useOrderList } from '@/composables/useOrderList'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const filter = ref<'all' | 'in'>('all')
const { filtered, loading, error, search } = useOrderList('received')

const visible = computed(() =>
  filter.value === 'in' ? filtered.value.filter((o) => o.status === '進行中') : filtered.value,
)
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">
      {{ t('list.receivedTitle', { name: auth.user?.person ?? '' }) }}
    </h1>
    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>

    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-400 bg-slate-100 p-3 text-sm"
    >
      <span class="inline-flex" role="group">
        <button
          type="button"
          class="border border-slate-500 px-3 py-1"
          :class="filter === 'all' ? 'bg-blue-100 font-bold' : 'bg-white'"
          :aria-pressed="filter === 'all'"
          @click="filter = 'all'"
        >
          {{ t('list.filterAll') }}
        </button>
        <button
          type="button"
          class="border-y border-r border-slate-500 px-3 py-1"
          :class="filter === 'in' ? 'bg-blue-100 font-bold' : 'bg-white'"
          :aria-pressed="filter === 'in'"
          @click="filter = 'in'"
        >
          {{ t('list.filterInProgress') }}
        </button>
      </span>
      <div class="flex items-center gap-2">
        <span class="font-bold">{{ t('list.filter') }}</span>
        <AppInput
          id="search"
          v-model="search"
          :label="t('common.search')"
          :placeholder="t('list.searchWarehousePlaceholder')"
        />
      </div>
    </div>

    <p v-if="loading" class="text-slate-600">{{ t('common.loading') }}</p>
    <OrderTable v-else :orders="visible" :empty-text="t('common.noData')" />
  </section>
</template>
