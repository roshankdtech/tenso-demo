<script setup lang="ts">
import type { BadgeTone } from '@/types'

withDefaults(defineProps<{ tone?: BadgeTone }>(), { tone: 'neutral' })

// Badges always show a text label (slot), never colour alone.
const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-200 text-slate-900',
  info: 'bg-blue-100 text-blue-900',
  success: 'bg-green-100 text-green-900',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-900',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-3 py-1 text-base font-semibold"
    :class="toneClasses[tone]"
  >
    <slot />
  </span>
</template>
