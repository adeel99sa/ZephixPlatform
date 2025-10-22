import { test, expect } from '@playwright/test';

const adminPages = [
  ['Organization', '/admin/organization', /Organization/i],
  ['Users', '/admin/users', /Users/i],
  ['Roles', '/admin/roles', /Roles/i],
  ['Security', '/admin/security', /Security/i],
  ['Workspaces', '/admin/workspaces', /Workspaces/i],
  ['API Keys', '/admin/api-keys', /API Keys/i],
  ['Audit Logs', '/admin/audit-logs', /Audit Logs/i],
  ['Billing', '/admin/billing', /Billing/i],
  ['Integrations', '/admin/integrations', /Integrations/i],
  ['KPIs', '/admin/kpis', /KPIs/i],
  ['Templates', '/admin/templates', /Templates/i],
];

for (const [name, path, heading] of adminPages) {
  test(`Admin: ${name} loads without double /api and renders`, async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email').fill('demo@zephix.com');
    await page.getByLabel('Password').fill('Demo123!@#');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/hub|\/dashboard/);

    const reqs: string[] = [];
    page.on('request', r => { if (r.url().includes('/api/')) reqs.push(r.url()); });

    await page.goto(path, { waitUntil: 'networkidle' });

    // basic render assertion
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();

    // no /api/api
    const doubled = reqs.filter(u => u.includes('/api/api/'));
    expect(doubled, `Found doubled API prefix: \n${doubled.join('\n')}`).toHaveLength(0);
  });
}

test('Admin navigation works from profile menu', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@zephix.com');
  await page.getByLabel('Password').fill('Demo123!@#');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/hub|\/dashboard/);

  // Click profile menu
  await page.getByRole('button', { name: /profile/i }).click();
  
  // Click Administration
  await page.getByText('Administration').click();
  
  // Should be on admin organization page
  await expect(page).toHaveURL(/\/admin\/organization/);
  await expect(page.getByRole('heading', { name: /Organization/i })).toBeVisible();
});

test('Admin navigation works from sidebar', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@zephix.com');
  await page.getByLabel('Password').fill('Demo123!@#');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/hub|\/dashboard/);

  // Click Administration in sidebar
  await page.getByText('Administration').click();
  
  // Should be on admin organization page
  await expect(page).toHaveURL(/\/admin\/organization/);
  await expect(page.getByRole('heading', { name: /Organization/i })).toBeVisible();
});
