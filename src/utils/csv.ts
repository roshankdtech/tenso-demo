import type { Item, Order, Warehouse } from '@/types'
import { slashDate, todayIso } from './dates'

/** Customer code sent to Answer. Matches the prototype's sample; confirm with Kumon. */
export const CUSTOMER_CODE = 'TS0001'

/** The CSV columns, in order. Items marked as such are still to be confirmed with Kumon. */
export const CSV_COLUMNS = [
  '発注番号',
  '行番号',
  '発注日',
  '得意先コード',
  '届け先コード',
  '届け先名',
  '納品希望日',
  '品目コード',
  '品名',
  '数量',
  '単位',
  '単価',
  '金額',
  '申請倉庫',
  '備考',
] as const

/** Quotes a value when it contains a comma, quote or line break. */
export function csvField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** One CSV row per order line, following CSV_COLUMNS. */
export function csvRows(order: Order, items: Item[], warehouses: Warehouse[]): string[] {
  const warehouse = warehouses.find((w) => w.id === order.warehouseId)
  if (!warehouse) return []
  return order.lines.flatMap((line, index) => {
    const item = items.find((i) => i.code === line.code)
    if (!item) return []
    const values = [
      order.no,
      index + 1,
      order.decided || slashDate(todayIso()),
      CUSTOMER_CODE,
      warehouse.destinationCode,
      warehouse.name,
      slashDate(order.due),
      item.code,
      item.name,
      line.qty,
      item.unit,
      item.price,
      Math.round(item.price * line.qty),
      warehouse.name,
      order.note,
    ]
    return [values.map(csvField).join(',')]
  })
}

/** Full CSV file text for one order, with header and CRLF line endings. */
export function csvFile(order: Order, items: Item[], warehouses: Warehouse[]): string {
  const header = CSV_COLUMNS.join(',')
  return [header, ...csvRows(order, items, warehouses)].join('\r\n') + '\r\n'
}

/** File name for one order's CSV, e.g. order_PO-2611-0031.csv. */
export function csvFileName(order: Order): string {
  return `order_${order.no}.csv`
}
