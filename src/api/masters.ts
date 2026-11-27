import type { Account, Item, Warehouse } from '@/types'
import { apiClient } from './client'

export async function listItems(all = false): Promise<Item[]> {
  const { data } = await apiClient.get<Item[]>('/items/', { params: all ? { all: 1 } : undefined })
  return data
}

export async function saveItem(item: Item, isNew: boolean): Promise<Item> {
  if (isNew) {
    const { data } = await apiClient.post<Item>('/items/', item)
    return data
  }
  const { data } = await apiClient.put<Item>(`/items/${encodeURIComponent(item.code)}/`, item)
  return data
}

export async function listWarehouses(all = false): Promise<Warehouse[]> {
  const { data } = await apiClient.get<Warehouse[]>('/warehouses/', {
    params: all ? { all: 1 } : undefined,
  })
  return data
}

export async function saveWarehouse(warehouse: Warehouse, isNew: boolean): Promise<Warehouse> {
  if (isNew) {
    const { data } = await apiClient.post<Warehouse>('/warehouses/', warehouse)
    return data
  }
  const { data } = await apiClient.put<Warehouse>(`/warehouses/${warehouse.id}/`, warehouse)
  return data
}

export async function listAccounts(): Promise<Account[]> {
  const { data } = await apiClient.get<Account[]>('/accounts/')
  return data
}

export type AccountInput = Omit<Account, 'lastLogin' | 'passwordSet'>

export async function saveAccount(account: AccountInput, isNew: boolean): Promise<Account> {
  if (isNew) {
    const { data } = await apiClient.post<Account>('/accounts/', account)
    return data
  }
  const { data } = await apiClient.put<Account>(
    `/accounts/${encodeURIComponent(account.id)}/`,
    account,
  )
  return data
}

export async function resetAccountPassword(id: string): Promise<Account> {
  const { data } = await apiClient.post<Account>(
    `/accounts/${encodeURIComponent(id)}/reset-password/`,
  )
  return data
}

export async function unlockAccount(id: string): Promise<Account> {
  const { data } = await apiClient.post<Account>(`/accounts/${encodeURIComponent(id)}/unlock/`)
  return data
}
