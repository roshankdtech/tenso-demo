/** Saves text as a file. A UTF-8 byte-order mark is added so Excel opens Japanese text correctly. */
export function downloadText(filename: string, text: string): void {
  const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Shows the amount in yen with thousands separators, e.g. 92,000. */
export function yen(amount: number): string {
  return Math.round(amount).toLocaleString('ja-JP')
}
