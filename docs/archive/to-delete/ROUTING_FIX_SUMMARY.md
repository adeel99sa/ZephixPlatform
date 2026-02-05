# Routing Fix Summary

## Problem
GET `/api/resources/conflicts` was returning 404 "Resource not found" because NestJS was matching it to the dynamic route `@Get(':id')` with `id="conflicts"`.

## Root Cause
In `ResourcesController`, the dynamic route `@Get(':id')` was registered **before** the static route `@Get('conflicts')`. NestJS matches routes in order, so the first match wins.

## Solution
Moved all static routes **before** all dynamic routes in `ResourcesController`:

**Static routes (moved up):**
- `@Get('conflicts')` - now before `@Get(':id')`
- `@Get('capacity/resources')` - now before `@Get(':id')`
- All other static routes were already in correct position

**Dynamic routes (remain after static):**
- `@Get(':id')`
- `@Patch(':id')`
- `@Get(':id/capacity-breakdown')`
- `@Get(':id/allocation')`
- etc.

## Changes Made

### Files Changed:
1. `zephix-backend/src/modules/resources/resources.controller.ts`
   - Moved `@Get('conflicts')` before `@Get(':id')`
   - Moved `@Get('capacity/resources')` before `@Get(':id')`
   - Added comment explaining route order requirement

2. `zephix-backend/test/resources-routing.e2e-spec.ts` (new)
   - E2E tests to lock routing correctness:
     - Test A: `/api/resources/conflicts` returns 200 or 403, never 404
     - Test B: `/api/resources/capacity/resources` returns 200 or 403, never 404
     - Test C: `/api/resources/:id` with random UUID returns 404 "Resource not found"

## Verification

### Before Fix:
```bash
curl -i "$BASE/api/resources/conflicts?resolved=false" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID"
```
**Result:** HTTP 404 "Resource not found"

### After Fix:
```bash
curl -i "$BASE/api/resources/conflicts?resolved=false" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID"
```
**Result:** HTTP 200 ✅

### Capacity Endpoint:
```bash
curl -i "$BASE/api/resources/capacity/resources?startDate=2026-01-01&endDate=2026-01-31" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID"
```
**Result:** HTTP 200 ✅

## Commit
- **Commit:** `4ae366e fix(resources): move static routes before dynamic routes to prevent 404 on conflicts endpoint`
- **Status:** Deployed and verified in production ✅

## Lessons Learned
1. **Always put static routes before dynamic routes** in NestJS controllers
2. **Route order matters** - NestJS matches in declaration order
3. **E2E tests catch routing issues** - add tests to lock correct behavior

