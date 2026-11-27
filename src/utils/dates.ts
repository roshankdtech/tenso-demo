/** Today as YYYY-MM-DD in local time. */
export function todayIso(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Shows a YYYY-MM-DD date in the given language, e.g. 2026年11月27日 or Nov 27, 2026. Returns the input if it isn't a date. */
export function formatDate(iso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const tag = locale === 'ja' ? 'ja-JP' : 'en-US'
  return date.toLocaleDateString(tag, { year: 'numeric', month: 'long', day: 'numeric' })
}

/** Short form used in lists, e.g. 12/1. */
export function shortDate(iso: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso)
  return match ? `${Number(match[1])}/${Number(match[2])}` : iso
}

/** Slash form used in the CSV and approval records, e.g. 2026/12/01. */
export function slashDate(iso: string): string {
  return iso.replace(/-/g, '/')
}

/** The date `days` after the given YYYY-MM-DD date. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
