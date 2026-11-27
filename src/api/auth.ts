import type { User } from '@/types'
import { apiClient } from './client'

export type LoginResult = { status: 'signed-in'; user: User } | { status: 'code-sent'; user: User }

/** Step 1. Approvers and admins also get a code by email (second step). */
export async function login(username: string, password: string): Promise<LoginResult> {
  const { data } = await apiClient.post<{ status: 'signed-in' | 'code-sent'; user: User }>(
    '/auth/login/',
    { username, password },
  )
  return data
}

/** Step 2 for approvers and admins: the 6-digit code from the email. */
export async function verifyCode(username: string, code: string): Promise<User> {
  const { data } = await apiClient.post<User>('/auth/verify-code/', { username, code })
  return data
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me/')
  return data
}

/** Changes the signed-in user's password. The server checks the current one. */
export async function changePassword(current: string, next: string): Promise<void> {
  await apiClient.post('/auth/change-password/', { current, next })
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout/')
}
