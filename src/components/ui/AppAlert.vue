<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ tone?: 'error' | 'success' | 'info' }>(), {
  tone: 'info',
})

const toneClasses = {
  error: 'border-red-800 bg-red-50 text-red-900',
  success: 'border-green-800 bg-green-50 text-green-900',
  info: 'border-slate-500 bg-slate-100 text-slate-900',
}

const role = computed(() => (props.tone === 'error' ? 'alert' : 'status'))
</script>

<template>
  <div :role="role" class="rounded-md border-2 px-4 py-3 text-lg" :class="toneClasses[tone]">
    <slot />
  </div>
</template>
