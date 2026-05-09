/**
 * RBAC Build 1 — PR screenshots (iPad viewport via playwright.rbac-b1.config.ts).
 * Start preview: npm run build && npx vite preview --host 127.0.0.1 --port 4173
 * Run: PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npx playwright test -c playwright.rbac-b1.config.ts tests/rbac-b1-pr-screenshots.spec.ts
 */
import { test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const OUT = path.join(process.cwd(), 'reports', 'rbac-b1', 'screenshots');

const shots: Array<{ url: string; file: string }> = [
  { url: '/forgot-password', file: '01-forgot-password.png' },
  { url: '/reset-password?token=demo-token', file: '02-reset-password.png' },
  { url: '/invites/accept?token=demo-token', file: '03-invite-accept.png' },
  { url: '/403?reason=need_org_admin', file: '04-403-org-admin.png' },
  { url: '/403?reason=need_workspace_owner', file: '05-403-workspace-owner.png' },
  { url: '/login', file: '06-login.png' },
  { url: '/login/mfa-challenge', file: '07-mfa-challenge.png' },
  { url: '/administration/people', file: '08-administration-people.png' },
  { url: '/workspaces/ws-demo/members', file: '09-workspace-members.png' },
  { url: '/administration/profile', file: '10-administration-profile.png' },
];

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

for (const { url, file } of shots) {
  test(`screenshot ${file}`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  });
}
