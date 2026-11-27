<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { describeError } from '@/i18n/errors'
import { listSendLog, retrySend } from '@/api/sendlog'
import { useToast } from '@/composables/useToast'
import type { SendLogEntry } from '@/types'
import { CSV_COLUMNS } from '@/utils/csv'
import { downloadText } from '@/utils/download'

const { t, tm } = useI18n()
const toast = useToast()
const entries = ref<SendLogEntry[]>([])
const error = ref('')
const loading = ref(true)

const headers = computed(() => tm('sendLog.cols') as string[])

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    entries.value = await listSendLog()
  } catch (err) {
    error.value = describeError(err, t, 'errors.unexpected')
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** A failed send is retried only when that order has no successful send yet. */
function canRetry(entry: SendLogEntry): boolean {
  return !entry.ok && !entries.value.some((e) => e.orderNo === entry.orderNo && e.ok)
}

function saveOne(entry: SendLogEntry): void {
  downloadText(entry.fileName, entry.csvText)
  toast.show(t('detail.csvSaved', { file: entry.fileName }))
}

function saveAll(): void {
  const successful = entries.value.filter((e) => e.ok)
  if (!successful.length) return
  const header = CSV_COLUMNS.join(',')
  const rows = successful.flatMap((e) => e.csvText.split('\r\n').slice(1).filter(Boolean))
  downloadText('order_2026-11_送信分.csv', [header, ...rows].join('\r\n') + '\r\n')
  toast.show(t('detail.csvSaved', { file: 'order_2026-11_送信分.csv' }))
}

async function retry(entry: SendLogEntry): Promise<void> {
  try {
    await retrySend(entry.id)
    toast.show(t('sendLog.retried', { no: entry.orderNo }))
    await load()
  } catch (err) {
    error.value = describeError(err, t, 'errors.unexpected')
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">{{ t('sendLog.title') }}</h1>
    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>

    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-400 bg-slate-100 p-3 text-sm"
    >
      <span>{{ t('sendLog.destination', { mail: 'edi@kumon-shiki.com' }) }}</span>
      <AppButton variant="secondary" @click="saveAll">{{ t('sendLog.saveAll') }}</AppButton>
    </div>

    <p v-if="loading" class="text-slate-600">{{ t('common.loading') }}</p>
    <div v-else class="overflow-x-auto rounded border border-slate-400 bg-white">
      <table class="w-full min-w-[860px] border-collapse text-sm">
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
          <tr v-for="entry in entries" :key="entry.id" class="align-top">
            <td class="border border-slate-300 px-2 py-2 tabular-nums">{{ entry.at }}</td>
            <td class="border border-slate-300 px-2 py-2">
              <RouterLink
                :to="`/orders/${entry.orderNo}`"
                class="font-mono font-bold text-blue-700 underline"
              >
                {{ entry.orderNo }}
              </RouterLink>
            </td>
            <td class="border border-slate-300 px-2 py-2">{{ entry.warehouseName }}</td>
            <td class="border border-slate-300 px-2 py-2 font-mono text-xs">
              {{ entry.fileName }}
            </td>
            <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
              {{ entry.lineCount }}
            </td>
            <td class="border border-slate-300 px-2 py-2 text-center">
              <span v-if="entry.ok" class="font-bold text-green-800">{{ t('sendLog.sent') }}</span>
              <template v-else>
                <span class="font-bold text-red-800">{{ t('sendLog.failed') }}</span>
                <div class="text-xs text-slate-600">{{ entry.error }}</div>
              </template>
            </td>
            <td class="border border-slate-300 px-2 py-2 text-center">
              <div class="flex flex-col items-center gap-2">
                <AppButton variant="secondary" @click="saveOne(entry)">{{
                  t('sendLog.saveOne')
                }}</AppButton>
                <AppButton v-if="canRetry(entry)" variant="accent" @click="retry(entry)">
                  {{ t('sendLog.retry') }}
                </AppButton>
              </div>
            </td>
          </tr>
          <tr v-if="!entries.length">
            <td colspan="7" class="px-4 py-6 text-center text-slate-600">
              {{ t('common.noData') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-slate-600">{{ t('sendLog.note') }}</p>
  </section>
</template>
