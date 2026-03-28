# Phase 3A — Plan & Entitlement Engine: Proof Document

## Objective
Introduce plan model at Organization level, central entitlement registry, quota enforcement, feature gating via backend guard, storage tracking for attachments, soft + hard limits, zero regression to existing features.

---

## 1. Migration

**File:** `src/migrations/18000000000007-PlanAndEntitlements.ts`

### Changes
- **organizations** table: Added `plan_code` (varchar, default 'enterprise'), `plan_status` (varchar, default 'active'), `plan_expires_at` (timestamptz nullable), `plan_metadata` (jsonb nullable)
- CHECK constraints: `plan_code IN ('free','team','enterprise','custom')`, `plan_status IN ('active','past_due','canceled')`
- Indexes: `IDX_organizations_plan_code`, `IDX_organizations_plan_status`
- **workspace_storage_usage** table: New table for atomic storage tracking per workspace
- All DDL idempotent (ADD COLUMN IF NOT EXISTS, DO $$ EXCEPTION WHEN duplicate_object)

### Backward Compatibility
- All existing organizations default to `planCode = 'enterprise'`, `planStatus = 'active'`
- No breaking changes to existing queries

---

## 2. Entity Updates

| File | Changes |
|------|---------|
| `organizations/entities/organization.entity.ts` | Added `planCode`, `planStatus`, `planExpiresAt`, `planMetadata` |
| `modules/billing/entities/workspace-storage-usage.entity.ts` | **New** — `WorkspaceStorageUsage` entity |

---

## 3. Entitlement Registry

**File:** `modules/billing/entitlements/entitlement.registry.ts`

### Plan Definitions

| Feature / Limit | FREE | TEAM | ENTERPRISE | CUSTOM |
|---|---|---|---|---|
| capacity_engine | false | true | true | true |
| what_if_scenarios | false | false | true | true |
| portfolio_rollups | false | true | true | true |
| attachments | true | true | true | true |
| board_view | true | true | true | true |
| max_projects | 3 | 20 | unlimited | unlimited |
| max_portfolios | 1 | 5 | unlimited | unlimited |
| max_scenarios | 0 | 0 | unlimited | unlimited |
| max_storage_bytes | 500 MB | 5 GB | 100 GB | unlimited |
| api_rate_multiplier | 1 | 2 | 10 | 10 |

**No magic numbers outside this file.**

---

## 4. Entitlement Service

**File:** `modules/billing/entitlements/entitlement.service.ts`

### Methods
- `resolve(orgId)` — Full entitlement set, cached per request
- `hasFeature(orgId, key)` — Boolean feature check
- `getLimit(orgId, key)` — Numeric limit (null = unlimited)
- `assertFeature(orgId, key)` — Throws 403 `ENTITLEMENT_REQUIRED`
- `assertWithinLimit(orgId, key, currentValue)` — Throws 403 `{KEY}_LIMIT_EXCEEDED`
- `getPlanCode(orgId)` — Returns PlanCode enum
- `getPlanStatus(orgId)` — Returns status string

### Custom Plan Support
- `PlanCode.CUSTOM` inherits enterprise defaults
- Overrides applied from `organization.plan_metadata` JSONB

---

## 5. Guards

### RequireEntitlement Decorator
**File:** `modules/billing/entitlements/require-entitlement.guard.ts`

Usage: `@RequireEntitlement('capacity_engine')` on controller class or method.

**Applied to:**
- `CapacityAnalyticsController` → `capacity_engine`
- `CapacityCalendarController` → `capacity_engine`
- `CapacityLevelingController` → `capacity_engine`
- `ScenariosController` → `what_if_scenarios`
- `PortfolioAnalyticsController` → `portfolio_rollups`
- `AttachmentsController` → `attachments`

### PlanStatusGuard (Global)
**File:** `modules/billing/entitlements/plan-status.guard.ts`

Registered as `APP_GUARD` in AppModule after `CsrfGuard`.
- GET/HEAD/OPTIONS: Always allowed (read-only)
- POST/PUT/PATCH/DELETE: Blocked with `PLAN_INACTIVE` when `planStatus != 'active'`

---

## 6. Quota Enforcement

| Resource | Service | Check Location |
|---|---|---|
| Projects | `ProjectsService.createProject()` | Before workspace validation |
| Portfolios | `PortfoliosService.create()` | Before entity creation |
| Scenarios | `ScenariosService.create()` | Before plan creation |
| Storage | `AttachmentsService.createPresign()` | Before presigned URL generation |

### Storage Tracking
- `incrementStorageUsage()` called on `completeUpload`
- `decrementStorageUsage()` called on `deleteAttachment`
- Atomic SQL operations via QueryBuilder
- Organization-wide aggregation via `getOrgStorageUsed()`

---

## 7. Frontend Plan Endpoint

**Endpoint:** `GET /billing/org-plan`

**Response:**
```json
{
  "data": {
    "planCode": "enterprise",
    "limits": { "max_projects": null, "max_portfolios": null, "max_scenarios": null, "max_storage_bytes": 107374182400 },
    "features": { "capacity_engine": true, "what_if_scenarios": true, "portfolio_rollups": true, "attachments": true, "board_view": true }
  }
}
```

---

## 8. Stripe Readiness Stubs

| Endpoint | Status |
|---|---|
| `POST /billing/checkout-session` | 501 `STRIPE_NOT_CONFIGURED` |
| `POST /billing/webhook` | 501 `STRIPE_NOT_CONFIGURED` |
| `POST /billing/portal` | 501 `STRIPE_NOT_CONFIGURED` |

Structure ready for Stripe SDK integration.

---

## 9. Files Created

| File | Purpose |
|------|---------|
| `src/migrations/18000000000007-PlanAndEntitlements.ts` | Migration |
| `src/modules/billing/entitlements/plan-code.enum.ts` | PlanCode enum |
| `src/modules/billing/entitlements/entitlement.registry.ts` | Plan definitions |
| `src/modules/billing/entitlements/entitlement.service.ts` | Entitlement resolution |
| `src/modules/billing/entitlements/require-entitlement.guard.ts` | Decorator + guard |
| `src/modules/billing/entitlements/plan-status.guard.ts` | Global plan status guard |
| `src/modules/billing/entitlements/entitlements.module.ts` | NestJS module (global) |
| `src/modules/billing/entities/workspace-storage-usage.entity.ts` | Storage tracking entity |
| `src/modules/billing/entitlements/__tests__/entitlement.registry.spec.ts` | 23 tests |
| `src/modules/billing/entitlements/__tests__/entitlement.service.spec.ts` | 24 tests |
| `src/modules/billing/entitlements/__tests__/require-entitlement.guard.spec.ts` | 5 tests |
| `src/modules/billing/entitlements/__tests__/plan-status.guard.spec.ts` | 10 tests |
| `src/modules/billing/entitlements/__tests__/quota-enforcement.spec.ts` | 17 tests |
| `src/modules/billing/entitlements/__tests__/backward-compat.spec.ts` | 9 tests |

## 10. Files Modified

| File | Change |
|------|--------|
| `organizations/entities/organization.entity.ts` | Plan fields added |
| `src/app.module.ts` | EntitlementsModule + PlanStatusGuard registered |
| `capacity-analytics.controller.ts` | `@RequireEntitlement('capacity_engine')` |
| `capacity-calendar.controller.ts` | `@RequireEntitlement('capacity_engine')` |
| `capacity-leveling.controller.ts` | `@RequireEntitlement('capacity_engine')` |
| `scenarios.controller.ts` | `@RequireEntitlement('what_if_scenarios')` |
| `portfolio-analytics.controller.ts` | `@RequireEntitlement('portfolio_rollups')` |
| `attachments.controller.ts` | `@RequireEntitlement('attachments')` |
| `projects.service.ts` | Project quota check in `createProject()` |
| `portfolios.service.ts` | Portfolio quota check in `create()` |
| `scenarios.service.ts` | Scenario quota check in `create()` |
| `attachments.service.ts` | Storage quota check + tracking |
| `attachments.module.ts` | WorkspaceStorageUsage entity registered |
| `billing.controller.ts` | org-plan endpoint + Stripe stubs |
| Test specs updated: `billing.controller.spec.ts`, `scenarios.service.spec.ts`, `attachments.service.spec.ts`, `projects.service.spec.ts` |

---

## 11. Test Results

### Phase 3A Entitlement Tests: **88 tests, 6 suites, all passing**
### All affected module tests: **500 tests, 47 suites, all passing**

```
Test Suites: 47 passed, 47 total
Tests:       500 passed, 500 total
```

### TypeScript Compilation
```
Backend:  npx tsc --noEmit  → exit 0
Frontend: npx tsc --noEmit  → exit 0
```

---

## 12. Security Checklist

- [x] All endpoints still require JwtAuthGuard (entitlement is additional layer)
- [x] Role guards unchanged (VIEWER still blocked where applicable)
- [x] Cross-org isolation maintained (all queries scoped by organizationId)
- [x] No string literal plan codes outside registry
- [x] No entitlement checks inline in controllers (guard or service only)
- [x] All quota checks inside service layer, not controller
- [x] PlanStatusGuard blocks writes for inactive plans
- [x] Storage tracking atomic via SQL QueryBuilder
- [x] No secrets in logs
- [x] No regression in 2A-2H engines

---

## 13. Self-Audit Findings (Fixed)

### Bug 1: Singleton cache serving stale entitlements
**Found:** `EntitlementService` used an in-memory `Map` cache, but NestJS default scope is SINGLETON, not REQUEST. Plan upgrades would not take effect until server restart.
**Fixed:** Removed in-memory cache entirely. DB query is lightweight (single row, 4 columns, PK lookup). Roadmap: add short-TTL cache in Phase 3+.

### Bug 2: Storage increment double-counting
**Found:** `incrementStorageUsage()` used two sequential operations — an INSERT with `orUpdate` (which *replaces*) followed by an UPDATE (which *adds*). This would double-count on first upload and produce incorrect counts on subsequent uploads.
**Fixed:** Replaced with single atomic `INSERT ... ON CONFLICT DO UPDATE SET used_bytes = used_bytes + $3` raw SQL query. No double-count possible.

### Bug 3: Placeholder test assertions
**Found:** Two tests in `backward-compat.spec.ts` used `expect(true).toBe(true)` and minimal `toBeDefined()` checks — effectively testing nothing.
**Fixed:** Replaced with real assertions: verifying `findOne` select clause only reads plan fields, and verifying returned entitlement object does not leak org entity fields.

---

## 14. Non-Negotiable Rules Compliance

| Rule | Status |
|------|--------|
| No string literal plan codes except registry | PASS |
| No entitlement checks inline in controllers | PASS |
| Always use guard or entitlementService | PASS |
| All quota checks inside service layer | PASS |
| All migrations idempotent | PASS |
| All tests passing | PASS (500 tests, 47 suites) |
| tsc clean | PASS (backend + frontend) |
| No regression in 2A-2H | PASS |
| No placeholder code | PASS (audit-verified) |
