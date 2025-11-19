# Week 3 Phase 3.3 – Resource Center Frontend v1

## Objective

Expose Resource Intelligence v1 in the UI using the backend from Phase 3.2, without mock data or breaking changes.

## Prerequisites Verified

✅ Backend documentation exists: `WEEK_3_PHASE_3_2_RESOURCE_BACKEND.md`
✅ Backend test suite passes: `resources.e2e-spec.ts` (13 tests passing)
✅ Frontend build passes: `npm run build` ✅

## Pages and Components

### Main Resource Center Page

**File**: `src/features/resources/pages/ResourcesPage.tsx`

**Purpose**: Primary Resource Center view with filtering, capacity indicators, and resource detail panel.

**Key Features**:
- Resource directory table with filters
- Skills, roles, workspace, and date range filters
- Capacity indicators per resource (allocated hours, utilization %)
- Resource detail panel showing cross-project breakdown
- Heatmap visualization per resource

### Updated Components

**File**: `src/features/resources/api/useResources.ts`

**New Hooks Added**:
- `useCapacitySummary()` - Fetches capacity summary for date range
- `useCapacityBreakdown()` - Fetches project breakdown for a resource
- `useSkillsFacet()` - Fetches skills with counts
- `useResourcesList()` - Extended to support new filters

**Updated Types**:
- `ResourceListFilters` - Added skills, roles, workspaceId, dateFrom, dateTo
- `CapacitySummary` - New type for capacity summary data
- `CapacityBreakdown` - New type for project breakdown data
- `SkillFacet` - New type for skills facet data

### Helper Components

**File**: `src/features/resources/pages/ResourcesPage.tsx` (inline)

- `ResourceAllocationHeatmap` - Helper component that wraps `ResourceHeatmap` with `useResourceAllocations` hook

## Backend Endpoints Used

### 1. GET `/api/resources`

**Used By**: `ResourcesPage` main table
**Hook**: `useResourcesList()`
**Query Parameters** (all optional):
- `skills` (comma-separated string)
- `roles` (comma-separated string)
- `workspaceId` (UUID)
- `dateFrom` (ISO date string)
- `dateTo` (ISO date string)
- `search` (string)
- `dept` (string)
- `page` (number)
- `pageSize` (number)

**UI Usage**:
- Powers the main resource table
- Filters update query parameters and trigger refetch
- Response shape: `{ data: Resource[] }`

### 2. GET `/api/resources/capacity-summary`

**Used By**: `ResourcesPage` capacity indicators column
**Hook**: `useCapacitySummary()`
**Query Parameters** (required):
- `dateFrom` (ISO date string)
- `dateTo` (ISO date string)

**Query Parameters** (optional):
- `workspaceId` (UUID)

**UI Usage**:
- Fetched automatically when page loads with date range
- Data joined to resource list by resource ID
- Displays in "Capacity" and "Utilization" columns
- Shows loading state ("...") while fetching
- Response shape: `{ data: CapacitySummary[] }`

### 3. GET `/api/resources/:id/capacity-breakdown`

**Used By**: `ResourcesPage` detail panel
**Hook**: `useCapacityBreakdown()`
**Query Parameters** (required):
- `dateFrom` (ISO date string)
- `dateTo` (ISO date string)

**UI Usage**:
- Triggered when user clicks a resource row
- Shows project breakdown in detail panel
- Displays project name, allocated hours, and percentage of resource time
- Shows loading state while fetching
- Shows empty state if no allocations in range
- Response shape: `{ data: CapacityBreakdown[] }`

### 4. GET `/api/resources/skills`

**Used By**: `ResourcesPage` skills filter dropdown
**Hook**: `useSkillsFacet()`
**Query Parameters**: None

**UI Usage**:
- Fetched on page load
- Populates skills filter dropdown with skill names and counts
- Format: "Skill Name (count)"
- Filter disabled if no skills available
- Response shape: `{ data: SkillFacet[] }`

## UX Flows

### Filter Flow

1. **User opens Resource Center**
   - Page loads with default date range (today to 4 weeks from now)
   - Resource list displays all active resources in organization
   - Capacity summary loads for the date range
   - Skills facet loads and populates skills dropdown

2. **User adjusts filters**
   - **Skills**: Select from dropdown → skill added as badge → can remove by clicking badge
   - **Roles**: Select from dropdown → role added as badge → can remove by clicking badge
   - **Workspace**: Select from dropdown → filters to resources with allocations in that workspace
   - **Date Range**: Change date inputs → capacity summary and breakdowns update

3. **List and capacity indicators update**
   - Resource list refetches with new filters
   - Capacity summary refetches with new date range (and workspace if selected)
   - Table shows filtered resources with updated capacity indicators
   - URL search params update to reflect current filters

4. **Clearing filters**
   - Remove skill/role badges → filter removed
   - Reset workspace to "All workspaces" → filter removed
   - Reset date range → returns to default (next 4 weeks)
   - List returns to default view

### Detail Flow

1. **User selects a resource row**
   - Click any row in the resource table
   - Row highlights (blue background)
   - Detail panel opens on the right (1/3 width)

2. **Detail panel opens**
   - Shows "Resource Details" header with close button (×)
   - Shows loading state while breakdown fetches

3. **Panel shows project allocations**
   - For each project in the date range:
     - Project name (bold)
     - Allocated hours (e.g., "40.0 hours")
     - Percentage of resource time (e.g., "25% of capacity")
   - Date range shown in panel header

4. **Empty and error states**
   - If no allocations: "No allocations found for this date range."
   - If loading: "Loading..." spinner
   - If error: Generic error message (backend handles 404 for cross-org access)

5. **Closing detail panel**
   - Click × button or click the same resource row again
   - Panel closes, selected state cleared

### Capacity Indicator Flow

1. **On page load**
   - Capacity summary endpoint called with current date range
   - Loading state shows "..." in capacity/utilization columns

2. **When data arrives**
   - Capacity column shows: "80.0h / 160.0h" (allocated / total)
   - Utilization column shows: Badge with percentage (color-coded):
     - Green (≤80%): Available
     - Blue (81-100%): Optimal
     - Yellow (101-120%): Warning
     - Red (>120%): Critical

3. **When date range changes**
   - Capacity summary refetches with new dates
   - Indicators update to reflect new range

## Tests

### Test Files

**File**: `src/features/resources/pages/__tests__/ResourcesPage.test.tsx`

**Test Coverage**:

1. ✅ **Default load**
   - Renders Resource Center page
   - Calls `useResourcesList` with default query parameters
   - Displays resource list

2. ✅ **Skills filter**
   - Selecting a skill updates URL search params
   - Skills filter dropdown populated from skills facet

3. ✅ **Date range filter**
   - Changing date inputs updates URL search params
   - Date range changes trigger capacity summary refetch

4. ✅ **Capacity indicators**
   - Utilization percentage renders from capacity summary
   - Loading state shows "..." while fetching
   - Capacity hours display correctly

5. ✅ **Detail panel**
   - Clicking resource row triggers breakdown request
   - Project rows render when breakdown data available
   - Empty state shows when no allocations

6. ✅ **Empty states**
   - Empty resource list shows appropriate message
   - Empty breakdown shows appropriate message

**Test Command**: `npm test -- ResourcesPage.test.tsx`

**Status**: ✅ All tests passing (11 tests)

### ProjectCreateModal Tests

**File**: `src/features/projects/__tests__/ProjectCreateModal.test.tsx`

**Existing Coverage** (from Phase 2.4):
- ✅ Blank project creation calls normal project creation path
- ✅ Template selection calls apply template endpoint (`/admin/templates/:id/apply`)
- ✅ Template selector loads templates from `/admin/templates`

**Status**: ✅ Tests already cover template behavior

## Implementation Details

### Filter State Management

- Filters stored in URL search params for shareability
- State synchronized between URL and component state
- Filters object built from URL params and passed to `useResourcesList`
- Date range defaults to next 4 weeks if not in URL

### Capacity Data Joining

- Capacity summary fetched separately from resource list
- Data joined in frontend using `Map` for O(1) lookup
- Capacity indicators show loading state independently
- Prevents blocking resource list render while capacity loads

### Detail Panel State

- Selected resource ID stored in URL param `selected`
- Panel visibility controlled by `selectedResourceId` state
- Breakdown hook enabled only when resource selected
- Panel closes when same resource clicked again

### Skills Facet Integration

- Skills facet fetched on mount
- Dropdown disabled while loading
- Dropdown disabled if no skills available (with message)
- Selected skills shown as removable badges
- Skills filter sent as comma-separated string to backend

### Error Handling

- Generic error message for failed API calls
- Backend 404 for cross-org access handled as normal error
- Empty states for no data scenarios
- Loading states prevent UI blocking

## Known Limitations

1. **No Pagination UI**: Resource list doesn't show pagination controls (backend supports it, UI doesn't expose it yet)

2. **No Sorting**: Resources sorted by `createdAt DESC` only, no user-selectable sorting

3. **Capacity Calculation**: Uses simple linear calculation, doesn't account for:
   - Holidays or time off
   - Part-time schedules
   - Variable capacity over time

4. **Workspace Filter Limitation**: Only shows resources with allocations in workspace, not all resources in workspace

5. **No Bulk Actions**: Can't select multiple resources or perform bulk operations

6. **Detail Panel Width**: Fixed at 1/3 width, not resizable

7. **No Export**: Can't export resource list or capacity data

## Constraints Respected

✅ No new backend endpoints
✅ No changes to backend request/response shapes
✅ No mock data in production code
✅ Existing resource behavior preserved when filters not used
✅ All new UI behavior wired through documented backend contracts
✅ Backward compatible (existing search/dept filters still work)
✅ All filters are optional

## Summary

Phase 3.3 successfully:
- ✅ Upgraded resource directory to Resource Center v1 with comprehensive filtering
- ✅ Added capacity indicators per resource
- ✅ Added resource detail panel with cross-project breakdown
- ✅ Integrated skills facet for skill-based navigation
- ✅ All 11 frontend tests passing
- ✅ Build passes
- ✅ No breaking changes to existing functionality

The Resource Center frontend v1 is complete and ready for use.

