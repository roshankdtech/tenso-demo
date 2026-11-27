import type { APIRequestContext, Page } from '@playwright/test'

export const PASSWORD = 'password'

/** Restore the mock's starting data and log everyone out. */
export async function resetMock(request: APIRequestContext): Promise<void> {
  await request.post('/api/__mock/reset?seed=test')
}

/** Which role's login page a sample account uses. */
export function roleOf(username: string): 'warehouse' | 'approver' | 'admin' {
  if (username.startsWith('tenso')) return 'approver'
  if (username.startsWith('kumon')) return 'admin'
  return 'warehouse'
}

/**
 * Logs in through the real form. Approvers and admins also enter the email code (any 6 digits in the mock).
 * Warehouse accounts go straight in.
 */
export async function login(page: Page, username: string): Promise<void> {
  await page.goto(`/login/${roleOf(username)}`)
  await page.locator('#username').fill(username)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()

  if (roleOf(username) !== 'warehouse') {
    await page.locator('#otp-code').fill('123456')
    await page.getByRole('button', { name: 'Confirm and log in' }).click()
  }
  // Wait until the app has moved on from the login page.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}
