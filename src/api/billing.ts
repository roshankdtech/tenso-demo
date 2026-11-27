import type { BillingRow } from '@/types'
import { apiClient } from './client'

export type BillingMonth = { month: string; rows: BillingRow[] }

export async function getBilling(month: string): Promise<BillingMonth> {
  const { data } = await apiClient.get<BillingMonth>('/billing/', { params: { month } })
  return data
}
