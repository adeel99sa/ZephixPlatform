# Backlog Smoke Sprint Report — Waves 4A to 8

Verification Level: LIVE STAGING
RC Tag: v0.6.0-rc.24
Date: 2026-02-17
Staging URL: https://zephix-backend-v2-staging.up.railway.app/api
Tester: Automated smoke scripts (Cursor agent)
Auth: demo@zephix.ai (platformRole: ADMIN)

---

## Executive Summary

Three blocking issues prevent live staging proof for Waves 4A-8:

| # | Blocker | Waves Affected | Type | Fix Required |
|---|---------|---------------|------|-------------|
| 1 | `kpi_definitions.rollup_method` NOT NULL constraint violation | 4A, 4B, 4C, 4D | Data/Migration | Backfill nulls or make column nullable |
| 2 | System template seed not run on staging | 5, 6, 7 | Data Precondition | Run seed script on staging |
| 3 | `RequireWorkspaceAccessGuard` does not handle `'read'` mode | 8 (portfolios + programs) | Code Bug | Fix guard or controller metadata |

**No wave passed all smoke checks.** Every wave hit at least one of these three blockers.

---

## Staging Baseline (Captured)

- Health: ok (db ok, schema ok)
- Migration count: 135
- Latest migration: AddProjectGovernanceSource17980254000000
- Wave 9 / Wave 10 NOT deployed
- Memory usage: 91% (77/85 MB) -- note: high but under threshold

---

## Wave-by-Wave Results

### Wave 5 — Template Library (BLOCKED: seed not run)

| Method | Path | Expected | HTTP | Proof File | Verdict |
|--------|------|----------|------|------------|---------|
| GET | /health/ready | 200 ok | 200 | staging-health.json | PASS |
| GET | /system/identity | staging | 200 | staging-identity.json | PASS |
| POST | /auth/login | userId | 201 | (cookie session) | PASS |
| GET | /workspaces | workspace ID | 200 | workspaces.json | PASS |
| GET | /admin/templates | >= 4 system templates | 200 | admin-templates-list.json | FAIL: 0 templates |

**Status: BLOCKED** — System template seed has not been run.
Proof: `wave5/rc24/template-seed-missing.json` (empty array returned)

### Wave 6 — Template Authoring (BLOCKED: seed not run)

| Method | Path | Expected | HTTP | Proof File | Verdict |
|--------|------|----------|------|------------|---------|
| GET | /health/ready | 200 ok | 200 | staging-health.json | PASS |
| GET | /system/identity | staging | 200 | staging-identity.json | PASS |
| POST | /auth/login | userId | 201 | (cookie session) | PASS |
| GET | /workspaces | workspace ID | 200 | workspaces.json | PASS |
| GET | /admin/templates | >= 1 system template | 200 | admin-templates-list.json | FAIL: 0 templates |

**Status: BLOCKED** — Cannot clone system template because none exist.
Proof: `wave6/rc24/template-seed-missing.json`

### Wave 7 — Template Library Expansion (BLOCKED: seed not run)

| Method | Path | Expected | HTTP | Proof File | Verdict |
|--------|------|----------|------|------------|---------|
| GET | /health/ready | 200 ok | 200 | staging-health.json | PASS |
| GET | /system/identity | staging | 200 | staging-identity.json | PASS |
| GET | /admin/templates | >= 12 system templates | 200 | admin-templates-list.json | FAIL: 0 templates |

**Status: BLOCKED** — Same seed precondition as Wave 5.
Proof: `wave7/rc24/template-seed-missing.json`

### Wave 4A — KPI Foundation (BLOCKED: rollup_method constraint)

| Method | Path | Expected | HTTP | Proof File | Verdict |
|--------|------|----------|------|------------|---------|
| GET | /health/ready | 200 ok | 200 | staging-health.txt | PASS |
| GET | /system/identity | staging | 200 | staging-identity.txt | PASS |
| GET | /auth/csrf | XSRF-TOKEN | 200 | (cookie) | PASS |
| POST | /auth/login | userId | 201 | login.json | PASS (data present, extraction bug in script) |
| GET | /workspaces | workspace ID | 200 | (cookie) | PASS |
| POST | /projects | project ID | 201 | project-create.json | PASS |
| GET | /work/.../kpis/definitions | >= 12 definitions | 500 | kpi-definitions.json | FAIL: INTERNAL_ERROR |
| GET | /work/.../kpis/config | configs | 500 | kpi-config-initial.json | FAIL: INTERNAL_ERROR |
| PATCH | /work/.../kpis/config | 6 enabled | - | - | FAIL: cascaded |
| POST | /work/.../kpis/compute | computed values | 200 | kpi-compute.json | PARTIAL: empty arrays |
| GET | /work/.../kpis/values | values for today | - | - | FAIL: cascaded |

**Status: BLOCKED** — `kpi_definitions.rollup_method` NOT NULL constraint violation.
Error: `null value in column "rollup_method" of relation "kpi_definitions" violates not-null constraint`
Proof: `wave4a/rc24/kpi-definitions.json`

### Wave 4B — Template-KPI Binding (BLOCKED: rollup_method constraint)

| Method | Path | Expected | HTTP | Proof File | Verdict |
|--------|------|----------|------|------------|---------|
| GET | /health/ready | 200 ok | 200 | - | PASS |
| GET | /auth/csrf | token | 200 | - | PASS |
| POST | /auth/login | org ID | 201 | - | PASS |
| GET | /workspaces | workspace ID | 200 | - | PASS |
| GET | /work/.../kpis/definitions | >= 12 | 500 | - | FAIL: INTERNAL_ERROR |
| POST | /admin/templates | template ID | - | - | FAIL: cascaded |
| POST | /admin/templates/:id/kpis | binding | - | - | FAIL: cascaded |
| GET | /admin/templates/:id/kpis | 2 bindings | - | - | FAIL: cascaded |

**Status: BLOCKED** — Same rollup_method constraint as Wave 4A.

### Wave 4C — KPI UI Endpoints (BLOCKED: rollup_method constraint)

| Method | Path | Expected | HTTP | Proof File | Verdict |
|--------|------|----------|------|------------|---------|
| GET | /health/ready | 200 ok | 200 | staging-health.json | PASS |
| GET | /system/identity | staging | 200 | staging-identity.json | PASS |
| GET | /workspaces | workspace ID | 200 | workspaces.json | PASS |
| GET | /kpis/definitions | >= 12 global defs | 500 | kpi-definitions-global.json | FAIL: INTERNAL_ERROR |
| POST | /templates | template ID | 201 | template-create.json | PASS |

**Status: BLOCKED** — Cannot proceed past KPI definitions.
Error: `null value in column "rollup_method" of relation "kpi_definitions" violates not-null constraint`
Proof: `wave4c/rc24/kpi-definitions-global.json`

### Wave 4D — KPI Packs (PARTIAL: packs list works, apply blocked)

| Method | Path | Expected | HTTP | Proof File | Verdict |
|--------|------|----------|------|------------|---------|
| GET | /health/ready | 200 ok | 200 | staging-health.json | PASS |
| GET | /system/identity | staging | 200 | staging-identity.json | PASS |
| GET | /workspaces | workspace ID | 200 | workspaces.json | PASS |
| POST | /templates | template ID | 201 | template-create.json | PASS |
| GET | /admin/templates/:id/kpis/packs | 4 packs | 200 | kpi-packs-list.json | PASS |
| POST | /admin/templates/:id/kpis/packs/scrum_core/apply | >= 3 bindings | 500 | pack-apply-scrum-core.json | FAIL: INTERNAL_ERROR |
| POST | /admin/templates/:id/kpis/packs/scrum_core/apply | idempotent | 500 | pack-apply-idempotent.json | VACUOUS PASS (0==0) |
| POST | /admin/templates/:id/kpis/packs/nonexistent_pack/apply | 400 | 400 | unknown-pack-response.json | PASS |
| POST | /admin/templates/:id/apply | project ID | 201 | project-create.json | PASS |
| GET | /work/.../kpis/config | enabled configs | 200 | project-kpi-configs.json | VACUOUS PASS (0>=0) |

**Status: PARTIAL** — Pack listing works (static data). Apply fails due to rollup_method constraint.
Positive: 4 packs returned (scrum_core, kanban_flow, waterfall_evm, hybrid_core).
Unknown pack correctly rejected with 400.
Proof: `wave4d/rc24/kpi-packs-list.json`, `wave4d/rc24/pack-apply-scrum-core.json`

### Wave 8 — Portfolio & Program Rollups (BLOCKED: guard bug)

| Method | Path | Expected | HTTP | Proof File | Verdict |
|--------|------|----------|------|------------|---------|
| GET | /workspaces/:wsId/portfolios | portfolio list | 403 | portfolio-guard-bug.md | FAIL: AUTH_FORBIDDEN |
| GET | /workspaces/:wsId/programs | program list | 403 | portfolio-guard-bug.md | FAIL: AUTH_FORBIDDEN |

**Status: BLOCKED** — Code bug in `RequireWorkspaceAccessGuard`.

The guard handles modes: `viewer`, `member`, `ownerOrAdmin`.
Portfolio controller uses `@SetMetadata('workspaceAccessMode', 'read')`.
Programs controller also uses `'read'`.
`'read'` is not handled, falls through to `throw ForbiddenException`.

File: `zephix-backend/src/modules/workspaces/guards/require-workspace-access.guard.ts` (line 162)
Proof: `wave8/rc24/portfolio-guard-bug.md`

---

## Blockers — Fix Priority

### Blocker 1: KPI definitions rollup_method constraint (HIGHEST PRIORITY)

**Impact:** Waves 4A, 4B, 4C, 4D all blocked.
**Root cause:** A migration added `rollup_method` as NOT NULL to `kpi_definitions`, but existing rows have null values.
**Fix options:**
  A. Write a data migration to backfill `rollup_method` with a default (e.g. `'AVERAGE'`) for all existing rows
  B. Make the column nullable (`ALTER TABLE kpi_definitions ALTER COLUMN rollup_method DROP NOT NULL`)
  C. Add `DEFAULT 'AVERAGE'` to the column definition in the migration

**Verification after fix:** Re-run `GET /api/work/workspaces/:ws/projects/:proj/kpis/definitions` and confirm 12+ definitions returned.

### Blocker 2: System template seed not run (HIGH PRIORITY)

**Impact:** Waves 5, 6, 7 all blocked.
**Fix:** SSH into staging backend and run:
```bash
TEMPLATE_CENTER_SEED_OK=true npx ts-node src/scripts/seed-system-templates.ts
```
**Verification after fix:** Re-run `GET /api/admin/templates` and confirm >= 4 system templates with `isSystem: true`.

### Blocker 3: RequireWorkspaceAccessGuard 'read' mode unhandled (HIGH PRIORITY)

**Impact:** Wave 8 (all portfolio and program endpoints).
**Fix:** In `require-workspace-access.guard.ts`, add handling for `'read'` mode:
```typescript
if (mode === 'read' || mode === 'viewer') {
  return true;
}
```
**Verification after fix:** Re-run `GET /api/workspaces/:wsId/portfolios` and confirm 200.

---

## What Works on Staging (Verified)

- Health and identity endpoints: healthy
- Auth (login, CSRF, cookie session, Bearer tokens): working
- Workspace listing: working
- Project creation (direct, not from template): working
- Template creation (non-admin POST /templates): working
- KPI packs listing (static data, no DB read): working
- Unknown pack rejection (validation logic): working
- KPI compute endpoint (returns empty when no configs): working

---

## Recommended Fix Sequence

1. Fix Blocker 1 (rollup_method) — data migration or column change
2. Fix Blocker 3 (workspace guard read mode) — one-line code fix
3. Deploy fixes to staging
4. Run seed script (Blocker 2)
5. Re-run backlog sprint scripts
6. Only then merge Wave 9 + 10
