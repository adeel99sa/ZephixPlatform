# Wave 3B Staging Smoke Report — v0.6.0-rc.23

| Item | Status | Notes |
|------|--------|-------|
| **Tag** | `v0.6.0-rc.23` | |
| **Branch** | `feat/wave3b-frontend` | |
| **CI Pipeline** | GATING PASS | Backend 122 suites; Frontend 41 files / 398 tests |
| **Staging Backend** | v0.6.0-rc.22 deployed | Wave 3A backend already on staging |
| **Staging Smoke** | **14/14 PASS** | |

## Results: 14/14 PASS

### 0. Infrastructure

| Check | Result |
|-------|--------|
| `/api/health/ready` | 200 OK — db: ok, schema: ok |
| `/api/system/identity` | env=staging, migration=CreateWave3ATables17980248000000, count=128 |
| CSRF token | Acquired |
| Login demo@zephix.ai | 200 — user=8406d901 |
| Workspace resolution | dfbc9223 via /workspaces endpoint |
| Project creation | 1c26926e-83e4-4ad4-a40c-e88dc30aa8d1 |

### 1. Change Requests (full lifecycle)

| Step | Expected | Actual | Result |
|------|----------|--------|--------|
| POST /change-requests | status=DRAFT | DRAFT | PASS |
| POST /change-requests/:id/submit | status=SUBMITTED | SUBMITTED | PASS |
| POST /change-requests/:id/approve | status=APPROVED | APPROVED | PASS |
| POST /change-requests/:id/implement | status=IMPLEMENTED | IMPLEMENTED | PASS |

### 2. Documents (create + version)

| Step | Expected | Actual | Result |
|------|----------|--------|--------|
| POST /documents | version=1 | v1 | PASS |
| PATCH /documents/:id | version > 1 | v2 | PASS |

### 3. Budget (PATCH + persistence)

| Step | Expected | Actual | Result |
|------|----------|--------|--------|
| GET /budget | any | initial state | PASS |
| PATCH /budget | baselineBudget=500000.00 | 500000.00 | PASS |
| GET /budget (verify) | baselineBudget=500000.00 | 500000.00 | PASS |

## Frontend Changes Summary

### New Tabs
- **Change Requests**: List, create, submit, approve/reject/implement with workspace RBAC
- **Documents**: List, create with JSON content, edit (version increments), delete
- **Budget**: Delegates to Sprint 5 BudgetTab (EV metrics, baselines, actuals, policy thresholds)

### API Route Verification

| Module | Backend Controller | Frontend API Path | Match |
|--------|-------------------|-------------------|-------|
| Change Requests | `work/workspaces/:wsId/projects/:projId/change-requests` | `/work/workspaces/${wsId}/projects/${projectId}/change-requests` | ✅ |
| Documents | `work/workspaces/:wsId/projects/:projId/documents` | `/work/workspaces/${wsId}/projects/${projectId}/documents` | ✅ |
| Budget | `work/workspaces/:wsId/projects/:projId/budget` | `/work/workspaces/${wsId}/projects/${projectId}/budget` | ✅ |

### Entity Column Mapping Verification (SnakeNamingStrategy disabled)

All 3 entities use explicit `name: 'snake_case'` on every multi-word column.

### DTO Validation

Budget `UpdateProjectBudgetDto` uses `@Matches(/^\d+(\.\d{1,2})?$/)` — strict decimal for `numeric(12,2)`.

### RBAC

- CR approve/reject/implement: only workspace OWNER or ADMIN
- Tech debt: `mapPlatformRole()` has TODO for `WorkspaceAccessService` replacement

### Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| ProjectChangeRequestsTab.test.tsx | 6 | ✅ all pass |
| ProjectDocumentsTab.test.tsx | 5 | ✅ all pass |
| ProjectBudgetTab.test.tsx | 2 | ✅ all pass |
| **Gating total** | **41 files / 398 tests** | ✅ all pass |

---

*Report generated: 2026-02-15*
*Staging URL: https://zephix-backend-v2-staging.up.railway.app*
