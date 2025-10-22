import { test, expect } from '@playwright/test';

test.describe('Cloudflare API Proxy - Production Login', () => {
  test('should successfully login via Cloudflare-proxied API', async ({ page }) => {
    // Navigate to production site
    await page.goto('https://getzephix.com/login');

    // Wait for login form to be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Fill in credentials
    await page.fill('input[type="email"]', 'adeel99sa@yahoo.com');
    await page.fill('input[type="password"]', 'ReAdY4wK73967#!@');

    // Set up network interception to verify API calls
    const loginRequest = page.waitForResponse(
      response => response.url().includes('/api/auth/login')
    );

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for login response
    const response = await loginRequest;
    
    // Verify response
    expect(response.status()).toBe(201);
    
    const responseBody = await response.json();
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.user.email).toBe('adeel99sa@yahoo.com');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Verify dashboard loaded
    await expect(page.locator('text=Portfolio Overview')).toBeVisible({ timeout: 5000 });

    // Capture that we're authenticated
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).toBeTruthy();

    console.log('✅ Login successful via Cloudflare proxy');
    console.log(`✅ Token received and stored`);
    console.log(`✅ Redirected to dashboard`);
  });

  test('should be able to navigate to Milestone-2 pages after login', async ({ page }) => {
    // Login first
    await page.goto('https://getzephix.com/login');
    await page.fill('input[type="email"]', 'adeel99sa@yahoo.com');
    await page.fill('input[type="password"]', 'ReAdY4wK73967#!@');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Test navigation to Resources page
    await page.click('a[href="/resources"]');
    await expect(page).toHaveURL(/\/resources/);
    await expect(page.locator('h1, h2, text=Resources')).toBeVisible({ timeout: 3000 });
    console.log('✅ Resources page accessible');

    // Test navigation to Risks page
    await page.click('a[href="/risks"]');
    await expect(page).toHaveURL(/\/risks/);
    await expect(page.locator('h1, h2, text=Risk')).toBeVisible({ timeout: 3000 });
    console.log('✅ Risks page accessible');

    // Test navigation to Admin/KPI page
    await page.click('a[href*="admin"], a[href*="kpi"]');
    await expect(page.locator('h1, h2, text=Admin, text=KPI')).toBeVisible({ timeout: 3000 });
    console.log('✅ Admin/KPI page accessible');
  });
});
