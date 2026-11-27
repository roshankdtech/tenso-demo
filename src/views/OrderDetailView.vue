<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { approveOrders, getOrder, rejectOrder, returnOrder } from '@/api'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { describeError } from '@/i18n/errors'
import { useToast } from '@/composables/useToast'
import { useAuthStore, roleHome } from '@/stores/auth'
import { useMastersStore } from '@/stores/masters'
import type { Order } from '@/types'
import { APPROVER_NAME } from '@/utils/constants'
import { csvFile, csvFileName } from '@/utils/csv'
import { formatDate } from '@/utils/dates'
import { downloadText, yen } from '@/utils/download'
import { lastDecision, orderAmount, statusTone } from '@/utils/orders'

const route = useRoute()
const router = useRouter()
const { t, tm, locale } = useI18n()
const auth = useAuthStore()
const masters = useMastersStore()
const toast = useToast()

const order = ref<Order | null>(null)
const error = ref('')
const comment = ref('')
const commentError = ref('')
const busy = ref(false)

const warehouse = computed(
  () => masters.warehouses.find((w) => w.id === order.value?.warehouseId) ?? null,
)
const amount = computed(() => (order.value ? orderAmount(order.value.lines, masters.items) : 0))
const isApprover = computed(() => auth.role === 'approver')
const isOwner = computed(() => order.value?.ownerId === auth.user?.id)
const canDecide = computed(() => isApprover.value && order.value?.status === '進行中')
const canEdit = computed(
  () => auth.role === 'warehouse' && isOwner.value && order.value?.status === '差し戻し',
)
const notApprovedToCsv = computed(() => auth.role !== 'warehouse')
const csvText = computed(() =>
  order.value ? csvFile(order.value, masters.items, masters.warehouses) : '',
)
const decision = computed(() => (order.value ? lastDecision(order.value) : null))

async function load(): Promise<void> {
  error.value = ''
  try {
    await masters.load()
    order.value = await getOrder(String(route.params.no))
  } catch (err) {
    error.value = describeError(err, t, 'errors.unexpected')
  }
}

onMounted(load)

function itemName(code: string): string {
  return masters.items.find((i) => i.code === code)?.name ?? code
}
function itemOf(code: string) {
  return masters.items.find((i) => i.code === code)
}

async function approve(): Promise<void> {
  if (!order.value) return
  busy.value = true
  try {
    await approveOrders([order.value.no])
    toast.show(t('detail.approvedToast', { count: 1, mail: 'edi@kumon-shiki.com' }))
    await load()
  } catch (err) {
    error.value = describeError(err, t, 'errors.unexpected')
  } finally {
    busy.value = false
  }
}

async function decideWithComment(kind: 'return' | 'reject'): Promise<void> {
  if (!order.value) return
  const text = comment.value.trim()
  if (!text) {
    commentError.value = t('detail.reasonRequired', {
      action: kind === 'return' ? t('detail.return') : t('detail.reject'),
    })
    return
  }
  commentError.value = ''
  busy.value = true
  try {
    const updated =
      kind === 'return'
        ? await returnOrder(order.value.no, text)
        : await rejectOrder(order.value.no, text)
    toast.show(
      t('detail.returnedToast', {
        no: updated.no,
        status: t(`status.${updated.status}`),
        warehouse: warehouse.value?.name ?? '',
      }),
    )
    comment.value = ''
    await load()
  } catch (err) {
    error.value = describeError(err, t, 'errors.unexpected')
  } finally {
    busy.value = false
  }
}

function saveCsv(): void {
  if (!order.value) return
  downloadText(csvFileName(order.value), csvText.value)
  toast.show(t('detail.csvSaved', { file: csvFileName(order.value) }))
}

function goBack(): void {
  if (window.history.length > 1) router.back()
  else void router.push(auth.role ? roleHome[auth.role] : '/login')
}

function editOrder(): void {
  if (order.value) void router.push(`/orders/${order.value.no}/edit`)
}

const createdAt = computed(() => order.value?.created ?? '')

/** The steps an approved order has been through, from the history. */
const progress = computed(() => {
  const history = order.value?.history ?? []
  const submitted = [...history].reverse().find((h) => h.action === '申請' || h.action === '再申請')
  const approved = [...history].reverse().find((h) => h.action.startsWith('決裁'))
  return {
    submittedAt: submitted?.at ?? '',
    approvedAt: approved?.at ?? '',
    sent: order.value?.csvSent ?? false,
  }
})
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">
        {{
          order
            ? t('detail.title', {
                title: t('list.orderTitle', {
                  warehouse: warehouse?.name ?? '',
                  due: formatDate(order.due, locale),
                }),
              })
            : ''
        }}
      </h1>
      <AppButton variant="secondary" @click="goBack">{{ t('common.back') }}</AppButton>
    </div>

    <AppAlert v-if="error" tone="error">{{ error }}</AppAlert>

    <template v-if="order">
      <div class="rounded-lg border border-slate-400 bg-white p-4 shadow-sm">
        <h2 class="mb-3 border-b-2 border-blue-700 pb-1 font-bold text-blue-800">
          📄 {{ t('detail.sectionApp') }}
        </h2>
        <table class="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <th class="w-44 border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.formName') }}
              </th>
              <td class="border border-slate-300 px-3 py-2">{{ t('form.formValue') }}</td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.orderNo') }}
              </th>
              <td class="border border-slate-300 px-3 py-2 font-mono">{{ order.no }}</td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.headline') }}
              </th>
              <td class="border border-slate-300 px-3 py-2 font-bold">
                {{
                  t('list.orderTitle', {
                    warehouse: warehouse?.name ?? '',
                    due: formatDate(order.due, locale),
                  })
                }}
              </td>
            </tr>
            <template v-if="order.proxy">
              <tr>
                <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                  {{ t('detail.warehouse') }}
                </th>
                <td class="border border-slate-300 px-3 py-2">{{ warehouse?.name }}</td>
              </tr>
              <tr>
                <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                  {{ t('detail.enteredBy') }}
                </th>
                <td class="border border-slate-300 px-3 py-2">
                  {{ order.ownerName }}
                  <span class="font-bold text-purple-800">
                    {{
                      order.selfApproved ? t('detail.proxyApprovedTag') : t('detail.proxyApplied')
                    }}
                  </span>
                </td>
              </tr>
              <tr>
                <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                  {{ t('detail.reasonLabel') }}
                </th>
                <td class="border border-slate-300 px-3 py-2">{{ order.proxyReason }}</td>
              </tr>
              <tr>
                <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                  {{ t('detail.notifyLabel') }}
                </th>
                <td class="border border-slate-300 px-3 py-2">{{ order.proxyNotice }}</td>
              </tr>
            </template>
            <tr v-else>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.applicant') }}
              </th>
              <td class="border border-slate-300 px-3 py-2">
                {{ order.ownerName }}
                <span class="font-mono text-xs text-slate-600">({{ order.ownerId }})</span>
              </td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.destination') }}
              </th>
              <td class="border border-slate-300 px-3 py-2">
                {{ warehouse?.name }} ({{ t('detail.destinationCode') }}
                <span class="font-mono">{{ warehouse?.destinationCode }}</span>)
              </td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.amount') }}
              </th>
              <td class="border border-slate-300 px-3 py-2 font-bold text-blue-800 tabular-nums">
                {{ t('common.jpy') }} {{ yen(amount) }}
              </td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.due') }}
              </th>
              <td class="border border-slate-300 px-3 py-2 font-bold text-red-700">
                {{ formatDate(order.due, locale) }}
              </td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.createdAt') }}
              </th>
              <td class="border border-slate-300 px-3 py-2">{{ createdAt }}</td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.currentStatus') }}
              </th>
              <td class="border border-slate-300 px-3 py-2">
                <AppBadge :tone="statusTone(order.status)">{{
                  t(`status.${order.status}`)
                }}</AppBadge>
              </td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.notes') }}<br /><span class="text-xs text-slate-500">{{
                  t('detail.notesHint')
                }}</span>
              </th>
              <td class="border border-slate-300 px-3 py-2">
                {{ order.note || t('detail.none') }}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="w-12 border border-slate-300 px-2 py-2 text-center">
                  {{ t('detail.lineNo') }}
                </th>
                <th class="border border-slate-300 px-2 py-2 text-left">
                  {{ t('detail.lineCode') }}
                </th>
                <th class="border border-slate-300 px-2 py-2 text-left">
                  {{ t('detail.lineName') }}
                </th>
                <th class="border border-slate-300 px-2 py-2 text-right">
                  {{ t('detail.lineQty') }}
                </th>
                <th class="border border-slate-300 px-2 py-2 text-right">
                  {{ t('detail.linePrice') }}
                </th>
                <th class="border border-slate-300 px-2 py-2 text-right">
                  {{ t('detail.lineAmount') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in order.lines" :key="index">
                <td class="border border-slate-300 px-2 py-2 text-center">{{ index + 1 }}</td>
                <td class="border border-slate-300 px-2 py-2 font-mono">{{ line.code }}</td>
                <td class="border border-slate-300 px-2 py-2">{{ itemName(line.code) }}</td>
                <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
                  {{ line.qty.toLocaleString('ja-JP') }} {{ itemOf(line.code)?.unit }}
                </td>
                <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
                  {{
                    itemOf(line.code)?.price.toLocaleString('ja-JP', { maximumFractionDigits: 2 })
                  }}
                </td>
                <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
                  {{ yen((itemOf(line.code)?.price ?? 0) * line.qty) }}
                </td>
              </tr>
              <tr class="bg-slate-50 font-bold">
                <td colspan="5" class="border border-slate-300 px-2 py-2 text-right">
                  {{ t('detail.lineTotal') }}
                </td>
                <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
                  {{ yen(amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-lg border border-slate-400 bg-white p-4 shadow-sm">
        <h2 class="mb-3 border-b-2 border-green-700 pb-1 font-bold text-green-800">
          {{ t('detail.sectionApproval') }}
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="w-24 border border-slate-300 px-2 py-2 text-left">
                  {{ t('detail.approvalColRole') }}
                </th>
                <th class="w-36 border border-slate-300 px-2 py-2 text-left">
                  {{ t('detail.approvalColTarget') }}
                </th>
                <th class="border border-slate-300 px-2 py-2 text-left">
                  {{ t('detail.approvalColComment') }}
                </th>
                <th class="w-64 border border-slate-300 px-2 py-2 text-center">
                  {{ t('detail.approvalColAction') }}
                </th>
                <th class="w-32 border border-slate-300 px-2 py-2 text-center">
                  {{ t('detail.approvalColStatus') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="align-top">
                <td class="border border-slate-300 px-2 py-2">{{ t('detail.approver') }}</td>
                <td class="border border-slate-300 px-2 py-2">{{ APPROVER_NAME }}</td>
                <td class="border border-slate-300 px-2 py-2 text-xs">
                  {{ decision?.reason ?? '' }}
                </td>
                <td class="border border-slate-300 px-2 py-2">
                  <div v-if="canDecide" class="flex flex-col gap-2">
                    <input
                      v-model="comment"
                      type="text"
                      :placeholder="t('detail.approverPlaceholder')"
                      :aria-label="t('detail.commentLabel')"
                      class="rounded border border-slate-500 px-2 py-1"
                    />
                    <p v-if="commentError" class="text-xs font-bold text-red-800">
                      {{ commentError }}
                    </p>
                    <div class="flex flex-wrap justify-center gap-2">
                      <AppButton variant="accent" :disabled="busy" @click="approve">{{
                        t('detail.approve')
                      }}</AppButton>
                      <AppButton
                        variant="secondary"
                        :disabled="busy"
                        @click="decideWithComment('return')"
                      >
                        {{ t('detail.return') }}
                      </AppButton>
                      <AppButton
                        variant="danger"
                        :disabled="busy"
                        @click="decideWithComment('reject')"
                      >
                        {{ t('detail.reject') }}
                      </AppButton>
                    </div>
                  </div>
                  <span v-else class="text-slate-400">-</span>
                </td>
                <td class="border border-slate-300 px-2 py-2 text-center font-bold">
                  <template v-if="order.status === '進行中'">
                    <span class="text-orange-700">{{ t('detail.notYet') }}</span>
                  </template>
                  <template v-else-if="order.status === '決裁済'">
                    <span class="text-green-800">{{ t('detail.approvedStatus') }}</span>
                  </template>
                  <template v-else-if="order.status === '差し戻し'">
                    <span class="text-orange-700">{{ t('detail.returnedStatus') }}</span>
                  </template>
                  <template v-else-if="order.status === '却下'">
                    <span class="text-red-800">{{ t('detail.rejectedStatus') }}</span>
                  </template>
                  <template v-else>
                    <span class="text-slate-500">{{ t('detail.waiting') }}</span>
                  </template>
                  <div v-if="decision" class="mt-1 text-xs font-normal text-slate-500">
                    {{ decision.at }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p
          v-if="canDecide"
          class="mt-3 rounded border border-dashed border-amber-600 bg-amber-50 p-2 text-sm"
        >
          <b>{{ t('detail.returnHintTitle') }}:</b> {{ t('detail.returnHint') }}
        </p>
        <div v-if="canEdit" class="mt-4 flex justify-center">
          <AppButton variant="accent" @click="editOrder">{{ t('detail.editReturned') }}</AppButton>
        </div>
        <p
          v-else-if="auth.role === 'warehouse' && order.status === '差し戻し'"
          class="mt-3 text-sm text-slate-600"
        >
          {{ t('detail.editOnlyOwner', { name: order.ownerName }) }}
        </p>
      </div>

      <div
        v-if="order.status === '決裁済'"
        class="rounded-lg border border-slate-400 bg-white p-4 shadow-sm"
      >
        <h2 class="mb-3 border-b-2 border-blue-700 pb-1 font-bold text-blue-800">
          {{ t('detail.sectionProgress') }}
        </h2>
        <ol class="flex flex-col gap-3 text-sm">
          <li class="flex flex-wrap gap-2">
            <span class="w-40 font-bold">{{ t('detail.progressSubmitted') }}</span>
            <span class="tabular-nums text-slate-600">{{ progress.submittedAt }}</span>
          </li>
          <li class="flex flex-wrap gap-2">
            <span class="w-40 font-bold">{{ t('detail.progressApproved') }}</span>
            <span class="tabular-nums text-slate-600">{{ progress.approvedAt }}</span>
          </li>
          <li class="flex flex-wrap gap-2">
            <span class="w-40 font-bold">{{ t('detail.progressSent') }}</span>
            <span v-if="progress.sent" class="font-bold text-green-800">{{
              t('detail.progressSentOk')
            }}</span>
            <span v-else class="font-bold text-red-800">{{ t('detail.progressSentFail') }}</span>
          </li>
        </ol>
      </div>

      <div class="rounded-lg border border-slate-400 bg-white p-4 shadow-sm">
        <h2 class="mb-3 border-b-2 border-slate-500 pb-1 font-bold text-slate-700">
          🕘 {{ t('detail.sectionHistory') }}
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[560px] border-collapse text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="w-28 border border-slate-300 px-2 py-2 text-left">
                  {{ (tm('detail.historyCols') as string[])[0] }}
                </th>
                <th class="w-24 border border-slate-300 px-2 py-2 text-left">
                  {{ (tm('detail.historyCols') as string[])[1] }}
                </th>
                <th class="w-44 border border-slate-300 px-2 py-2 text-left">
                  {{ (tm('detail.historyCols') as string[])[2] }}
                </th>
                <th class="border border-slate-300 px-2 py-2 text-left">
                  {{ (tm('detail.historyCols') as string[])[3] }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, index) in order.history" :key="index">
                <td class="border border-slate-300 px-2 py-2 tabular-nums">{{ entry.at }}</td>
                <td class="border border-slate-300 px-2 py-2">{{ entry.action }}</td>
                <td class="border border-slate-300 px-2 py-2">{{ entry.by }}</td>
                <td class="border border-slate-300 px-2 py-2 text-xs">{{ entry.reason ?? '' }}</td>
              </tr>
              <tr v-if="!order.history.length">
                <td
                  colspan="4"
                  class="border border-slate-300 px-2 py-3 text-center text-slate-600"
                >
                  {{ t('detail.noHistory') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        v-if="order.status === '決裁済'"
        class="rounded-lg border border-orange-400 bg-white p-4 shadow-sm"
      >
        <div
          class="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-orange-600 pb-1"
        >
          <h2 class="font-bold text-orange-800">📨 {{ t('detail.sectionCsv') }}</h2>
          <AppButton v-if="notApprovedToCsv" variant="secondary" @click="saveCsv">
            {{ t('detail.saveCsv', { file: csvFileName(order) }) }}
          </AppButton>
        </div>
        <table class="mb-3 w-full border-collapse text-sm">
          <tbody>
            <tr>
              <th class="w-32 border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.csvTo') }}
              </th>
              <td class="border border-slate-300 px-3 py-2 font-mono">
                edi@kumon-shiki.com {{ t('detail.csvToValue') }}
              </td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.csvSubject') }}
              </th>
              <td class="border border-slate-300 px-3 py-2">{{ t('detail.csvSubjectValue') }}</td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.csvAttachment') }}
              </th>
              <td class="border border-slate-300 px-3 py-2 font-mono">{{ csvFileName(order) }}</td>
            </tr>
            <tr>
              <th class="border border-slate-300 bg-slate-100 px-3 py-2 text-right">
                {{ t('detail.csvResult') }}
              </th>
              <td class="border border-slate-300 px-3 py-2">
                <span v-if="order.csvSent" class="font-bold text-green-800">{{
                  t('detail.csvSentOk')
                }}</span>
                <span v-else class="font-bold text-red-800">{{ t('detail.csvSentFail') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <pre
          v-if="notApprovedToCsv"
          class="overflow-x-auto whitespace-pre rounded border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-relaxed"
          >{{ csvText }}</pre>
      </div>
    </template>
  </section>
</template>
