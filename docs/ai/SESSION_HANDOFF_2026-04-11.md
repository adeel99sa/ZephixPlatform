# Session handoff — 2026-04-11

**Purpose:** Preserve decisions and operator steps from the staging / Template Center stabilization thread for the next session.

---

## Staging backend public URL (verified)

- **Correct API base:** `https://zephix-backend-staging-staging.up.railway.app/api`
- **Incorrect assumption:** `https://zephix-backend-staging.up.railway.app` — Railway edge returns **404** (no service at that subdomain).
- **Why the double `staging`:** Service name `zephix-backend-staging` in Railway **environment** `staging` yields a default `*.up.railway.app` host that includes both tokens. Always confirm **Networking → Public URL** in the dashboard.

**Repo sources of truth:**

- `docs/ai/environments/staging.env` — `STAGING_BACKEND_BASE`, `STAGING_BACKEND_API`, frontend base.
- `zephix-frontend/.env.staging` — local/staging build copy; must stay aligned with `STAGING_BACKEND_API`.

---

## Frontend Railway variables (canonical)

1. Set **`VITE_API_URL`** = `https://zephix-backend-staging-staging.up.railway.app/api` (no trailing slash issues: client normalizes).
2. Remove **`VITE_API_BASE`** (and **`VITE_API_BASE_URL`** if present) — not read by `zephix-frontend/src/lib/api/client.ts`; only **`VITE_API_URL`** is used in production.
3. **Redeploy frontend** so Vite bakes env at build time.

**Symptoms when wrong:** 401s, empty Template Center, or failed authenticated calls because the SPA hit the wrong host or a dead Railway subdomain.

---

## Staging DB: migration 066 + template seed

**Migration 066 (repo):** `zephix-backend/src/migrations/18000000000066-AddColumnConfigToTemplatesAndProjects.ts`

From repo root (requires `ZEPHIX_ENV=staging` and `DATABASE_URL` for staging Postgres):

```bash
export ZEPHIX_ENV=staging
export DATABASE_URL='<from Railway staging DB>'
bash scripts/migrations/run-staging.sh
```

**System template seed** (15 templates, `columnConfig`; guarded env flags). From `zephix-backend/`:

```bash
cd zephix-backend
export DATABASE_URL='<same staging DB>'
TEMPLATE_CENTER_SEED_OK=true TEMPLATE_CENTER_REFRESH_SYSTEM_DEF=true \
  npx ts-node src/scripts/seed-system-templates.ts
```

**Done criteria:** Open Template Center on staging frontend; templates load (not empty / not persistent 401).

---

## Other topics touched this session (carry to next)

Recorded here for continuity; verify in GitHub / design docs before implementing.

| Topic | Notes |
|-------|--------|
| PR #123 | MVP-5, described as 4 commits — confirm branch/merge state in GitHub. |
| PR #126 | P-2 / template-related — e.g. `columnConfig` seed alignment. |
| Overview redesign | Spec: three colored cards — locate in design / issue tracker. |
| Toolbar consolidation | Filter / Assignee / Search / Gear / … / +Task — product UX spec. |
| Insight Center catalog | ~80 KPI cards — catalog / entitlement surface. |
| Document–task bidirectional linking | Architecture discussion — find ADR or issue. |
| Post-MVP backlog | Next session after Template Center stabilization is verified. |

**Remaining MVP items:** Operator indicated **four** items after stabilization; list and owners to be picked up next session (not enumerated in this file).

---

## Related doc commits (this repo)

- `docs/README.md` — frontend env docs corrected to **`VITE_API_URL`** (not legacy `VITE_API_BASE`).
- `docs/ai/environments/staging.env` + `zephix-frontend/.env.staging` — Railway hostname and operator comments (commit `feaa78a8` area).

---

## Quick verification commands

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "https://zephix-backend-staging-staging.up.railway.app/api/ping"
# expect 200

curl -sS -o /dev/null -w "%{http_code}\n" "https://zephix-backend-staging.up.railway.app/api/ping"
# expect 404 unless you intentionally add that host in Railway
```

---

**Next session entry:** After ops steps 1–5 above, smoke Template Center; then proceed with the four remaining MVP items and post-MVP spec as already documented elsewhere.
