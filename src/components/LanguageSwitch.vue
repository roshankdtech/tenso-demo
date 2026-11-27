<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import type { Locale } from '@/i18n'

const { t, locale } = useI18n()

const options = computed<{ value: Locale; label: string }[]>(() => [
  { value: 'en', label: t('common.english') },
  { value: 'ja', label: t('common.japanese') },
])
</script>

<template>
  <div
    class="inline-flex overflow-hidden rounded border border-slate-500 text-sm"
    role="group"
    :aria-label="t('common.language')"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="px-3 py-1"
      :class="
        locale === option.value
          ? 'bg-slate-900 font-bold text-white'
          : 'bg-white text-slate-800 hover:bg-slate-100'
      "
      :aria-pressed="locale === option.value"
      @click="setLocale(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
