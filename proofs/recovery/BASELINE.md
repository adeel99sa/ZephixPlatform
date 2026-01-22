# Phase 0 Baseline - Current State Analysis

**Date:** 2026-01-XX
**Branch:** recovery/workspace-mvp
**Purpose:** Document current state before fixes

---

## Acceptance Flow Test (8 Steps)

### Step 1: Login
**Status:** ✅ Likely works (not tested in browser)
**Evidence:** Auth code exists, login page exists

### Step 2: Create Workspace
**Status:** ❌ **CONTRACT MISMATCH IDENTIFIED**
**Evidence from code:**

**Backend Contract:**
- Endpoint: `POST /api/workspaces`
- Accepts: `{ name: string, slug?: string }` (DTO allows more, but frontend sends only name/slug)
- Returns: `{ data: { workspaceId: string } }` (line 322, 358 in workspaces.controller.ts)
- Owner: Derived from auth context (`@CurrentUser()`)

**Frontend Expectation:**
- Sends: `{ name: string, slug?: string }` ✅ (correct)
- Expects: `{ data: Workspace }` ❌ (mismatch - backend returns `{ data: { workspaceId } }`)
- Code: `zephix-frontend/src/features/workspaces/api.ts:51`
  ```typescript
  const response = await api.post<{ data: Workspace }>('/workspaces', payload);
  return unwrapData<Workspace>(response) || {} as Workspace;
  ```

**Problem:**
- Backend returns `{ data: { workspaceId: "..." } }`
- Frontend expects `{ data: Workspace }` (full workspace object)
- `unwrapData` will extract `{ workspaceId }` but code expects `Workspace` with `id` property
- `onCreated(ws.id)` will fail because `ws` is `{ workspaceId }` not `{ id: string }`

**Expected Failure:**
- API call succeeds (200)
- Response parsing fails or returns wrong shape
- `ws.id` is undefined
- `onCreated(ws.id)` passes undefined
- Workspace not selected
- Navigation fails

### Step 3: Owner Auto Assigned
**Status:** ✅ Backend logic correct
**Evidence:**
- Backend derives owner from `@CurrentUser()` (line 267)
- Defaults to `[u.id]` if not provided
- Owner assignment happens in `createWithOwners()` service method

**Potential Issue:**
- If frontend fails to get workspaceId from response, owner assignment works but workspace selection fails

### Step 4: Land on Workspace Home
**Status:** ❌ **ROUTE MISSING**
**Evidence:**
- No route `/workspaces/:workspaceId/home` exists in `App.tsx`
- Current routes:
  - `/workspaces` - WorkspacesIndexPage
  - `/workspaces/:id` - WorkspaceView
  - `/home` - HomeView (requires workspace but no explicit workspaceId in URL)
  - `/w/:slug/home` - WorkspaceHomeBySlug (slug-based, not ID-based)

**Problem:**
- After workspace creation, no clear navigation target
- `WorkspaceCreateModal.onCreated(ws.id)` callback doesn't navigate
- User stuck on current page or redirected to generic `/home`

### Step 5: Plus Menu Exists
**Status:** ❌ **NOT FOUND**
**Evidence:**
- No plus menu component found in workspace context
- Sidebar has workspace dropdown but no plus button
- No menu with "Project", "Template Center", "Doc", "Form" options

### Step 6: Open Template Center
**Status:** ⚠️ **ROUTE EXISTS BUT NOT ACCESSIBLE FROM WORKSPACE**
**Evidence:**
- Route `/templates` exists → `TemplateCenterPage`
- TemplateCenter component exists
- But no clear path from workspace to template center
- No plus menu to access it

### Step 7: Create Project from Template
**Status:** ⚠️ **CODE EXISTS BUT FLOW BROKEN**
**Evidence:**
- `ProjectCreateModal` exists with template selector
- Template instantiation endpoint exists: `POST /admin/templates/:id/apply`
- But requires workspaceId which may not be set
- Navigation after creation: `onCreated(projectId)` but no navigation code visible

**Potential Issues:**
- Workspace context may not be available
- Template instantiation may fail if workspaceId missing
- Navigation after creation unclear

### Step 8: Open Plan View
**Status:** ⚠️ **ROUTE EXISTS BUT MAY NOT WORK**
**Evidence:**
- Route `/work/projects/:projectId/plan` exists → `ProjectPlanView`
- But requires project to exist first
- If project creation fails, plan view inaccessible

---

## Code Analysis Findings

### 1. API Response Contract Mismatch

**Backend (`workspaces.controller.ts:322, 358`):**
```typescript
return formatResponse({ workspaceId: workspace.id });
// Returns: { data: { workspaceId: string } }
```

**Frontend (`features/workspaces/api.ts:51`):**
```typescript
const response = await api.post<{ data: Workspace }>('/workspaces', payload);
return unwrapData<Workspace>(response) || {} as Workspace;
// Expects: { data: Workspace } where Workspace has { id: string }
```

**Impact:** Workspace creation succeeds but frontend can't extract workspaceId correctly.

### 2. Workspace Selection After Creation

**Frontend (`WorkspaceCreateModal.tsx:37`):**
```typescript
onCreated(ws.id); // ws.id is undefined if response is { workspaceId }
```

**Missing:**
- No `setActiveWorkspace(ws.id)` call
- No navigation after creation
- Workspace not persisted to store

### 3. Workspace Home Route Missing

**Current Routes:**
- `/workspaces` - List page
- `/workspaces/:id` - WorkspaceView (may not be "home")
- `/home` - HomeView (generic, requires workspace context)
- `/w/:slug/home` - Slug-based home (not ID-based)

**Missing:**
- `/workspaces/:workspaceId/home` - Explicit workspace home route

### 4. Plus Menu Not Found

**Search Results:**
- No plus button component in workspace context
- No menu with "Project", "Template Center", "Doc", "Form" options
- Sidebar has workspace switcher but no create actions

### 5. State Management Issues

**Workspace Store (`state/workspace.store.ts`):**
- Persists `activeWorkspaceId`
- But workspace creation doesn't set it
- No automatic selection after creation

**Auth Context:**
- Stores token in `localStorage.getItem('zephix.at')`
- API client reads from multiple locations (zephix.at, auth-storage)
- Potential token management issues

---

## Expected Failures (Based on Code Analysis)

### Failure 1: Workspace Creation Response Mismatch
**Endpoint:** `POST /api/workspaces`
**Request Payload:**
```json
{
  "name": "Test Workspace",
  "slug": "test-workspace"
}
```
**Expected Response:**
```json
{
  "data": {
    "workspaceId": "uuid-here"
  }
}
```
**Frontend Expectation:**
```typescript
{ data: Workspace } // { id: string, name: string, ... }
```
**Failure:** `ws.id` is undefined, `onCreated(undefined)` called

### Failure 2: No Navigation After Creation
**Current Behavior:**
- Modal closes (`onClose()`)
- Callback called with undefined (`onCreated(undefined)`)
- No navigation happens
- User stays on current page

**Expected Behavior:**
- Set active workspace
- Navigate to `/workspaces/:workspaceId/home`

### Failure 3: Workspace Home Route 404
**Attempted URL:** `/workspaces/:workspaceId/home`
**Result:** 404 Not Found
**Reason:** Route doesn't exist in `App.tsx`

### Failure 4: Plus Menu Not Found
**Location:** Inside workspace (after selection)
**Result:** No plus button visible
**Reason:** Component doesn't exist

---

## Files Requiring Changes (Phase 1 Preview)

### Backend
1. `zephix-backend/src/modules/workspaces/workspaces.controller.ts`
   - Change return from `{ data: { workspaceId } }` to `{ data: Workspace }`
   - OR keep current return and fix frontend

### Frontend
1. `zephix-frontend/src/features/workspaces/api.ts`
   - Fix response handling to match backend contract
   - Extract workspaceId correctly

2. `zephix-frontend/src/features/workspaces/WorkspaceCreateModal.tsx`
   - Set active workspace after creation
   - Navigate to workspace home

3. `zephix-frontend/src/App.tsx`
   - Add route `/workspaces/:workspaceId/home`

4. `zephix-frontend/src/components/shell/Header.tsx` or similar
   - Add plus menu component

---

## Baseline Commit State

**Branch:** recovery/workspace-mvp
**Base:** main (with uncommitted changes stashed)
**Status:** Code analyzed, baseline documented
**Next:** Phase 1 implementation after review

---

## Notes

- Cannot capture actual HAR files without running browser
- Cannot capture screenshots without running app
- Analysis based on code review only
- Actual failures may differ when tested in browser
- Phase 1 should include browser testing with HAR capture

---

*Baseline documented: 2026-01-XX*
*Next: Phase 1 - Fix workspace lifecycle end-to-end*
