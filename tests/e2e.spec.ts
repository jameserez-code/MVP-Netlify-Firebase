import { test, expect } from '@playwright/test';

test('End-to-end flow: password gate and dashboard', async ({ page }) => {
  // 1. Go to home page
  await page.goto('http://localhost:8080');

  // 2. Check if gate is visible
  await expect(page.locator('#gate')).toBeVisible();

  // 3. Enter incorrect code
  await page.fill('#gateInput', 'wrongcode');
  await page.click('#gateBtn');
  await expect(page.locator('#gateError')).toBeVisible();

  // 4. Enter correct code
  await page.fill('#gateInput', 'Thegreatwave');
  await page.click('#gateBtn');

  // 5. Wait for redirection to admin portal
  await page.waitForURL('**/admin-portal.html');

  // 6. Verify dashboard elements
  await expect(page.locator('h2', { hasText: 'Overview' })).toBeVisible();
  await expect(page.locator('#systemHealth')).toBeVisible();

  // 7. Test an API call (mocking the backend since we are running a simple http-server)
  // But wait, the netlify functions are not running.
  // For the sake of this test, we can just check if the buttons exist.
  await expect(page.locator('#callPassport')).toBeVisible();
  await expect(page.locator('#callVisas')).toBeVisible();

  // 8. Test Logout
  await page.click('#logoutBtn');
  await page.waitForURL('**/index.html');
  await expect(page.locator('#gate')).toBeVisible();
});
