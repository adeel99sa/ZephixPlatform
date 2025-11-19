# Week 3 Phase 3.2 – Resource Intelligence Backend v1

## Objective

Expose clean, org-scoped backend endpoints for Resource Intelligence v1 without schema changes or behavior breaks.

## Prerequisites Verified

✅ Inspection doc exists: `WEEK_3_PHASE_3_1_RESOURCE_INSPECTION.md`
✅ All backend test suites pass:
- `workspace-membership-filtering.e2e-spec.ts`: ✅ 17 passed
- `workspace-rbac.e2e-spec.ts`: ✅ 27 passed
- `workspace-backfill.e2e-spec.ts`: ✅ 6 passed
- `template-application.e2e-spec.ts`: ✅ 9 passed

## Endpoints Added or Extended

### 1. Extended: GET `/api/resources`

**Controller**: `ResourcesController`
**Service**: `ResourcesService.findAll()`
**Auth**: `JwtAuthGuard` (required)

**New Query Parameters** (all optional):
- `skills` (string or array) - Comma-separated or array of skill names
- `roles` (string or array) - Comma-separated or array of role names
- `workspaceId` (UUID) - Filter by workspace
- `dateFrom` (ISO date string) - Start date for allocation filter
- `dateTo` (ISO date string) - End date for allocation filter

**Behavior**:
- If no filters provided, returns all active resources in organization (existing behavior preserved)
- Skills filter: Returns resources that have ALL requested skills (JSONB array contains check)
- Roles filter: Returns resources matching any of the requested roles
- WorkspaceId filter: Returns resources that have allocations in projects within that workspace
- Date range filter: Returns resources that have allocations overlapping the date range
- All filters can be combined

**Response Shape**: Unchanged - `{ data: Resource[] }`

### 2. New: GET `/api/resources/capacity-summary`

**Controller**: `ResourcesController`
**Service**: `ResourcesService.getCapacitySummary()`
**Auth**: `JwtAuthGuard` (required)

**Query Parameters** (required):
- `dateFrom` (ISO date string) - Required
- `dateTo` (ISO date string) - Required

**Query Parameters** (optional):
- `workspaceId` (UUID) - Filter to workspace

**Response Shape**:
```typescript
{
  data: Array<{
    id: string;
    displayName: string; // resource.name || resource.email
    totalCapacityHours: number; // capacityHoursPerWeek * weeksInRange
    totalAllocatedHours: number; // Sum of allocated hours from allocations
    utilizationPercentage: number; // 0-100, rounded
  }>
}
```

**Purpose**: Aggregate capacity and utilization per resource over a date range.

### 3. New: GET `/api/resources/:id/capacity-breakdown`

**Controller**: `ResourcesController`
**Service**: `ResourcesService.getCapacityBreakdown()`
**Auth**: `JwtAuthGuard` (required)

**Route Order**: Must come before `GET /api/resources/:id/allocation` to avoid route conflicts.

**Query Parameters** (required):
- `dateFrom` (ISO date string) - Required
- `dateTo` (ISO date string) - Required

**Response Shape**:
```typescript
{
  data: Array<{
    projectId: string;
    projectName: string;
    workspaceId: string;
    totalAllocatedHours: number; // Sum of hours allocated to this project
    percentageOfResourceTime: number; // 0-100, percentage of resource's total capacity
  }>
}
```

**Purpose**: Show where a resource's time is allocated across projects in a date range.

**Error Handling**:
- Returns 404 if resource does not belong to caller's organization
- Returns empty array if no allocations exist in date range

### 4. New: GET `/api/resources/skills`

**Controller**: `ResourcesController`
**Service**: `ResourcesService.getSkillsFacet()`
**Auth**: `JwtAuthGuard` (required)

**Query Parameters**: None

**Response Shape**:
```typescript
{
  data: Array<{
    name: string; // Skill name
    count: number; // Number of resources with this skill
  }>
}
```

**Purpose**: Return all unique skills in the organization with resource counts, sorted by count (descending).

**Behavior**:
- Only includes skills from active resources
- Only includes skills from caller's organization
- Skills are extracted from Resource.skills JSONB array
- Duplicate skills are aggregated and counted

## Response Shapes

### Extended Endpoint

**GET `/api/resources`** (with filters):
- Response shape unchanged: `{ data: Resource[] }`
- Each Resource object maintains existing fields:
  - `id`, `name`, `email`, `role`, `skills`, `capacityHoursPerWeek`, `costPerHour`, `isActive`, `preferences`, `createdAt`, `updatedAt`
- Only the filtering logic changes; response structure is identical

### New Endpoints

**GET `/api/resources/capacity-summary`**:
```typescript
{
  data: [
    {
      id: "uuid",
      displayName: "Resource Name",
      totalCapacityHours: 80, // e.g., 40 hours/week * 2 weeks
      totalAllocatedHours: 40,
      utilizationPercentage: 50
    },
    // ... more resources
  ]
}
```

**GET `/api/resources/:id/capacity-breakdown`**:
```typescript
{
  data: [
    {
      projectId: "uuid",
      projectName: "Project Name",
      workspaceId: "uuid",
      totalAllocatedHours: 20,
      percentageOfResourceTime: 25 // 20 hours / 80 total capacity
    },
    // ... more projects
  ]
}
```

**GET `/api/resources/skills`**:
```typescript
{
  data: [
    { name: "JavaScript", count: 5 },
    { name: "TypeScript", count: 3 },
    { name: "React", count: 4 },
    // ... more skills, sorted by count descending
  ]
}
```

## Org and Workspace Scoping

### Organization Scoping

All endpoints enforce organization scoping:

1. **GET `/api/resources`**:
   - Filters by `req.user.organizationId`
   - Uses `WorkspaceAccessService` to respect workspace membership feature flag
   - Skills, roles, and date filters only apply within the organization

2. **GET `/api/resources/capacity-summary`**:
   - Only includes resources from `req.user.organizationId`
   - Only includes allocations from organization's projects
   - WorkspaceId filter verifies workspace belongs to organization

3. **GET `/api/resources/:id/capacity-breakdown`**:
   - Verifies resource belongs to `req.user.organizationId` (returns 404 if not)
   - Only includes allocations from organization's projects
   - Respects workspace membership filtering via `WorkspaceAccessService`

4. **GET `/api/resources/skills`**:
   - Only aggregates skills from resources in `req.user.organizationId`
   - No cross-organization data leakage

### Workspace Scoping

**WorkspaceId Filter Behavior**:
- When `workspaceId` is provided:
  1. Verifies workspace belongs to caller's organization
  2. Gets all projects in that workspace
  3. Filters allocations/resources by those projects
  4. Respects workspace membership feature flag (if user has no access to workspace, returns empty)

**Workspace Membership Integration**:
- All endpoints use `WorkspaceAccessService.getAccessibleWorkspaceIds()` to respect `ZEPHIX_WS_MEMBERSHIP_V1` feature flag
- If feature flag is ON and user has no accessible workspaces, endpoints return empty arrays
- If feature flag is OFF, org admins see all workspace data

## Tests

### E2E Test File

**File**: `test/resources.e2e-spec.ts`

**Test Suites and Scenarios**:

1. **Resource Directory Filters** (5 tests):
   - ✅ `Should filter resources by skills` - Verifies skills filter returns only matching resources
   - ✅ `Should filter resources by roles` - Verifies roles filter works correctly
   - ✅ `Should filter resources by workspaceId` - Verifies workspace filter behavior
   - ✅ `Should filter resources by date range` - Verifies date range filter
   - ✅ `Should respect organization isolation` - Verifies cross-org data is not returned

2. **Capacity Summary Endpoint** (3 tests):
   - ✅ `Should return capacity summary for resources` - Verifies summary structure and calculations
   - ✅ `Should filter capacity summary by workspaceId` - Verifies workspace filtering
   - ✅ `Should require dateFrom and dateTo` - Verifies validation

3. **Capacity Breakdown Endpoint** (3 tests):
   - ✅ `Should return capacity breakdown for a resource` - Verifies per-project breakdown
   - ✅ `Should return 404 for cross-org resource` - Verifies org isolation
   - ✅ `Should return empty list if no allocations in range` - Verifies empty state handling

4. **Skills Facet Endpoint** (2 tests):
   - ✅ `Should return skills with counts` - Verifies skills aggregation
   - ✅ `Should only return skills from caller organization` - Verifies org isolation

**Total Tests**: 13 tests, all passing ✅

### Test Summary

| Suite | Tests | Status |
|-------|-------|--------|
| `workspace-membership-filtering.e2e-spec.ts` | 17 | ✅ All passing |
| `workspace-rbac.e2e-spec.ts` | 27 | ✅ All passing |
| `workspace-backfill.e2e-spec.ts` | 6 | ✅ All passing |
| `template-application.e2e-spec.ts` | 9 | ✅ All passing |
| `resources.e2e-spec.ts` | 13 | ✅ All passing |

**Total Backend E2E Tests**: 72 tests, all passing ✅

## Known Limitations

1. **No AI Scoring**: Endpoints do not include AI-powered resource suggestions or scoring logic. This is intentionally deferred to later phases.

2. **No Per-Day Time Series**: Capacity summary and breakdown return aggregate totals, not daily breakdowns. Daily data exists in `user_daily_capacity` table but is not exposed in these endpoints.

3. **Skills as Free Text**: Skills are stored as JSONB array of strings. No skill normalization or deduplication beyond case-sensitive exact matching.

4. **Capacity Calculation**: Uses simple linear calculation (capacityHoursPerWeek * weeksInRange). Does not account for:
   - Holidays or time off
   - Part-time schedules
   - Variable capacity over time

5. **Allocation Overlap**: When calculating hours for overlapping allocations, uses simple sum. Does not handle complex overlapping scenarios with different allocation percentages.

6. **No Pagination**: Resource directory endpoint does not support pagination yet. Returns all matching resources.

7. **No Sorting**: Results are sorted by `createdAt DESC` for resources, but no custom sorting options.

8. **Workspace Filter Limitation**: Workspace filter requires resources to have allocations in that workspace. Resources without allocations won't appear even if they're in the workspace.

## Implementation Details

### Files Modified

1. **`src/modules/resources/dto/resource-list-query.dto.ts`** (new):
   - DTO for resource list query parameters

2. **`src/modules/resources/dto/capacity-summary-query.dto.ts`** (new):
   - DTO for capacity summary query parameters

3. **`src/modules/resources/resources.service.ts`**:
   - Extended `findAll()` to accept optional filters parameter
   - Added `getCapacitySummary()` method
   - Added `getCapacityBreakdown()` method
   - Added `getSkillsFacet()` method

4. **`src/modules/resources/resources.controller.ts`**:
   - Extended `getAllResources()` to parse and pass filter query parameters
   - Added `getCapacitySummary()` endpoint
   - Added `getCapacityBreakdown()` endpoint (placed before `:id/allocation` to avoid route conflicts)
   - Added `getSkillsFacet()` endpoint

5. **`test/resources.e2e-spec.ts`** (new):
   - Comprehensive e2e tests for all new endpoints and filters

### Key Implementation Notes

**Skills Filtering**:
- Uses PostgreSQL JSONB `@>` operator to check if skills array contains requested skill
- Requires ALL requested skills to be present (AND logic, not OR)

**Workspace Filtering**:
- Queries projects in workspace first
- Uses EXISTS subquery to filter resources with allocations in those projects
- Respects workspace membership feature flag

**Date Range Filtering**:
- Uses EXISTS subquery to find resources with allocations overlapping date range
- Overlap logic: `startDate <= endDate AND endDate >= startDate`

**Capacity Calculations**:
- Calculates weeks in date range: `daysDiff / 7`
- Total capacity: `capacityHoursPerWeek * weeksInRange`
- Allocated hours: Sum of `(capacityHoursPerWeek * allocationPercentage / 100) * allocationWeeks` for each allocation
- Utilization: `(totalAllocatedHours / totalCapacityHours) * 100`

**Route Ordering**:
- `GET /api/resources/:id/capacity-breakdown` must come before `GET /api/resources/:id/allocation` in controller
- Specific routes (`capacity-summary`, `skills`) come before parameterized routes (`:id/...`)

## Constraints Respected

✅ No schema changes
✅ No new entities
✅ No feature flags
✅ No changes to existing request/response shapes (only added optional query params)
✅ All queries enforce `organizationId`
✅ All endpoints respect existing guards (`JwtAuthGuard`)
✅ Extended existing services and controllers (no new modules)
✅ Backward compatible (existing behavior preserved when no filters provided)
✅ All resource endpoints remain fully tenant-safe

## Summary

Phase 3.2 successfully:
- ✅ Extended resource directory API with 5 new filter options
- ✅ Added capacity summary endpoint for aggregate capacity view
- ✅ Added capacity breakdown endpoint for per-resource project allocation
- ✅ Added skills facet endpoint for skill-based navigation
- ✅ All 13 new e2e tests pass
- ✅ All 59 existing e2e tests still pass (no regressions)
- ✅ Build and lint pass
- ✅ No schema changes or breaking changes

The Resource Intelligence backend v1 is ready for frontend integration in Phase 3.3.

