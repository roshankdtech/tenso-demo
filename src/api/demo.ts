import type { User } from '@/types'
import { apiClient } from './client'

export type DemoAccount = User & { status: '有効' | '停止' | 'ロック中' }

/** Sample accounts for the demo login list. Only the mock API serves this. */
export async function listDemoAccounts(): Promise<DemoAccount[]> {
  const { data } = await apiClient.get<DemoAccount[]>('/auth/demo-accounts/')
  return data
}

/** Signs in as a sample account without a password. Mock API only. */
export async function demoSignIn(username: string): Promise<User> {
  const { data } = await apiClient.post<User>('/auth/demo-login/', { username })
  return data
}
