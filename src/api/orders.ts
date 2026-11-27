import type { Order, OrderLine } from '@/types'
import { apiClient } from './client'

export type OrderScope = 'mine' | 'drafts' | 'latest' | 'pending' | 'received'

export type OrderInput = {
  warehouseId?: string
  due: string
  note: string
  lines: OrderLine[]
  /** true to save as a draft, false to submit. */
  draft: boolean
  /** Set only by approvers entering an order on behalf of a warehouse. */
  proxy?: { reason: string; autoApprove: boolean }
}

export async function listOrders(scope: OrderScope): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>('/orders/', { params: { scope } })
  return data
}

export async function getOrder(no: string): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/orders/${encodeURIComponent(no)}/`)
  return data
}

export async function createOrder(body: OrderInput): Promise<Order> {
  const { data } = await apiClient.post<Order>('/orders/', body)
  return data
}

/** Saves changes to a draft, or resubmits a returned order when `draft` is false. */
/** Deletes a draft. Only the warehouse user who saved it can do this. */
export async function deleteDraft(no: string): Promise<void> {
  await apiClient.delete(`/orders/${encodeURIComponent(no)}/`)
}

export async function updateOrder(no: string, body: OrderInput): Promise<Order> {
  const { data } = await apiClient.put<Order>(`/orders/${encodeURIComponent(no)}/`, body)
  return data
}
