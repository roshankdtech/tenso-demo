<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const toast = useToast()
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="pointer-events-none fixed bottom-5 left-1/2 z-30 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded bg-slate-800 px-4 py-2 text-sm text-white shadow-lg transition-opacity"
    :class="toast.visible.value ? 'opacity-100' : 'opacity-0'"
  >
    {{ toast.message.value }}
  </div>
</template>
