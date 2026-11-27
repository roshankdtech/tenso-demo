<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ApiError, changePassword } from '@/api'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { describeError } from '@/i18n/errors'
import { useToast } from '@/composables/useToast'
import { roleHome, useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const current = ref('')
const next = ref('')
const confirm = ref('')
const formError = ref('')
const submitting = ref(false)
const errors = reactive<{ current: string; next: string; confirm: string }>({
  current: '',
  next: '',
  confirm: '',
})

const MIN_LENGTH = 8

function validate(): boolean {
  errors.current = current.value ? '' : t('password.errors.required')
  errors.next = next.value.length >= MIN_LENGTH ? '' : t('password.errors.tooShort')
  if (!errors.next && next.value === current.value) errors.next = t('password.errors.same')
  errors.confirm = confirm.value === next.value ? '' : t('password.errors.mismatch')
  return !errors.current && !errors.next && !errors.confirm
}

async function onSubmit(): Promise<void> {
  formError.value = ''
  if (!validate()) return
  submitting.value = true
  try {
    await changePassword(current.value, next.value)
    toast.show(t('password.saved'))
    const role = auth.role
    await router.push(role ? roleHome[role] : '/login')
  } catch (err) {
    // The server names the field and reason; show it on that field.
    if (err instanceof ApiError && err.code === 'wrongCurrent')
      errors.current = t('password.errors.wrongCurrent')
    else if (err instanceof ApiError && err.code === 'tooShort')
      errors.next = t('password.errors.tooShort')
    else if (err instanceof ApiError && err.code === 'same') errors.next = t('password.errors.same')
    else formError.value = describeError(err, t, 'errors.unexpected')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto flex max-w-md flex-col gap-4">
    <h1 class="text-2xl font-bold">{{ t('password.title') }}</h1>
    <p class="text-sm text-slate-700">{{ t('password.note') }}</p>

    <AppAlert v-if="formError" tone="error">{{ formError }}</AppAlert>

    <form
      class="flex flex-col gap-4 rounded-lg border border-slate-400 bg-white p-6 shadow"
      novalidate
      @submit.prevent="onSubmit"
    >
      <AppInput
        id="current-password"
        v-model="current"
        type="password"
        show-toggle
        autocomplete="current-password"
        :label="t('password.current')"
        :error="errors.current"
        required
      />
      <AppInput
        id="new-password"
        v-model="next"
        type="password"
        show-toggle
        autocomplete="new-password"
        :label="t('password.new')"
        :error="errors.next"
        required
      />
      <AppInput
        id="confirm-password"
        v-model="confirm"
        type="password"
        show-toggle
        autocomplete="new-password"
        :label="t('password.confirm')"
        :error="errors.confirm"
        required
      />
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="router.back()">{{ t('common.cancel') }}</AppButton>
        <AppButton type="submit" variant="accent" :loading="submitting">{{
          t('password.submit')
        }}</AppButton>
      </div>
    </form>
  </section>
</template>
