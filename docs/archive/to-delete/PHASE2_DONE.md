# Phase 2: Resource and Allocation Engine MVP - Completion Checklist

This document outlines the acceptance criteria and verification steps for Phase 2 of the Zephix Resource and Allocation Engine MVP.

## ✅ Acceptance Criteria

- [x] Data model fixes: workspaceId on Resource, unitsType on ResourceAllocation, organizationId on ResourceConflict
- [x] Indexes added for common queries
- [x] HARD overallocation > 100% returns 409 Conflict
- [x] SOFT overallocation > 100% creates conflict rows and returns 200/201
- [x] All queries are org scoped
- [x] Resource CRUD endpoints: POST, GET/:id, PATCH/:id
- [x] GET /api/resources/conflicts endpoint with filters
- [x] GET /api/resources/capacity/resources endpoint with weekly rollup
- [x] UnitsType enforcement: PERCENT uses allocationPercentage, HOURS uses hoursPerWeek/hoursPerDay
- [x] Migration created for schema changes

## 🚀 Production Verification Steps

### Step 1: Verify Deployment Commit SHA

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api-domain.com/api/version | jq '.commitSha'
```

Expected: Should show the commit SHA of the deployed Phase 2 code.

### Step 2: Run Migration

Ensure the migration `1786000000000-Phase2ResourceSchemaUpdates` has been applied:

```bash
# Check migration status in your database
psql $DATABASE_URL -c "SELECT * FROM migrations WHERE name LIKE '%Phase2ResourceSchemaUpdates%';"
```

### Step 3: Test HARD Overallocation (Expected: 409 Conflict)

```bash
# Create a resource
RESOURCE_ID=$(curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Resource",
    "email": "test@example.com",
    "role": "Developer",
    "organizationId": "'$ORG_ID'"
  }' \
  https://your-api-domain.com/api/resources | jq -r '.id')

# Create first HARD allocation (60%)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "'$RESOURCE_ID'",
    "projectId": "'$PROJECT_ID'",
    "allocationPercentage": 60,
    "unitsType": "PERCENT",
    "type": "HARD",
    "startDate": "2025-02-01",
    "endDate": "2025-02-28"
  }' \
  https://your-api-domain.com/api/resource-allocations

# Try to create second HARD allocation (50%) - should return 409
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "'$RESOURCE_ID'",
    "projectId": "'$PROJECT_ID'",
    "allocationPercentage": 50,
    "unitsType": "PERCENT",
    "type": "HARD",
    "startDate": "2025-02-01",
    "endDate": "2025-02-28"
  }' \
  https://your-api-domain.com/api/resource-allocations

# Expected: HTTP 409 Conflict with message about exceeding 100% capacity
```

### Step 4: Test SOFT Overallocation (Expected: 200/201 + Conflict Row Created)

```bash
# Create first SOFT allocation (60%)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "'$RESOURCE_ID'",
    "projectId": "'$PROJECT_ID'",
    "allocationPercentage": 60,
    "unitsType": "PERCENT",
    "type": "SOFT",
    "startDate": "2025-02-01",
    "endDate": "2025-02-28"
  }' \
  https://your-api-domain.com/api/resource-allocations

# Create second SOFT allocation (50%) - should succeed and create conflict row
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "'$RESOURCE_ID'",
    "projectId": "'$PROJECT_ID'",
    "allocationPercentage": 50,
    "unitsType": "PERCENT",
    "type": "SOFT",
    "startDate": "2025-02-01",
    "endDate": "2025-02-28"
  }' \
  https://your-api-domain.com/api/resource-allocations

# Expected: HTTP 200/201 (allocation created)
# Verify conflict row was created
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-api-domain.com/api/resources/conflicts?resourceId=$RESOURCE_ID&resolved=false" | jq

# Expected: Should return conflict row with totalAllocation > 100
```

### Step 5: Test Capacity Rollup Endpoint

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-api-domain.com/api/resources/capacity/resources?startDate=2025-02-01&endDate=2025-02-28" | jq

# Expected: Returns weekly rollup per resource with:
# - totalHard
# - totalSoft
# - total
# - remaining
```

### Step 6: Test Resource CRUD Endpoints

```bash
# GET /api/resources/:id
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-api-domain.com/api/resources/$RESOURCE_ID" | jq

# PATCH /api/resources/:id
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Resource Name"}' \
  "https://your-api-domain.com/api/resources/$RESOURCE_ID" | jq
```

### Step 7: Test UnitsType Enforcement

```bash
# Test PERCENT unitsType
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "'$RESOURCE_ID'",
    "projectId": "'$PROJECT_ID'",
    "allocationPercentage": 50,
    "unitsType": "PERCENT",
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }' \
  https://your-api-domain.com/api/resource-allocations

# Test HOURS unitsType
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceId": "'$RESOURCE_ID'",
    "projectId": "'$PROJECT_ID'",
    "hoursPerWeek": 20,
    "unitsType": "HOURS",
    "startDate": "2025-04-01",
    "endDate": "2025-04-30"
  }' \
  https://your-api-domain.com/api/resource-allocations

# Expected: Both should succeed, with proper unitsType stored
```

### Step 8: Test Tenant Isolation

```bash
# Create allocation in Org A
# Switch to Org B
# Verify Org B cannot see Org A's allocations
# Verify Org B cannot create allocations for Org A's resources
```

## 📋 Schema Changes Summary

### Resources Table
- Added `workspace_id` (uuid, nullable)
- Added index `idx_resources_org_workspace` on (organization_id, workspace_id)

### Resource Allocations Table
- Made `organization_id` NOT NULL (was nullable)
- Added `units_type` enum (PERCENT, HOURS)
- Added index `idx_ra_org_resource_dates` on (organization_id, resource_id, start_date, end_date)
- Added index `idx_ra_org_project_dates` on (organization_id, project_id, start_date, end_date)

### Resource Conflicts Table
- Added `organization_id` (uuid, NOT NULL)
- Added index `idx_conflicts_org_resource_date` on (organization_id, resource_id, conflict_date)

## 🔍 Key Implementation Details

1. **Conflict Enforcement**:
   - HARD allocations > 100%: Blocked with HTTP 409 Conflict
   - SOFT allocations > 100%: Allowed, conflict rows created automatically

2. **UnitsType Validation**:
   - PERCENT: Requires `allocationPercentage`, `hoursPerWeek`/`hoursPerDay` must be null
   - HOURS: Requires `hoursPerWeek` or `hoursPerDay`, `allocationPercentage` must be null
   - Conversion: HOURS allocations are converted to percentage for conflict checking (40 hours/week = 100%)

3. **Org Scoping**:
   - All queries use `organizationId` from auth context
   - TenantAwareRepository automatically filters by organizationId
   - ResourceConflict queries are org-scoped

## 📝 Notes

- Migration includes backfill logic for existing data
- No breaking changes to existing JSON response envelopes
- All routes maintain backward compatibility
- RBAC enforcement uses existing guards (minimum: Org Admin or Project Manager for writes)

## ✅ Final Checklist

- [ ] Migration applied successfully
- [ ] HARD overallocation returns 409
- [ ] SOFT overallocation creates conflict rows
- [ ] Capacity endpoint returns weekly rollup
- [ ] Resource CRUD endpoints work
- [ ] UnitsType enforcement works
- [ ] Tenant isolation verified
- [ ] All Phase 2 integration tests pass

