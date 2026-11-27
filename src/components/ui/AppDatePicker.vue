<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Date (YYYY-MM-DD) or month (YYYY-MM) field with a Japanese calendar popup.
 * The text box stays typeable, so values can also be entered by hand.
 */
const props = withDefaults(
  defineProps<{
    id: string
    label: string
    mode?: 'date' | 'month'
    error?: string
    required?: boolean
  }>(),
  { mode: 'date', error: '', required: false },
)

const model = defineModel<string>({ default: '' })

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth() + 1)

const { t, tm } = useI18n()
const WEEKDAYS = computed(() => tm('datePicker.weekdays') as string[])
const MONTH_NAMES = computed(() => tm('datePicker.monthNames') as string[])
const YEAR_SUFFIX = computed(() => t('datePicker.yearSuffix'))
const errorId = computed(() => `${props.id}-error`)
const placeholder = computed(() => (props.mode === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'))
// Years offered in the dropdown: 20 years either side of today, plus the year on view if it is outside that.
const yearOptions = computed<number[]>(() => {
  const now = new Date().getFullYear()
  const years = new Set<number>()
  for (let y = now - 20; y <= now + 20; y++) years.add(y)
  years.add(viewYear.value)
  return [...years].sort((a, b) => a - b)
})
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const pad = (n: number): string => String(n).padStart(2, '0')

/** The selected value split into parts, or null when the text is not a complete date/month. */
function selectedParts(): { y: number; m: number; d: number | null } | null {
  const value = model.value
  if (props.mode === 'month') {
    const match = /^(\d{4})-(\d{2})$/.exec(value)
    return match ? { y: Number(match[1]), m: Number(match[2]), d: null } : null
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) } : null
}

const panel = ref<HTMLElement | null>(null)
/** The day that has keyboard focus in the popup (roving focus: only this day is in the Tab order). */
const focusDay = ref(1)

// When the popup opens, show the month of the current value (or today), and focus that day.
watch(open, (isOpen) => {
  if (!isOpen) return
  const parts = selectedParts()
  const now = new Date()
  viewYear.value = parts?.y ?? now.getFullYear()
  viewMonth.value = parts?.m ?? now.getMonth() + 1
  const sameMonth = viewYear.value === now.getFullYear() && viewMonth.value === now.getMonth() + 1
  focusDay.value = parts?.d ?? (sameMonth ? now.getDate() : 1)
  void focusOn(focusDay.value)
})

function daysIn(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function focusOn(day: number): Promise<void> {
  return nextTick(() => {
    panel.value?.querySelector<HTMLButtonElement>(`[data-day="${day}"]`)?.focus()
  })
}

/**
 * Arrow keys move through the days: left/right by one day, up/down by one week.
 * Moving past the end or start of the month moves to the next or previous month.
 */
function onPanelKey(event: KeyboardEvent): void {
  if (props.mode !== 'date') return
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
  const step = steps[event.key]
  if (step === undefined) return
  event.preventDefault()

  let day = focusDay.value + step
  if (day < 1) {
    shift(-1)
    day += daysIn(viewYear.value, viewMonth.value)
  } else if (day > daysIn(viewYear.value, viewMonth.value)) {
    day -= daysIn(viewYear.value, viewMonth.value)
    shift(1)
  }
  focusDay.value = day
  void focusOn(day)
}

/** Day cells for the month on view: null for the blank cells before the 1st. */
const dayCells = computed<(number | null)[]>(() => {
  const first = new Date(viewYear.value, viewMonth.value - 1, 1).getDay()
  const days = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: first }, () => null)
  for (let day = 1; day <= days; day++) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
})

function shift(step: number): void {
  if (props.mode === 'month') {
    viewYear.value += step
    return
  }
  const next = viewMonth.value - 1 + step
  viewYear.value += Math.floor(next / 12)
  viewMonth.value = (((next % 12) + 12) % 12) + 1
}

function pickDay(day: number): void {
  model.value = `${viewYear.value}-${pad(viewMonth.value)}-${pad(day)}`
  open.value = false
}

function pickMonth(month: number): void {
  model.value = `${viewYear.value}-${pad(month)}`
  open.value = false
}

function pickToday(): void {
  const now = new Date()
  if (props.mode === 'month') {
    model.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  } else {
    model.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  }
  open.value = false
}

function clearValue(): void {
  model.value = ''
  open.value = false
}

function isSelectedDay(day: number): boolean {
  const parts = selectedParts()
  return !!parts && parts.y === viewYear.value && parts.m === viewMonth.value && parts.d === day
}

function isSelectedMonth(month: number): boolean {
  const parts = selectedParts()
  return !!parts && parts.y === viewYear.value && parts.m === month
}

function onDocumentPointerDown(event: MouseEvent): void {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentPointerDown))
</script>

<template>
  <div ref="root" class="flex flex-col gap-1.5" @keydown.esc="open = false">
    <label :for="id" class="text-lg font-semibold">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>

    <div class="relative">
      <input
        :id="id"
        v-model="model"
        type="text"
        inputmode="numeric"
        :placeholder="placeholder"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        class="min-h-12 w-full rounded-md border-2 py-2 pl-3 pr-12 text-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
        :class="error ? 'border-red-800' : 'border-slate-500'"
      />
      <button
        type="button"
        class="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-r-md px-3 text-slate-700 hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
        :aria-label="t('datePicker.open')"
        :aria-expanded="open"
        aria-haspopup="dialog"
        @click="open = !open"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-6 w-6"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      <div
        v-if="open"
        ref="panel"
        role="dialog"
        :aria-label="t('datePicker.dialog')"
        @keydown="onPanelKey"
        class="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-slate-300 bg-white p-3 text-slate-900 shadow-xl"
      >
        <div class="mb-2 flex items-center justify-between">
          <button
            type="button"
            class="min-h-10 min-w-10 rounded-md text-xl hover:bg-slate-100"
            :aria-label="mode === 'month' ? t('datePicker.prevYear') : t('datePicker.prevMonth')"
            @click="shift(-1)"
          >
            ‹
          </button>
          <div class="flex items-center gap-1">
            <select
              v-model.number="viewYear"
              :aria-label="t('datePicker.year')"
              class="min-h-10 rounded-md border border-slate-300 bg-white px-2 text-base"
            >
              <option v-for="year in yearOptions" :key="year" :value="year">
                {{ year }}{{ YEAR_SUFFIX }}
              </option>
            </select>
            <select
              v-if="mode === 'date'"
              v-model.number="viewMonth"
              :aria-label="t('datePicker.month')"
              class="min-h-10 rounded-md border border-slate-300 bg-white px-2 text-base"
            >
              <option v-for="month in MONTHS" :key="month" :value="month">
                {{ MONTH_NAMES[month - 1] }}
              </option>
            </select>
          </div>
          <button
            type="button"
            class="min-h-10 min-w-10 rounded-md text-xl hover:bg-slate-100"
            :aria-label="mode === 'month' ? t('datePicker.nextYear') : t('datePicker.nextMonth')"
            @click="shift(1)"
          >
            ›
          </button>
        </div>

        <template v-if="mode === 'date'">
          <div class="grid grid-cols-7 text-center text-sm text-slate-600">
            <span v-for="weekday in WEEKDAYS" :key="weekday" class="py-1">{{ weekday }}</span>
          </div>
          <div class="grid grid-cols-7 gap-1 text-center">
            <template v-for="(day, index) in dayCells" :key="index">
              <span v-if="day === null"></span>
              <button
                v-else
                type="button"
                :data-day="day"
                :tabindex="day === focusDay ? 0 : -1"
                class="min-h-9 rounded-md text-base hover:bg-slate-100"
                :class="isSelectedDay(day) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''"
                :aria-pressed="isSelectedDay(day)"
                @focus="focusDay = day"
                @click="pickDay(day)"
              >
                {{ day }}
              </button>
            </template>
          </div>
        </template>

        <div v-else class="grid grid-cols-3 gap-2 text-center">
          <button
            v-for="month in 12"
            :key="month"
            type="button"
            class="min-h-10 rounded-md text-base hover:bg-slate-100"
            :class="isSelectedMonth(month) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''"
            :aria-pressed="isSelectedMonth(month)"
            @click="pickMonth(month)"
          >
            {{ MONTH_NAMES[month - 1] }}
          </button>
        </div>

        <div class="mt-3 flex justify-between border-t border-slate-200 pt-2 text-sm">
          <button type="button" class="rounded-md px-2 py-1 hover:bg-slate-100" @click="clearValue">
            {{ t('datePicker.clear') }}
          </button>
          <button type="button" class="rounded-md px-2 py-1 hover:bg-slate-100" @click="pickToday">
            {{ t('datePicker.today') }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="error" :id="errorId" class="text-base text-red-900">{{ error }}</p>
  </div>
</template>
