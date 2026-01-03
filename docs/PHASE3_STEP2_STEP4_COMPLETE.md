# Phase 3 Step 2 & Step 4 Implementation Complete

## Summary

Completed Step 2 (Capacity Math Normalization) and Step 4 (Allocation Recompute) as the foundation for Phase 3.

## Step 2: Capacity Math Normalization ✅

### Changes Made

1. **Created `CapacityMathHelper.toPercentOfWeek()`** - Single source of truth function
   - Handles PERCENT units (returns allocationPercentage directly)
   - Handles HOURS units (converts using resource.capacityHoursPerWeek, fallback 40)
   - Rounds to 2 decimals
   - Location: `zephix-backend/src/modules/resources/helpers/capacity-math.helper.ts`

2. **Integrated helper everywhere:**
   - ✅ Allocation creation (`ResourceAllocationService.create()`)
   - ✅ Conflict detection (`checkDailyAllocation()`)
   - ✅ Conflict row creation (`createConflictRowsIfNeeded()`)
   - ✅ Governance checks (`validateGovernance()`)
   - ✅ Capacity rollups (`getCapacityResources()`)

3. **Removed hardcoded 40s:**
   - All capacity calculations now use `resource.capacityHoursPerWeek` with fallback to 40 only in helper
   - No hardcoded assumptions outside the helper

### Files Changed
- `zephix-backend/src/modules/resources/helpers/capacity-math.helper.ts` (created)
- `zephix-backend/src/modules/resources/resource-allocation.service.ts`
- `zephix-backend/src/modules/resources/resources.service.ts`

## Step 4: Allocation Recompute ✅

### Changes Made

1. **Created `recomputeConflicts()` method**
   - Recomputes conflicts for a resource over a date range
   - Uses `CapacityMathHelper` for consistent math
   - Upserts conflicts when total > 100%
   - Deletes conflicts when total <= 100% (both resolved and unresolved)
   - Updates affectedProjects with normalized percentages

2. **Wired into `update()` method**
   - Checks for HARD breach before saving (returns 409)
   - Recomputes conflicts for impacted window (old range ∪ new range)
   - Non-blocking (catches errors, doesn't fail update)

3. **Wired into `remove()` method**
   - Recomputes conflicts for deleted window
   - Non-blocking (catches errors, doesn't fail delete)

4. **HARD breach protection**
   - On create: Already implemented (returns 409)
   - On update: Now checks before save, returns 409 if breach
   - Uses `checkDailyAllocation()` which uses `CapacityMathHelper`

### Files Changed
- `zephix-backend/src/modules/resources/resource-allocation.service.ts`

## Key Behaviors

### Capacity Math
- **Mixed units**: HOURS and PERCENT allocations on same dates produce consistent totals
- **Resource capacity**: Uses `resource.capacityHoursPerWeek` (default 40 if missing)
- **Single source of truth**: All calculations go through `CapacityMathHelper.toPercentOfWeek()`

### Conflict Recompute
- **Upsert**: If total > 100%, create or update conflict row
- **Delete**: If total <= 100%, delete conflict row (conflict no longer exists)
- **Resolved conflicts**: Deleted when conflict disappears (user must reopen if needed)
- **Window**: Covers both old and new date ranges on update

### HARD Protection
- **Create**: Blocks with 409 if would exceed 100%
- **Update**: Blocks with 409 if changing to HARD or updating HARD allocation would exceed 100%
- **Uses normalized math**: All calculations use `CapacityMathHelper`

## Next Steps

1. **Step 1 & Step 3 Tests**: Add e2e tests for workspace scoping and conflict lifecycle
2. **Step 5**: Create Phase 3 verification script
3. **Frontend**: Implement MVP UI (separate task)

## Testing Commands

```bash
# Run unit tests
cd zephix-backend
npm run test

# Run e2e tests
npm run test:e2e

# Run specific e2e suite
npm run test:e2e -- resources-phase2.e2e-spec.ts
```

## Migration

Run migration for conflict lifecycle fields:
```bash
cd zephix-backend
npm run migration:run
```

Migration file: `zephix-backend/src/migrations/1767376476696-AddConflictLifecycleFields.ts`

