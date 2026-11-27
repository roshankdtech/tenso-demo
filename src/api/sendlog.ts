import type { SendLogEntry } from '@/types'
import { apiClient } from './client'

export async function listSendLog(): Promise<SendLogEntry[]> {
  const { data } = await apiClient.get<SendLogEntry[]>('/sendlog/')
  return data
}

/** Sends a failed CSV again. */
export async function retrySend(id: number): Promise<SendLogEntry> {
  const { data } = await apiClient.post<SendLogEntry>(`/sendlog/${id}/retry/`)
  return data
}
