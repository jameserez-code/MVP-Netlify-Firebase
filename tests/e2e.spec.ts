import { test, expect } from '@playwright/test';

test('End-to-end flow: password gate and dashboard', async ({ page }) => {
  // 1. Go to home page
  await page.goto('http://localhost:8080');

  // 2. Check if gate is visible
  await expect(page.locator('#passwordGate')).toBeVisible();

  // 3. Enter incorrect code
  await page.fill('#gatePass', 'wrongcode');
  await page.click('#gateSubmit');
  await expect(page.locator('#gateMsg')).toBeVisible();

  // 4. Enter correct code
  await page.fill('#gatePass', 'Thegreatwave');
  await page.click('#gateSubmit');

  // 5. Verify gate vanishes
  await expect(page.locator('#passwordGate')).toBeHidden();

  // Note: Redirection to admin-portal happens only after Firebase login,
  // which we can't easily test without a real Firebase setup or mock.
  // For the sake of this test, we skip the redirect and go directly.
  await page.goto('http://localhost:8080/admin-portal.html');

  // Verify dashboard gate (auto-unlocked by localStorage)
  await expect(page.locator('#passwordGate')).toBeHidden();

  // 6. Verify dashboard elements
  await expect(page.locator('h2', { hasText: 'Overview' })).toBeVisible();
  await expect(page.locator('#systemHealth')).toBeVisible();

  // 7. Check API action buttons
  await expect(page.locator('#callPassport')).toBeVisible();
  await expect(page.locator('#callVisas')).toBeVisible();

  // 8. Test Logout logic (Firebase mock)
  // logoutBtn exists in the sidebar
  await expect(page.locator('#logoutBtn')).toBeVisible();
});
