import { test, expect } from '@playwright/test';

test('login & portfolio KPI loads', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@zephix.com');
  await page.getByLabel('Password').fill('Demo123!@#');
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL(/\/hub|\/dashboard/);
  const resp = await page.waitForResponse(r => r.url().includes('/api/kpi/portfolio') && r.status() === 200);
  expect(resp.ok()).toBeTruthy();
});

test('admin suite navigation works', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@zephix.com');
  await page.getByLabel('Password').fill('Demo123!@#');
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL(/\/hub|\/dashboard/);
  
  // Test admin navigation
  await page.goto('/admin/organization');
  await expect(page.locator('h1')).toContainText('Organization');
  
  // Test that API calls are properly normalized (no /api/api/)
  const responses = [];
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      responses.push(response.url());
    }
  });
  
  await page.goto('/admin/users');
  await expect(page.locator('h1')).toContainText('Users');
  
  // Verify no double /api/ prefixes
  const doubleApiCalls = responses.filter(url => url.includes('/api/api/'));
  expect(doubleApiCalls).toHaveLength(0);
});
