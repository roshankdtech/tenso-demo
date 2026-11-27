import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  fetchCurrentUser,
  login as requestLogin,
  logout as requestLogout,
  verifyCode,
} from '@/api/auth'
import type { LoginResult } from '@/api/auth'
import type { Role, User } from '@/types'

/** Where each role lands after logging in. */
export const roleHome: Record<Role, string> = {
  warehouse: '/orders',
  approver: '/pending',
  admin: '/sendlog',
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const restored = ref(false)

  const isLoggedIn = computed(() => user.value !== null)
  const role = computed<Role | null>(() => user.value?.role ?? null)

  /** Checks for an existing session. Runs once, on the first navigation. */
  async function restore(): Promise<void> {
    if (restored.value) return
    try {
      user.value = await fetchCurrentUser()
    } catch {
      user.value = null
    } finally {
      restored.value = true
    }
  }

  /** Step 1. Returns 'code-sent' when a second step is needed. */
  async function login(username: string, password: string): Promise<LoginResult> {
    const result = await requestLogin(username, password)
    restored.value = true
    if (result.status === 'signed-in') user.value = result.user
    return result
  }

  /** Step 2 for approvers and admins. */
  async function confirmCode(username: string, code: string): Promise<User> {
    const signedIn = await verifyCode(username, code)
    user.value = signedIn
    restored.value = true
    return signedIn
  }

  async function logout(): Promise<void> {
    try {
      await requestLogout()
    } catch {
      // The session is already gone on the server. Clear locally anyway.
    } finally {
      clear()
    }
  }

  function clear(): void {
    user.value = null
  }

  function setUser(next: User): void {
    user.value = next
    restored.value = true
  }

  return { user, isLoggedIn, role, restore, login, confirmCode, logout, clear, setUser }
})
