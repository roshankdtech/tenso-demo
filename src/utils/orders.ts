import type { Item, Order, OrderLine, OrderStatus } from '@/types'

export type LotMode = 'multiple' | 'min'

/** Price for one line, in yen. Rounded to the whole yen as on the CSV. */
export function lineAmount(item: Item, qty: number): number {
  return Math.round(item.price * qty)
}

/** Total of the lines that have a valid item and quantity. */
export function orderAmount(lines: OrderLine[], items: Item[]): number {
  return lines.reduce((sum, line) => {
    const item = items.find((i) => i.code === line.code)
    return item ? sum + lineAmount(item, line.qty) : sum
  }, 0)
}

/** Message for a bad quantity or item, or '' when the line is valid. `t` is the app's translate function. */
export function lineError(
  line: { code: string; qty: string | number },
  item: Item | undefined,
  lotMode: LotMode,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!item) return t('form.lineItem')
  const text = String(line.qty)
  const qty = Number(text)
  if (text === '' || !Number.isInteger(qty) || qty <= 0) return t('form.lineQty')
  if (lotMode === 'multiple' && qty % item.lot !== 0) {
    return t('form.lineLotMultiple', { lot: item.lot.toLocaleString(), unit: item.unit })
  }
  if (lotMode === 'min' && qty < item.lot) {
    return t('form.lineLotMin', { lot: item.lot.toLocaleString(), unit: item.unit })
  }
  return ''
}

export function statusTone(
  status: OrderStatus,
): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case '進行中':
      return 'info'
    case '差し戻し':
      return 'warning'
    case '決裁済':
      return 'success'
    case '却下':
      return 'danger'
    default:
      return 'neutral'
  }
}

/** The item names of an order, joined for the list's sub-line. */
export function itemNames(order: Order, items: Item[]): string {
  return order.lines
    .map((line) => items.find((i) => i.code === line.code)?.name ?? line.code)
    .join('、')
}

/** The last history entry that has a comment and was not written by the system. */
export function lastComment(order: Order): HistoryEntryLike | null {
  for (let i = order.history.length - 1; i >= 0; i--) {
    const entry = order.history[i]
    if (entry.reason && entry.by !== 'システム') return entry
  }
  return null
}

type HistoryEntryLike = { by: string; reason?: string }

/** The last approval action (not the submission), for the approval status box. */
export function lastDecision(order: Order) {
  for (let i = order.history.length - 1; i >= 0; i--) {
    const entry = order.history[i]
    if (entry.action !== '申請' && entry.action !== '再申請') return entry
  }
  return null
}
