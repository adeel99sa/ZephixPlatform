# STEP 1.2 — ENFORCE WORKSPACE MEMBERSHIP FILTERING

**Status:** ✅ Complete
**Date:** 2025-01-27

---

## SUMMARY

Implemented workspace membership filtering across all read endpoints. When `ZEPHIX_WS_MEMBERSHIP_V1` is enabled, non-admin users can only access workspaces, projects, and resources where they are members.

---

## FILES MODIFIED

### 1. **NEW: WorkspaceAccessService** ✅
**File:** `zephix-backend/src/modules/workspaces/services/workspace-access.service.ts`

**Purpose:** Centralized service to determine accessible workspace IDs for a user.

**Methods:**
- `getAccessibleWorkspaceIds()` - Returns array of workspace IDs or `null` (all workspaces)
- `canAccessWorkspace()` - Checks if user can access specific workspace

**Logic:**
- Flag OFF or Admin → Returns `null` (all workspaces)
- Flag ON + Non-Admin → Returns array of workspace IDs where user is member
- Flag ON + Non-Admin + No userId → Returns empty array

---

### 2. **WorkspacesModule** ✅
**File:** `zephix-backend/src/modules/workspaces/workspaces.module.ts`

**Changes:**
- Added `WorkspaceAccessService` to providers
- Exported `WorkspaceAccessService` for use in other modules

---

### 3. **WorkspacesController** ✅
**File:** `zephix-backend/src/modules/workspaces/workspaces.controller.ts`

**Endpoint Updated:**
- **GET `/api/workspaces/:id`**
  - Added `WorkspaceAccessService` injection
  - Added membership check before returning workspace
  - Throws `403 Forbidden` if user cannot access workspace

**Behavior:**
- Flag OFF: All users can access any workspace in their org
- Flag ON + Admin: Admins can access all workspaces
- Flag ON + Non-Admin: Only workspaces where user is member

**Note:** GET `/api/workspaces` already uses `listByOrg()` which has membership filtering built-in.

---

### 4. **ProjectsModule** ✅
**File:** `zephix-backend/src/modules/projects/projects.module.ts`

**Changes:**
- Added `WorkspacesModule` import to access `WorkspaceAccessService`

---

### 5. **ProjectsService** ✅
**File:** `zephix-backend/src/modules/projects/services/projects.service.ts`

**Methods Updated:**

1. **`findAllProjects()`**
   - Added `userId` and `userRole` parameters
   - Calls `WorkspaceAccessService.getAccessibleWorkspaceIds()`
   - Filters projects by `workspaceId IN (accessibleWorkspaceIds)` when flag is on
   - Returns empty array if user has no accessible workspaces
   - Validates workspace access when specific `workspaceId` is requested

2. **`findProjectById()`**
   - Added `userId` and `userRole` parameters
   - After fetching project, checks if user can access project's workspace
   - Throws `403 Forbidden` if user cannot access workspace

**Behavior:**
- Flag OFF: Returns all projects in organization
- Flag ON + Admin: Returns all projects in organization
- Flag ON + Non-Admin: Returns only projects in accessible workspaces

---

### 6. **ProjectsController** ✅
**File:** `zephix-backend/src/modules/projects/projects.controller.ts`

**Endpoints Updated:**
- **GET `/api/projects`**
  - Passes `userId` and `userRole` from tenant context to service

- **GET `/api/projects/:id`**
  - Passes `userId` and `userRole` from tenant context to service

---

### 7. **ResourceModule** ✅
**File:** `zephix-backend/src/modules/resources/resource.module.ts`

**Changes:**
- Added `WorkspacesModule` import
- Added `Project` entity to TypeORM features (needed for workspace filtering)

---

### 8. **ResourcesService** ✅
**File:** `zephix-backend/src/modules/resources/resources.service.ts`

**Methods Updated:**

1. **`findAll()`**
   - Added `userId` and `userRole` parameters
   - Calls `WorkspaceAccessService.getAccessibleWorkspaceIds()`
   - Returns empty array if user has no accessible workspaces
   - **Note:** Resources themselves are org-scoped (no workspaceId), but allocations are filtered

2. **`getConflicts()`**
   - Added `userId` and `userRole` parameters
   - Filters allocations by accessible workspaces through projects
   - Only shows conflicts for allocations in accessible workspaces

**Behavior:**
- Flag OFF: Returns all resources/conflicts in organization
- Flag ON + Admin: Returns all resources/conflicts in organization
- Flag ON + Non-Admin: Returns resources but filters allocations by accessible workspaces

---

### 9. **ResourcesController** ✅
**File:** `zephix-backend/src/modules/resources/resources.controller.ts`

**Endpoints Updated:**
- **GET `/api/resources`**
  - Extracts `userId` and `userRole` from request
  - Passes to service for filtering

- **GET `/api/resources/conflicts`**
  - Extracts `userId` and `userRole` from request
  - Passes to service for filtering

- **GET `/api/resources/heat-map`**
  - Extracts `userId`, `userRole`, and `organizationId` from request
  - Sets `organizationId` in query if not provided
  - Passes to service for filtering

---

### 10. **ResourceHeatMapService** ✅
**File:** `zephix-backend/src/modules/resources/services/resource-heat-map.service.ts`

**Methods Updated:**

1. **`getHeatMapData()`**
   - Added `userId` and `userRole` parameters
   - Calls `WorkspaceAccessService.getAccessibleWorkspaceIds()`
   - Filters allocations by projects in accessible workspaces
   - Returns empty heat map if user has no accessible workspaces

**Behavior:**
- Flag OFF: Returns heat map for all allocations in organization
- Flag ON + Admin: Returns heat map for all allocations in organization
- Flag ON + Non-Admin: Returns heat map only for allocations in accessible workspaces

---

## ENDPOINT BEHAVIOR SUMMARY

| Endpoint | Flag OFF | Flag ON + Admin | Flag ON + Non-Admin |
|----------|----------|-----------------|-------------------|
| GET `/api/workspaces` | All org workspaces | All org workspaces | Only member workspaces |
| GET `/api/workspaces/:id` | Any workspace in org | Any workspace in org | Only if member |
| GET `/api/workspaces/:id/members` | 403 (flag required) | If member | If member |
| GET `/api/projects` | All org projects | All org projects | Only in member workspaces |
| GET `/api/projects/:id` | Any project in org | Any project in org | Only if workspace member |
| GET `/api/resources` | All org resources | All org resources | All resources (filtered allocations) |
| GET `/api/resources/heat-map` | All allocations | All allocations | Only in member workspaces |
| GET `/api/resources/conflicts` | All conflicts | All conflicts | Only in member workspaces |

---

## GUARDS USED

- **Existing Guards (Reused):**
  - `RequireWorkspaceAccessGuard` - Already checks workspace membership
  - `RequireOrgRoleGuard` - Already checks org role
  - `WorkspaceMembershipFeatureGuard` - Already gates membership endpoints

- **New Logic:**
  - `WorkspaceAccessService` - Centralized membership filtering logic
  - Applied in service layer, not as a guard (allows conditional filtering)

---

## TESTING REQUIREMENTS

Tests should verify:

1. **Flag OFF:**
   - Org admin sees all workspaces/projects/resources
   - Regular user sees all workspaces/projects/resources (current behavior)

2. **Flag ON:**
   - Org admin still sees all workspaces/projects/resources
   - Non-admin sees only workspaces where they are members
   - Non-admin sees only projects in those workspaces
   - Non-admin sees only resource data for those workspaces
   - Non-member cannot access workspace directly (403)
   - Non-member cannot access project in inaccessible workspace (403)

---

## NEXT STEPS

After this step:
- **Step 1.3:** Enforce Role-Based Access (Owner/Member/Viewer permissions)
- **Step 1.4:** Backfill Script (create membership records for existing workspaces)
- **Step 1.5:** RBAC Test Suite

---

**End of Step 1.2 Summary**

