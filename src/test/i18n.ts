import { createI18n } from 'vue-i18n'
import { ja } from '@/i18n/ja'

/** Translations for component tests. */
export const testI18n = createI18n({ legacy: false, locale: 'ja', messages: { ja } })
