import { describe, expect, it } from 'vitest'
import { csvField, csvFile } from './csv'
import type { Item, Order, Warehouse } from '@/types'

const items: Item[] = [
  {
    code: 'DB-080',
    category: '段ボール',
    name: '段ボール 80サイズ',
    spec: '',
    lot: 500,
    unit: '枚',
    price: 92,
    answerCode: 'AN-D0801',
    active: true,
  },
]
const warehouses: Warehouse[] = [
  {
    id: 'W02',
    name: '日野倉庫',
    destinationCode: 'T-1202',
    address: '',
    phone: '',
    receivingHours: '',
    deliveryConditions: '',
    answerCode: 'N-1202',
    customerCode: 'TS0001',
    shippingFee: 4200,
    active: true,
  },
]
const order: Order = {
  no: 'PO-2611-0031',
  warehouseId: 'W02',
  due: '2026-12-01',
  created: '11/26 08:42',
  status: '決裁済',
  round: 1,
  note: 'パレット納品希望, 至急',
  lines: [{ code: 'DB-080', qty: 1000 }],
  history: [],
  ownerId: 'hino-tanaka',
  ownerName: '日野倉庫 田中',
  proxy: false,
  proxyReason: '',
  proxyNotice: '',
  selfApproved: false,
  reason: '',
  decided: '2026/11/26',
  csvSent: true,
}

describe('csvField', () => {
  it('leaves plain values alone', () => {
    expect(csvField('段ボール')).toBe('段ボール')
  })
  it('quotes values with commas and doubles quotes inside them', () => {
    expect(csvField('a,"b"')).toBe('"a,""b"""')
  })
})

describe('csvFile', () => {
  it('writes a header and one row per line with CRLF endings', () => {
    const text = csvFile(order, items, warehouses)
    const [header, row, after] = text.split('\r\n')
    expect(header.startsWith('発注番号,行番号,発注日')).toBe(true)
    expect(row).toBe(
      'PO-2611-0031,1,2026/11/26,TS0001,T-1202,日野倉庫,2026/12/01,DB-080,段ボール 80サイズ,1000,枚,92,92000,日野倉庫,"パレット納品希望, 至急"',
    )
    expect(after).toBe('')
    expect(text.endsWith('\r\n')).toBe(true)
  })
})
