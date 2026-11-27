<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    type?: string
    error?: string
    autocomplete?: string
    required?: boolean
    showToggle?: boolean
    dark?: boolean
    disabled?: boolean
    placeholder?: string
    inputmode?: 'numeric' | 'decimal' | 'text'
  }>(),
  {
    type: 'text',
    error: '',
    required: false,
    showToggle: false,
    dark: false,
    disabled: false,
    placeholder: undefined,
    inputmode: undefined,
  },
)

const { t } = useI18n()
const model = defineModel<string>({ default: '' })
const errorId = computed(() => `${props.id}-error`)

// Password fields can show or hide the typed text.
const revealed = ref(false)
const inputType = computed(() =>
  props.showToggle && props.type === 'password' && revealed.value ? 'text' : props.type,
)

const labelClass = computed(() =>
  props.dark ? 'text-sm font-semibold text-slate-200' : 'text-lg font-semibold',
)
const inputClass = computed(() => {
  const base =
    'min-h-12 w-full rounded-md border-2 px-3 py-2 text-lg focus:outline-none focus-visible:ring-4'
  if (props.dark) {
    const border = props.error ? 'border-red-400' : 'border-slate-600'
    return `${base} bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-blue-400 ${border}`
  }
  const border = props.error ? 'border-red-800' : 'border-slate-500'
  return `${base} focus-visible:ring-amber-400 ${border}`
})
const errorClass = computed(() => (props.dark ? 'text-sm text-red-300' : 'text-base text-red-900'))
const toggleClass = computed(() =>
  props.dark
    ? 'text-slate-300 hover:text-white focus-visible:ring-blue-400'
    : 'text-slate-700 hover:text-slate-900 focus-visible:ring-amber-400',
)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" :class="labelClass">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <div class="relative">
      <input
        :id="id"
        :value="model"
        :type="inputType"
        :autocomplete="autocomplete"
        :required="required"
        :disabled="disabled"
        :placeholder="placeholder"
        :inputmode="inputmode"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        :class="[inputClass, showToggle ? 'pr-14' : '']"
        @input="model = ($event.target as HTMLInputElement).value"
      />
      <button
        v-if="showToggle && type === 'password'"
        type="button"
        class="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center rounded-r-md px-3 focus:outline-none focus-visible:ring-4"
        :class="toggleClass"
        :aria-label="revealed ? t('common.hidePassword') : t('common.showPassword')"
        :aria-pressed="revealed"
        :aria-controls="id"
        @click="revealed = !revealed"
      >
        <svg
          v-if="!revealed"
          aria-hidden="true"
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <svg
          v-else
          aria-hidden="true"
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.6" />
          <path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.9 9.9 0 0 0 5.4-1.6" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      </button>
    </div>
    <p v-if="error" :id="errorId" :class="errorClass">{{ error }}</p>
  </div>
</template>
