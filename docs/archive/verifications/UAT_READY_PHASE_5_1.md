# Phase 5.1 UAT Go-Live Checklist

**Date:** _______________
**Prepared by:** _______________
**Approved by:** _______________

---

## Scope Statement

Phase 5.1 delivers the Work Management System foundation, including:

- Template Center with deterministic recommendations
- Project and Program work plans with phases and tasks
- Project health tracking and needs attention lists
- Role-based access control (delivery owner vs stakeholder)
- Structure locking when work starts
- Acknowledgement flow for reporting-impact changes

**Out of scope for Phase 5.1:**
- Dashboard widgets and analytics
- Advanced task dependencies visualization
- Program-level phase structures
- Template editing UI

---

## Routes Shipped

### Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/templates` | `TemplateCenter` | Template recommendation and selection |
| `/projects/:projectId` | `ProjectOverviewPage` | Project overview with health and needs attention |
| `/work/projects/:projectId/plan` | `ProjectPlanView` | Work plan with phases and tasks |

### Backend Endpoints

#### Templates
- `GET /api/templates/recommendations` - Get template recommendations
- `GET /api/templates/:templateId/preview-v5_1` - Preview template structure
- `POST /api/templates/:templateId/instantiate-v5_1` - Create project from template

#### Work Management
- `GET /api/work/projects/:projectId/overview` - Project overview
- `GET /api/work/projects/:projectId/plan` - Project work plan
- `GET /api/work/programs/:programId/overview` - Program overview
- `GET /api/work/programs/:programId/plan` - Program work plan
- `POST /api/work/projects/:projectId/start` - Start work (lock structure)
- `PATCH /api/work/projects/:projectId/delivery-owner` - Set delivery owner

#### Tasks
- `POST /api/work/tasks` - Create task
- `PATCH /api/work/tasks/:id` - Update task
- `DELETE /api/work/tasks/:id` - Delete task
- `PATCH /api/work/tasks/bulk` - Bulk update task status

#### Phases
- `PATCH /api/work/phases/:phaseId` - Update phase (may require acknowledgement)

---

## Roles Behavior

### Platform Roles
- **ADMIN**: Can create workspaces, has implicit workspace_owner access
- **MEMBER**: Can access workspaces where they have membership
- **VIEWER**: Read-only access to workspaces

### Workspace Roles
- **workspace_owner**: Full control over workspace
- **delivery_owner**: Full write access within assigned containers (Sprint 6)
- **workspace_member**: Legacy role, backfilled to delivery_owner
- **stakeholder**: Read-only access across workspace (Sprint 6)
- **workspace_viewer**: Read-only access (Sprint 6)

### Authorization Rules
- **Read access**: All roles can read within workspace
- **Write access**: Only `delivery_owner` and `workspace_owner` can write
- **Project start**: Requires `deliveryOwnerUserId` to be set
- **Structure edits**: Blocked after project state is ACTIVE

---

## Locked Copy Phrases

All Phase 5.1 UI uses these exact phrases (no variants):

- **Structure locks when work starts**
- **Read only access**
- **Needs attention**
- **On track**
- **Blocked**
- **Confirmation required**
- **Confirmation expired. Try again.**

### Empty State Messages
- **Select a workspace to continue.**
- **No templates match. Try another work type.**
- **No phases exist for this project.**
- **No tasks in this phase.**
- **No items need attention at this time.**

### Error Messages (mapped from backend codes)
- `WORKSPACE_REQUIRED` → "Select a workspace to continue."
- `FORBIDDEN_ROLE` → "Read only access"
- `DELIVERY_OWNER_REQUIRED` → "Delivery owner must be set before starting work."
- `ACK_TOKEN_EXPIRED` / `ACK_TOKEN_INVALID` → "Confirmation expired. Try again."
- `WORK_PLAN_ALREADY_INITIALIZED` → "Project already has a work plan."
- `WORK_PLAN_INVALID` → "No phases exist for this project."
- `LOCKED_PHASE_STRUCTURE` → "Project is active. Structure is locked."

---

## Known Limitations

1. **Template editing**: Templates cannot be edited via UI (admin only via API)
2. **Program phases**: Programs do not have their own phase structures (aggregate project plans only)
3. **Task dependencies visualization**: Dependencies exist but no visual graph yet
4. **Bulk operations**: Limited bulk operations (status updates only)
5. **Health recalculation**: Health is stored and recalculated on triggers, not real-time
6. **Phase-only templates**: Supported but may show empty task lists

---

## Pass Criteria

### Functional Requirements
- [ ] Template recommendations return deterministic top 3 results
- [ ] Template instantiation creates phases and tasks correctly
- [ ] Project start locks structure and sets all phases to locked
- [ ] Health calculation shows HEALTHY, AT_RISK, or BLOCKED correctly
- [ ] Needs attention list shows actionable items
- [ ] Delivery owner can write, stakeholder can only read
- [ ] Acknowledgement flow works for milestone phase changes

### Non-Functional Requirements
- [ ] All copy phrases match locked list exactly
- [ ] Empty states show appropriate messages and actions
- [ ] Error messages are user-friendly (no raw codes)
- [ ] Loading states prevent layout jumps
- [ ] Routes are accessible and navigation works
- [ ] No console errors in browser
- [ ] Backend E2E tests pass

---

## Manual Smoke Tests

### Delivery Owner Smoke Steps

Run in this order:

1. **Template Center**
   - [ ] Open `/templates`
   - [ ] Preview a template
   - [ ] Use template, create project

2. **Project Setup**
   - [ ] Set delivery owner if prompted
   - [ ] Start work

3. **Work Plan**
   - [ ] Open `/work/projects/:id/plan`
   - [ ] Change milestone dueDate, confirm modal, verify change applied
   - [ ] Change milestone dueDate again, confirm modal appears again, verify change applied

### Stakeholder Smoke Steps

Run in this order:

1. **Template Center (Read-Only)**
   - [ ] Open `/templates`
   - [ ] Preview works
   - [ ] No "Use template" visible, "Read only access" text visible

2. **Project Views (Read-Only)**
   - [ ] Open same project overview and plan
   - [ ] No "Start work" visible
   - [ ] No "Add task" visible
   - [ ] No phase edit visible

---

## Issues Found During Smoke Tests

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| ProjectPlanView missing phase edit UI | High | Resolved | Added minimal phase edit UI with guardrails: "Edit date" link appears only when canWrite=true, projectState=ACTIVE, phase.isMilestone=true, phase.isLocked=true, and phase.dueDate exists. Wired to usePhaseUpdate hook and AckRequiredModal. Save button disabled during request with "Saving..." text. Smoke test step "Change milestone dueDate" can now be completed. |
| Backend database trigger error | Medium | Resolved | Fixed database trigger `zephix_protect_demo_users()` by removing references to non-existent columns. Simplified to only block DELETE operations on demo users. Backend now healthy on port 3001 (HTTP 200). |
| Manual smoke tests - frontend API port mismatch | High | Resolved | Fixed all hardcoded port 3000 references: updated `auth.interceptor.ts` to use relative paths, commented out `VITE_API_URL` in `.env` files, verified Vite proxy routes `/api` to `localhost:3001`. Network requests now correctly use `http://localhost:5173/api/*` (proxied). Ready for smoke tests. |
| | | | |

---

## Sign-Off

**QA Lead:** _______________ Date: _______________

**Product Owner:** _______________ Date: _______________

**Engineering Lead:** _______________ Date: _______________

---

## Post-UAT Notes

_Add any follow-up items or known issues discovered during UAT:_

