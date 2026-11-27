<script setup lang="ts">
import { computed } from 'vue'
import type { SelectOption } from '@/types'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    options: SelectOption[]
    error?: string
    required?: boolean
    placeholder?: string
  }>(),
  { error: '', required: false, placeholder: 'Choose…' },
)

const model = defineModel<string>({ default: '' })
const errorId = computed(() => `${props.id}-error`)
</script>

<template>
  <div class="flex flex-col gap-1">
    <label :for="id" class="text-lg font-semibold">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <select
      :id="id"
      v-model="model"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? errorId : undefined"
      class="min-h-12 rounded-md border-2 bg-white px-3 py-2 text-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
      :class="error ? 'border-red-800' : 'border-slate-500'"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" :id="errorId" class="text-base text-red-900">{{ error }}</p>
  </div>
</template>
