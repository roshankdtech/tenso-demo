/** Who is using the app. 倉庫 = warehouse staff, 承認者 = tenso approver, 管理者 = Kumon admin. */
export type Role = 'warehouse' | 'approver' | 'admin'

/** 下書き (draft), 進行中 (in progress), 差し戻し (returned), 決裁済 (approved), 却下 (rejected). */
export type OrderStatus = '下書き' | '進行中' | '差し戻し' | '決裁済' | '却下'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export type SelectOption = { value: string; label: string }

export type User = {
  id: string
  person: string
  role: Role
  /** Warehouse the account belongs to. Only set for warehouse accounts. */
  warehouseId: string | null
  /** Display name, e.g. "足立倉庫 佐藤". */
  label: string
  mail: string
}

export type ItemCategory = '段ボール' | 'ラベル' | '袋類' | 'その他'

export type Item = {
  code: string
  category: ItemCategory
  name: string
  spec: string
  /** Minimum order quantity. */
  lot: number
  unit: string
  /** Unit price before tax, in yen. */
  price: number
  /** Answer product code (Kumon's system). */
  answerCode: string
  active: boolean
}

export type Warehouse = {
  id: string
  name: string
  /** 届け先コード, used on the order CSV. */
  destinationCode: string
  address: string
  phone: string
  receivingHours: string
  deliveryConditions: string
  /** Answer delivery code. */
  answerCode: string
  /** Customer code sent to Answer. */
  customerCode: string
  /** Shipping and fee charged per approved order, in yen. */
  shippingFee: number
  active: boolean
}

export type OrderLine = { code: string; qty: number }

export type HistoryEntry = {
  at: string
  action: string
  by: string
  reason?: string
}

export type Order = {
  no: string
  warehouseId: string
  /** Delivery date, YYYY-MM-DD. */
  due: string
  created: string
  status: OrderStatus
  /** 1 for the first submission, +1 for each resubmission after a return. */
  round: number
  note: string
  lines: OrderLine[]
  history: HistoryEntry[]
  ownerId: string
  ownerName: string
  /** Entered by an approver on behalf of the warehouse (代理申請). */
  proxy: boolean
  proxyReason: string
  proxyNotice: string
  /** Approved by the same person who entered it (代理・即決裁). */
  selfApproved: boolean
  /** Latest return or rejection reason. */
  reason: string
  /** Approval date, YYYY/MM/DD. */
  decided: string
  /** Whether the latest CSV for this order reached Kumon. Only meaningful once approved. */
  csvSent: boolean
}

export type Account = {
  id: string
  person: string
  role: Role
  warehouseId: string | null
  mail: string
  lastLogin: string
  passwordSet: boolean
  status: '有効' | '停止' | 'ロック中'
}

export type SendLogEntry = {
  id: number
  /** Send time, e.g. 11/25 10:02. */
  at: string
  orderNo: string
  warehouseName: string
  fileName: string
  lineCount: number
  /** The CSV exactly as it was sent, kept on the system. */
  csvText: string
  ok: boolean
  error: string
}

/** One row of the monthly billing table, per warehouse. */
export type BillingRow = {
  warehouseId: string
  warehouseName: string
  destinationCode: string
  orderCount: number
  selfApprovedCount: number
  materialAmount: number
  shippingAmount: number
}
