<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'accent'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
  }>(),
  { variant: 'primary', type: 'button', disabled: false, loading: false },
)

const variantClasses = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700',
  secondary: 'border border-slate-500 bg-white text-slate-900 hover:bg-slate-100',
  danger: 'bg-red-800 text-white hover:bg-red-900',
  accent: 'bg-blue-600 text-white hover:bg-blue-500',
}

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    class="inline-flex min-h-12 items-center justify-center rounded-md px-5 py-2 text-lg font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
    :class="variantClasses[variant]"
  >
    <slot />
  </button>
</template>
