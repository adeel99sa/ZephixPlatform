# Stabilization Issue Closure Addendum

date_utc: 2026-03-07T03:00:00Z
branch: main
base_memo: STABILIZATION_GO_NO_GO.md (commit 20732cc5)
closure_commit: (see `git log --oneline -1` on main after this commit)
assessed_by: Claude (automated proof pipeline)
open_issues: 0

---

## Issues Found During Post-Memo Verification

Two issues were identified after the initial GO/NO-GO memo (commit 20732cc5) was published:

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | Update-path portfolio governance sync looked up portfolio by `id` only — missing `organizationId` scope, creating cross-tenant governance inheritance risk on the update path | P0 | `zephix-backend/src/modules/projects/services/projects.service.ts` |
| 2 | `enterprise-ci.yml` backup-readiness probe called authenticated endpoint without `Authorization` header — unauthenticated curl against `@UseGuards(JwtAuthGuard, AdminGuard)` endpoint returns 401/403, causing false CI failure | P1 | `.github/workflows/enterprise-ci.yml` |

---

## Closure Evidence

### Issue 1 — Update-path portfolio governance org-scope

**Root cause:** `updateProject()` governance sync block at line ~641 looked up portfolio by `id` only.
A caller with a known foreign-org `portfolioId` could trigger governance defaults from a portfolio
in a different organization.

The create-path (line ~275) already had the correct `organizationId` scope. The update-path was missed.

**Before:**
```typescript
// projects.service.ts ~line 641 (BEFORE)
const portfolio = await this.dataSource.getRepository(Portfolio).findOne({
  where: { id: processedData.portfolioId as string },
});
```

**After:**
```typescript
// projects.service.ts ~line 641 (AFTER)
const portfolio = await this.dataSource.getRepository(Portfolio).findOne({
  where: { id: processedData.portfolioId as string, organizationId },
});
```

`organizationId` is the parameter passed to `updateProject(id, dto, organizationId, userId)` — the
JWT-authenticated caller's org, already used for all other lookups in this method.

**Regression tests:**
`zephix-backend/src/modules/projects/services/__tests__/project-update-governance.spec.ts`

| Test | Outcome |
|------|---------|
| Case A: same-org portfolio lookup returns portfolio → governance sync proceeds | **PASS** |
| Case B: foreign-org portfolio lookup returns null → governance sync is blocked | **PASS** |
| Case C: missing portfolio returns null → safe failure, no cross-tenant fallback | **PASS** |
| WHERE clause contains both id and organizationId fields | **PASS** |
| DataSource mock: same-org findOne returns portfolio | **PASS** |
| DataSource mock: foreign-org findOne returns null | **PASS** |
| Regression guard: organizationId must be present in where clause | **PASS** |

**Total: 7/7 PASS**

---

### Issue 2 — enterprise-ci.yml backup-readiness probe authentication

**Root cause:** Backup-readiness probe in `deploy-production` job called the endpoint via plain
`curl -sf` with no `Authorization` header. The controller is decorated with
`@UseGuards(JwtAuthGuard, AdminGuard)` — unauthenticated requests receive 401/403,
causing the CI step to fail even when the endpoint is healthy.

**Before:**
```yaml
curl -sf "${{ secrets.STAGING_API_URL }}/admin/system/backup-readiness" \
  && echo "Backup readiness: OK" \
  || { echo "::error::..."; exit 1; }
```

**After:**
```yaml
if [ -z "${{ secrets.ADMIN_AUTH_TOKEN }}" ]; then
  echo "::error::ADMIN_AUTH_TOKEN secret is not configured — backup readiness probe requires admin auth"
  exit 1
fi
if [ -n "${{ secrets.STAGING_API_URL }}" ]; then
  curl -sf \
    -H "Authorization: Bearer ${{ secrets.ADMIN_AUTH_TOKEN }}" \
    "${{ secrets.STAGING_API_URL }}/admin/system/backup-readiness" \
    && echo "Backup readiness: OK" \
    || { echo "::error::Backup readiness check failed on staging — aborting production deploy"; exit 1; }
```

Changes:
- Fail-fast with `::error::` if `ADMIN_AUTH_TOKEN` secret is absent (no silent bypass)
- `Authorization: Bearer` header matches the controller's guard requirements
- Secret value never echoed to log

---

## Post-Fix Validation Results

### Type Check + Lint

| Check | Command | Result |
|-------|---------|--------|
| Backend tsc | `cd zephix-backend && npx tsc --noEmit` | **PASS** — 0 errors |
| Frontend tsc | `cd zephix-frontend && npx tsc --noEmit` | **PASS** — 0 errors |
| Frontend lint | `npm run lint:new` | **PASS** — 0 errors, 52 pre-existing warnings |
| Regression tests | `npx jest project-update-governance --no-coverage` | **PASS** — 7/7 |

### Smoke Lanes (post-fix rerun on main)

| Lane | Timestamp | Result |
|------|-----------|--------|
| guard | 2026-03-07T02:43:00Z | **PASS** (import-drift, role-drift, token-artifact, contract-runner-parity) |
| org-invites | 2026-03-07T02:43:00Z | **PASS** (invite create 200, accept 200, invitee workspace access confirmed) |
| customer-journey | 2026-03-07T02:43:58Z | **PASS** |
| ui-acceptance | 2026-03-07T02:44:00Z | **PASS** (15/15) |

---

## Hard Gate Outcomes (Closure)

| Gate | Requirement | Actual | Result |
|------|-------------|--------|--------|
| Update-path portfolio org-scope | `organizationId` in WHERE clause | Fixed, 7/7 regression tests PASS | **PASS** |
| CI backup-readiness auth | Bearer token + fail-fast on missing secret | Fixed | **PASS** |
| No unresolved P0/P1 defects | 0 open | 0 open | **PASS** |
| tsc --noEmit backend + frontend | 0 errors | 0 errors | **PASS** |
| lint:new | 0 errors | 0 errors (52 pre-existing warnings unchanged) | **PASS** |
| Smoke: guard | PASS | PASS | **PASS** |
| Smoke: org-invites | PASS | PASS | **PASS** |
| Smoke: customer-journey | PASS | PASS | **PASS** |
| Smoke: ui-acceptance | 15/15 PASS | 15/15 PASS | **PASS** |

---

## Final Status

**open_issues = 0**

All P0/P1 issues from both the original stabilization plan and the post-memo verification
are now closed on `main`. The platform is confirmed ready for the Week 3 controlled pilot launch.
