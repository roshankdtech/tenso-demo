<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const { t } = useI18n()
</script>

<template>
  <main class="p-6">
    <h1 class="text-3xl font-bold">{{ t('notFound.title') }}</h1>
    <RouterLink class="mt-4 inline-block underline" to="/login">{{
      t('notFound.goToLogin')
    }}</RouterLink>
  </main>
</template>
