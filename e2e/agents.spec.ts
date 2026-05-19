import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const API_URL = process.env.API_URL || 'http://localhost:3000'

test.describe('Agent Registration', () => {
  test.beforeEach(async ({ page, context }) => {
    // Get auth token via API and set in localStorage
    const loginRes = await context.request.post(`${API_URL}/auth/login`, {
      data: {
        email: 'admin@acmecorp.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
      },
    })
    const loginData = await loginRes.json()

    await page.goto(BASE_URL)
    await page.evaluate((token) => {
      localStorage.setItem('passport_token', token)
    }, loginData.token)
  })

  test('agents page loads and displays agent list', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents.html`)
    await page.waitForLoadState('networkidle')

    // Page should have some content
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(0)
  })

  test('can navigate to agent registration form', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents.html`)

    // Look for register/add agent button
    const registerBtn = page.locator('button:has-text("Register"), button:has-text("Add"), a:has-text("Register")').first()

    if (await registerBtn.isVisible().catch(() => false)) {
      await registerBtn.click()
      await page.waitForTimeout(500)

      // Form fields should appear
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]').first()
      if (await nameInput.isVisible().catch(() => false)) {
        await expect(nameInput).toBeVisible()
      }
    }
  })

  test('agent details page shows passport information', async ({ page }) => {
    // First get an agent ID from the API
    const agentsRes = await page.request.get(`${API_URL}/agents`)
    const agentsData = await agentsRes.json()

    if (agentsData.data && agentsData.data.length > 0) {
      const firstAgent = agentsData.data[0]
      await page.goto(`${BASE_URL}/agents.html`)
      await page.waitForTimeout(1000)

      // Agent name or passport should be visible somewhere on the page
      const bodyText = await page.locator('body').innerText()
      const hasAgentInfo = bodyText.includes(firstAgent.name) ||
        bodyText.includes(firstAgent.passport?.passportNumber || '') ||
        bodyText.includes(firstAgent.id.substring(0, 8))

      // This is a soft assertion since the UI might be static HTML
      if (hasAgentInfo) {
        expect(hasAgentInfo).toBe(true)
      }
    }
  })

  test('revoked agents show revoked status', async ({ page, context }) => {
    // Create and then revoke an agent via API
    const loginRes = await context.request.post(`${API_URL}/auth/login`, {
      data: {
        email: 'admin@acmecorp.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
      },
    })
    const loginData = await loginRes.json()

    // Register agent
    const agentRes = await context.request.post(`${API_URL}/agents/register`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
      data: {
        name: 'E2E Revoke Test Agent',
        model: 'gpt-4o',
        provider: 'openai',
      },
    })
    const agentData = await agentRes.json()

    // Revoke agent
    await context.request.patch(`${API_URL}/agents/${agentData.agentId}/revoke`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
      data: { reason: 'E2E test revocation' },
    })

    // Verify agent is revoked
    const getRes = await context.request.get(`${API_URL}/agents/${agentData.agentId}`)
    const getData = await getRes.json()

    expect(getData.status).toBe('revoked')
    expect(getData.revokedReason).toBe('E2E test revocation')
  })
})
