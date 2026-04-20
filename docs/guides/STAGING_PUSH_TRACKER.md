# Staging push tracker

Use this file to batch changes before deploying to staging. Append new bullets as you land work; remove or archive after a successful deploy.

## Last updated

2026-04-19

---

## Queued for next staging deploy

### Frontend — onboarding (`zephix-frontend`)

- **`src/pages/onboarding/OnboardingPage.tsx`**
  - Load org name from `GET /admin/organization/overview` → **`profile.name`** (fixes empty “—” when API wraps payload under `profile`).
  - **Organization name** is an editable field for org admins; **Continue** saves via **`PATCH /admin/organization/profile`** `{ name }` then advances to workspace step.
  - Copy updated: confirm/edit org name; footer still points to Settings for later edits.

### Admin Preferences — local empty page / load error (`zephix-frontend` + `zephix-backend`)

- **Cause:** `GET /users/me/preferences` reads/writes **`user_settings`**. That table was never created by migrations in `src/migrations` (only in `migrations-archive`), so fresh local DBs failed while staging already had the table.
- **Backend:** Migration **`18000000000072-EnsureUserSettingsTable.ts`** (not 068 — avoids filename clash with governance migration) creates `user_settings`. Manual DDL: **`scripts/sql/ensure-user-settings-table.sql`**; then register in **`migrations`** with **`scripts/sql/register-migration-ensure-user-settings.sql`** so `DatabaseVerifyService` does not fail boot with `pendingMigrations`.
- **Frontend:** **`AdminPreferencesPage.tsx`** — if load fails, show the same preference sections as staging (defaults) plus an amber notice with the SQL/migration hint; autosave allowed after error once the table exists.

### Backend / env (reference only — not in this diff)

- Local signup previously required **`TOKEN_HASH_SECRET`** in `zephix-backend/.env` (already set in Railway staging/prod). No code change.

---

## Before you push

- [ ] Run frontend checks: `npm run lint`, `npm run typecheck` (or `validate`) in `zephix-frontend`.
- [ ] Smoke: `/onboarding` step 1 — name loads, edit saves, Continue reaches workspace step.
- [ ] Confirm branch includes only intended files (`git status`).

---

## Git hints

```bash
# See what will ship
git status
git diff zephix-frontend/src/pages/onboarding/OnboardingPage.tsx

# Optional: commit only onboarding when ready
git add zephix-frontend/src/pages/onboarding/OnboardingPage.tsx
git add docs/guides/STAGING_PUSH_TRACKER.md
git commit -m "fix(onboarding): editable org name and load profile.name from overview"
```

---

## Deployed to staging (fill in after deploy)

| Date | Branch / SHA | Notes |
|------|----------------|-------|
| _pending_ | | |
