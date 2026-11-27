<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { describeError } from '@/i18n/errors'
import { saveItem } from '@/api/masters'
import { useToast } from '@/composables/useToast'
import { useMastersStore } from '@/stores/masters'
import type { Item, ItemCategory } from '@/types'
import { csvField } from '@/utils/csv'
import { downloadText } from '@/utils/download'

const { t, tm } = useI18n()
const masters = useMastersStore()
const toast = useToast()

onMounted(() => void masters.load())

const CATEGORIES: ItemCategory[] = ['段ボール', 'ラベル', '袋類', 'その他']
const categoryOptions = computed(() =>
  CATEGORIES.map((c) => ({ value: c, label: t(`masters.categories.${c}`) })),
)
const statusOptions = [
  { value: '1', label: t('masters.fields.statusItemActive') },
  { value: '0', label: t('masters.fields.statusItemStopped') },
]

/** null = closed. '' = new item. A code = editing that item. */
const editingCode = ref<string | null>(null)
const formError = ref('')
const saving = ref(false)
const pageError = ref('')

const form = reactive({
  code: '',
  category: '段ボール' as ItemCategory,
  name: '',
  spec: '',
  lot: '',
  unit: '枚',
  price: '',
  answerCode: '',
  active: '1',
})
const errors = reactive<Record<string, string>>({})

const isOpen = computed(() => editingCode.value !== null)
const isNew = computed(() => editingCode.value === '')
const activeCount = computed(() => masters.items.filter((i) => i.active).length)

function openNew(): void {
  Object.assign(form, {
    code: '',
    category: '段ボール',
    name: '',
    spec: '',
    lot: '',
    unit: '枚',
    price: '',
    answerCode: '',
    active: '1',
  })
  editingCode.value = ''
  formError.value = ''
  Object.keys(errors).forEach((k) => delete errors[k])
}

function openEdit(item: Item): void {
  Object.assign(form, {
    code: item.code,
    category: item.category,
    name: item.name,
    spec: item.spec,
    lot: String(item.lot),
    unit: item.unit,
    price: String(item.price),
    answerCode: item.answerCode,
    active: item.active ? '1' : '0',
  })
  editingCode.value = item.code
  formError.value = ''
  Object.keys(errors).forEach((k) => delete errors[k])
}

function close(): void {
  editingCode.value = null
}

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  const code = form.code.trim().toUpperCase()
  if (!/^[A-Z0-9-]{2,20}$/.test(code)) errors.code = t('masters.errors.code')
  else if (isNew.value && masters.items.some((i) => i.code === code)) {
    errors.code = t('masters.errors.codeTaken', { code })
  }
  if (!form.name.trim()) errors.name = t('masters.errors.name')
  const lot = Number(form.lot)
  if (!(lot > 0) || !Number.isInteger(lot)) errors.lot = t('masters.errors.lot')
  if (!form.unit.trim()) errors.unit = t('masters.errors.unit')
  if (form.price.trim() === '' || !(Number(form.price) >= 0))
    errors.price = t('masters.errors.price')
  return Object.keys(errors).length === 0
}

async function save(): Promise<void> {
  formError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    const item: Item = {
      code: form.code.trim().toUpperCase(),
      category: form.category,
      name: form.name.trim(),
      spec: form.spec.trim(),
      lot: Number(form.lot),
      unit: form.unit.trim(),
      price: Number(form.price),
      answerCode: form.answerCode.trim(),
      active: form.active === '1',
    }
    // The code of an existing item cannot change, so the stored code is always used when editing.
    await saveItem(
      isNew.value ? item : { ...item, code: editingCode.value ?? item.code },
      isNew.value,
    )
    await masters.reload()
    toast.show(
      t('masters.savedItem', {
        code: item.code,
        action: isNew.value ? t('masters.created') : t('masters.updated'),
        effect: item.active ? t('masters.shownOnOrder') : t('masters.hiddenOnOrder'),
      }),
    )
    close()
  } catch (err) {
    formError.value = describeError(err, t, 'errors.unexpected')
  } finally {
    saving.value = false
  }
}

async function toggle(item: Item): Promise<void> {
  pageError.value = ''
  try {
    await saveItem({ ...item, active: !item.active }, false)
    await masters.reload()
    toast.show(
      t('masters.itemToggled', {
        code: item.code,
        action: item.active ? t('masters.stopped') : t('masters.resumed'),
      }),
    )
  } catch (err) {
    pageError.value = describeError(err, t, 'errors.unexpected')
  }
}

function saveCsv(): void {
  const header = (tm('masters.itemCols') as string[]).slice(0, 8).join(',')
  const rows = masters.items.map((i) =>
    [
      i.code,
      i.category,
      i.name,
      i.spec,
      i.lot,
      i.unit,
      i.price,
      i.answerCode,
      i.active ? t('masters.activeStatus') : t('masters.stoppedStatus'),
    ]
      .map(csvField)
      .join(','),
  )
  downloadText('品目マスタ.csv', [header, ...rows].join('\r\n') + '\r\n')
  toast.show(t('masters.csvDone', { file: '品目マスタ.csv' }))
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">{{ t('masters.itemsTitle') }}</h1>
    <AppAlert v-if="pageError" tone="error">{{ pageError }}</AppAlert>

    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-400 bg-slate-100 p-3 text-sm"
    >
      <span>{{
        t('masters.itemsNote', { count: masters.items.length, active: activeCount })
      }}</span>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" @click="saveCsv">{{ t('masters.csv') }}</AppButton>
        <AppButton variant="accent" @click="openNew">{{ t('masters.add') }}</AppButton>
      </div>
    </div>

    <div v-if="isOpen" class="rounded-lg border border-slate-400 bg-white p-4 shadow">
      <h2 class="mb-3 font-bold">
        {{ isNew ? t('masters.formNewItem') : t('masters.formEditItem', { code: form.code }) }}
      </h2>
      <AppAlert v-if="formError" tone="error">{{ formError }}</AppAlert>
      <div class="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <AppInput
            id="item-code"
            v-model="form.code"
            :label="t('masters.fields.code')"
            :error="errors.code"
            :disabled="!isNew"
            :placeholder="'DB-140'"
            required
          />
          <p class="mt-1 text-xs text-slate-600">
            {{ isNew ? t('masters.fields.codeNote') : t('masters.fields.codeLocked') }}
          </p>
        </div>
        <AppSelect
          id="item-category"
          v-model="form.category"
          :label="t('masters.fields.category')"
          :options="categoryOptions"
          required
        />
        <AppInput
          id="item-name"
          v-model="form.name"
          :label="t('masters.fields.name')"
          :error="errors.name"
          required
        />
        <div>
          <AppInput id="item-spec" v-model="form.spec" :label="t('masters.fields.spec')" />
          <p class="mt-1 text-xs text-slate-600">{{ t('masters.fields.specNote') }}</p>
        </div>
        <AppInput
          id="item-lot"
          v-model="form.lot"
          :label="t('masters.fields.lot')"
          :error="errors.lot"
          inputmode="numeric"
          required
        />
        <AppInput
          id="item-unit"
          v-model="form.unit"
          :label="t('masters.fields.unit')"
          :error="errors.unit"
          required
        />
        <AppInput
          id="item-price"
          v-model="form.price"
          :label="t('masters.fields.price')"
          :error="errors.price"
          inputmode="decimal"
          required
        />
        <div>
          <AppInput
            id="item-answer"
            v-model="form.answerCode"
            :label="t('masters.fields.answerCode')"
          />
          <p class="mt-1 text-xs text-slate-600">{{ t('masters.fields.answerNote') }}</p>
        </div>
        <AppSelect
          id="item-status"
          v-model="form.active"
          :label="t('masters.fields.status')"
          :options="statusOptions"
          required
        />
      </div>
      <div class="mt-4 flex flex-wrap justify-center gap-3">
        <AppButton variant="secondary" @click="close">{{ t('common.cancel') }}</AppButton>
        <AppButton variant="accent" :loading="saving" @click="save">{{
          t('common.save')
        }}</AppButton>
      </div>
    </div>

    <div class="overflow-x-auto rounded border border-slate-400 bg-white">
      <table class="w-full min-w-[1000px] border-collapse text-sm">
        <thead class="bg-slate-100">
          <tr>
            <th
              v-for="(head, index) in tm('masters.itemCols') as string[]"
              :key="index"
              class="border border-slate-300 px-2 py-2 text-left"
            >
              {{ head }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in masters.items"
            :key="item.code"
            :class="item.active ? '' : 'text-slate-400'"
          >
            <td class="border border-slate-300 px-2 py-2 font-mono">{{ item.code }}</td>
            <td class="border border-slate-300 px-2 py-2">
              {{ t(`masters.categories.${item.category}`) }}
            </td>
            <td class="border border-slate-300 px-2 py-2 font-bold">{{ item.name }}</td>
            <td class="border border-slate-300 px-2 py-2 text-xs">{{ item.spec }}</td>
            <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
              {{ item.lot.toLocaleString('ja-JP') }} {{ item.unit }}
            </td>
            <td class="border border-slate-300 px-2 py-2 text-right tabular-nums">
              {{ item.price.toLocaleString('ja-JP', { maximumFractionDigits: 2 }) }}
            </td>
            <td class="border border-slate-300 px-2 py-2 font-mono">
              {{ item.answerCode || '―' }}
            </td>
            <td
              class="border border-slate-300 px-2 py-2 text-center font-bold"
              :class="item.active ? 'text-green-800' : 'text-red-800'"
            >
              {{ item.active ? t('masters.activeStatus') : t('masters.stoppedStatus') }}
            </td>
            <td class="border border-slate-300 px-2 py-2 text-center whitespace-nowrap">
              <div class="flex justify-center gap-2">
                <AppButton variant="secondary" @click="openEdit(item)">{{
                  t('masters.edit')
                }}</AppButton>
                <AppButton variant="secondary" @click="toggle(item)">
                  {{ item.active ? t('masters.stop') : t('masters.resume') }}
                </AppButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="rounded border border-dashed border-amber-600 bg-amber-50 p-3 text-sm">
      <b>{{ t('masters.checkNote') }}</b> {{ t('masters.itemsCheck') }}
    </div>
  </section>
</template>
