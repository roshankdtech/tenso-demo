<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import { useMastersStore } from '@/stores/masters'
import type { Order } from '@/types'
import { CSV_COLUMNS, csvFile } from '@/utils/csv'
import { downloadText } from '@/utils/download'

const { t, tm } = useI18n()
const masters = useMastersStore()

/** Sample value for each CSV field. Field names are the file's headers, so they stay in Japanese. */
const EXAMPLES = [
  'PO-2611-0031',
  '1',
  '2026/11/26',
  'TS0001',
  'T-1202',
  '日野倉庫',
  '2026/12/01',
  'DB-080',
  '段ボール 80サイズ',
  '1000',
  '枚',
  '92',
  '92000',
  '日野倉庫',
  'パレット納品希望',
] as const

const fieldRows = computed(() => tm('csvSpec.fieldRows') as string[][])

/** The sample order used in the prototype (PO-2611-0030). */
const sample = computed<Order>(() => ({
  no: 'PO-2611-0030',
  warehouseId: 'W04',
  due: '2026-12-01',
  created: '11/25 16:30',
  status: '決裁済',
  round: 1,
  note: 'パレット納品希望',
  lines: [
    { code: 'DB-060', qty: 1500 },
    { code: 'DB-100', qty: 300 },
  ],
  history: [],
  ownerId: 'atsugi-watanabe',
  ownerName: '厚木倉庫 渡辺',
  proxy: false,
  proxyReason: '',
  proxyNotice: '',
  selfApproved: false,
  reason: '',
  decided: '2026/11/26',
  csvSent: true,
}))

const sampleText = computed(() => csvFile(sample.value, masters.items, masters.warehouses))

onMounted(() => void masters.load())

function saveSample(): void {
  downloadText('order_見本.csv', sampleText.value)
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">{{ t('csvSpec.title') }}</h1>

    <div class="rounded-lg border border-slate-400 bg-white p-4 shadow-sm">
      <h2 class="mb-3 border-b-2 border-blue-700 pb-1 font-bold text-blue-800">
        {{ t('csvSpec.howTitle') }}
      </h2>
      <table class="w-full border-collapse text-sm">
        <tbody>
          <tr>
            <th class="w-40 border border-slate-300 bg-slate-100 px-3 py-2 text-right">
              {{ t('csvSpec.when') }}
            </th>
            <td class="border border-slate-300 px-3 py-2">
              {{ t('csvSpec.whenNote') }}
            </td>
          </tr>
          <tr>
            <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
              {{ t('csvSpec.to') }}
            </th>
            <td class="border border-slate-300 px-3 py-2">
              <span class="font-mono">edi@kumon-shiki.com</span> {{ t('csvSpec.toValue') }}
            </td>
          </tr>
          <tr>
            <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
              {{ t('csvSpec.fileName') }}
            </th>
            <td class="border border-slate-300 px-3 py-2 font-mono">
              {{ t('csvSpec.fileNameValue') }}
            </td>
          </tr>
          <tr>
            <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
              {{ t('csvSpec.format') }}
            </th>
            <td class="border border-slate-300 px-3 py-2">{{ t('csvSpec.formatValue') }}</td>
          </tr>
          <tr>
            <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
              {{ t('csvSpec.encoding') }}
            </th>
            <td class="border border-slate-300 px-3 py-2">
              {{ t('csvSpec.encodingValue') }}
              <span class="text-xs text-slate-600">{{ t('csvSpec.encodingNote') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="rounded-lg border border-slate-400 bg-white p-4 shadow-sm">
      <h2 class="mb-3 border-b-2 border-blue-700 pb-1 font-bold text-blue-800">
        {{ t('csvSpec.fieldsTitle') }}
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-sm">
          <thead class="bg-slate-100">
            <tr>
              <th
                v-for="(head, index) in tm('csvSpec.fieldCols') as string[]"
                :key="index"
                class="border border-slate-300 px-2 py-2 text-left"
              >
                {{ head }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(name, index) in CSV_COLUMNS" :key="name">
              <td class="border border-slate-300 px-2 py-2 text-center">{{ index + 1 }}</td>
              <td class="border border-slate-300 px-2 py-2 font-bold">{{ name }}</td>
              <td class="border border-slate-300 px-2 py-2 font-mono">{{ EXAMPLES[index] }}</td>
              <td class="border border-slate-300 px-2 py-2">{{ fieldRows[index]?.[0] }}</td>
              <td class="border border-slate-300 px-2 py-2 text-xs text-slate-700">
                {{ fieldRows[index]?.[1] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="rounded-lg border border-slate-400 bg-white p-4 shadow-sm">
      <div
        class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-blue-700 pb-1"
      >
        <h2 class="font-bold text-blue-800">{{ t('csvSpec.sampleTitle') }}</h2>
        <AppButton variant="secondary" @click="saveSample">{{ t('csvSpec.saveSample') }}</AppButton>
      </div>
      <pre
        class="overflow-x-auto whitespace-pre rounded border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-relaxed"
        >{{ sampleText }}</pre>
    </div>

    <div class="rounded border border-dashed border-amber-600 bg-amber-50 p-4 text-sm">
      <p class="font-bold">{{ t('csvSpec.questionsTitle') }}</p>
      <ul class="mt-2 list-disc pl-5">
        <li v-for="(question, index) in tm('csvSpec.questions') as string[]" :key="index">
          {{ question }}
        </li>
      </ul>
    </div>
  </section>
</template>
