# Workspace Landing Page Fix Plan

## Executive Summary

The current workspace landing page violates product specifications and creates a poor customer experience by:
1. **Leaking system-generated workspaces** to real customers
2. **Showing empty modules** that throw 404 errors
3. **Calling non-existent endpoints** for empty workspaces
4. **Violating the clean-slate architecture** defined in `MASTER_CURSOR_PROMPT.md`

---

## Problem 1: System-Generated Workspaces Leaking to Customers

### Current Behavior
- `GET /api/workspaces` returns **all workspaces** in the organization, including:
  - Workspaces created during development/testing
  - Workspaces created by seed scripts
  - Workspaces created by demo/bootstrap services
  - Internal system workspaces

### Root Cause Analysis

**Backend (`workspaces.service.ts:42-105`):**
```typescript
async listByOrg(organizationId: string, userId?: string, userRole?: string) {
  // If feature flag disabled or user is admin, return ALL org workspaces
  if (!featureEnabled || userRole === 'admin' || userRole === 'owner') {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }
  // ... membership filtering for non-admins
}
```

**Frontend (`SidebarWorkspaces.tsx:43-50`):**
```typescript
async function refresh() {
  const data = await listWorkspaces(); // Calls GET /api/workspaces
  setWorkspaces(data); // Displays ALL workspaces without filtering
}
```

**No filtering mechanism exists for:**
- System-generated workspaces
- Development/test workspaces
- Workspaces created by seed scripts
- Demo/bootstrap workspaces

### Impact
- **Customer confusion**: New customers see internal workspaces they didn't create
- **Security concern**: System workspaces may contain test data
- **Professional appearance**: Real SaaS products never show prepopulated content

### Architecture Violation
Per `MASTER_CURSOR_PROMPT.md` Section 0.1:
> "Workspace owner or admin can create projects from Template Center only."
> "Customers must build their workspace from a clean slate"

---

## Problem 2: Empty Workspace Overview Shows Empty Modules & 404s

### Current Behavior
`WorkspaceHome.tsx` loads and displays:
- KPIs (shows 0s)
- Active Projects (shows "No projects yet")
- Tasks due this week (shows "Nothing due this week")
- Recent updates (shows "No recent activity")

### Root Cause Analysis

**Frontend (`WorkspaceHome.tsx:16-35`):**
```typescript
useEffect(() => {
  const [w, k, p, t, r] = await Promise.all([
    getWorkspace(workspaceId),
    getKpiSummary(workspaceId),      // ✅ Has fallback
    listProjects(workspaceId),         // ✅ Has fallback
    listTasksDueThisWeek(workspaceId), // ❌ Calls non-existent endpoint
    listRecentUpdates(workspaceId),    // ❌ Calls non-existent endpoint
  ]);
}, [workspaceId]);
```

**API Calls (`workspace.api.ts`):**

1. **`listTasksDueThisWeek()` (line 162-169):**
   ```typescript
   const tasks = await api.get(`/tasks?workspaceId=${id}&due=week`);
   ```
   - **Backend endpoint**: `GET /tasks` exists but **doesn't support `workspaceId` query param**
   - **Actual endpoint**: `GET /tasks/project/:projectId` (requires projectId, not workspaceId)
   - **Result**: 404 or Bad Request

2. **`listRecentUpdates()` (line 172-179):**
   ```typescript
   const updates = await api.get(`/api/activity?workspaceId=${id}&limit=10`);
   ```
   - **Backend endpoint**: `GET /api/activity` **does not exist**
   - **Activity service**: `ActivityFeedService` exists but is in `temp-disabled/collaboration/`
   - **Result**: 404 Not Found

### Impact
- **Console errors**: Multiple 404s logged for every workspace view
- **Poor UX**: Empty state shows broken modules
- **Performance**: Unnecessary failed API calls

### Architecture Violation
Per `ARCHITECTURE_GUIDE.md` Phase 1:
> "Customers must build their workspace from a clean slate: create projects, create folders, create forms, create documents, create templates"

The UI should show **empty state with clear CTAs**, not broken modules.

---

## Problem 3: Workspace Should NOT Autogenerate Structure

### Current Behavior
When a workspace is created:
- Workspace entity is created ✅
- WorkspaceMember record is created ✅
- **But the UI assumes structure exists** ❌

### Root Cause Analysis

**Workspace Creation (`workspaces.service.ts:152-235`):**
```typescript
async createWithOwner(input: {...}) {
  // Creates workspace entity
  const savedWorkspace = await workspaceRepo.save(entity);

  // Creates workspace member
  await memberRepo.save(member);

  // ✅ CORRECT: No auto-generation of projects, tasks, etc.
}
```

**But `WorkspaceHome.tsx` immediately tries to load:**
- Projects (empty is OK)
- Tasks (404 error)
- Activity (404 error)
- KPIs (shows 0s)

### Architecture Compliance
✅ **Backend is correct**: No auto-generation happens
❌ **Frontend violates spec**: Assumes structure exists

Per `MASTER_CURSOR_PROMPT.md` Section 0.3:
> "Projects: Created only through Template Center. Never from random '+ New project' buttons."
> "Customers must build their workspace from a clean slate"

---

## System Connections Map

### Frontend → Backend Flow

```
WorkspaceHome.tsx
  ├─→ getWorkspace(id) → GET /api/workspaces/:id ✅ EXISTS
  ├─→ getKpiSummary(id) → GET /api/kpi/workspaces/:id/summary ✅ EXISTS (with fallback)
  ├─→ listProjects(id) → GET /api/projects?workspaceId=id ✅ EXISTS (with fallback)
  ├─→ listTasksDueThisWeek(id) → GET /api/tasks?workspaceId=id&due=week ❌ DOESN'T EXIST
  └─→ listRecentUpdates(id) → GET /api/activity?workspaceId=id&limit=10 ❌ DOESN'T EXIST

SidebarWorkspaces.tsx
  └─→ listWorkspaces() → GET /api/workspaces ❌ RETURNS ALL (including system workspaces)
```

### Backend Endpoints Status

| Endpoint | Status | Issue |
|----------|--------|-------|
| `GET /api/workspaces` | ✅ Exists | Returns all workspaces (no filtering) |
| `GET /api/workspaces/:id` | ✅ Exists | Works correctly |
| `GET /api/projects?workspaceId=:id` | ✅ Exists | Works correctly |
| `GET /api/tasks?workspaceId=:id&due=week` | ❌ **Doesn't exist** | Tasks controller doesn't support workspaceId query |
| `GET /api/activity?workspaceId=:id` | ❌ **Doesn't exist** | Activity service is in temp-disabled |
| `GET /api/kpi/workspaces/:id/summary` | ✅ Exists | Has fallback in frontend |

---

## Proposed Solution Plan

### Phase 1: Filter System Workspaces (Backend)

**File**: `zephix-backend/src/modules/workspaces/workspaces.service.ts`

**Changes**:
1. Add `isSystemGenerated` boolean field to `Workspace` entity (migration required)
2. OR: Add `metadata` JSONB field to store `{ "source": "user" | "system" | "seed" | "demo" }`
3. Update `listByOrg()` to filter out system workspaces for non-admin users
4. Add admin-only endpoint to view system workspaces if needed

**Filtering Logic**:
```typescript
// For regular users: only show user-created workspaces
if (userRole !== 'admin' && userRole !== 'owner') {
  query.andWhere('w.metadata->>\'source\' = :source', { source: 'user' });
  // OR: query.andWhere('w.isSystemGenerated = :isSystem', { isSystem: false });
}
```

**Migration Required**:
- Add column to `workspaces` table
- Mark existing system workspaces (identify by naming pattern, created_by system user, etc.)

---

### Phase 2: Fix Empty Workspace Overview (Frontend)

**File**: `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx`

**Changes**:
1. **Remove broken API calls**:
   - Remove `listTasksDueThisWeek()` call (endpoint doesn't exist)
   - Remove `listRecentUpdates()` call (endpoint doesn't exist)

2. **Implement proper empty state**:
   - Show empty state when workspace has no projects
   - Display clear CTAs: "Create your first project", "Go to Template Center"
   - Hide empty modules (Tasks, Activity) until workspace has content

3. **Conditional rendering**:
   ```typescript
   {projects.length === 0 ? (
     <EmptyWorkspaceState onGoToTemplates={...} />
   ) : (
     <WorkspaceOverview projects={projects} kpi={kpi} />
   )}
   ```

**File**: `zephix-frontend/src/features/workspaces/workspace.api.ts`

**Changes**:
1. Remove or comment out `listTasksDueThisWeek()` (endpoint doesn't exist)
2. Remove or comment out `listRecentUpdates()` (endpoint doesn't exist)
3. Add TODO comments referencing when these endpoints will be implemented

---

### Phase 3: Implement Clean Slate Empty State

**File**: `zephix-frontend/src/features/workspaces/components/EmptyWorkspaceState.tsx` (NEW)

**Design**:
- Large illustration/icon
- Heading: "Your workspace is ready"
- Subheading: "Start by creating your first project from a template"
- Primary CTA: "Go to Template Center" → `/templates?workspaceId=${workspaceId}`
- Secondary CTA: "Learn more about workspaces" (optional)

**Integration**:
- Replace empty module sections in `WorkspaceHome.tsx`
- Show when `projects.length === 0 && tasks.length === 0`

---

### Phase 4: Backend Endpoint Implementation (Future)

**Option A: Implement missing endpoints**
- `GET /api/tasks?workspaceId=:id&due=week` - Filter tasks by workspace and due date
- `GET /api/activity?workspaceId=:id` - Workspace-scoped activity feed

**Option B: Remove frontend calls** (Recommended for now)
- Remove calls until endpoints are implemented
- Follow clean-slate architecture: don't show data that doesn't exist

---

## Implementation Priority

### Critical (Fix Immediately)
1. ✅ **Filter system workspaces** - Prevents customer confusion
2. ✅ **Remove broken API calls** - Stops 404 errors
3. ✅ **Implement empty state** - Aligns with clean-slate architecture

### Important (Next Sprint)
4. ⚠️ **Add workspace metadata field** - Proper system workspace identification
5. ⚠️ **Migration for existing workspaces** - Mark system workspaces

### Future (When Activity/Tasks endpoints are ready)
6. 📋 **Implement activity endpoint** - Workspace-scoped activity feed
7. 📋 **Implement tasks endpoint** - Workspace-scoped task queries

---

## Testing Checklist

### Before Fix
- [ ] New customer sees system workspaces in sidebar
- [ ] Empty workspace shows 404 errors in console
- [ ] Empty workspace shows broken modules

### After Fix
- [ ] New customer sees only their workspaces
- [ ] Empty workspace shows clean empty state
- [ ] No 404 errors in console
- [ ] Empty state has clear CTAs to Template Center
- [ ] System workspaces hidden from regular users
- [ ] Admins can still see all workspaces (if needed)

---

## Files to Modify

### Backend
1. `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts` - Add metadata field
2. `zephix-backend/src/modules/workspaces/workspaces.service.ts` - Add filtering logic
3. `zephix-backend/src/migrations/XXXX-AddWorkspaceMetadata.ts` - Migration (NEW)

### Frontend
1. `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx` - Remove broken calls, add empty state
2. `zephix-frontend/src/features/workspaces/workspace.api.ts` - Remove/comment broken functions
3. `zephix-frontend/src/features/workspaces/components/EmptyWorkspaceState.tsx` - NEW component

---

## Architecture Compliance

✅ **After fixes, the system will comply with:**
- `MASTER_CURSOR_PROMPT.md` Section 0.1: Clean slate workspace creation
- `MASTER_CURSOR_PROMPT.md` Section 0.3: Projects only from Template Center
- `ARCHITECTURE_GUIDE.md` Phase 1: Customers build from clean slate

---

## Notes

- **Activity endpoint**: Currently in `temp-disabled/collaboration/activity-feed.service.ts` - needs to be enabled and workspace-scoped
- **Tasks endpoint**: `TasksController` exists but doesn't support workspaceId query - needs extension
- **System workspace identification**: May need to identify existing system workspaces by:
  - Naming patterns (e.g., "Demo Workspace", "Test Workspace")
  - Created by system user
  - Created before customer onboarding date
  - Metadata field (preferred solution)

---

**Status**: ✅ Research Complete - Awaiting Approval to Proceed








