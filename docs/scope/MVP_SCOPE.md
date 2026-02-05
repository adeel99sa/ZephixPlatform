# MVP Scope Matrix

> **Source of Truth** for what ships in MVP vs what is deferred.

**Status**: LOCKED  
**Last Updated**: 2026-02-04

---

## One-Sentence MVP

Admin creates a workspace, creates a project from a template, assigns tasks to members, members update status and comment, admin sees rollups and one basic reporting surface, with role-gated access.

---

## MVP Flow Steps

1. Login
2. Land on role home
3. Enter workspace by slug
4. Create project from template
5. Assign work and update status
6. Verify rollups and basic reporting

---

## Must Ship (In Scope)

### Sprint 1: Auth ✅
- Cookie-based authentication flow
- JWT refresh token mechanism
- Role-based home routing (AdminHome, MemberHome, GuestHome)
- Session management

### Sprint 2: Governance ✅
- Workspace creation by admin
- Workspace slug resolution
- Workspace home with health snapshot
- Role-based workspace access

### Sprint 3: Templates 🚧
- Template Center UI
- Template selection and preview
- Template instantiation to project
- Project creation with phases and tasks

### Sprint 4: Resources 🚧
- Resource allocation tracking
- Allocation percentage calculations
- Over-allocation warnings
- Resource utilization reporting

### Sprint 5: Security ✅
- Workspace-scoped data access
- Cross-workspace access blocking
- Role-based permission enforcement
- Negative test coverage

---

## Ship Dark (Backend Ready, UI Deferred)

| Feature | Backend Status | UI Status | Notes |
|---------|---------------|-----------|-------|
| Program/Portfolio | ✅ API exists | ❌ No UI | Backend ready, UI post-MVP |
| Custom fields | ✅ Entity exists | ❌ No admin UI | Non-admin creation deferred |
| Template versioning | 🚧 Partial | ❌ Not exposed | Update propagation planned |
| Advanced notifications | ✅ Basic | ❌ Preferences UI | 3 core events only |

---

## Explicitly Deferred (Out of Scope)

| Feature | Reason |
|---------|--------|
| External integrations | Complexity, security review needed |
| Mobile applications | Web-first approach |
| Real-time WebSocket updates | Polling sufficient for MVP |
| AI assistant features | Requires model integration |
| Financial reporting | Not core workflow |
| Integration worker services | Post-MVP infrastructure |
| Overview page builder | View-only pages allowed, builder deferred |
| Admin console completeness | Workspace management only |
| Advanced notification preferences | Basic inbox sufficient |
| Custom field creation for non-admins | Admin-only for MVP |

---

## Definition of Done for MVP

- [ ] All 5 sprints pass their proof gates
- [ ] Each sprint has runtime proof artifacts
- [ ] No Phase 6 features included
- [ ] No overview page builder work
- [ ] Backend build passes
- [ ] Frontend build passes
- [ ] Core smoke test passes (login → workspace → project → task)
- [ ] Security negative tests pass

---

## Success Criteria by Sprint

### Sprint 1: Auth
- Login returns HTTP 200 with Set-Cookie header
- Refresh token stored securely
- AdminHome displays organization aggregations
- MemberHome displays assigned work aggregations
- GuestHome displays read-only access
- Role-based routing works at /home

### Sprint 2: Governance
- Workspace preview shows validation
- Workspace creation returns workspaceId
- Workspace home loads at /w/:slug/home
- Health snapshot displays execution summary
- Overdue tasks panel shows top 10 items
- Recent activity panel shows last 20 activities

### Sprint 3: Templates
- Template Center lists available templates
- Template preview shows phases and tasks
- Template instantiation creates project
- Project contains phases and tasks from template
- Success navigation routes to project overview

### Sprint 4: Resources
- Allocation percentages calculated correctly
- Over-allocation warnings displayed
- Utilization metrics accurate
- Resource endpoints return correct data

### Sprint 5: Security
- Cross-workspace access blocked (403/404)
- Role-based permissions enforced
- No data leakage across workspaces
- Negative tests pass

---

## Source Notes

Extracted from:
- `docs/MVP/01_scope.txt`
- `docs/MVP/00_decisions.txt`

*Created: 2026-02-04*
