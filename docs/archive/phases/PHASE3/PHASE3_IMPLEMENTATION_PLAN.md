# Phase 3 Implementation Plan

## Overview
Turn the resource engine into a real planning loop: Create, plan, detect, resolve, and report.

## Implementation Status

### Step 1: API Contract Hardening ✅ (Complete)
- [x] Created `WorkspaceScopeHelper` for workspace validation
- [x] Updated `ResourceAllocationController` to require `x-workspace-id` header
- [x] Updated `ResourcesController` workspace-scoped endpoints (conflicts, capacity)
- [x] Added workspace validation to all workspace-scoped endpoints
- [x] Consistent error codes (401, 403, 404, 409) with requestId
- [x] Added e2e tests for workspace scoping (missing header, invalid UUID, wrong workspace, valid header)
- **Note:** All workspace-scoped endpoints require `x-workspace-id` header

### Step 2: Capacity Math Correctness ✅ (Complete)
- [x] Created `CapacityMathHelper.toPercentOfWeek()` - single source of truth
- [x] Integrated helper into allocation creation (uses resource.capacityHoursPerWeek)
- [x] Updated capacity rollup calculations to use helper
- [x] Updated conflict detection to use helper
- [x] Updated governance checks to use helper
- [x] Removed hardcoded 40s (only in helper as fallback)

### Step 3: Conflict Lifecycle ✅ (Complete)
- [x] Create migration for `resolved_by_user_id` and `resolution_note` columns
- [x] Update `ResourceConflict` entity
- [x] Add `PATCH /api/resources/conflicts/:id/resolve` endpoint
- [x] Add `PATCH /api/resources/conflicts/:id/reopen` endpoint
- [x] Add structured logging for resolve/reopen (audit events)
- [x] Add e2e tests (resolve, reopen, access control)

### Step 4: Allocation Update/Delete Recompute ✅ (Complete)
- [x] Created `recomputeConflicts()` method
- [x] Updated `ResourceAllocationService.update()` to recompute conflicts (impacted window)
- [x] Updated `ResourceAllocationService.remove()` to recompute conflicts (deleted window)
- [x] HARD patch that breaches returns 409 (checked before save)
- [x] Upserts conflicts when total > 100%
- [x] Deletes conflicts when total <= 100% (both resolved and unresolved)

### Step 5: Verification Scripts ✅ (Complete)
- [x] Created `scripts/phase3-deploy-verify.sh`
- [x] Added checks for resolve/reopen endpoints
- [x] Added checks for conflict recompute on patch/delete
- [x] Added mixed units test case
- [x] Added HARD breach negative test (409)

## Files Changed

### Created:
- `zephix-backend/src/modules/resources/helpers/workspace-scope.helper.ts`
- `zephix-backend/src/modules/resources/helpers/capacity-math.helper.ts`
- `zephix-backend/src/migrations/1767376476696-AddConflictLifecycleFields.ts`
- `scripts/phase3-deploy-verify.sh`
- `docs/PHASE3_IMPLEMENTATION_PLAN.md`
- `docs/PHASE3_STEP2_STEP4_COMPLETE.md`
- `docs/PHASE3_STEP1_STEP3_STEP5_COMPLETE.md`

### Modified:
- `zephix-backend/src/modules/resources/resource-allocation.controller.ts`
- `zephix-backend/src/modules/resources/resources.controller.ts`
- `zephix-backend/src/modules/resources/resource-allocation.service.ts`
- `zephix-backend/src/modules/resources/resources.service.ts`
- `zephix-backend/src/modules/resources/entities/resource-conflict.entity.ts`
- `zephix-backend/test/resources-phase2.e2e-spec.ts`

## Phase 3 Status: ✅ COMPLETE

All steps implemented and tested:
- ✅ Step 1: API Contract Hardening (workspace scoping + tests)
- ✅ Step 2: Capacity Math Normalization
- ✅ Step 3: Conflict Lifecycle (migration + endpoints + tests)
- ✅ Step 4: Allocation Recompute
- ✅ Step 5: Verification Script

## Testing Commands

### Run E2E Tests
```bash
cd zephix-backend
npm run test:e2e -- resources-phase2.e2e-spec.ts
```

### Run Verification Script
```bash
export BASE="https://zephix-backend-production.up.railway.app"
export TOKEN="your-token"
bash scripts/phase3-deploy-verify.sh
```

### Run Migration
```bash
cd zephix-backend
npm run migration:run
```

