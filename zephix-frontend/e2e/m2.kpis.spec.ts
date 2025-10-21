import { test, expect } from '@playwright/test';

test.describe('Milestone 2 - KPIs', () => {
  test('login → /admin/kpis → create KPI → see it listed', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5178/login');
    await page.fill('[data-testid="email-input"]', 'adeel99sa@yahoo.com');
    await page.fill('[data-testid="password-input"]', 'NewStrong!Pass123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Navigate to KPI catalog
    await page.goto('http://localhost:5178/admin/kpis');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("KPI Catalog")');
    
    // Fill in KPI name
    await page.fill('input[placeholder="KPI name"]', 'Test KPI');
    
    // Select calculation type
    await page.selectOption('select', { label: 'Provided' });
    
    // Click Add button
    await page.click('button:has-text("Add")');
    
    // Wait for the KPI to appear in the list
    await page.waitForSelector('li:has-text("Test KPI")');
    
    // Verify the KPI is listed
    const kpiItem = page.locator('li:has-text("Test KPI")');
    await expect(kpiItem).toBeVisible();
  });
});
