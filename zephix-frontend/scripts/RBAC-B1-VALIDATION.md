# RBAC Build 1 — validation (Lighthouse, screenshots, Vitest)

## Vitest (RBAC-focused)

```bash
npx vitest run \
  src/utils/__tests__/apiErrorMessage.rbac.test.ts \
  src/pages/auth/__tests__/ForgotPasswordPage.test.tsx \
  src/pages/auth/__tests__/ResetPasswordPage.test.tsx \
  src/pages/auth/__tests__/InviteAcceptPage.test.tsx \
  src/pages/auth/__tests__/rbac-b1-pages.a11y.test.tsx \
  src/features/administration/components/profile/__tests__/MfaSection.test.tsx \
  src/features/administration/components/__tests__/EditOrgMemberDialog.last-admin.test.tsx \
  src/features/workspaces/pages/__tests__/WorkspaceMembersPage.test.tsx
```

## Screenshots (attach to PR)

After `npm run build`, serve preview and run Playwright (iPad Mini viewport):

```bash
npx vite preview --host 127.0.0.1 --port 4173
# other terminal:
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npx playwright test -c playwright.rbac-b1.config.ts tests/rbac-b1-pr-screenshots.spec.ts
```

PNG output directory: `reports/rbac-b1/screenshots/` (gitignored). Upload those files to the GitHub PR.

## Lighthouse mobile (accessibility category)

```bash
npm run build
npx vite preview --host 127.0.0.1 --port 4173
# other terminal:
./scripts/rbac-b1-lighthouse-a11y-mobile.sh
```

If headless Chrome returns **NO_FCP**, re-run from a local graphical session or CI with appropriate Chrome flags / dev-shm. Re-validate on staging after Stream A deploys.

## Tech debt (architecture)

**Trigger:** post–Stream A PR2 merge to staging.

Run full **Lighthouse mobile** accessibility audit on staging and confirm **≥ 90** on accessibility across the ten RBAC B1 pages listed in `rbac-b1-lighthouse-a11y-mobile.sh` (forgot-password through administration/profile). Supersedes pre-merge jest-axe substitute for that environment only.
