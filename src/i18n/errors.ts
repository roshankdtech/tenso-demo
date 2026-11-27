import { ApiError } from '@/api'

type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * Turns an error into a message for the user.
 * Status-based messages come from the translation files. For validation errors (422)
 * the server's own message is shown as it is sent.
 */
export function describeError(err: unknown, t: Translate, fallbackKey: string): string {
  if (!(err instanceof ApiError)) return t(fallbackKey)

  switch (err.status) {
    case 0:
      return t('errors.network')
    case 401:
      return t('errors.session')
    case 403:
      return t('errors.forbidden')
    case 404:
      return t('errors.notFound')
    case 422:
      if (err.code) return t(`serverErrors.${err.code}`, err.params ?? {})
      return err.message || t('errors.invalid')
  }
  return err.status >= 500 ? t('errors.server') : t(fallbackKey)
}
