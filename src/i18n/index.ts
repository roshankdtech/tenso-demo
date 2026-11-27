import { createI18n } from 'vue-i18n'
import { en } from './en'
import { ja } from './ja'

export type Locale = 'en' | 'ja'

/** The language screens start in. Users can switch; the choice is remembered in this browser. */
export const DEFAULT_LOCALE: Locale = 'en'

const STORAGE_KEY = 'tenso.locale'

function savedLocale(): Locale {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'ja' || value === 'en' ? value : DEFAULT_LOCALE
  } catch {
    // Private windows and blocked storage: fall back to the default.
    return DEFAULT_LOCALE
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: { en, ja },
})

/** Switches the language, keeps it for next time, and sets the page language. */
export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Storage unavailable: the switch still works for this visit.
  }
}

document.documentElement.lang = i18n.global.locale.value

/** Browser locale tag used for date and number formatting. */
export function localeTag(locale: string): string {
  return locale === 'ja' ? 'ja-JP' : 'en-US'
}
