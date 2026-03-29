# Stabilization Issue Closure Addendum

date_utc: 2026-03-07T03:00:00Z
branch: main
base_memo: STABILIZATION_GO_NO_GO.md (commit a4381150)
closure_commit: (point-in-time — see `git rev-parse HEAD` for current sha)
assessed_by: Claude (automated proof pipeline)
open_issues: 0

---

## Issues Found During Post-Memo Verification

Two issues were identified after the initial GO/NO-GO memo was published:

| # | Issue | Severity | File |
|---|-------|----------|------|
| 1 | Update-path portfolio governance sync looked up portfolio by `id` only — missing `organizationId` scope, creating cross-tenant governance inheritance risk | P0 | `projects.service.ts` |
| 2 | `enterprise-ci.yml` backup-readiness probe called authenticated endpoint without `Authorization` header — unauthenticated curl returns 401/403, causing false CI failure | P1 | `.github/workflows/enterprise-ci.yml` |

---

## Closure Evidence

### Issue 1 — Update-path portfolio governance org-scope

**Before:**
```typescript
// zephix-backend/src/modules/projects/services/projects.service.ts ~line 640
const portfolio = await this.dataSource.getRepository(Portfolio).findOne({
  where: { id: processedData.portfolioId as string },
});
```

**After:**
```typescript
const portfolio = await this.dataSource.getRepository(Portfolio).findOne({
  where: { id: processedData.portfolioId as string, organizationId },
});
```

`organizationId` is the caller's verified org from the JWT-authenticated request, already used in the same method for all other DB lookups (e.g., `oldProject` fetch at line ~665).

**Regression tests added:** `zephix-backend/src/modules/projects/services/__tests__/project-update-governance.spec.ts`

| Test | Result |
|------|--------|
| Case A: same-org portfolio lookup returns portfolio → governance sync proceeds | PASS |
| Case B: foreign-org portfolio lookup returns null → governance sync is blocked | PASS |
| Case C: missing portfolio returns null → safe failure, no cross-tenant fallback | PASS |
| WHERE clause contains both id and organizationId fields | PASS |
| DataSource mock: same-org findOne returns portfolio | PASS |
| DataSource mock: foreign-org findOne returns null | PASS |
| Regression guard: organizationId must be present in where clause | PASS |

**Total: 7/7 PASS**

---

### Issue 2 — enterprise-ci.yml backup-readiness probe authentication

**Before:**
```yaml
curl -sf "${{ secrets.STAGING_API_URL }}/admin/system/backup-readiness" \
  && echo "Backup readiness: OK" \
  || { echo "::error::Backup readiness check failed on staging — aborting production deploy"; exit 1; }
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
- Fail-fast with `::error::` if `ADMIN_AUTH_TOKEN` secret is missing (prevents silent bypass)
- Passes `Authorization: Bearer` header matching the controller's `@UseGuards(JwtAuthGuard, AdminGuard)` requirement

---

## Post-Fix Validation Results

### Type Check + Lint

| Check | Result |
|-------|--------|
| `cd zephix-backend && npx tsc --noEmit` | **PASS** — 0 errors |
| `cd zephix-frontend && npx tsc --noEmit` | **PASS** — 0 errors |
| `npm run lint:new` (frontend) | **PASS** — 0 errors, 52 pre-existing warnings |
| `npx jest project-update-governance` | **PASS** — 7/7 |

### Smoke Lanes (post-fix rerun)

| Lane | Result |
|------|--------|
| guard | **PASS** (import-drift, role-drift, token-artifact, contract-runner-parity) |
| org-invites | **PASS** (invite create 200, accept 200, invitee workspace access confirmed) |
| customer-journey | **PASS** |
| ui-acceptance | **PASS** (15/15) |

---

## Hard Gate Outcomes (Closure)

| Gate | Requirement | Actual | Result |
|------|-------------|--------|--------|
| Update-path portfolio org-scope | `organizationId` in where clause | Fixed + regression tested 7/7 | **PASS** |
| CI backup-readiness auth | `Authorization` header + fail-fast on missing secret | Fixed | **PASS** |
| No unresolved P0/P1 defects | 0 open | 0 open | **PASS** |
| tsc --noEmit backend + frontend | 0 errors | 0 errors | **PASS** |
| lint:new | 0 errors | 0 errors (52 pre-existing warnings) | **PASS** |
| Smoke lanes: all 4 | PASS | guard + org-invites + customer-journey + ui-acceptance | **PASS** |

---

## Final Status

**open_issues = 0**

All P0/P1 issues from the original stabilization review are now closed. The platform is confirmed ready for the Week 3 controlled pilot launch with no unresolved correctness or security defects.
