import { test, expect } from '@playwright/test';

test.describe('Milestone 2 - Resources', () => {
  test('login → visit /resources → expect table rows > 0', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5178/login');
    await page.fill('[data-testid="email-input"]', 'adeel99sa@yahoo.com');
    await page.fill('[data-testid="password-input"]', 'NewStrong!Pass123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Navigate to resources
    await page.goto('http://localhost:5178/resources');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Resources")');
    
    // Check if table has rows (or loading state)
    const tableRows = page.locator('table tbody tr');
    const rowCount = await tableRows.count();
    
    // Should have either data rows or loading state
    expect(rowCount).toBeGreaterThan(0);
  });
});
