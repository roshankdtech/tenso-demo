import { apiClient } from './client'

export type MailMessage = { id: number; at: string; to: string; subject: string; body: string }

/** Messages the app would send. Demo only: the mock records them instead of sending. */
export async function listMailOutbox(): Promise<MailMessage[]> {
  const { data } = await apiClient.get<MailMessage[]>('/mail/outbox/')
  return data
}
