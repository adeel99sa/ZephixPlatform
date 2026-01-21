# Next Work: Core Flow 05 - Create Project

**Status:** Ready to start  
**Priority:** High - Core flow  
**Dependencies:** Core Flow 04 must be verified first

## Epic: Core Flow 05 - Create Project

### Current State

- ✅ ProjectsPage component exists at `zephix-frontend/src/pages/projects/ProjectsPage.tsx`
- ⚠️ Uses old API client (`apiClient` from `@/lib/api/client`)
- ⚠️ Uses old workspace store (`useWorkspaceStore` from `@/stores/workspaceStore`)
- ✅ Has inline empty state for no workspace selected
- ✅ Has CreateProjectPanel component

### Requirements

1. **Update ProjectsPage to use new API client:**
   - Replace `apiClient` with `api` from `@/services/api`
   - Update workspace store import to `@/state/workspace.store`
   - Ensure all project API calls use the unified client

2. **Verify workspace scoping:**
   - If no workspace selected: show inline empty state (already exists)
   - If workspace selected: list projects from `GET /projects`
   - All project API calls must include `x-workspace-id` header

3. **Verify project creation:**
   - Create project via `POST /projects`
   - Request must include `x-workspace-id` header
   - Projects list refreshes after creation

4. **Proof required:**
   - Network headers for `GET /projects` show `x-workspace-id`
   - Network headers for `POST /projects` show `x-workspace-id`
   - Screenshots of Network tab headers

### Files to Update

1. `zephix-frontend/src/pages/projects/ProjectsPage.tsx`
   - Replace `apiClient` import with `api` from `@/services/api`
   - Update workspace store import path
   - Verify `useProjects` hook uses correct API client

2. Verify `CreateProjectPanel` component:
   - Uses `api` from `@/services/api`
   - Includes `x-workspace-id` header on POST

### Acceptance Criteria

- [ ] ProjectsPage loads without errors
- [ ] Inline empty state shows when no workspace selected
- [ ] Projects list loads when workspace selected
- [ ] `GET /projects` includes `x-workspace-id` header
- [ ] `POST /projects` includes `x-workspace-id` header
- [ ] Project creation refreshes list
- [ ] Network tab screenshots captured

### Proof Files

Update `proofs/core-05-create-project.md` with:
- Status: PASS
- Network headers screenshots
- Verification steps completed
