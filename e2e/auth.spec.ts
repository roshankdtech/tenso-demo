import { expect, test } from '@playwright/test'
import { PASSWORD, login, resetMock } from './helpers'

test.beforeEach(async ({ request }) => resetMock(request))

test('logged-out users are sent to login, keeping the page they asked for', async ({ page }) => {
  await page.goto('/orders')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await expect(page.getByRole('heading', { name: 'Choose your role' })).toBeVisible()
})

test('empty login shows a message for each field', async ({ page }) => {
  await page.goto('/login/warehouse')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByText('Enter your user name and password.').first()).toBeVisible()
})

test('wrong password shows the tries left, then locks the ID after five tries', async ({
  page,
}) => {
  await page.goto('/login/warehouse')
  for (let i = 0; i < 4; i++) {
    await page.locator('#username').fill('adachi-sato')
    await page.locator('#password').fill('x')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    // The app clears the password after each failed try; wait for that before the next one.
    await expect(page.locator('#password')).toHaveValue('')
  }
  await expect(page.getByRole('alert')).toContainText('1 tries left')

  await page.locator('#username').fill('adachi-sato')
  await page.locator('#password').fill('x')
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('locked after five wrong passwords')
})

test('approver needs the email code, and cannot open warehouse pages', async ({ page }) => {
  await login(page, 'tenso-takahashi')
  await expect(page).toHaveURL(/\/pending$/)
  await page.goto('/orders')
  await expect(page).toHaveURL(/\/pending$/)
})

test('warehouse user lands on own orders and cannot open approvals', async ({ page }) => {
  await login(page, 'adachi-sato')
  await expect(page).toHaveURL(/\/orders$/)
  await expect(page.getByRole('heading', { name: /Requests for 足立倉庫/ })).toBeVisible()
  await page.goto('/pending')
  await expect(page).toHaveURL(/\/orders$/)
})

test('admin lands on the send log and can open masters', async ({ page }) => {
  await login(page, 'kumon-admin')
  await expect(page).toHaveURL(/\/sendlog$/)
  await page.getByRole('link', { name: 'Item master' }).click()
  await expect(page.getByRole('heading', { name: 'Item master' })).toBeVisible()
})

test('log out returns to login and blocks the pages again', async ({ page }) => {
  await login(page, 'adachi-sato')
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/orders')
  await expect(page).toHaveURL(/\/login\?redirect/)
})

test('password can be shown and hidden', async ({ page }) => {
  await page.goto('/login/warehouse')
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page.locator('#password')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(page.locator('#password')).toHaveAttribute('type', 'password')
})

test('English is the default, and the switch to Japanese is remembered', async ({ page }) => {
  await page.goto('/login/warehouse')
  await expect(page.getByRole('heading', { name: 'Warehouse log in' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.getByRole('button', { name: '日本語' }).click()
  await expect(page.getByRole('heading', { name: '倉庫のログイン' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja')

  await page.reload()
  await expect(page.getByRole('heading', { name: '倉庫のログイン' })).toBeVisible()

  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'Warehouse log in' })).toBeVisible()
})

test('the three icons open their own log in pages', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: /Approver/ }).click()
  await expect(page).toHaveURL(/\/login\/approver$/)
  await expect(page.getByRole('heading', { name: 'Approver log in' })).toBeVisible()

  await page.goto('/login')
  await page.getByRole('link', { name: /Administrator/ }).click()
  await expect(page).toHaveURL(/\/login\/admin$/)
  await expect(page.getByRole('heading', { name: 'Administrator log in' })).toBeVisible()

  await page.goto('/login')
  await page.getByRole('link', { name: /Warehouse/ }).click()
  await expect(page).toHaveURL(/\/login\/warehouse$/)
})

test('an ID from another role is refused on a role log in page', async ({ page }) => {
  await page.goto('/login/approver')
  await page.locator('#username').fill('adachi-sato')
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('does not belong to the Approver role')
  await expect(page).toHaveURL(/\/login\/approver/)
})

test('a signed-in user can change their password', async ({ page }) => {
  await login(page, 'adachi-sato')
  await page.getByRole('banner').getByRole('button', { name: 'Change password' }).click()
  await expect(page).toHaveURL(/\/password$/)

  await page.locator('#current-password').fill('wrong-one')
  await page.locator('#new-password').fill('newpass123')
  await page.locator('#confirm-password').fill('newpass123')
  await page.locator('form').getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('The current password is not correct.')).toBeVisible()

  await page.locator('#new-password').fill('short')
  await page.locator('#confirm-password').fill('short')
  await page.locator('form').getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Use at least 8 characters.')).toBeVisible()

  await page.locator('#current-password').fill('password')
  await page.locator('#new-password').fill('newpass123')
  await page.locator('#confirm-password').fill('newpass123')
  await page.locator('form').getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Password changed')).toBeVisible()
  await expect(page).toHaveURL(/\/orders$/)
})

test('the new password must match its confirmation', async ({ page }) => {
  await login(page, 'adachi-sato')
  await page.goto('/password')
  await page.locator('#current-password').fill('password')
  await page.locator('#new-password').fill('newpass123')
  await page.locator('#confirm-password').fill('different1')
  await page.locator('form').getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('The new passwords do not match.')).toBeVisible()
})

test('a signed-in user is logged out after 30 minutes without activity', async ({ page }) => {
  await page.clock.install()
  await login(page, 'adachi-sato')
  await expect(page).toHaveURL(/\/orders$/)

  await page.clock.fastForward('31:00')
  await expect(page).toHaveURL(/\/login\?reason=idle$/)
  await expect(page.getByText('You were logged out automatically after 30 minutes')).toBeVisible()
})

test('activity restarts the 30-minute timer', async ({ page }) => {
  await page.clock.install()
  await login(page, 'adachi-sato')

  await page.clock.fastForward('20:00')
  await page.mouse.move(100, 100)
  await page.clock.fastForward('20:00')
  await expect(page).toHaveURL(/\/orders$/)
})

test('a warning appears before the automatic logout, and can be dismissed', async ({ page }) => {
  await page.clock.install()
  await login(page, 'adachi-sato')

  await page.clock.fastForward('29:30')
  await expect(page.getByRole('alertdialog')).toContainText('logged out in 30 seconds')
  // The fake clock stops the browser's stability checks, so the click is forced.
  await page.getByRole('button', { name: 'Stay signed in' }).click({ force: true })
  await expect(page.getByRole('alertdialog')).toHaveCount(0)

  await page.clock.fastForward('29:30')
  await expect(page).toHaveURL(/\/orders$/)
})
