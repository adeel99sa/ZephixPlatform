# Zephix Execution Loop Fix Plan

## The Problem

**You can't:**
- Create workspaces (API connection broken)
- Create projects (workspace context missing)
- Create dashboards (integration broken)
- Navigate reliably (routing issues)
- Complete any workflow (state management broken)

**Root Cause:** Integration points between frontend and backend are broken. Code exists, but connections fail.

---

## Fix Priority Order (No Deviations)

### 🔴 CRITICAL: Fix API Connection (Day 1-2)

**Problem:** Multiple API clients, inconsistent configuration, token management broken.

**Solution:**

1. **Consolidate to Single API Client**
   - Choose ONE: `services/api.ts` OR `lib/api/client.ts`
   - Delete the other
   - Update all imports

2. **Fix Base URL Configuration**
   ```typescript
   // Single source of truth
   const API_BASE_URL = import.meta.env.VITE_API_URL || 
     (import.meta.env.PROD 
       ? 'https://api.getzephix.com/api' 
       : '/api');
   ```

3. **Fix Token Management**
   - Single storage location: `localStorage.getItem('zephix.at')`
   - Remove all `auth-storage` references
   - Update AuthContext to use single location

4. **Fix Workspace Header Injection**
   - Get workspace ID from single source: `useWorkspaceStore().activeWorkspaceId`
   - Inject `x-workspace-id` header only when workspace exists
   - Don't send header for auth/health endpoints

5. **Add Proper Error Handling**
   - Surface API errors to users
   - Log errors for debugging
   - Show clear error messages

**Acceptance Criteria:**
- ✅ Single API client used everywhere
- ✅ API calls succeed consistently
- ✅ Token refresh works
- ✅ Workspace header injected correctly
- ✅ Errors are clear and actionable

**Files to Fix:**
- `zephix-frontend/src/services/api.ts` (consolidate here)
- `zephix-frontend/src/lib/api.ts` (delete or merge)
- `zephix-frontend/src/lib/api/client.ts` (delete or merge)
- All files importing from multiple API clients

---

### 🔴 CRITICAL: Fix Workspace Selection (Day 3-4)

**Problem:** Multiple selection screens, routing confusion, state not persisting.

**Solution:**

1. **Single Workspace Selection Screen**
   - Use ONLY `WorkspacesIndexPage` for workspace selection
   - Remove `WorkspaceSelectionScreen` or make it redirect to `/workspaces`
   - Remove duplicate selection logic from `SidebarWorkspaces`

2. **Fix Selection Flow**
   ```typescript
   // In WorkspacesIndexPage
   function handleSelectWorkspace(workspaceId: string) {
     setActiveWorkspace(workspaceId); // Set in store
     navigate('/home'); // Navigate to home
   }
   ```

3. **Fix Auto-Selection**
   - If only one workspace: auto-select and navigate
   - If multiple: show list
   - If zero: show empty state with "Create Workspace" button

4. **Fix State Persistence**
   - Workspace store persists `activeWorkspaceId`
   - On app load: check persisted workspace, validate it exists
   - If invalid: clear and show selection screen

**Acceptance Criteria:**
- ✅ Single workspace selection screen
- ✅ Selection works reliably
- ✅ Navigation happens after selection
- ✅ State persists across refreshes
- ✅ Auto-selection works for single workspace

**Files to Fix:**
- `zephix-frontend/src/views/workspaces/WorkspacesIndexPage.tsx`
- `zephix-frontend/src/components/workspace/WorkspaceSelectionScreen.tsx` (remove or redirect)
- `zephix-frontend/src/features/workspaces/SidebarWorkspaces.tsx` (remove selection logic)
- `zephix-frontend/src/state/workspace.store.ts` (ensure persistence works)

---

### 🔴 CRITICAL: Fix State Management (Day 5)

**Problem:** State scattered, race conditions, hydration issues.

**Solution:**

1. **Unify State Management**
   - Keep `workspace.store.ts` (Zustand) for workspace state
   - Keep `AuthContext` for auth state
   - Ensure they don't conflict

2. **Fix Hydration Order**
   ```typescript
   // In App.tsx or DashboardLayout
   useEffect(() => {
     // 1. Wait for auth
     if (authLoading) return;
     if (!user) return;
     
     // 2. Load workspaces
     loadWorkspaces();
     
     // 3. Restore persisted workspace
     const persisted = workspaceStore.activeWorkspaceId;
     if (persisted) {
       validateWorkspace(persisted);
     }
   }, [authLoading, user]);
   ```

3. **Fix Context Propagation**
   - Workspace context available via `useWorkspaceStore()`
   - Don't use multiple sources
   - Ensure workspace ID is available before making workspace-scoped API calls

4. **Remove Race Conditions**
   - Don't make API calls until workspace is set
   - Guard all workspace-scoped components
   - Show loading/empty states while hydrating

**Acceptance Criteria:**
- ✅ State loads before UI renders
- ✅ No race conditions
- ✅ Workspace context available everywhere
- ✅ State persists correctly

**Files to Fix:**
- `zephix-frontend/src/state/workspace.store.ts`
- `zephix-frontend/src/state/AuthContext.tsx`
- `zephix-frontend/src/components/layouts/DashboardLayout.tsx`
- All components using workspace context

---

### 🔴 CRITICAL: Fix Routing (Day 6-7)

**Problem:** Multiple routing patterns, guards conflicting, routes break on refresh.

**Solution:**

1. **Choose Single Routing Pattern**
   - **Recommendation:** Use slug-based (`/w/:slug/home`)
   - Keep legacy routes as redirects only
   - Remove ID-based routes from main app

2. **Simplify Route Guards**
   ```typescript
   // ProtectedRoute: Auth required
   // DashboardLayout: Workspace required for certain routes
   // AdminRoute: Admin required
   // No more complex guards
   ```

3. **Fix Navigation Reliability**
   - Use route helpers from `routes/workspaceRoutes.ts`
   - Don't hardcode paths
   - Ensure routes work on refresh

4. **Fix Workspace Context Gates**
   - Routes that need workspace: check `workspaceReady` in `DashboardLayout`
   - Show `WorkspaceSelectionScreen` if not ready
   - Don't block `/workspaces` route (it IS the selection page)

**Acceptance Criteria:**
- ✅ Routes work on refresh
- ✅ Navigation is predictable
- ✅ Route guards don't conflict
- ✅ Workspace context properly gated

**Files to Fix:**
- `zephix-frontend/src/App.tsx`
- `zephix-frontend/src/components/layouts/DashboardLayout.tsx`
- `zephix-frontend/src/routes/workspaceRoutes.ts`
- All navigation calls

---

## Making Core Flows Work

### Workspace Creation Flow (Week 2, Day 1-2)

**Current State:** Code exists, but integration broken.

**Fix Steps:**

1. **Test API Call**
   ```typescript
   // In WorkspaceCreateModal
   const response = await api.post('/workspaces', { name, slug });
   // Verify response format matches expected
   ```

2. **Fix Response Handling**
   ```typescript
   // Backend returns: { data: { workspaceId } }
   // Frontend expects: Workspace object
   // Fix mismatch
   ```

3. **Auto-Select After Creation**
   ```typescript
   const workspace = await createWorkspace({ name, slug });
   setActiveWorkspace(workspace.id); // Auto-select
   navigate('/home'); // Navigate to home
   ```

4. **Refresh Workspace List**
   ```typescript
   // After creation, refresh workspace list
   await refreshWorkspaces();
   ```

**Acceptance Criteria:**
- ✅ User can create workspace
- ✅ Workspace is selected automatically
- ✅ Navigation to home works
- ✅ Workspace appears in list

**Files to Fix:**
- `zephix-frontend/src/features/workspaces/WorkspaceCreateModal.tsx`
- `zephix-frontend/src/features/workspaces/api.ts`
- `zephix-backend/src/modules/workspaces/workspaces.controller.ts` (verify response format)

---

### Project Creation Flow (Week 2, Day 3-4)

**Current State:** Code exists, but workspace context missing.

**Fix Steps:**

1. **Ensure Workspace Context**
   ```typescript
   // In ProjectCreateModal
   const { activeWorkspaceId } = useWorkspaceStore();
   if (!activeWorkspaceId) {
     // Show error or redirect to workspace selection
     return <div>Please select a workspace first</div>;
   }
   ```

2. **Fix API Call**
   ```typescript
   // Include workspaceId in request
   const project = await createProject({
     name,
     workspaceId: activeWorkspaceId, // Ensure this is set
   });
   ```

3. **Fix Template Application**
   ```typescript
   // If template selected, use template apply endpoint
   if (templateId) {
     const { data } = await api.post(`/templates/${templateId}/apply`, {
       name,
       workspaceId: activeWorkspaceId,
     });
   }
   ```

4. **Navigate After Creation**
   ```typescript
   // Navigate to project overview
   navigate(`/projects/${project.id}`);
   ```

**Acceptance Criteria:**
- ✅ User can create project from template
- ✅ Template is applied correctly
- ✅ Project appears in workspace
- ✅ Navigation to project overview works

**Files to Fix:**
- `zephix-frontend/src/features/projects/ProjectCreateModal.tsx`
- `zephix-frontend/src/features/projects/api.ts`
- `zephix-backend/src/modules/projects/projects.controller.ts`

---

### Dashboard Creation Flow (Week 2, Day 5-7)

**Current State:** Code exists, but integration broken.

**Fix Steps:**

1. **Fix Dashboard List Loading**
   ```typescript
   // In DashboardsIndex
   useEffect(() => {
     const loadDashboards = async () => {
       const { activeWorkspaceId } = useWorkspaceStore.getState();
       if (!activeWorkspaceId) return;
       
       const dashboards = await listDashboards(activeWorkspaceId);
       setDashboards(dashboards);
     };
     loadDashboards();
   }, [activeWorkspaceId]);
   ```

2. **Fix Dashboard Creation**
   ```typescript
   // In DashboardCreateModal
   const { activeWorkspaceId } = useWorkspaceStore();
   const dashboard = await createDashboard({
     name,
     workspaceId: activeWorkspaceId,
   });
   ```

3. **Fix Builder Loading**
   ```typescript
   // In DashboardBuilder
   // Ensure workspace context is available
   // Load dashboard data
   // Render widgets
   ```

4. **Fix Widget Rendering**
   ```typescript
   // In WidgetRenderer
   // Ensure widget data loads
   // Handle loading/error states
   // Render widget correctly
   ```

**Acceptance Criteria:**
- ✅ User can create dashboard
- ✅ Dashboard saves correctly
- ✅ Widgets render
- ✅ Navigation to dashboard view works

**Files to Fix:**
- `zephix-frontend/src/views/dashboards/Index.tsx`
- `zephix-frontend/src/features/dashboards/DashboardCreateModal.tsx`
- `zephix-frontend/src/views/dashboards/Builder.tsx`
- `zephix-frontend/src/features/dashboards/widgets/WidgetRenderer.tsx`

---

## Testing Checklist

### API Connection
- [ ] API calls succeed in dev
- [ ] API calls succeed in prod
- [ ] Token refresh works
- [ ] Workspace header injected
- [ ] Errors are clear

### Workspace Selection
- [ ] Selection screen loads
- [ ] Selection works
- [ ] Navigation happens
- [ ] State persists
- [ ] Auto-selection works

### Workspace Creation
- [ ] Modal opens
- [ ] Form submits
- [ ] API call succeeds
- [ ] Workspace created
- [ ] Auto-selected
- [ ] Navigation works

### Project Creation
- [ ] Modal opens
- [ ] Workspace context available
- [ ] Template selector works
- [ ] API call succeeds
- [ ] Project created
- [ ] Navigation works

### Dashboard Creation
- [ ] Dashboard list loads
- [ ] Create modal opens
- [ ] Builder loads
- [ ] Dashboard saves
- [ ] Widgets render
- [ ] Navigation works

---

## Success Metrics

### Week 1: Integration Fixed
- ✅ API connection works reliably
- ✅ Workspace selection works
- ✅ State management unified
- ✅ Routing simplified

### Week 2: Core Flows Work
- ✅ Workspace creation works end-to-end
- ✅ Project creation works end-to-end
- ✅ Dashboard creation works end-to-end

### Week 3: User Can Complete Workflows
- ✅ User can login
- ✅ User can select/create workspace
- ✅ User can create project
- ✅ User can view project
- ✅ User can create dashboard
- ✅ User can view dashboard

---

## What NOT to Do

### Don't Add Features
- ❌ Don't add resource engine
- ❌ Don't add KPI packs
- ❌ Don't add template versioning
- ❌ Don't add new UI components

### Don't Refactor
- ❌ Don't change data models
- ❌ Don't change API structure
- ❌ Don't optimize performance
- ❌ Don't add new abstractions

### Don't Compare
- ❌ Don't compare feature counts
- ❌ Don't compare UI polish
- ❌ Focus on making what exists work

---

## The Path Forward

**Week 1:** Fix integration (API, state, routing)
**Week 2:** Make core flows work (workspace, project, dashboard)
**Week 3:** Test and polish
**Week 4:** Add resource engine v1 (your first differentiator)

**Then:** You have a working platform with real differentiators.

**But first:** Make what exists work.

---

*Fix Plan Created: January 2026*
*Based on: Codebase analysis, integration point failures, execution loop gaps*
