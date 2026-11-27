import { expect, test } from '@playwright/test'
import { login, resetMock } from './helpers'

test.beforeEach(async ({ request }) => resetMock(request))

test('admin adds an item and sees it in the list', async ({ page }) => {
  await login(page, 'kumon-admin')
  await page.goto('/items')
  await page.getByRole('button', { name: '+ Add' }).click()
  await page.locator('#item-code').fill('DB-140')
  await page.locator('#item-name').fill('段ボール 140サイズ')
  await page.locator('#item-lot').fill('500')
  await page.locator('#item-price').fill('150')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Item DB-140 added.')).toBeVisible()
  await expect(page.locator('tbody tr', { hasText: 'DB-140' })).toBeVisible()
})

test('a duplicate item code is refused', async ({ page }) => {
  await login(page, 'kumon-admin')
  await page.goto('/items')
  await page.getByRole('button', { name: '+ Add' }).click()
  await page.locator('#item-code').fill('DB-060')
  await page.locator('#item-name').fill('重複')
  await page.locator('#item-lot').fill('500')
  await page.locator('#item-price').fill('70')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Item code DB-060 is already registered.')).toBeVisible()
})

test('admin locks an account, then unlocks it', async ({ page }) => {
  await login(page, 'kumon-admin')
  await page.goto('/accounts')
  const row = page.locator('tbody tr', { hasText: 'tenso-dairi' })
  await expect(row.getByRole('button', { name: 'Unlock' })).toBeVisible()
  await row.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByText('tenso-dairi is unlocked and can log in again.')).toBeVisible()
})
