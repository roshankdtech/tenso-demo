import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type {
  Account,
  HistoryEntry,
  Item,
  Order,
  OrderLine,
  OrderStatus,
  Role,
  SendLogEntry,
  User,
  Warehouse,
} from './src/types/index.ts'

// Dev-only stand-in for the Django API, used until the backend is running.
// Enabled when VITE_MOCK_API=true (see .env.development). Sample data is the prototype's.

const SESSION_COOKIE = 'mock_session'
const CUSTOMER_CODE = 'TS0001'
const APPROVER = 'tenso 髙橋'

// ----- sample master data -----

const items: Item[] = [
  item(
    'DB-060',
    '段ボール',
    '段ボール 60サイズ',
    'A式 260×180×100 K5×K5 Bフルート',
    500,
    68,
    'AN-D0601',
  ),
  item(
    'DB-080',
    '段ボール',
    '段ボール 80サイズ',
    'A式 330×250×180 K5×K5 Bフルート',
    500,
    92,
    'AN-D0801',
  ),
  item(
    'DB-100',
    '段ボール',
    '段ボール 100サイズ',
    'A式 400×300×250 K5×K5 Aフルート',
    300,
    128,
    'AN-D1001',
  ),
  item(
    'DB-120',
    '段ボール',
    '段ボール 120サイズ',
    'A式 480×350×330 K6×K6 Aフルート',
    200,
    165,
    'AN-D1201',
  ),
  item(
    'DB-TCB',
    '段ボール',
    'トレカ挟み込み用 段ボール板',
    '板 100×150 Eフルート（トレカ挟み込み用）',
    1000,
    18,
    'AN-B0101',
  ),
  item(
    'DB-REC',
    '段ボール',
    'レコード用 段ボール板',
    '板 320×320 Bフルート（レコード用）',
    500,
    24,
    'AN-B0201',
  ),
  item(
    'LB-TH1',
    'ラベル',
    'サーマルラベル 100×150',
    'サーマル 100×150 1巻1,000枚',
    68000,
    3.13,
    'AN-L0101',
  ),
  item('LB-CL1', 'ラベル', 'カラーラベル', 'カラー 70×50 1巻2,000枚', 10000, 4.2, 'AN-L0201'),
  item('BG-PEM', '袋類', '宅配用ポリ袋 M', '宅配用ポリ袋 M 250×350+50', 1000, 9.5, 'AN-P0101'),
  item('BG-PEL', '袋類', '宅配用ポリ袋 L', '宅配用ポリ袋 L 320×450+50', 1000, 12, 'AN-P0201'),
]

function item(
  code: string,
  category: Item['category'],
  name: string,
  spec: string,
  lot: number,
  price: number,
  answerCode: string,
): Item {
  return { code, category, name, spec, lot, unit: '枚', price, answerCode, active: true }
}

const warehouses: Warehouse[] = [
  wh(
    'W01',
    '足立倉庫',
    'T-1201',
    '東京都足立区○○1-2-3（住所は例）',
    '03-0000-0101',
    '9:00〜16:00',
    'パレット納品',
    'N-1201',
    3500,
  ),
  wh(
    'W02',
    '日野倉庫',
    'T-1202',
    '東京都日野市○○4-5-6（住所は例）',
    '042-000-0102',
    '9:00〜15:00',
    'パレット納品',
    'N-1202',
    4200,
  ),
  wh(
    'W03',
    '草加倉庫',
    'T-1203',
    '埼玉県草加市○○7-8-9（住所は例）',
    '048-000-0103',
    '10:00〜16:00',
    'パレット納品',
    'N-1203',
    3500,
  ),
  wh(
    'W04',
    '厚木倉庫',
    'T-1204',
    '神奈川県厚木市○○1-1-1（住所は例）',
    '046-000-0104',
    '9:00〜16:00',
    'パレット納品（指定パレットへ積替え）',
    'N-1204',
    4800,
  ),
  wh(
    'W05',
    '春日部倉庫',
    'T-1205',
    '埼玉県春日部市○○2-2-2（住所は例）',
    '048-000-0105',
    '9:00〜15:30',
    'パレット納品',
    'N-1205',
    3800,
  ),
]

function wh(
  id: string,
  name: string,
  destinationCode: string,
  address: string,
  phone: string,
  receivingHours: string,
  deliveryConditions: string,
  answerCode: string,
  shippingFee: number,
): Warehouse {
  return {
    id,
    name,
    destinationCode,
    address,
    phone,
    receivingHours,
    deliveryConditions,
    answerCode,
    customerCode: CUSTOMER_CODE,
    shippingFee,
    active: true,
  }
}

type StoredAccount = Account & { password: string; label: string; mailAddress: string }

const accounts: StoredAccount[] = [
  acct('adachi-sato', 'warehouse', 'W01', '佐藤', 'sato.adachi@example.jp', '11/26 09:58'),
  acct('adachi-suzuki', 'warehouse', 'W01', '鈴木', 'suzuki.adachi@example.jp', '11/25 11:02'),
  acct('hino-tanaka', 'warehouse', 'W02', '田中', 'tanaka.hino@example.jp', '11/26 08:40'),
  acct('soka-ito', 'warehouse', 'W03', '伊藤', 'ito.soka@example.jp', '11/26 09:12'),
  acct('atsugi-watanabe', 'warehouse', 'W04', '渡辺', 'watanabe.atsugi@example.jp', '11/25 16:28'),
  acct(
    'atsugi-kobayashi',
    'warehouse',
    'W04',
    '小林',
    'kobayashi.atsugi@example.jp',
    '10/31 15:00',
    '停止',
  ),
  acct(
    'kasukabe-yamamoto',
    'warehouse',
    'W05',
    '山本',
    'yamamoto.kasukabe@example.jp',
    '11/25 08:47',
  ),
  acct('tenso-takahashi', 'approver', null, APPROVER, 'takahashi@example.jp', '11/26 10:05'),
  acct(
    'tenso-dairi',
    'approver',
    null,
    'tenso 代理承認者（例）',
    'dairi@example.jp',
    '11/20 17:02',
    'ロック中',
  ),
  acct('kumon-admin', 'admin', null, '久門紙器工業 管理者', 'edi-admin@example.jp', '11/26 10:20'),
]

function acct(
  id: string,
  role: Role,
  warehouseId: string | null,
  person: string,
  mail: string,
  lastLogin: string,
  status: Account['status'] = '有効',
): StoredAccount {
  const warehouse = warehouseId ? warehouses.find((w) => w.id === warehouseId) : undefined
  const label =
    role === 'warehouse'
      ? `${warehouse?.name ?? ''} ${person}`
      : role === 'approver'
        ? `${person}（承認者）`
        : person
  return {
    id,
    person,
    role,
    warehouseId,
    mail,
    lastLogin,
    passwordSet: true,
    status,
    password: 'password',
    label,
    mailAddress: mail,
  }
}

// ----- sample orders (from the prototype) -----

const orders: Order[] = [
  order(
    'PO-2611-0031',
    'W02',
    '2026-12-01',
    '11/26 08:42',
    '進行中',
    [l('DB-080', 1000), l('BG-PEM', 2000)],
    'hino-tanaka',
    { history: [h('11/26 08:42', '申請', '日野倉庫 田中')] },
  ),
  order(
    'PO-2611-0032',
    'W03',
    '2026-12-02',
    '11/26 09:15',
    '進行中',
    [l('LB-TH1', 68000)],
    'soka-ito',
    { history: [h('11/26 09:15', '申請', '草加倉庫 伊藤')] },
  ),
  order(
    'PO-2611-0030',
    'W04',
    '2026-12-01',
    '11/25 16:30',
    '進行中',
    [l('DB-060', 1500), l('DB-100', 300)],
    'atsugi-watanabe',
    { note: 'パレット納品希望', history: [h('11/25 16:30', '申請', '厚木倉庫 渡辺')] },
  ),
  order(
    'PO-2611-0029',
    'W01',
    '2026-12-02',
    '11/25 11:05',
    '差し戻し',
    [l('DB-120', 400), l('DB-TCB', 1000)],
    'adachi-suzuki',
    {
      reason:
        'Cannot receive on 12/2. Please change the delivery date to 12/3 or later and resubmit.',
      history: [
        h('11/25 11:05', '申請', '足立倉庫 鈴木'),
        h(
          '11/25 15:40',
          '差し戻し',
          APPROVER,
          'Cannot receive on 12/2. Please change the delivery date to 12/3 or later and resubmit.',
        ),
      ],
    },
  ),
  order(
    'PO-2611-0027',
    'W01',
    '2026-11-27',
    '11/24 09:20',
    '決裁済',
    [l('DB-060', 1000), l('LB-CL1', 10000)],
    'adachi-sato',
    {
      decided: '2026/11/24',
      history: [h('11/24 09:20', '申請', '足立倉庫 佐藤'), h('11/24 10:05', '決裁', APPROVER)],
    },
  ),
  order(
    'PO-2611-0028',
    'W05',
    '2026-11-28',
    '11/25 08:50',
    '決裁済',
    [l('BG-PEL', 3000), l('DB-080', 500)],
    'kasukabe-yamamoto',
    {
      decided: '2026/11/25',
      history: [h('11/25 08:50', '申請', '春日部倉庫 山本'), h('11/25 10:02', '決裁', APPROVER)],
    },
  ),
  order(
    'PO-2611-0033',
    'W01',
    '2026-12-05',
    '11/26 09:58',
    '下書き',
    [l('BG-PEL', 1000)],
    'adachi-sato',
    {},
  ),
  order(
    'PO-2611-0034',
    'W01',
    '2026-12-04',
    '11/26 08:30',
    '進行中',
    [l('BG-PEM', 2000)],
    'tenso-takahashi',
    {
      proxy: true,
      proxyReason: '足立倉庫の佐藤様から電話で依頼を受けたため',
      proxyNotice: '11/26 08:30 足立倉庫 佐藤・鈴木へメールで通知',
      history: [
        h(
          '11/26 08:30',
          '代理申請',
          'tenso 髙橋（足立倉庫の代理）',
          '足立倉庫の佐藤様から電話で依頼を受けたため',
        ),
        h('11/26 08:30', '倉庫へ通知', 'システム', '足立倉庫 佐藤・鈴木へメール'),
      ],
    },
  ),
  order(
    'PO-2611-0021',
    'W01',
    '2026-11-19',
    '11/18 09:00',
    '決裁済',
    [l('DB-080', 1500), l('BG-PEM', 3000)],
    'adachi-suzuki',
    {
      decided: '2026/11/18',
      history: [h('11/18 09:00', '申請', '足立倉庫 鈴木'), h('11/18 10:10', '決裁', APPROVER)],
    },
  ),
  order(
    'PO-2611-0014',
    'W02',
    '2026-11-12',
    '11/11 13:20',
    '決裁済',
    [l('DB-060', 2000), l('LB-TH1', 68000)],
    'hino-tanaka',
    {
      decided: '2026/11/11',
      history: [h('11/11 13:20', '申請', '日野倉庫 田中'), h('11/11 15:02', '決裁', APPROVER)],
    },
  ),
  order(
    'PO-2611-0019',
    'W03',
    '2026-11-17',
    '11/14 10:00',
    '決裁済',
    [l('DB-100', 600), l('BG-PEL', 2000)],
    'soka-ito',
    { decided: '2026/11/14' },
  ),
  order(
    'PO-2611-0009',
    'W04',
    '2026-11-08',
    '11/06 09:30',
    '決裁済',
    [l('DB-120', 400), l('DB-REC', 1000)],
    'atsugi-kobayashi',
    { decided: '2026/11/06' },
  ),
  order(
    'PO-2611-0017',
    'W05',
    '2026-11-14',
    '11/12 15:10',
    '決裁済',
    [l('DB-060', 1000)],
    'kasukabe-yamamoto',
    { decided: '2026/11/12' },
  ),
  order(
    'PO-2611-0024',
    'W03',
    '2026-11-20',
    '11/19 16:40',
    '却下',
    [l('LB-CL1', 10000)],
    'soka-ito',
    {
      reason: 'Duplicate request, cancelled',
      history: [
        h('11/19 16:40', '申請', '草加倉庫 伊藤'),
        h('11/20 09:10', '却下', APPROVER, 'Duplicate request, cancelled'),
      ],
    },
  ),
]

function l(code: string, qty: number): OrderLine {
  return { code, qty }
}

function h(at: string, action: string, by: string, reason?: string): HistoryEntry {
  return reason ? { at, action, by, reason } : { at, action, by }
}

function order(
  no: string,
  warehouseId: string,
  due: string,
  created: string,
  status: OrderStatus,
  lines: OrderLine[],
  ownerAccountId: string,
  extra: Partial<Order> & { history?: HistoryEntry[] },
): Order {
  const owner = accounts.find((a) => a.id === ownerAccountId)
  return {
    no,
    warehouseId,
    due,
    created,
    status,
    round: 1,
    note: '',
    lines,
    history: [],
    ownerId: ownerAccountId,
    ownerName: owner ? displayName(owner) : '',
    proxy: false,
    proxyReason: '',
    proxyNotice: '',
    selfApproved: false,
    reason: '',
    decided: '',
    csvSent: false,
    ...extra,
  }
}

/** Demo mail outbox: messages the app would send. Nothing is sent to real addresses. */
type MailMessage = { id: number; at: string; to: string; subject: string; body: string }
const outbox: MailMessage[] = [
  {
    id: 1,
    at: '2026/11/25 10:02',
    to: 'edi-admin@example.jp',
    subject: 'Send to Kumon failed: PO-2611-0028',
    body: 'The CSV could not be sent (timeout). Retry it from the send log.',
  },
]
let nextMailId = 2

function sendMail(recipients: string[], subject: string, body: string): void {
  for (const to of recipients) {
    outbox.unshift({ id: nextMailId++, at: fullStamp(), to, subject, body })
  }
}

function warehouseNameOf(o: Order): string {
  return warehouses.find((w) => w.id === o.warehouseId)?.name ?? o.warehouseId
}

/** New order waiting for approval: every active approver. */
function notifyApprovers(o: Order): void {
  const to = accounts
    .filter((a) => a.role === 'approver' && a.status === '有効')
    .map((a) => a.mailAddress)
  sendMail(
    to,
    `New order to approve: ${o.no}`,
    `${warehouseNameOf(o)} requested ${o.lines.length} line(s), delivery ${o.due}. Review it in the approvals list.`,
  )
}

/** Proxy order or decision for a warehouse: every active staff member of that warehouse. */
function notifyWarehouse(o: Order, subject: string, body: string): void {
  const to = accounts
    .filter((a) => a.role === 'warehouse' && a.warehouseId === o.warehouseId && a.status === '有効')
    .map((a) => a.mailAddress)
  sendMail(to, subject, body)
}

/** Return or rejection: the person who made the request. */
function notifyOwner(o: Order, subject: string, body: string): void {
  const owner = accounts.find((a) => a.id === o.ownerId)
  if (owner && owner.status === '有効') sendMail([owner.mailAddress], subject, body)
}

const sendLog: SendLogEntry[] = [
  sendEntry(
    1,
    '2026/11/25 10:02',
    'PO-2611-0028',
    false,
    '送信サーバーの応答がありません（タイムアウト）',
  ),
  sendEntry(2, '2026/11/24 10:05', 'PO-2611-0027', true, ''),
  sendEntry(3, '2026/11/18 10:10', 'PO-2611-0021', true, ''),
  sendEntry(4, '2026/11/14 10:31', 'PO-2611-0019', true, ''),
  sendEntry(5, '2026/11/12 15:40', 'PO-2611-0017', true, ''),
  sendEntry(6, '2026/11/11 15:02', 'PO-2611-0014', true, ''),
  sendEntry(7, '2026/11/06 10:12', 'PO-2611-0009', true, ''),
]
let nextLogId = 8
let nextOrderSeq = 35

function sendEntry(
  id: number,
  at: string,
  orderNo: string,
  ok: boolean,
  error: string,
): SendLogEntry {
  const target = orders.find((o) => o.no === orderNo)
  return {
    id,
    at,
    orderNo,
    warehouseName: warehouses.find((w) => w.id === target?.warehouseId)?.name ?? '',
    fileName: `order_${orderNo}.csv`,
    lineCount: target?.lines.length ?? 0,
    csvText: target ? csvOf(target) : '',
    ok,
    error,
  }
}

// ----- helpers -----

function csvField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csvOf(o: Order): string {
  const w = warehouses.find((x) => x.id === o.warehouseId)
  const header = [
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
  ]
  const rows = o.lines.flatMap((line, index) => {
    const it = items.find((x) => x.code === line.code)
    if (!it || !w) return []
    return [
      [
        o.no,
        index + 1,
        o.decided || '2026/11/26',
        CUSTOMER_CODE,
        w.destinationCode,
        w.name,
        o.due.replace(/-/g, '/'),
        it.code,
        it.name,
        line.qty,
        it.unit,
        it.price,
        Math.round(it.price * line.qty),
        w.name,
        o.note,
      ]
        .map(csvField)
        .join(','),
    ]
  })
  return [header.join(','), ...rows].join('\r\n') + '\r\n'
}

function nowStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Date and time with the year, e.g. 2026/11/26 08:42. */
function fullStamp(): string {
  const d = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function todayDecided(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

/** Name as written in the history: warehouse accounts show their site, approvers and admins their name. */
function displayName(a: StoredAccount): string {
  return a.role === 'warehouse' ? a.label : a.person
}

function toUser(a: StoredAccount): User {
  return {
    id: a.id,
    person: a.person,
    role: a.role,
    warehouseId: a.warehouseId,
    label: a.label,
    mail: a.mailAddress,
  }
}

function isCsvSent(no: string): boolean {
  const latest = sendLog.filter((e) => e.orderNo === no)
  return latest.length > 0 && latest.some((e) => e.ok)
}

function withCsvState(o: Order): Order {
  return { ...o, csvSent: isCsvSent(o.no) }
}

function approveNow(target: Order, actor: StoredAccount, selfApprove: boolean): void {
  const stamp = nowStamp()
  target.status = '決裁済'
  target.decided = todayDecided()
  if (selfApprove) target.selfApproved = true
  target.history.push(h(stamp, selfApprove ? '決裁（代理・即決裁）' : '決裁', displayName(actor)))
  const w = warehouses.find((x) => x.id === target.warehouseId)
  sendLog.unshift({
    id: nextLogId++,
    at: fullStamp(),
    orderNo: target.no,
    warehouseName: w?.name ?? '',
    fileName: `order_${target.no}.csv`,
    lineCount: target.lines.length,
    csvText: csvOf(target),
    ok: true,
    error: '',
  })
}

// Starting data, copied at startup so a reset can restore it.
const pristine = structuredClone({ items, warehouses, accounts, orders, sendLog, outbox })

function restoreSampleData(): void {
  items.splice(0, items.length, ...structuredClone(pristine.items))
  warehouses.splice(0, warehouses.length, ...structuredClone(pristine.warehouses))
  accounts.splice(0, accounts.length, ...structuredClone(pristine.accounts))
  orders.splice(0, orders.length, ...structuredClone(pristine.orders))
  sendLog.splice(0, sendLog.length, ...structuredClone(pristine.sendLog))
  outbox.splice(0, outbox.length, ...structuredClone(pristine.outbox))
  nextMailId = pristine.outbox.length + 1
  nextLogId = pristine.sendLog.length + 1
  nextOrderSeq = 35
  sessions.clear()
  failedLogins.clear()
}

// ----- session and request helpers -----

const sessions = new Map<string, string>() // session id -> account id
const failedLogins = new Map<string, number>()
const pendingCodes = new Map<string, string>() // account id -> code sent (demo accepts any 6 digits)

function sessionIdFrom(req: IncomingMessage): string | null {
  const cookie = req.headers.cookie ?? ''
  const match = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  return match ? match.slice(SESSION_COOKIE.length + 1) : null
}

function currentAccount(req: IncomingMessage): StoredAccount | null {
  const id = sessionIdFrom(req)
  const accountId = id ? sessions.get(id) : undefined
  return accountId ? (accounts.find((a) => a.id === accountId) ?? null) : null
}

function startSession(res: ServerResponse, accountId: string): void {
  const id = randomUUID()
  sessions.set(id, accountId)
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax`)
  const account = accounts.find((a) => a.id === accountId)
  if (account) account.lastLogin = nowStamp()
}

function send(res: ServerResponse, status: number, body?: unknown): void {
  res.statusCode = status
  if (body === undefined) {
    res.end()
    return
  }
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {})
      } catch {
        resolve({})
      }
    })
  })
}

function canSeeOrder(account: StoredAccount, o: Order): boolean {
  if (account.role === 'warehouse') return o.warehouseId === account.warehouseId
  return true
}

function nextOrderNo(): string {
  return `PO-2611-00${nextOrderSeq++}`
}

function validLines(input: unknown): OrderLine[] {
  if (!Array.isArray(input)) return []
  return input
    .map((x) => x as { code?: unknown; qty?: unknown })
    .filter((x) => typeof x.code === 'string' && Number(x.qty) > 0)
    .map((x) => ({ code: String(x.code), qty: Number(x.qty) }))
}

/** A line problem as a code the app translates, with the values it needs. */
type Problem = { code: string; params?: Record<string, string | number> }

function lineProblem(line: OrderLine): Problem | null {
  const it = items.find((x) => x.code === line.code)
  if (!it) return { code: 'itemRequired' }
  if (!Number.isInteger(line.qty) || line.qty <= 0) return { code: 'qtyInvalid' }
  if (line.qty % it.lot !== 0)
    return { code: 'lotMultiple', params: { lot: it.lot, unit: it.unit } }
  return null
}

function problemBody(problem: Problem): {
  detail: string
  code: string
  params?: Record<string, string | number>
} {
  return { detail: problem.code, code: problem.code, params: problem.params }
}

// ----- the plugin -----

/**
 * Handles one /api request. `req.url` must be the path without the /api prefix
 * (Vite's middleware strips it; the standalone demo server strips it too).
 */
export async function handleMockApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://mock.local')
  // Paths are matched with a trailing slash, like the Django API routes.
  const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`
  const method = (req.method ?? 'GET').toUpperCase()
  const account = currentAccount(req)
  const body = method === 'GET' ? {} : await readBody(req)

  // Test helper: restore the sample data and sign everyone out.
  if (method === 'POST' && path === '/__mock/reset/') {
    restoreSampleData()
    return send(res, 204)
  }

  // Auth
  if (method === 'GET' && path === '/auth/me/') {
    return account ? send(res, 200, toUser(account)) : send(res, 401, { detail: 'Not logged in.' })
  }
  if (method === 'GET' && path === '/auth/demo-accounts/') {
    return send(
      res,
      200,
      accounts.map((a) => ({ ...toUser(a), status: a.status })),
    )
  }
  if (method === 'POST' && path === '/auth/login/') {
    const username = String(body.username ?? '')
    const password = String(body.password ?? '')
    const a = accounts.find((x) => x.id === username)
    if (!a) return send(res, 401, { detail: 'Invalid.', code: 'unknown' })
    if (a.status === '停止') return send(res, 403, { detail: 'Stopped.', code: 'stopped' })
    if (a.status === 'ロック中') return send(res, 401, { detail: 'Locked.', code: 'lockedAccount' })
    if (password === 'x' || password === '') {
      const n = (failedLogins.get(a.id) ?? 0) + 1
      failedLogins.set(a.id, n)
      if (n >= 5) {
        a.status = 'ロック中'
        failedLogins.delete(a.id)
        return send(res, 401, { detail: 'Locked.', code: 'locked' })
      }
      return send(res, 401, { detail: 'Wrong.', code: 'wrong', left: 5 - n })
    }
    failedLogins.delete(a.id)
    if (a.role === 'warehouse') {
      startSession(res, a.id)
      return send(res, 200, { status: 'signed-in', user: toUser(a) })
    }
    pendingCodes.set(a.id, '000000')
    return send(res, 200, { status: 'code-sent', user: toUser(a) })
  }
  if (method === 'POST' && path === '/auth/verify-code/') {
    const a = accounts.find((x) => x.id === String(body.username ?? ''))
    const code = String(body.code ?? '')
    if (!a || !/^\d{6}$/.test(code))
      return send(res, 401, { detail: 'Wrong code.', code: 'otpWrong' })
    startSession(res, a.id)
    return send(res, 200, toUser(a))
  }
  if (method === 'POST' && path === '/auth/demo-login/') {
    const a = accounts.find((x) => x.id === String(body.username ?? ''))
    if (!a || a.status !== '有効') return send(res, 404, { detail: 'Not found.' })
    startSession(res, a.id)
    return send(res, 200, toUser(a))
  }
  if (method === 'POST' && path === '/auth/logout/') {
    const id = sessionIdFrom(req)
    if (id) sessions.delete(id)
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0`)
    return send(res, 204)
  }

  if (!account) return send(res, 401, { detail: 'Not logged in.' })

  if (method === 'POST' && path === '/auth/change-password/') {
    const current = String(body.current ?? '')
    const next = String(body.next ?? '')
    if (current !== account.password)
      return send(res, 422, {
        detail: 'The current password is not correct.',
        field: 'current',
        code: 'wrongCurrent',
      })
    if (next.length < 8)
      return send(res, 422, {
        detail: 'Use at least 8 characters.',
        field: 'next',
        code: 'tooShort',
      })
    if (next === current)
      return send(res, 422, {
        detail: 'Choose a password different from the current one.',
        field: 'next',
        code: 'same',
      })
    account.password = next
    account.passwordSet = true
    return send(res, 204)
  }

  // Masters (read: everyone; write: admin)
  if (method === 'GET' && path === '/items/') return send(res, 200, items)
  if (method === 'GET' && path === '/warehouses/') return send(res, 200, warehouses)
  if (
    (method === 'POST' && path === '/items/') ||
    (method === 'PUT' && path.startsWith('/items/'))
  ) {
    if (account.role !== 'admin') return send(res, 403, { detail: 'Forbidden.' })
    const code = method === 'PUT' ? decodeURIComponent(path.split('/')[2]) : String(body.code ?? '')
    const incoming = body as unknown as Item
    const existing = items.find((x) => x.code === code)
    if (method === 'POST' && existing) return send(res, 422, { detail: 'Duplicate code.' })
    if (existing) Object.assign(existing, { ...incoming, code })
    else items.push({ ...incoming, code })
    return send(
      res,
      200,
      items.find((x) => x.code === code),
    )
  }
  if (
    (method === 'POST' && path === '/warehouses/') ||
    (method === 'PUT' && path.startsWith('/warehouses/'))
  ) {
    if (account.role !== 'admin') return send(res, 403, { detail: 'Forbidden.' })
    const incoming = body as unknown as Warehouse
    if (method === 'POST') {
      const id = `W${String(warehouses.length + 1).padStart(2, '0')}`
      warehouses.push({ ...incoming, id })
      return send(
        res,
        200,
        warehouses.find((x) => x.id === id),
      )
    }
    const id = path.split('/')[2]
    const existing = warehouses.find((x) => x.id === id)
    if (!existing) return send(res, 404, { detail: 'Not found.' })
    Object.assign(existing, { ...incoming, id })
    return send(res, 200, existing)
  }

  // Accounts (admin)
  if (path.startsWith('/accounts/') || path === '/accounts/') {
    if (account.role !== 'admin') return send(res, 403, { detail: 'Forbidden.' })
    if (method === 'GET' && path === '/accounts/') {
      return send(
        res,
        200,
        accounts.map((a) => ({
          id: a.id,
          person: a.person,
          role: a.role,
          warehouseId: a.warehouseId,
          mail: a.mail,
          lastLogin: a.lastLogin,
          passwordSet: a.passwordSet,
          status: a.status,
        })),
      )
    }
    if (method === 'POST' && path === '/accounts/') {
      const id = String(body.id ?? '')
      if (accounts.some((x) => x.id === id)) return send(res, 422, { detail: 'Taken.' })
      const created = acct(
        id,
        body.role as Role,
        (body.warehouseId as string) ?? null,
        String(body.person ?? ''),
        String(body.mail ?? ''),
        '―',
      )
      created.status = (body.status as Account['status']) ?? '有効'
      created.passwordSet = false
      accounts.push(created)
      return send(res, 200, { ...created, password: undefined })
    }
    const parts = path.split('/')
    const id = decodeURIComponent(parts[2] ?? '')
    const target = accounts.find((x) => x.id === id)
    if (!target) return send(res, 404, { detail: 'Not found.' })
    if (method === 'POST' && parts[3] === 'reset-password') {
      target.passwordSet = false
      return send(res, 200, target)
    }
    if (method === 'POST' && parts[3] === 'unlock') {
      target.status = '有効'
      failedLogins.delete(target.id)
      return send(res, 200, target)
    }
    if (method === 'PUT') {
      if (target.id === account.id && (body.status === '停止' || body.role !== account.role)) {
        return send(res, 422, { detail: 'Own account cannot be stopped or re-roled.' })
      }
      Object.assign(target, {
        person: String(body.person ?? target.person),
        role: (body.role as Role) ?? target.role,
        warehouseId: body.role === 'warehouse' ? ((body.warehouseId as string) ?? null) : null,
        mailAddress: String(body.mail ?? target.mailAddress),
        mail: String(body.mail ?? target.mail),
        status: (body.status as Account['status']) ?? target.status,
      })
      Object.assign(target, {
        label:
          target.role === 'warehouse'
            ? `${warehouses.find((w) => w.id === target.warehouseId)?.name ?? ''} ${target.person}`
            : target.role === 'approver'
              ? `${target.person}（承認者）`
              : target.person,
      })
      return send(res, 200, { ...target, password: undefined })
    }
  }

  // Orders
  if (method === 'GET' && path === '/orders/') {
    const scope = url.searchParams.get('scope')
    const mine = (o: Order) => o.warehouseId === account.warehouseId
    let list: Order[] = orders
    if (scope === 'mine')
      list = orders.filter(
        (o) =>
          account.role === 'warehouse' &&
          mine(o) &&
          (o.status === '進行中' || o.status === '差し戻し'),
      )
    if (scope === 'drafts')
      list = orders.filter(
        (o) => account.role === 'warehouse' && o.status === '下書き' && o.ownerId === account.id,
      )
    if (scope === 'latest')
      list = orders.filter(
        (o) =>
          account.role === 'warehouse' && mine(o) && (o.status === '決裁済' || o.status === '却下'),
      )
    if (scope === 'pending')
      list = orders.filter((o) => account.role === 'approver' && o.status === '進行中')
    if (scope === 'received')
      list = orders.filter((o) => account.role === 'approver' && o.status !== '下書き')
    if (scope === 'mine' || scope === 'drafts' || scope === 'latest') {
      if (account.role !== 'warehouse') return send(res, 403, { detail: 'Forbidden.' })
    }
    if (scope === 'pending' || scope === 'received') {
      if (account.role !== 'approver') return send(res, 403, { detail: 'Forbidden.' })
    }
    return send(res, 200, list.map(withCsvState))
  }
  if (method === 'POST' && path === '/orders/') {
    const lines = validLines(body.lines)
    const draft = body.draft !== false
    const proxy = body.proxy as { reason?: string; autoApprove?: boolean } | undefined
    if (proxy) {
      if (account.role !== 'approver') return send(res, 403, { detail: 'Forbidden.' })
      if (!String(proxy.reason ?? '').trim())
        return send(res, 422, {
          detail: 'reasonRequired',
          code: 'reasonRequired',
          field: 'reason',
        })
    } else if (account.role !== 'warehouse') {
      return send(res, 403, { detail: 'Forbidden.' })
    }
    const problem = lines.map(lineProblem).find(Boolean)
    if (problem && !draft) return send(res, 422, problemBody(problem))
    const warehouseId = proxy ? String(body.warehouseId ?? '') : (account.warehouseId ?? '')
    if (!warehouses.some((w) => w.id === warehouseId))
      return send(res, 422, {
        detail: 'warehouseRequired',
        code: 'warehouseRequired',
        field: 'warehouseId',
      })
    const stamp = nowStamp()
    const created = order(
      nextOrderNo(),
      warehouseId,
      String(body.due ?? ''),
      stamp,
      draft ? '下書き' : '進行中',
      lines,
      account.id,
      {
        note: String(body.note ?? ''),
      },
    )
    created.ownerName = displayName(account)
    if (proxy) {
      created.proxy = true
      created.proxyReason = String(proxy.reason).trim()
      const wname = warehouses.find((w) => w.id === warehouseId)?.name ?? ''
      created.proxyNotice = `${stamp} ${wname} へメールで通知`
      created.history.push(
        h(stamp, '代理申請', `${account.person}（${wname}の代理）`, created.proxyReason),
      )
      created.history.push(h(stamp, '倉庫へ通知', 'システム', `${wname} へメール`))
      if (proxy.autoApprove && !draft) {
        orders.unshift(created)
        notifyWarehouse(
          created,
          `Proxy order entered for your warehouse: ${created.no}`,
          created.proxyReason,
        )
        approveNow(created, account, true)
        return send(res, 200, withCsvState(created))
      }
    } else if (!draft) {
      created.history.push(h(stamp, '申請', displayName(account)))
    }
    if (!draft) {
      notifyApprovers(created)
      if (proxy) {
        notifyWarehouse(
          created,
          `Proxy order entered for your warehouse: ${created.no}`,
          created.proxyReason,
        )
      }
    }
    orders.unshift(created)
    return send(res, 200, withCsvState(created))
  }
  if (path.startsWith('/orders/') && path !== '/orders/') {
    const parts = path.split('/')
    const no = decodeURIComponent(parts[2] ?? '')
    const target = orders.find((o) => o.no === no)
    if (!target || !canSeeOrder(account, target)) return send(res, 404, { detail: 'Not found.' })
    if (method === 'GET' && parts.length === 4 && parts[3] === '')
      return send(res, 200, withCsvState(target))
    if (method === 'GET' && parts.length === 3) return send(res, 200, withCsvState(target))
    if (method === 'DELETE') {
      if (account.role !== 'warehouse' || target.ownerId !== account.id)
        return send(res, 403, { detail: 'Only the owner can delete.' })
      if (target.status !== '下書き')
        return send(res, 422, { detail: 'Only drafts can be deleted.' })
      orders.splice(orders.indexOf(target), 1)
      return send(res, 204)
    }
    if (method === 'PUT') {
      if (account.role !== 'warehouse' || target.ownerId !== account.id)
        return send(res, 403, { detail: 'Only the owner can edit.' })
      if (target.status !== '下書き' && target.status !== '差し戻し')
        return send(res, 422, { detail: 'This order cannot be edited.' })
      const lines = validLines(body.lines)
      const draft = body.draft !== false
      const problem = lines.map(lineProblem).find(Boolean)
      if (problem && !draft) return send(res, 422, problemBody(problem))
      target.lines = lines
      target.due = String(body.due ?? target.due)
      target.note = String(body.note ?? '')
      const stamp = nowStamp()
      if (draft) {
        target.status = target.status === '差し戻し' ? '差し戻し' : '下書き'
      } else {
        const resubmit = target.status === '差し戻し'
        target.status = '進行中'
        target.created = stamp
        if (resubmit) {
          target.round += 1
          target.history.push(h(stamp, '再申請', displayName(account)))
        } else {
          target.history.push(h(stamp, '申請', displayName(account)))
        }
        target.reason = ''
        notifyApprovers(target)
      }
      return send(res, 200, withCsvState(target))
    }
    return send(res, 404, { detail: 'Not found (mock).' })
  }

  // Approvals (approver only)
  if (method === 'POST' && path === '/approvals/approve/') {
    if (account.role !== 'approver')
      return send(res, 403, { detail: 'Only approvers can approve.' })
    const nos = Array.isArray(body.nos) ? (body.nos as string[]) : []
    const selfApprove = body.selfApprove === true
    const approved: Order[] = []
    for (const no of nos) {
      const target = orders.find((o) => o.no === no)
      if (target && target.status === '進行中') {
        approveNow(target, account, selfApprove && target.proxy)
        approved.push(withCsvState(target))
      }
    }
    return send(res, 200, approved)
  }
  const decision = /^\/approvals\/([^/]+)\/(return|reject)\/$/.exec(path)
  if (method === 'POST' && decision) {
    if (account.role !== 'approver') return send(res, 403, { detail: 'Only approvers can decide.' })
    const target = orders.find((o) => o.no === decodeURIComponent(decision[1]))
    if (!target) return send(res, 404, { detail: 'Not found.' })
    const reason = String(body.reason ?? '').trim()
    if (!reason)
      return send(res, 422, {
        detail: 'decisionReasonRequired',
        code: 'decisionReasonRequired',
        field: 'reason',
      })
    target.status = decision[2] === 'return' ? '差し戻し' : '却下'
    target.reason = reason
    target.history.push(h(nowStamp(), target.status, displayName(account), reason))
    notifyOwner(
      target,
      `${target.no} was ${target.status === '差し戻し' ? 'returned' : 'rejected'}`,
      reason,
    )
    return send(res, 200, withCsvState(target))
  }

  // Send log (approver and admin)
  if (method === 'GET' && path === '/mail/outbox/') {
    const mine =
      account.role === 'admin' ? outbox : outbox.filter((m) => m.to === account.mailAddress)
    return send(res, 200, mine)
  }
  if (path === '/sendlog/' && method === 'GET') {
    if (account.role === 'warehouse') return send(res, 403, { detail: 'Forbidden.' })
    return send(res, 200, sendLog)
  }
  const retry = /^\/sendlog\/(\d+)\/retry\/$/.exec(path)
  if (method === 'POST' && retry) {
    if (account.role === 'warehouse') return send(res, 403, { detail: 'Forbidden.' })
    const source = sendLog.find((e) => e.id === Number(retry[1]))
    if (!source) return send(res, 404, { detail: 'Not found.' })
    const entry: SendLogEntry = {
      ...source,
      id: nextLogId++,
      at: fullStamp(),
      ok: true,
      error: '',
    }
    sendLog.unshift(entry)
    return send(res, 200, entry)
  }

  // Billing (approver and admin)
  if (method === 'GET' && path === '/billing/') {
    if (account.role === 'warehouse') return send(res, 403, { detail: 'Forbidden.' })
    const month = url.searchParams.get('month') ?? '2026-11'
    const prefix = month.replace('-', '/')
    const rows = warehouses.map((w) => {
      const mine = orders.filter(
        (o) => o.warehouseId === w.id && o.status === '決裁済' && o.decided.startsWith(prefix),
      )
      const material = mine.reduce(
        (sum, o) =>
          sum +
          o.lines.reduce(
            (s, line) =>
              s + Math.round((items.find((x) => x.code === line.code)?.price ?? 0) * line.qty),
            0,
          ),
        0,
      )
      return {
        warehouseId: w.id,
        warehouseName: w.name,
        destinationCode: w.destinationCode,
        orderCount: mine.length,
        selfApprovedCount: mine.filter((o) => o.selfApproved).length,
        materialAmount: material,
        shippingAmount: mine.length * w.shippingFee,
      }
    })
    return send(res, 200, { month, rows })
  }
}

export function mockApi(): Plugin {
  return {
    name: 'tenso-mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', (req: IncomingMessage, res: ServerResponse) => {
        void handleMockApi(req, res)
      })
    },
  }
}
