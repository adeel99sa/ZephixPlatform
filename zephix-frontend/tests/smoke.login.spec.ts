import { test, expect } from "@playwright/test";

test("login -> hub", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("demo@zephix.com");
  await page.getByLabel(/password/i).fill("Demo123!@#");
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes("/api/auth/login") && r.ok()),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
  expect(resp.ok()).toBeTruthy();
  await page.waitForURL(/\/hub/);
  await expect(page).toHaveTitle(/Zephix/i);
});
