# Wave 3A Staging Smoke Report

**Date**: 2026-02-15T21:05:52Z
**Tag**: v0.6.0-rc.22
**Staging URL**: `https://zephix-backend-v2-staging.up.railway.app`
**Git SHA**: `1ae4ce0e`
**Latest Migration**: `CreateWave3ATables17980248000000` (128 total)

## Results: 12/12 PASS

### 0. Infrastructure

| Check | Result |
|-------|--------|
| `/api/health/ready` | 200 OK — db: ok, schema: ok |
| `/api/system/identity` | env=staging, migration=CreateWave3ATables17980248000000, count=128 |

### 1. Authentication

| Step | Result |
|------|--------|
| CSRF token | Acquired |
| Login demo@zephix.ai | 200 — token (347 chars) |

### 2. Project Creation

| Step | Result |
|------|--------|
| Create project | `51c40776-5d8e-463b-8a27-d64911bc6906` created |

### 3. Change Requests (full lifecycle)

| Step | Expected | Actual | Result |
|------|----------|--------|--------|
| POST /change-requests | status=DRAFT | DRAFT | PASS |
| POST /change-requests/:id/submit | status=SUBMITTED | SUBMITTED | PASS |
| POST /change-requests/:id/approve | status=APPROVED | APPROVED | PASS |
| GET /change-requests | count >= 1 | 1 | PASS |

**CR ID**: `a6ef9879-4b79-4a07-9075-0f33df6a9603`

### 4. Documents (CRUD + version)

| Step | Expected | Actual | Result |
|------|----------|--------|--------|
| POST /documents | version=1 | 1 | PASS |
| PATCH /documents/:id | version=2 | 2 | PASS |

**Doc ID**: `48be73de-a374-436b-83b2-ebc66a54653b`

### 5. Budget (upsert + persistence)

| Step | Expected | Actual | Result |
|------|----------|--------|--------|
| GET /budget (auto-create) | baselineBudget=0.00 | 0.00 | PASS |
| PATCH /budget | baselineBudget=250000.00 | 250000.00 | PASS |
| GET /budget (verify) | baseline=250000.00, contingency=25000.00 | 250000.00, 25000.00 | PASS |

## Fixes Applied During Verification

1. **Domain mismatch**: Was hitting `zephix-backend-staging.up.railway.app` (404). Correct domain is `zephix-backend-v2-staging.up.railway.app`.
2. **Budget DTO validation**: `UpdateProjectBudgetDto` had no class-validator decorators, causing the global `ValidationPipe` (whitelist + forbidNonWhitelisted) to reject all properties. Fixed by adding `@IsOptional()` + `@IsString()` decorators.

## Raw Proof Files

- `health.json` — Health endpoint response
- `identity.json` — System identity response
- `cr-create.json` — Change request creation response
- `cr-submit.json` — Change request submit transition
- `cr-approve.json` — Change request approve transition
- `doc-create.json` — Document creation (version=1)
- `doc-update.json` — Document update (version=2)
- `budget-get-initial.json` — Budget auto-created (zeros)
- `budget-patch.json` — Budget patch response
- `budget-get-verify.json` — Budget persistence verification
