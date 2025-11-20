# STEP 1.1 — FEATURE FLAG AUDIT REPORT

**Feature Flag:** `ZEPHIX_WS_MEMBERSHIP_V1`
**Date:** 2025-01-27
**Status:** Audit Complete

---

## 1. EXACT DEFINITION

### Backend Environment Variable
- **Name:** `ZEPHIX_WS_MEMBERSHIP_V1`
- **Type:** String (must equal `'1'` to be enabled)
- **Default:** `undefined` (disabled by default)
- **Location:** Environment variable read via `ConfigService`

### Frontend Environment Variable
- **Name:** `VITE_WS_MEMBERSHIP_V1`
- **Type:** String (must equal `'1'` to be enabled)
- **Default:** `undefined` (disabled by default)
- **Location:** `import.meta.env.VITE_WS_MEMBERSHIP_V1`

### Feature Flag Config
- **File:** `zephix-backend/src/config/feature-flags.config.ts:32`
- **Config Path:** `features.workspaceMembershipV1`
- **Logic:** `process.env.ZEPHIX_WS_MEMBERSHIP_V1 === '1'`

---

## 2. CURRENT STATE

### Enabled or Disabled?
**STATUS: DISABLED BY DEFAULT**

- No `.env` files found in repository
- Flag defaults to `undefined` which evaluates to `false`
- Both backend and frontend check for exact string `'1'`
- If environment variable is not set or not equal to `'1'`, feature is **DISABLED**

### Activation Requirement
To enable:
- Backend: `export ZEPHIX_WS_MEMBERSHIP_V1=1` (or set in `.env`)
- Frontend: `export VITE_WS_MEMBERSHIP_V1=1` (or set in `.env`)

---

## 3. BACKEND CODE PATHS

### Guard Implementation
**File:** `zephix-backend/src/modules/workspaces/guards/feature-flag.guard.ts`

```typescript
canActivate(context: ExecutionContext): boolean {
  const isEnabled = this.configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1') === '1';
  if (!isEnabled) {
    throw new ForbiddenException('Workspace membership feature is not enabled');
  }
  return true;
}
```

**Behavior:** Throws `403 Forbidden` if flag is not enabled.

### Controller Endpoints Gated by Flag

All endpoints below use `@UseGuards(WorkspaceMembershipFeatureGuard)`:

1. **POST `/api/workspaces`** (Create workspace)
   - **File:** `workspaces.controller.ts:42-62`
   - **Guards:** `WorkspaceMembershipFeatureGuard`, `RequireOrgRoleGuard`
   - **Requires:** Admin role + feature flag enabled
   - **Enforces:** `ownerId` required when flag enabled

2. **GET `/api/workspaces/:id/members`** (List members)
   - **File:** `workspaces.controller.ts:85-99`
   - **Guards:** `WorkspaceMembershipFeatureGuard`, `RequireWorkspaceAccessGuard`
   - **Requires:** Viewer access + feature flag enabled

3. **POST `/api/workspaces/:id/members`** (Add member)
   - **File:** `workspaces.controller.ts:101-110`
   - **Guards:** `WorkspaceMembershipFeatureGuard`, `RequireWorkspaceAccessGuard`
   - **Requires:** Owner or Admin + feature flag enabled

4. **PATCH `/api/workspaces/:id/members/:userId`** (Change role)
   - **File:** `workspaces.controller.ts:112-122`
   - **Guards:** `WorkspaceMembershipFeatureGuard`, `RequireWorkspaceAccessGuard`
   - **Requires:** Owner or Admin + feature flag enabled

5. **DELETE `/api/workspaces/:id/members/:userId`** (Remove member)
   - **File:** `workspaces.controller.ts:124-133`
   - **Guards:** `WorkspaceMembershipFeatureGuard`, `RequireWorkspaceAccessGuard`
   - **Requires:** Owner or Admin + feature flag enabled

6. **POST `/api/workspaces/:id/change-owner`** (Change owner)
   - **File:** `workspaces.controller.ts:135-144`
   - **Guards:** `WorkspaceMembershipFeatureGuard`, `RequireOrgRoleGuard`
   - **Requires:** Admin role + feature flag enabled

### Service Logic Gated by Flag

**File:** `zephix-backend/src/modules/workspaces/workspaces.service.ts:25-87`

**Method:** `listByOrg(organizationId, userId?, userRole?)`

**Logic Flow:**
```typescript
const featureEnabled = this.configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1') === '1';

// If feature flag disabled OR user is admin/owner → return all org workspaces
if (!featureEnabled || userRole === 'admin' || userRole === 'owner') {
  return this.repo.find({ where: { organizationId } });
}

// Feature enabled AND user is NOT admin → filter by workspace membership
if (!userId) {
  return []; // Non-admin without userId sees nothing
}

// Get workspaces where user is a member
const memberWorkspaces = await this.memberRepo.find({
  where: { userId },
  relations: ['workspace'],
});
// Return filtered workspaces
```

**Behavior:**
- **Flag OFF:** All users see all workspaces in their organization (admin behavior)
- **Flag ON + Admin:** Admins see all workspaces (bypasses filtering)
- **Flag ON + Non-Admin:** Users only see workspaces where they are members
- **Flag ON + Non-Admin + No userId:** Returns empty array

---

## 4. FRONTEND CODE PATHS

### Flag Helper Function
**File:** `zephix-frontend/src/lib/flags.ts:4-7`

```typescript
export const isWorkspaceMembershipV1Enabled = () => {
  return import.meta.env.VITE_WS_MEMBERSHIP_V1 === '1' || hasFlag('workspaceMembershipV1');
};
```

**Behavior:** Checks environment variable OR runtime flag array.

### Components Using Flag

1. **AdminWorkspacesPage**
   - **File:** `zephix-frontend/src/pages/admin/AdminWorkspacesPage.tsx:34`
   - **Usage:** `const featureEnabled = isWorkspaceMembershipV1Enabled();`
   - **Purpose:** Conditionally show/hide workspace membership UI elements
   - **Lines:** 34 (flag check), then used throughout component for conditional rendering

2. **WorkspaceSettingsModal**
   - **File:** `zephix-frontend/src/features/workspaces/components/WorkspaceSettingsModal/WorkspaceSettingsModal.tsx:39`
   - **Usage:** `const featureEnabled = isWorkspaceMembershipV1Enabled();`
   - **Purpose:** Conditionally show member management UI
   - **Lines:** 39 (flag check), 47 (permission check based on flag)

### Frontend API Calls Affected

**File:** `zephix-frontend/src/features/workspaces/workspace.api.ts`

**Note:** API calls themselves don't check the flag, but:
- If flag is disabled, backend endpoints return `403 Forbidden`
- Frontend should handle 403 errors gracefully
- UI elements should be hidden when flag is disabled

---

## 5. SHOULD CODE DEFAULT ON OR OFF?

### Analysis

**Current Default:** **OFF** (disabled)

**Recommendation:** **KEEP DEFAULT AS OFF** for now, but prepare for migration.

### Reasoning:

#### Arguments for Keeping OFF (Current):
1. **Backward Compatibility:** Existing workspaces may not have membership records
2. **Gradual Rollout:** Allows testing in production without breaking existing users
3. **Data Migration Required:** Need to backfill `workspace_members` table before enabling
4. **Breaking Change:** Enabling flag changes behavior for non-admin users (they see fewer workspaces)

#### Arguments for Turning ON:
1. **Core Feature:** Workspace membership is a core differentiator
2. **Security:** Without flag, all org users see all workspaces (potential data leak)
3. **Consistency:** Flag creates inconsistent behavior (admins bypass, members filtered)

### Recommendation:

**KEEP DEFAULT OFF** until Step 1.4 (Backfill Script) is complete.

**Migration Path:**
1. Run backfill script (Step 1.4) to create membership records
2. Test with flag enabled in staging
3. Enable flag in production after verification
4. Eventually remove flag and make feature always-on

---

## 6. SUMMARY

### Flag Definition
- **Backend:** `ZEPHIX_WS_MEMBERSHIP_V1` (must equal `'1'`)
- **Frontend:** `VITE_WS_MEMBERSHIP_V1` (must equal `'1'`)
- **Default:** Disabled (undefined)

### Backend Code Paths (6 endpoints + 1 service method)
1. POST `/api/workspaces` - Create with owner
2. GET `/api/workspaces/:id/members` - List members
3. POST `/api/workspaces/:id/members` - Add member
4. PATCH `/api/workspaces/:id/members/:userId` - Change role
5. DELETE `/api/workspaces/:id/members/:userId` - Remove member
6. POST `/api/workspaces/:id/change-owner` - Change owner
7. `WorkspacesService.listByOrg()` - Visibility filtering

### Frontend Code Paths (2 components)
1. `AdminWorkspacesPage` - Conditional UI rendering
2. `WorkspaceSettingsModal` - Conditional member management UI

### Default Recommendation
**KEEP OFF** until backfill script completes (Step 1.4)

---

## 7. NEXT STEPS

After this audit, proceed to:
- **Step 1.2:** Enforce Workspace Membership Filtering
- **Step 1.3:** Enforce Role-Based Access
- **Step 1.4:** Backfill Script (create membership records)
- **Step 1.5:** RBAC Test Suite

---

**End of Audit Report**

