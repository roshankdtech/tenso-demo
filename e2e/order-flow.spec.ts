import { expect, test } from '@playwright/test'
import { login, resetMock } from './helpers'

test.beforeEach(async ({ request }) => resetMock(request))

test('warehouse submits an order, the approver approves it, and the CSV is sent', async ({
  page,
}) => {
  await login(page, 'adachi-sato')
  await page.goto('/orders/new')

  // The sample line for LB-TH1 needs whole lots of 68,000. Fix the quantity first.
  await page.locator('#line-qty-1').fill('68000')
  await page.getByRole('button', { name: 'Submit request' }).click()
  await expect(page).toHaveURL(/\/orders$/)
  await expect(page.getByText(/submitted\./)).toBeVisible()
  const row = page.locator('tbody tr', { hasText: '足立倉庫' }).first()
  await expect(row).toContainText('In progress')

  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await login(page, 'tenso-takahashi')
  await expect(page).toHaveURL(/\/pending$/)
  const pendingRow = page.locator('tbody tr').filter({ hasText: '足立倉庫' }).first()
  await pendingRow.getByRole('checkbox').check()
  await page.getByRole('button', { name: /^Approve \d+ selected$/ }).click()
  await expect(page.getByText(/approved\./)).toBeVisible()

  await page.getByRole('link', { name: 'Send log (CSV)' }).click()
  await expect(page).toHaveURL(/\/sendlog$/)
  await expect(page.locator('tbody tr').first()).toContainText('Sent')
})

test('an order with a bad quantity cannot be submitted', async ({ page }) => {
  await login(page, 'adachi-sato')
  await page.goto('/orders/new')
  await page.locator('#line-qty-0').fill('123')
  await expect(page.getByRole('button', { name: 'Submit request' })).toBeDisabled()
  await expect(page.getByText(/Enter a multiple of 500/)).toBeVisible()
})

test('the approver can return an order only with a reason', async ({ page }) => {
  await login(page, 'tenso-takahashi')
  await page.goto('/orders/PO-2611-0031')
  await page.getByRole('button', { name: 'Return', exact: true }).click()
  await expect(page.getByText(/Enter the reason for Return/)).toBeVisible()
})

test('billing shows the monthly total for the chosen month', async ({ page }) => {
  await login(page, 'kumon-admin')
  await page.goto('/billing')
  await expect(page.getByRole('heading', { name: /Invoice for November 2026/ })).toBeVisible()
  await expect(page.getByText('Total (one invoice)')).toBeVisible()
})

test('a saved draft can be deleted from the draft form', async ({ page }) => {
  await login(page, 'adachi-sato')
  await page.goto('/drafts')
  await expect(page.locator('table')).toBeVisible()
  const before = await page.locator('tbody tr').count()

  await page.goto('/orders/new')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByText(/Draft saved/)).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete draft' }).click()
  await expect(page).toHaveURL(/\/drafts$/)
  await expect(page.getByText(/Draft deleted/)).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(before)
})

test('the warehouse list can be filtered by delivery date range', async ({ page }) => {
  await login(page, 'adachi-sato')
  await page.goto('/orders')
  await expect(page.locator('tbody tr')).toHaveCount(2)

  // Only orders due on or after 12/3 stay: PO-2611-0034 is due 12/4, PO-2611-0029 is due 12/2.
  await page.locator('#delivery-from').fill('2026-12-03')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr')).toContainText('PO-2611-0034')

  await page.locator('#delivery-from').fill('')
  await page.locator('#delivery-to').fill('2026-12-03')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr')).toContainText('PO-2611-0029')
})

test('the calendar can be used from the keyboard', async ({ page }) => {
  await login(page, 'adachi-sato')
  await page.goto('/orders/new')
  const input = page.locator('#due-date')
  const before = await input.inputValue()

  await page.getByRole('button', { name: 'Open calendar' }).click()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')

  const expected = new Date(`${before}T00:00:00`)
  expected.setDate(expected.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  const next = `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}`
  await expect(input).toHaveValue(next)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('an approved order shows its progress and that Kumon has not replied yet', async ({
  page,
}) => {
  await login(page, 'adachi-sato')
  await page.goto('/orders/PO-2611-0027')
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible()
  const progress = page.locator('ol')
  await expect(progress.getByText('Sent', { exact: true })).toBeVisible()
  await expect(page.getByText('Sent to Kumon.', { exact: true })).toBeVisible()
})

test('the send log shows the full sent date', async ({ page }) => {
  await login(page, 'kumon-admin')
  await page.goto('/sendlog')
  await expect(page.locator('tbody tr', { hasText: 'PO-2611-0027' })).toContainText(
    '2026/11/24 10:05',
  )
})

test('submitting an order records an email to the approver in the mail outbox', async ({
  page,
}) => {
  await login(page, 'kumon-admin')
  await page.goto('/mail')
  await expect(
    page.getByRole('button', { name: /Send to Kumon failed: PO-2611-0028/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await login(page, 'adachi-sato')
  await page.goto('/orders/new')
  await page.locator('#line-qty-1').fill('68000')
  await page.getByRole('button', { name: 'Submit request' }).click()
  await expect(page).toHaveURL(/\/orders$/)

  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await login(page, 'tenso-takahashi')
  await page.getByRole('link', { name: 'Mail (demo)' }).click()
  await page
    .getByRole('button', { name: /New order to approve/ })
    .first()
    .click()
  await expect(page.getByText('takahashi@example.jp')).toBeVisible()
})

test('the mailbox updates by itself when a new email arrives', async ({ page, browser }) => {
  await login(page, 'tenso-takahashi')
  await page.goto('/mail')
  await expect(page.getByRole('button', { name: /New order to approve/ })).toHaveCount(0)

  // A warehouse user submits an order in a second browser session.
  const other = await browser.newContext()
  const warehouse = await other.newPage()
  await login(warehouse, 'adachi-sato')
  await warehouse.goto('/orders/new')
  await warehouse.locator('#line-qty-1').fill('68000')
  await warehouse.getByRole('button', { name: 'Submit request' }).click()
  await expect(warehouse).toHaveURL(/\/orders$/)

  // The approver's open mailbox shows it without a reload.
  await expect(page.getByRole('button', { name: /New order to approve/ }).first()).toBeVisible({
    timeout: 15000,
  })
  await other.close()
})
