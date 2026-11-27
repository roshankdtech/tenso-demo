import { describe, expect, it } from 'vitest'

const t = (key: string, params?: Record<string, string | number>) =>
  testI18n.global.t(key, params ?? {})
import { lineError, orderAmount } from './orders'
import { testI18n } from '@/test/i18n'
import type { Item } from '@/types'

const box: Item = {
  code: 'DB-080',
  category: '段ボール',
  name: '段ボール 80サイズ',
  spec: '',
  lot: 500,
  unit: '枚',
  price: 92,
  answerCode: '',
  active: true,
}

describe('lineError', () => {
  it('needs an item and a whole, positive quantity', () => {
    expect(lineError({ code: 'DB-080', qty: '' }, undefined, 'multiple', t)).toBe(
      '品目を選んでください',
    )
    expect(lineError({ code: 'DB-080', qty: '' }, box, 'multiple', t)).toBe(
      '数量を入力してください',
    )
    expect(lineError({ code: 'DB-080', qty: '0' }, box, 'multiple', t)).toBe(
      '数量を入力してください',
    )
  })
  it('requires multiples of the lot in multiple mode', () => {
    expect(lineError({ code: 'DB-080', qty: '1000' }, box, 'multiple', t)).toBe('')
    expect(lineError({ code: 'DB-080', qty: '750' }, box, 'multiple', t)).toBe(
      '500枚単位で入力してください',
    )
  })
  it('requires at least the lot in min mode', () => {
    expect(lineError({ code: 'DB-080', qty: '750' }, box, 'min', t)).toBe('')
    expect(lineError({ code: 'DB-080', qty: '300' }, box, 'min', t)).toBe(
      '最低ロット500枚以上で入力してください',
    )
  })
})

describe('orderAmount', () => {
  it('adds up the valid lines and skips unknown items', () => {
    expect(
      orderAmount(
        [
          { code: 'DB-080', qty: 1000 },
          { code: 'NOPE', qty: 5 },
        ],
        [box],
      ),
    ).toBe(92000)
  })
})
