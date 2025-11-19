# Week 3 Phase 3.1 – Resource Intelligence Inspection

## Objective

Map current resource, capacity, and skills implementation to prepare for Resource Intelligence v1 without changing behavior.

## Prerequisites Verified

✅ All Week 2 phase documentation exists:
- `WEEK_2_PHASE_2_1_TEMPLATE_BACKEND.md`
- `WEEK_2_PHASE_2_2_TEMPLATE_APPLICATION.md`
- `WEEK_2_PHASE_2_3_TEMPLATE_UI_COMPLETE.md`
- `WEEK_2_PHASE_2_4_TEMPLATE_HARDENING.md`

✅ All backend test suites pass:
- `workspace-membership-filtering.e2e-spec.ts`: ✅ 17 passed
- `workspace-rbac.e2e-spec.ts`: ✅ 27 passed
- `workspace-backfill.e2e-spec.ts`: ✅ 6 passed
- `template-application.e2e-spec.ts`: ✅ 9 passed

## Backend Entities

### 1. Resource Entity
**File**: `src/modules/resources/entities/resource.entity.ts`
**Table**: `resources`

**Key Fields:**
- `id` (UUID, primary key)
- `userId` (UUID, nullable) - Links to User entity if resource is an internal user
- `organizationId` (UUID, required) - Organization scoping
- `name` (string, nullable)
- `email` (string, required)
- `role` (string, required)
- `skills` (JSONB array, default: []) - Array of skill strings
- `capacityHoursPerWeek` (integer, default: 40) - Weekly capacity in hours
- `costPerHour` (decimal, default: 0)
- `isActive` (boolean, default: true) - Soft delete flag
- `preferences` (JSONB, nullable) - Object with:
  - `maxAllocation`: number
  - `preferredProjects`: string[]
  - `unavailableDates`: string[]

**Audit Fields:**
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Relations:**
- `user` (ManyToOne → User, nullable)
- `organization` (ManyToOne → Organization)
- `allocations` (OneToMany → ResourceAllocation)

**Computed Properties:**
- `allocated`: Sum of allocation percentages from related allocations
- `available`: 100 - allocated

**Indexes:**
- `idx_resources_org` on `organizationId`
- `idx_resources_user` on `userId`
- `idx_resources_active` on `isActive`

### 2. ResourceAllocation Entity
**File**: `src/modules/resources/entities/resource-allocation.entity.ts`
**Table**: `resource_allocations`

**Key Fields:**
- `id` (UUID, primary key)
- `organizationId` (UUID, nullable) - Organization scoping
- `projectId` (UUID, nullable) - Links to Project
- `resourceId` (UUID, nullable) - Links to Resource
- `userId` (UUID, nullable) - Alternative user reference
- `startDate` (date, nullable) - Allocation start date
- `endDate` (date, nullable) - Allocation end date
- `allocationPercentage` (integer, nullable) - Percentage allocation (0-100)
- `taskId` (UUID, nullable) - Links to Task
- `hoursPerWeek` (decimal, nullable) - Hours per week allocation

**Audit Fields:**
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Relations:**
- `resource` (ManyToOne → Resource)
- `task` (ManyToOne → Task, nullable)

**Indexes:**
- `idx_ra_dates` on `startDate`, `endDate`
- `idx_ra_org_resource` on `organizationId`, `resourceId`

### 3. UserDailyCapacity Entity
**File**: `src/modules/resources/entities/user-daily-capacity.entity.ts`
**Table**: `user_daily_capacity`

**Key Fields:**
- `organizationId` (string, primary key)
- `userId` (string, primary key)
- `capacityDate` (date, primary key)
- `allocatedPercentage` (number, default: 0) - Daily allocation percentage

**Purpose**: Tracks daily capacity per user for conflict detection and capacity calculations.

**Note**: Composite primary key on (organizationId, userId, capacityDate).

### 4. ResourceConflict Entity
**File**: `src/modules/resources/entities/resource-conflict.entity.ts`
**Table**: `resource_conflicts`

**Key Fields:**
- `id` (UUID, primary key)
- `resourceId` (string, required)
- `conflictDate` (date, required)
- `totalAllocation` (decimal) - Total allocation percentage (>100 if overallocated)
- `affectedProjects` (JSONB) - Array of objects with:
  - `projectId`: string
  - `projectName`: string
  - `taskId?`: string
  - `taskName?`: string
  - `allocation`: number
- `severity` (enum: 'low' | 'medium' | 'high' | 'critical')
- `resolved` (boolean, default: false)
- `detectedAt` (timestamp)
- `resolvedAt` (timestamp, nullable)

**Indexes:**
- Index on `resourceId`, `conflictDate`
- Index on `severity`

### 5. AuditLog Entity
**File**: `src/modules/resources/entities/audit-log.entity.ts`
**Table**: `audit_logs`

**Key Fields:**
- `id` (UUID, primary key)
- `userId` (UUID)
- `organizationId` (UUID)
- `entityType` (string) - e.g., 'resources', 'resource_allocation'
- `entityId` (UUID, nullable)
- `action` (string) - e.g., 'create', 'update', 'delete'
- `oldValue` (JSONB, nullable)
- `newValue` (JSONB, nullable)
- `ipAddress` (string, nullable)
- `userAgent` (text, nullable)
- `requestId` (UUID, nullable)
- `createdAt` (timestamp)

**Purpose**: Audit trail for resource and allocation changes.

## Backend Services and Routes

### ResourcesController
**File**: `src/modules/resources/resources.controller.ts`
**Base Route**: `/api/resources`
**Guards**: `JwtAuthGuard`

**Routes:**

1. **GET `/api/resources`**
   - **Purpose**: List all resources in organization
   - **Org Scoping**: Yes, via `req.user.organizationId`
   - **Workspace Filtering**: Yes, uses `WorkspaceAccessService` to filter by accessible workspaces
   - **Description**: Returns resources filtered by organization and workspace membership (if feature flag enabled)

2. **POST `/api/resources`**
   - **Purpose**: Create a new resource
   - **Org Scoping**: Yes, requires `organizationId` from user context
   - **Description**: Creates resource with audit logging

3. **GET `/api/resources/:id/allocation`**
   - **Purpose**: Get resource allocation for a specific resource over date range
   - **Query Params**: `startDate`, `endDate`
   - **Org Scoping**: Yes
   - **Description**: Returns allocation percentage, allocations array, and overallocation flags

4. **GET `/api/resources/heat-map`**
   - **Purpose**: Get resource allocation heat map data
   - **Query Params**: `startDate`, `endDate`, `organizationId`, `projectId` (via `HeatMapQueryDto`)
   - **Org Scoping**: Yes
   - **Workspace Filtering**: Yes, uses `WorkspaceAccessService`
   - **Description**: Returns weekly allocation data per resource with status indicators

5. **GET `/api/resources/conflicts`**
   - **Purpose**: Get resource conflicts (overallocations)
   - **Org Scoping**: Yes
   - **Workspace Filtering**: Yes, uses `WorkspaceAccessService`
   - **Description**: Returns resources with total allocation > 100% with severity levels

6. **POST `/api/resources/detect-conflicts`**
   - **Purpose**: Detect conflicts for a specific allocation before creating
   - **Body**: `DetectConflictsDto` (resourceId, startDate, endDate, allocationPercentage)
   - **Throttle**: 50 requests per minute
   - **Description**: Checks if adding allocation would cause conflicts

7. **POST `/api/resources/allocations`**
   - **Purpose**: Create resource allocation with audit and cache invalidation
   - **Body**: `CreateAllocationDto`
   - **Throttle**: 20 requests per minute
   - **Org Scoping**: Yes
   - **Description**: Creates allocation, invalidates cache, logs audit trail

8. **GET `/api/resources/task-heat-map`**
   - **Purpose**: Get task-based heat map
   - **Org Scoping**: Yes
   - **Description**: Returns heat map data grouped by tasks

9. **GET `/api/resources/my-capacity`**
   - **Purpose**: Get current user's capacity
   - **Org Scoping**: Yes
   - **Description**: Calculates capacity based on assigned tasks (40-hour work week)

### ResourceAllocationController
**File**: `src/modules/resources/resource-allocation.controller.ts`
**Base Route**: `/api/resource-allocations`
**Guards**: `JwtAuthGuard`

**Routes:**

1. **POST `/api/resource-allocations`**
   - **Purpose**: Create a new resource allocation
   - **Org Scoping**: Yes, via `req.user.organizationId`

2. **GET `/api/resource-allocations`**
   - **Purpose**: Get all resource allocations
   - **Query Params**: `resourceId?`, `projectId?`
   - **Org Scoping**: Yes

3. **GET `/api/resource-allocations/:id`**
   - **Purpose**: Get a specific resource allocation
   - **Org Scoping**: Yes

4. **PATCH `/api/resource-allocations/:id`**
   - **Purpose**: Update a resource allocation
   - **Org Scoping**: Yes

5. **DELETE `/api/resource-allocations/:id`**
   - **Purpose**: Delete a resource allocation
   - **Org Scoping**: Yes

6. **GET `/api/resource-allocations/resource/:resourceId`**
   - **Purpose**: Get all allocations for a specific resource
   - **Org Scoping**: Yes

7. **GET `/api/resource-allocations/project/:projectId`**
   - **Purpose**: Get all allocations for a specific project
   - **Org Scoping**: Yes

### Services

**ResourcesService** (`src/modules/resources/resources.service.ts`):
- `findAll()` - List resources with workspace filtering
- `create()` - Create resource
- `getResourceAllocation()` - Get allocation for resource over date range
- `getConflicts()` - Get overallocated resources
- `detectConflicts()` - Check for conflicts before allocation
- `createAllocationWithAudit()` - Create allocation with audit trail
- `calculateUserCapacity()` - Calculate user capacity from tasks

**ResourceAllocationService** (`src/modules/resources/resource-allocation.service.ts`):
- `create()` - Create allocation, checks capacity conflicts, updates daily capacity
- `findAll()` - List allocations with filters
- `findOne()` - Get single allocation
- `update()` - Update allocation
- `remove()` - Delete allocation
- `findByResource()` - Get allocations for resource
- `findByProject()` - Get allocations for project
- `checkCapacityConflicts()` - Private method to check daily capacity
- `updateDailyCapacity()` - Private method to update daily capacity table
- `getTaskBasedHeatMap()` - Generate task-based heat map

**ResourceHeatMapService** (`src/modules/resources/services/resource-heat-map.service.ts`):
- `getHeatMapData()` - Main method to generate heat map data
- `processAllocations()` - Private method to process allocations into weekly format
- `getWeeksBetween()` - Private method to calculate weeks between dates
- `getAllocationStatus()` - Private method to determine status (available/optimal/warning/critical)

## Capacity and Heatmap Logic

### ResourceHeatMapService.getHeatMapData()

**File**: `src/modules/resources/services/resource-heat-map.service.ts`

**Inputs:**
- `query: HeatMapQueryDto`:
  - `startDate?` (date string)
  - `endDate?` (date string)
  - `organizationId?` (UUID)
  - `projectId?` (UUID)
  - `view?` (enum: 'WEEK' | 'MONTH' | 'QUARTER')
- `userId?` (string)
- `userRole?` (string)

**Logic:**
1. Defaults to next 3 months if no date range provided
2. Gets accessible workspace IDs via `WorkspaceAccessService` (respects feature flag)
3. Filters allocations by:
   - Date range overlap (`startDate <= end AND endDate >= start`)
   - `organizationId`
   - `projectId` (if provided)
   - Accessible workspaces (if membership enforced)
4. Groups allocations by resource and week
5. Calculates total allocation per week per resource
6. Adds status indicators based on allocation percentage

**Output Shape:**
```typescript
Array<{
  resourceId: string;
  weeks: Array<{
    weekStart: string; // ISO date string
    totalAllocation: number; // Sum of percentages
    projects: Array<{
      projectId: string;
      allocation: number;
    }>;
    status: 'available' | 'optimal' | 'warning' | 'critical';
  }>;
}>
```

**Status Logic:**
- `available`: <= 80%
- `optimal`: 81-100%
- `warning`: 101-120%
- `critical`: > 120%

**Org Isolation**: ✅ Yes, respects `organizationId` and workspace membership

### ResourceAllocationService.checkCapacityConflicts()

**File**: `src/modules/resources/resource-allocation.service.ts`

**Inputs:**
- `organizationId` (string)
- `userId` (string)
- `startDate` (Date)
- `endDate` (Date)
- `allocationPercentage` (number)

**Logic:**
1. Queries `user_daily_capacity` table for date range
2. For each day, checks if adding allocation would exceed 100%
3. Returns array of conflicts with date and current allocation

**Output Shape:**
```typescript
Array<{
  date: Date;
  currentAllocation: number;
  newTotal: number;
}>
```

**Org Isolation**: ✅ Yes, filters by `organizationId`

### ResourceAllocationService.updateDailyCapacity()

**File**: `src/modules/resources/resource-allocation.service.ts`

**Inputs:**
- `organizationId` (string)
- `userId` (string)
- `startDate` (Date)
- `endDate` (Date)
- `allocationPercentage` (number)
- `manager` (EntityManager) - Transaction manager

**Logic:**
1. Iterates through each day in date range
2. Finds or creates `UserDailyCapacity` record
3. Accumulates allocation percentage per day
4. Saves to database

**Org Isolation**: ✅ Yes, uses `organizationId` in queries

### ResourcesService.getConflicts()

**File**: `src/modules/resources/resources.service.ts`

**Inputs:**
- `organizationId` (string)
- `userId?` (string)
- `userRole?` (string)

**Logic:**
1. Gets accessible workspace IDs via `WorkspaceAccessService`
2. Queries resources with allocations
3. Filters allocations by accessible projects (if workspace membership enforced)
4. Calculates total allocation per resource
5. Returns resources with total > 100%

**Output Shape:**
```typescript
{
  data: Array<{
    id: string;
    resourceId: string;
    resourceName: string;
    totalAllocation: number;
    severity: 'medium' | 'high' | 'critical';
    description: string;
    affectedProjects: Array<{
      projectId: string;
      allocation: number;
    }>;
  }>;
}
```

**Org Isolation**: ✅ Yes, respects `organizationId` and workspace membership

### ResourcesService.calculateUserCapacity()

**File**: `src/modules/resources/resources.service.ts`

**Inputs:**
- `userEmail` (string)
- `organizationId` (string)

**Logic:**
1. Finds user by email
2. Gets all tasks assigned to user
3. Sums `estimatedHours` from tasks
4. Calculates percentage based on 40-hour work week
5. Returns capacity percentage (capped at 200%)

**Output**: `number` (capacity percentage)

**Org Isolation**: ✅ Yes, filters by `organizationId`

## Frontend Surfaces

### ResourcesPage
**File**: `src/features/resources/pages/ResourcesPage.tsx`

**Purpose**: Resource directory page with list and heatmap

**API Usage:**
- `useResourcesList()` hook - Calls `/api/resources` with search, dept, page, pageSize filters
- `useResourceAllocations()` hook - Calls allocation API for each resource

**Features:**
- Search by name or role
- Filter by department
- Pagination (page, pageSize)
- Heatmap visualization per resource (8-week view)
- Table display: Name, Role, Dept, Heatmap

**Status**: ✅ Uses real API, no mock data

### ResourceHeatMap Component
**File**: `src/components/resources/ResourceHeatMap.tsx`

**Purpose**: Full heatmap visualization component

**API Usage:**
- `GET /api/resources` - Get all resources
- `GET /api/resources/:id/allocation` - Get allocation per resource with date range

**Features:**
- Date range selector (defaults to next 30 days)
- Weekly allocation view
- Color-coded status indicators
- Loading and error states

**Status**: ✅ Uses real API, no mock data

### ProjectResources Component
**File**: `src/components/projects/ProjectResources.tsx`

**Purpose**: Resource assignment panel in project detail view

**API Usage:**
- `GET /api/resources` - List all resources
- `GET /api/resource-allocations/project/:projectId` - Get project allocations

**Features:**
- List resources with skills
- Assign resources to project
- View current project allocations
- Create new resource modal

**Status**: ✅ Uses real API, no mock data

### ResourceHeatmap Component (Simple)
**File**: `src/features/resources/components/ResourceHeatmap.tsx`

**Purpose**: Simple 8-week heatmap visualization

**Input**: Array of `{ week: string, pct: number }`

**Features:**
- Grid layout (8 columns)
- Color intensity based on percentage
- Accessible labels

**Status**: ✅ Presentational component, no API calls

### Dashboard ResourceHeatMap
**File**: `src/pages/dashboard/ResourceHeatMap.tsx`

**Purpose**: Dashboard widget showing resource heatmap

**API Usage:**
- `GET /api/resources/task-heat-map` - Task-based heat map

**Features:**
- Task-based allocation view
- Status color coding
- Loading state

**Status**: ✅ Uses real API

### Filters and Views Available

**By Role**: ✅ Available via `role` field in Resource entity and search filter

**By Skill**: ⚠️ Partial - Skills stored as JSONB array in Resource entity, but no dedicated skill filter UI yet

**By Workspace**: ✅ Backend respects workspace membership via `WorkspaceAccessService`, frontend shows resources but doesn't explicitly filter by workspace in UI

**By Time Window**: ✅ Available via date range selectors in heatmap components

## Gaps and Priorities

### Resource Directory

**Status**: ✅ **EXISTING**

- Resource list page exists (`ResourcesPage.tsx`)
- Search and filter by role/department
- Pagination support
- Real API integration

**Gaps:**
- No skill-based filtering UI
- No workspace-level filtering UI
- No advanced filters (capacity range, availability status)

### Capacity Overview

**Status**: ⚠️ **PARTIAL**

**What Exists:**
- Weekly heatmap per resource (`ResourceHeatMap.tsx`)
- Task-based heatmap (`/api/resources/task-heat-map`)
- User capacity calculation (`/api/resources/my-capacity`)
- Daily capacity tracking (`UserDailyCapacity` entity)

**Gaps:**
- No dedicated capacity overview page
- No aggregate capacity view (org/workspace level)
- No capacity trends over time
- No capacity forecasting

### Cross Project Allocation View

**Status**: ⚠️ **PARTIAL**

**What Exists:**
- Heatmap shows allocations across projects per resource
- `GET /api/resources/heat-map` returns project breakdown per week
- Conflict detection shows affected projects

**Gaps:**
- No dedicated cross-project view page
- No project-level capacity aggregation
- No workspace-level capacity view
- No timeline view of allocations

### Skill Tags and Filtering

**Status**: ⚠️ **PARTIAL**

**What Exists:**
- Skills stored as JSONB array in Resource entity
- Skills displayed in ProjectResources component

**Gaps:**
- No skill management UI
- No skill-based filtering in resource directory
- No skill-based resource search
- No skill tags UI component
- No skill analytics (most common skills, skill gaps)

### Conflict Detection Endpoint

**Status**: ✅ **EXISTING**

- `GET /api/resources/conflicts` - Returns overallocated resources
- `POST /api/resources/detect-conflicts` - Pre-check before allocation
- Conflict severity levels (medium/high/critical)
- Affected projects listed in conflicts

**Gaps:**
- No conflict resolution workflow
- No conflict history/audit
- No conflict notifications

### AI or Scoring Logic

**Status**: ❌ **MISSING**

- No AI-powered resource suggestions
- No resource scoring/ranking
- No intelligent allocation recommendations
- No predictive capacity analysis

### Priority Assignment

**HIGH Priority** (Needed for basic Resource Intelligence v1):
1. ✅ Resource directory - **EXISTING** (needs skill filtering enhancement)
2. ⚠️ Cross-project capacity view - **PARTIAL** (needs dedicated page)
3. ⚠️ Workspace-level capacity view - **MISSING**
4. ✅ Conflict detection endpoint - **EXISTING**

**MEDIUM Priority** (Skills and analytics):
1. ⚠️ Skill tags and filtering - **PARTIAL** (needs UI)
2. ⚠️ Capacity overview page - **PARTIAL** (needs aggregation views)
3. ⚠️ Resource availability calendar - **MISSING**

**LOW Priority** (AI and advanced features):
1. ❌ AI-powered resource suggestions - **MISSING**
2. ❌ Resource scoring/ranking - **MISSING**
3. ❌ Predictive capacity analysis - **MISSING**
4. ❌ Conflict resolution workflow - **MISSING**

## Proposed Phase 3.2 and 3.3 Focus

### Phase 3.2: Backend Improvements for Resource Intelligence v1

**Target Endpoints to Add/Extend:**

1. **GET `/api/resources/capacity-overview`**
   - **Purpose**: Aggregate capacity view per workspace/project
   - **Query Params**: `workspaceId?`, `projectId?`, `startDate`, `endDate`
   - **Returns**: Capacity summary with total/allocated/available per workspace/project
   - **Data Needed**: Aggregate allocations by workspace/project, calculate totals

2. **GET `/api/resources/:id/capacity-timeline`**
   - **Purpose**: Capacity timeline for a resource over date range
   - **Query Params**: `startDate`, `endDate`
   - **Returns**: Daily/weekly capacity breakdown with project allocations
   - **Data Needed**: Daily capacity from `user_daily_capacity`, allocations grouped by date

3. **GET `/api/resources/skills`**
   - **Purpose**: List all unique skills in organization with resource counts
   - **Returns**: Array of `{ skill: string, count: number, resources: Resource[] }`
   - **Data Needed**: Extract unique skills from Resource.skills JSONB array

4. **GET `/api/resources?skill=:skillName`**
   - **Purpose**: Filter resources by skill (extend existing endpoint)
   - **Query Param**: `skill` (string)
   - **Returns**: Resources matching skill
   - **Data Needed**: Query Resource.skills JSONB array for skill match

5. **GET `/api/resources/workspace/:workspaceId/capacity`**
   - **Purpose**: Workspace-level capacity view
   - **Returns**: Aggregate capacity for all resources in workspace's projects
   - **Data Needed**: Get all projects in workspace, aggregate allocations

6. **GET `/api/resources/project/:projectId/capacity`**
   - **Purpose**: Project-level capacity view
   - **Returns**: All resources allocated to project with allocation percentages
   - **Data Needed**: Filter allocations by projectId, group by resource

**Data Structures Needed:**
- Weekly capacity view per resource: ✅ Exists in `ResourceHeatMapService`
- Weekly capacity view per project: ⚠️ Need to aggregate by project
- Weekly capacity view per workspace: ❌ Need to aggregate by workspace
- Skill-based resource filtering: ⚠️ Need JSONB query support

### Phase 3.3: Frontend Resource Center v1

**Target Pages/Components:**

1. **Resource Directory Page** (`/resources`)
   - **Status**: ✅ Exists, needs enhancement
   - **Enhancements**:
     - Add skill filter dropdown
     - Add workspace filter
     - Add capacity status filter (available/overallocated)
     - Add resource detail modal with capacity timeline

2. **Workspace Capacity View** (`/workspaces/:id/capacity`)
   - **Status**: ❌ Missing
   - **Features**:
     - Aggregate capacity for workspace
     - Resource list with allocations
     - Weekly heatmap for workspace
     - Project breakdown

3. **Project Planning View** (enhance existing project detail)
   - **Status**: ⚠️ Partial (ProjectResources exists)
   - **Enhancements**:
     - Show capacity conflicts when assigning resources
     - Display allocation timeline
     - Show cross-project conflicts
     - Resource suggestion based on skills

4. **Resource Detail Page** (`/resources/:id`)
   - **Status**: ❌ Missing
   - **Features**:
     - Resource profile (skills, capacity, role)
     - Capacity timeline (weekly view)
     - Current allocations across projects
     - Availability calendar

**Functional Goals:**
- Resource directory with skill/workspace/capacity filters
- Workspace-level capacity aggregation and visualization
- Project planning with conflict detection UI
- Resource detail view with capacity timeline

**Scope:**
- Use existing entities (Resource, ResourceAllocation, UserDailyCapacity)
- Extend existing endpoints where possible
- Add new endpoints only for workspace/project capacity aggregation
- No schema changes required
- Leverage existing heatmap logic

## Summary

**Existing Infrastructure:**
- ✅ Resource and allocation entities with proper org scoping
- ✅ Heatmap service with weekly aggregation
- ✅ Conflict detection logic
- ✅ Daily capacity tracking
- ✅ Workspace membership filtering integration

**Key Gaps:**
- ⚠️ Skill-based filtering (backend supports, UI missing)
- ⚠️ Workspace/project capacity aggregation endpoints
- ❌ Resource detail page
- ❌ Workspace capacity view page
- ❌ Capacity overview dashboard

**Ready for Phase 3.2**: Backend can be extended with aggregation endpoints and skill filtering without schema changes. All required data exists in current entities.

