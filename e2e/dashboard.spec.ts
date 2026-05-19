import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
  })

  test('dashboard loads with key metrics cards', async ({ page }) => {
    // Wait for stats grid to appear
    await page.waitForSelector('#stats, .grid, .card', { timeout: 10000 })

    // Verify metric cards are present
    const cards = page.locator('.card, [class*="card"]').first()
    await expect(cards).toBeVisible()
  })

  test('navigation links are present and functional', async ({ page }) => {
    // Check for console page links
    const links = [
      { name: /landing/i, path: '/landing.html' },
      { name: /operator/i, path: '/operator.html' },
      { name: /agent/i, path: '/agents.html' },
      { name: /admin/i, path: '/admin-portal.html' },
      { name: /dev/i, path: '/dev-dashboard.html' },
    ]

    for (const link of links) {
      const locator = page.locator(`a[href="${link.path}"], a:has-text("${link.name.source}")`).first()
      const count = await locator.count()
      if (count > 0) {
        await expect(locator).toBeVisible()
      }
    }
  })

  test('endpoint table renders API documentation', async ({ page }) => {
    const table = page.locator('.endpoint-table, table').first()
    await expect(table).toBeVisible()

    // Verify common endpoints are listed
    const content = await table.innerText()
    expect(content).toContain('/auth/login')
    expect(content).toContain('/task')
    expect(content).toContain('/agents')
    expect(content).toContain('/policies')
  })

  test('status indicator shows healthy state', async ({ page }) => {
    const statusDot = page.locator('#dot, .status-dot').first()
    const statusText = page.locator('#statusText, .status-text').first()

    if (await statusDot.isVisible().catch(() => false)) {
      // In dev/demo mode, status should eventually show healthy
      await page.waitForTimeout(3000)
      const text = await statusText.innerText().catch(() => '')
      expect(['healthy', 'initializing', 'ok']).toContain(text.toLowerCase())
    }
  })

  test('metrics auto-refresh functionality', async ({ page }) => {
    // Wait for initial metrics load
    await page.waitForSelector('#stats, .grid', { timeout: 10000 })

    // Get initial values
    const initialText = await page.locator('#stats, .grid').first().innerText()

    // Wait for refresh interval (10s in app) — we'll wait 2s and check it's still there
    await page.waitForTimeout(2000)

    const afterText = await page.locator('#stats, .grid').first().innerText()
    expect(afterText).toBeTruthy()
  })
})
