import type { Order } from '@/types'
import { apiClient } from './client'

/** Approves one or more orders. Each approved order goes to the CSV send log. */
export async function approveOrders(nos: string[], selfApprove = false): Promise<Order[]> {
  const { data } = await apiClient.post<Order[]>('/approvals/approve/', {
    nos,
    selfApprove,
  })
  return data
}

export async function returnOrder(no: string, reason: string): Promise<Order> {
  const { data } = await apiClient.post<Order>(`/approvals/${encodeURIComponent(no)}/return/`, {
    reason,
  })
  return data
}

export async function rejectOrder(no: string, reason: string): Promise<Order> {
  const { data } = await apiClient.post<Order>(`/approvals/${encodeURIComponent(no)}/reject/`, {
    reason,
  })
  return data
}
