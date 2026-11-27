<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useMailbox } from '@/composables/useMailbox'
import type { MailMessage } from '@/api/mail'

const { t } = useI18n()
const mail = useMailbox(5000)

/** Messages that were new when this page opened are highlighted for this visit. */
const seenAtOpen = mail.seenId.value

/** The message open in the detail view, or null for the list. */
const openId = ref<number | null>(null)
const openMessage = computed<MailMessage | null>(
  () => mail.messages.value.find((m) => m.id === openId.value) ?? null,
)

// Anything that arrives while the page is open is read straight away.
watch(mail.messages, () => mail.markAllRead())

function open(message: MailMessage): void {
  openId.value = message.id
}

function back(): void {
  openId.value = null
}

function isNew(message: MailMessage): boolean {
  return message.id > seenAtOpen
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold">{{ t('mail.title') }}</h1>
    <AppAlert tone="info">{{ t('mail.note') }} {{ t('mail.live') }}</AppAlert>
    <AppAlert v-if="mail.error.value" tone="error">{{ t('errors.network') }}</AppAlert>

    <!-- Detail: one message in full -->
    <div v-if="openMessage" class="rounded border border-slate-400 bg-white shadow">
      <div class="flex items-center justify-between gap-3 border-b border-slate-300 p-4">
        <AppButton variant="secondary" @click="back">{{ t('mail.back') }}</AppButton>
      </div>
      <div class="flex flex-col gap-3 p-4">
        <h2 class="text-xl font-bold">{{ openMessage.subject }}</h2>
        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-slate-700">
          <dt class="font-bold">{{ t('mail.to') }}</dt>
          <dd class="font-mono">{{ openMessage.to }}</dd>
          <dt class="font-bold">{{ t('mail.time') }}</dt>
          <dd class="tabular-nums">{{ openMessage.at }}</dd>
        </dl>
        <p class="whitespace-pre-wrap border-t border-slate-200 pt-4 text-base leading-relaxed">
          {{ openMessage.body }}
        </p>
      </div>
    </div>

    <!-- List: subjects only, newest first -->
    <ul
      v-else
      class="divide-y divide-slate-300 overflow-hidden rounded border border-slate-400 bg-white"
    >
      <li v-for="message in mail.messages.value" :key="message.id">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
          :class="isNew(message) ? 'bg-amber-50' : ''"
          @click="open(message)"
        >
          <span class="flex min-w-0 items-center gap-2">
            <span
              v-if="isNew(message)"
              class="shrink-0 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-white"
            >
              {{ t('mail.new') }}
            </span>
            <span class="truncate" :class="isNew(message) ? 'font-bold' : ''">{{
              message.subject
            }}</span>
          </span>
          <span class="shrink-0 text-sm tabular-nums text-slate-600">{{ message.at }}</span>
        </button>
      </li>
      <li v-if="!mail.messages.value.length" class="px-4 py-6 text-center text-slate-600">
        {{ t('common.noData') }}
      </li>
    </ul>
  </section>
</template>
