<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import OrderTable from '@/components/OrderTable.vue'
import { approveOrders } from '@/api/approvals'
import { describeError } from '@/i18n/errors'
import { useOrderList } from '@/composables/useOrderList'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const { orders, loading, error, reload } = useOrderList('pending')

const selected = ref<string[]>([])
const actionError = ref('')
const count = computed(() => selected.value.length)

function toggle(no: string): void {
  selected.value = selected.value.includes(no)
    ? selected.value.filter((n) => n !== no)
    : [...selected.value, no]
}

function toggleAll(): void {
  selected.value =
    selected.value.length === orders.value.length ? [] : orders.value.map((o) => o.no)
}

async function approveSelected(): Promise<void> {
  if (!selected.value.length) return
  actionError.value = ''
  try {
    const approvedCount = count.value
    await approveOrders(selected.value)
    toast.show(t('detail.approvedToast', { count: approvedCount, mail: 'edi@kumon-shiki.com' }))
    selected.value = []
    await reload()
  } catch (err) {
    actionError.value = describeError(err, t, 'errors.unexpected')
  }
}

const approverName = computed(() => auth.user?.person ?? '')
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">{{ t('list.pendingTitle', { name: approverName }) }}</h1>
    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>
    <AppAlert v-if="actionError" tone="error">{{ actionError }}</AppAlert>

    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-400 bg-slate-100 p-3 text-sm"
    >
      <span>{{ t('list.pendingNote') }}</span>
      <AppButton variant="accent" :disabled="!count" @click="approveSelected">
        {{ count ? t('list.bulkApprove', { count }) : t('list.bulkApproveNone') }}
      </AppButton>
    </div>

    <p v-if="loading" class="text-slate-600">{{ t('common.loading') }}</p>
    <OrderTable
      v-else
      :orders="orders"
      selectable
      :selected="selected"
      :empty-text="t('list.emptyPending')"
      @toggle="toggle"
      @toggle-all="toggleAll"
    />
    <p class="text-sm text-slate-600">{{ t('list.pendingCsvNote') }}</p>
  </section>
</template>
