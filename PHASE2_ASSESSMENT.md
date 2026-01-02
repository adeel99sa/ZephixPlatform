# Phase 2 Assessment: Resource and Allocation Engine MVP

## Current State Analysis

### ✅ What Already Exists (Good to Keep)

#### Entities
1. **Resource Entity** (`resource.entity.ts`)
   - ✅ Has `organizationId` (required)
   - ✅ Has `userId` (nullable)
   - ✅ Has `capacityHoursPerWeek` (default 40)
   - ✅ Has `isActive` flag
   - ✅ Has indexes: `idx_resources_org`, `idx_resources_user`, `idx_resources_active`
   - ❌ Missing: `workspaceId` (nullable) - needed for Phase 2

2. **ResourceAllocation Entity** (`resource-allocation.entity.ts`)
   - ✅ Has `organizationId` (nullable - should be required)
   - ✅ Has `resourceId`, `projectId`, `taskId` (all nullable where appropriate)
   - ✅ Has `startDate`, `endDate`
   - ✅ Has `type` enum: `HARD`, `SOFT`, `GHOST` ✅
   - ✅ Has `bookingSource` enum: `MANUAL`, `JIRA`, `GITHUB`, `AI` ✅
   - ✅ Has `allocationPercentage` (integer)
   - ✅ Has `hoursPerWeek` (decimal)
   - ✅ Has indexes: `idx_ra_dates`, `idx_ra_org_resource`
   - ⚠️ Issue: Has both `allocationPercentage` and `hoursPerWeek` - Phase 2 wants "pick one and enforce"
   - ❌ Missing: `unitsType` field to indicate if using percent or hours

3. **ResourceConflict Entity** (`resource-conflict.entity.ts`)
   - ✅ Has `resourceId`, `conflictDate`, `totalAllocation`
   - ✅ Has `affectedProjects` (JSONB)
   - ✅ Has `severity`: 'low' | 'medium' | 'high' | 'critical'
   - ✅ Has `resolved`, `detectedAt`, `resolvedAt`
   - ✅ Has indexes: `['resourceId', 'conflictDate']`, `['severity']`
   - ❌ Missing: `organizationId` (required for tenant isolation)

#### Controllers
1. **ResourcesController** (`resources.controller.ts`)
   - ✅ `GET /api/resources` - exists with filters
   - ✅ `GET /api/resources/heat-map` - exists
   - ✅ `GET /api/resources/conflicts` - exists
   - ✅ `POST /api/resources/allocations` - exists
   - ❌ Missing: `POST /api/resources` (create resource)
   - ❌ Missing: `GET /api/resources/:id` (get single resource)
   - ❌ Missing: `PATCH /api/resources/:id` (update resource)

2. **ResourceAllocationController** (`resource-allocation.controller.ts`)
   - ✅ `POST /api/resource-allocations` - exists
   - ✅ `GET /api/resource-allocations` - exists with filters
   - ✅ `GET /api/resource-allocations/:id` - exists
   - ✅ `PATCH /api/resource-allocations/:id` - exists
   - ✅ `DELETE /api/resource-allocations/:id` - exists
   - ✅ `GET /api/resource-allocations/resource/:resourceId` - exists
   - ✅ `GET /api/resource-allocations/project/:projectId` - exists
   - ⚠️ Note: Uses `/resource-allocations` not `/allocations` - Phase 2 wants `/allocations`

#### Services
1. **ResourceAllocationService**
   - ✅ Has conflict detection logic
   - ⚠️ May not enforce HARD > 100% = 409 error (needs verification)
   - ⚠️ May not create conflict rows for SOFT > 100% (needs verification)

2. **ResourceConflictService**
   - ✅ Has conflict detection and creation logic
   - ✅ Has cron job to detect conflicts

#### Enums
- ✅ `AllocationType`: HARD, SOFT, GHOST (Phase 2 only needs HARD, SOFT)
- ✅ `BookingSource`: MANUAL, JIRA, GITHUB, AI (Phase 2 wants: manual, import, integration - needs mapping)

### ❌ What's Missing for Phase 2

1. **Data Model Gaps**
   - Resource missing `workspaceId` (nullable)
   - ResourceAllocation `organizationId` should be required (not nullable)
   - ResourceConflict missing `organizationId`
   - ResourceAllocation needs `unitsType` field (percent vs hours)
   - Need to pick one: percent OR hours per day (not both)

2. **Database Constraints & Indexes**
   - Missing FK constraints (verify in migrations)
   - Missing unique constraints per org where needed
   - Missing indexes for date range queries with orgId

3. **RBAC Enforcement**
   - No standardized guard pattern
   - No policy checks at service layer
   - Need minimum roles: Org Admin, Workspace Admin, Project Manager, Contributor, Viewer

4. **Conflict Detection Rules**
   - HARD over 100% should return 409 (block write)
   - SOFT over 100% should create conflict rows (allow write)
   - Need to verify current behavior matches this

5. **Capacity View Endpoints**
   - Missing: `GET /api/capacity/resources` weekly rollup
   - Missing: `GET /api/conflicts` (list conflicts)

6. **Operational Readiness**
   - Need migration status check
   - Need health signal for outbox lag

7. **Tests**
   - Need tenant isolation tests
   - Need RBAC denial tests
   - Need allocation conflict detection tests

## Phase 2 Compressed Requirements

Based on existing code, here's what needs to be done:

### PR1: Lock Schema and Indexes
- Add `workspaceId` (nullable) to Resource entity
- Make `organizationId` required (not nullable) in ResourceAllocation
- Add `organizationId` to ResourceConflict
- Add `unitsType` enum to ResourceAllocation (percent | hours)
- Add FK constraints
- Add indexes: `(organizationId, startDate, endDate)` on ResourceAllocation
- Add index: `(organizationId, resourceId, conflictDate)` on ResourceConflict

### PR2: RBAC Guard Standardization
- Create standardized guard pattern
- Add policy helpers for write operations
- Enforce: Only Admin and PM can create allocations
- Viewers read-only

### PR3: Resource CRUD Completion
- Add `POST /api/resources` (create)
- Add `GET /api/resources/:id` (get single)
- Add `PATCH /api/resources/:id` (update)
- Ensure all endpoints enforce org scoping

### PR4: Allocation Conflict Enforcement
- Enforce HARD > 100% = 409 Conflict error (block write)
- Enforce SOFT > 100% = create conflict rows (allow write)
- Update ResourceConflictService to create rows on SOFT overallocation

### PR5: Capacity View Endpoints
- Add `GET /api/capacity/resources` with weekly rollup
- Add `GET /api/conflicts` (list conflicts filtered by org)

### PR6: Units Type Enforcement
- Add `unitsType` field to ResourceAllocation
- Enforce: if `unitsType = 'percent'`, use `allocationPercentage`; if `unitsType = 'hours'`, use `hoursPerDay`
- Migration to set default `unitsType = 'percent'` for existing rows

### PR7: BookingSource Mapping
- Map existing enum to Phase 2 requirements:
  - `MANUAL` → `manual` ✅
  - `JIRA`, `GITHUB` → `import` (or keep as-is)
  - `AI` → `integration` (or keep as-is)
- Or keep existing enum and document mapping

### PR8: Integration Tests
- Tenant isolation tests
- RBAC denial tests
- HARD overallocation returns 409
- SOFT overallocation creates conflicts
- List endpoints filtered by org

## Recommended Approach

1. **Keep existing enum values** (HARD, SOFT, MANUAL, JIRA, GITHUB, AI) - they're fine
2. **Add missing fields** (workspaceId, unitsType, orgId on conflicts)
3. **Enforce conflict rules** (HARD blocks, SOFT warns)
4. **Standardize RBAC** (one guard pattern)
5. **Add missing endpoints** (capacity view, conflicts list)
6. **Add tests** (tenant isolation, RBAC, conflicts)

## Next Steps

Create a compressed Phase 2 prompt that:
- Builds on existing code structure
- Only adds missing pieces
- Doesn't rework what's already good
- Focuses on gaps identified above

