# Phase 4A — Organization Command Center — Proof Document

## Summary

Cross-workspace executive analytics dashboard. Platform ADMIN only. Read-only.
Reuses existing tables and services. No logic duplication. Strict org scoping.

---

## Endpoints

| Method | Path | Access | Rate Limit Tier | Description |
|--------|------|--------|-----------------|-------------|
| GET | `/org/analytics/summary` | ADMIN | standard | Workspace/project/portfolio counts, BAC-weighted CPI/SPI, plan info |
| GET | `/org/analytics/capacity` | ADMIN | compute | Weekly utilization by workspace, top 20 overallocated users |
| GET | `/org/analytics/storage` | ADMIN | standard | Storage by workspace, percent used, top 10 by usage |
| GET | `/org/analytics/scenarios` | ADMIN | standard | Scenario counts, last-30-day breakdown, compute runs |
| GET | `/org/analytics/audit` | ADMIN | standard | Audit event counts, top actions, top workspaces |

All endpoints:
- Require JwtAuthGuard
- Enforce PlatformRole.ADMIN (MEMBER → 403, VIEWER → 403)
- Scope all queries by organizationId
- Include `X-Zephix-Org-Warning` header when org exceeds thresholds
- Return DTOs (never raw entities)
- Log elapsedMs via AppLogger context ORG_ANALYTICS

---

## Files Created

### Backend (11 files)

| File | Purpose |
|------|---------|
| `src/modules/organization-analytics/organization-analytics.module.ts` | Module registration |
| `src/modules/organization-analytics/controllers/organization-analytics.controller.ts` | 5 admin-only routes |
| `src/modules/organization-analytics/services/organization-analytics.service.ts` | Aggregation service |
| `src/modules/organization-analytics/dto/org-analytics-summary.dto.ts` | Summary DTO |
| `src/modules/organization-analytics/dto/org-analytics-capacity.dto.ts` | Capacity DTO |
| `src/modules/organization-analytics/dto/org-analytics-storage.dto.ts` | Storage DTO |
| `src/modules/organization-analytics/dto/org-analytics-scenarios.dto.ts` | Scenarios DTO |
| `src/modules/organization-analytics/dto/org-analytics-audit.dto.ts` | Audit DTO |
| `src/modules/organization-analytics/dto/index.ts` | Barrel export |
| `src/modules/organization-analytics/__tests__/organization-analytics.service.spec.ts` | 30 service tests |
| `src/modules/organization-analytics/__tests__/organization-analytics.controller.spec.ts` | 21 controller tests |
| `src/modules/organization-analytics/__tests__/dto-shape.spec.ts` | 5 DTO shape tests |

### Frontend (4 files)

| File | Purpose |
|------|---------|
| `src/features/org-dashboard/orgDashboard.api.ts` | API client (5 functions) |
| `src/features/org-dashboard/OrgDashboardPage.tsx` | Dashboard page |
| `src/features/org-dashboard/__tests__/org-dashboard.gating.test.tsx` | 6 gating tests |
| `src/features/org-dashboard/__tests__/org-dashboard.render.test.tsx` | 7 render tests |

## Files Modified

| File | Change | Why |
|------|--------|-----|
| `src/app.module.ts` | Import OrganizationAnalyticsModule | Register module in SKIP_DATABASE block |
| `zephix-frontend/src/App.tsx` | Import OrgDashboardPage, add route | Wire /org-dashboard under AdminRoute |

---

## Role Gating Evidence

Controller enforces ADMIN via `normalizePlatformRole(auth.platformRole)` check against `PlatformRole.ADMIN`.
Tests verify:
- ADMIN → 200 (all 5 endpoints)
- MEMBER → ForbiddenException with AUTH_FORBIDDEN code
- VIEWER → ForbiddenException with AUTH_FORBIDDEN code
- Error code is always `AUTH_FORBIDDEN`

Frontend page checks `user.platformRole.toUpperCase() === 'ADMIN'`.
Tests verify:
- MEMBER → redirects to /home
- VIEWER → redirects to /home
- No user → redirects to /login
- Loading → returns null (no flash)

---

## Query Scoping Evidence

Every SQL query in `OrganizationAnalyticsService` includes `organization_id = $1` in WHERE.
Test suite `org isolation` verifies:
- `getSummary` passes ORG_ID to all queries, never OTHER_ORG_ID
- `getStorage` scopes by orgId
- `getAuditSummary` scopes by orgId

---

## Test Results

### Backend: 56 tests, 3 suites

| Suite | Tests |
|-------|-------|
| organization-analytics.service.spec.ts | 30 |
| organization-analytics.controller.spec.ts | 21 |
| dto-shape.spec.ts | 5 |

### Frontend: 13 tests, 2 suites

| Suite | Tests |
|-------|-------|
| org-dashboard.gating.test.tsx | 6 |
| org-dashboard.render.test.tsx | 7 |

### Total Phase 4A tests: 69

---

## Compilation

```
Backend:  npx tsc --noEmit → exit 0
Frontend: npx tsc --noEmit → exit 0
```

## Regression

| Metric | Baseline (pre-4A) | After 4A | Delta |
|--------|-------------------|----------|-------|
| Backend passing suites | 106 | 109 | +3 |
| Backend passing tests | 1016 | 1072 | +56 |
| Backend failing suites | 22 | 22 | 0 (pre-existing) |
| work-management regression | 29 suites / 254 tests | 29/254 | 0 |

---

## No New Dependencies

Zero dependencies added. All imports reference existing platform modules.

## No String Literal Roles

- Controller uses `PlatformRole.ADMIN` from `platform-roles.enum.ts`
- Error uses `ErrorCode.AUTH_FORBIDDEN` from `error-codes.ts`
- Rate limit uses `PlanRateLimit('standard')` from config

## No Raw Entities

All endpoints return typed DTOs with explicit defaults and timestamps.

## Performance

- Large org detection: warn when workspaces > 25 or projects > 500
- `X-Zephix-Org-Warning` header set on large org responses
- elapsedMs logged per endpoint via AppLogger
- All queries use aggregate SQL (COUNT, SUM) — no task graph loading
