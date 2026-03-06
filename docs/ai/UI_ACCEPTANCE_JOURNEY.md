# UI Acceptance Journey

Defines the exact screens, conditions, and assertions for the UI acceptance smoke lane.
Run against staging with a live frontend deployment. All steps are serial; stop on first failure.

---

## Journey states

### State A — New org owner, fresh signup
- User does not yet exist on staging
- Created via `POST /api/auth/organization/signup` with a unique `staging+admin+<RUN_ID>@zephix.dev` email
- Session established via `POST /api/auth/smoke-login` (bypasses email verification)
- Lands on `/home` with no workspace yet
- Route: `/home` → OrgHomePage

### State B — Owner creates first workspace
- Owner navigates to `/setup/workspace`
- Fills workspace name, submits
- Backend: `POST /api/workspaces`
- Expects: redirect to `/w/<slug>/home`
- Route: `/w/:slug/home` → WorkspaceHomeBySlug

### State C — Owner creates portfolio and program
- Owner navigates to `/workspaces/:workspaceId/portfolios`
- Creates portfolio via UI form
- Backend: `POST /api/workspaces/:workspaceId/portfolios`
- Navigates to `/workspaces/:workspaceId/programs`
- Creates program (linked to portfolio)
- Backend: `POST /api/workspaces/:workspaceId/portfolios/:portfolioId/programs`
- Gated by `programsPortfolios` feature flag; if flag off, step is skipped not failed

### State D — Owner creates project
- Owner navigates to `/projects`
- Creates project via UI form
- Backend: `POST /api/projects`
- Expects: project appears in list

### State E — Owner links project to program and portfolio
- If UI exposes linkage: use PATCH via UI
- If UI does not expose linkage: call `PATCH /api/workspaces/:workspaceId/projects/:projectId/link` via APIRequestContext
- Then reload project detail page and assert programId + portfolioId are present in API response

### State F — Owner creates tasks, sees board
- Owner navigates to `/projects/:projectId/board`
- Creates task via UI
- Backend: `POST /api/work/tasks`
- Asserts: task card visible on board

### State G — Owner sends org invites
- Owner navigates to `/admin/invite`
- Page must render without 403
- Two users created via API (`POST /orgs/:orgId/invites`):
  - `staging+member+<RUN_ID>@zephix.dev` with role MEMBER
  - `staging+viewer+<RUN_ID>@zephix.dev` with role VIEWER

### State H — Invitees register
- Both invitees created via `POST /api/auth/register` with their emails
- Token for each invite fetched via `GET /api/smoke/invites/latest-token`

### State I — Invitees accept invite via UI
- Invitee smoke-login session established via API
- Invitee browser navigates to `/invites/accept?token=<token>` with session cookies applied
- Asserts: page shows "Invitation Accepted!" (not "Invitation Failed" or "Login Required")
- Asserts: redirect to `/home` after acceptance

### State J — Invitee sees workspace
- Invitee (member) session navigates to `/home`
- Asserts: workspace is visible in workspace list (GET /workspaces returns WORKSPACE_ID)

---

## RBAC checks

### Admin
- Can access `/admin` (no 403 redirect)
- Can access `/projects` (create button visible)
- Can access `/workspaces/:workspaceId/members` (no 403)
- Workspace header `X-Workspace-Id` is sent on all scoped requests

### Member
- Can access `/projects` (no 403)
- Cannot access `/admin` (redirected to `/home`)
- `/billing` → redirected to `/home` (admin only)
- Cannot see "Create Project" if canCreateProjects(MEMBER) is false (check role logic)
  - Note: `canCreateProjects` returns true for MEMBER, so member CAN create projects

### Viewer
- Cannot access `/admin` (redirected)
- Cannot access `/templates` (redirected to `/home` — RequirePaidInline guard)
- Cannot access `/workspaces/:id/members` (redirected to `/home` — RequirePaidInline guard)
- Cannot access `/my-work` (PaidRoute guard — redirected)

---

## Routes confirmed in App.tsx

| Path | Guard | Component |
|------|-------|-----------|
| `/home` | ProtectedRoute | OrgHomePage |
| `/setup/workspace` | ProtectedRoute | CreateFirstWorkspacePage |
| `/projects` | RequireWorkspace | ProjectsPage |
| `/projects/:projectId/board` | RequireWorkspace | ProjectBoardTab |
| `/admin` | AdminRoute | AdminDashboardPage |
| `/admin/invite` | AdminRoute | AdminInvitePage |
| `/billing` | RequireAdminInline | BillingPage |
| `/workspaces/:id/members` | RequirePaidInline | WorkspaceMembersPage |
| `/templates` | RequirePaidInline | TemplateRouteSwitch |
| `/my-work` | PaidRoute | MyWorkPage |
| `/invites/accept` | public | InviteAcceptPage |
| `/workspaces/:workspaceId/programs` | FeaturesRoute(programsPortfolios) | ProgramsListPage |
| `/workspaces/:workspaceId/portfolios` | FeaturesRoute(programsPortfolios) | PortfoliosListPage |

---

## Stop conditions

| Condition | Action |
|-----------|--------|
| `STAGING_FRONTEND_BASE` empty | Exit 1 before any browser launch |
| `STAGING_SMOKE_KEY` missing | Exit 1 before session setup |
| `/api/health/ready` non-200 | Exit 1 (schema drift may block auth) |
| org_signup 4xx/5xx | Exit 1 — can't continue without admin user |
| smoke-login fails | Exit 1 — no session to work with |
| `/home` shows 401 or 500 | Exit 1 |
| workspace creation fails | Exit 1 — all subsequent steps need workspace |
| Any 500 on core create flows | Exit 1 and save HTML snapshot |

---

## Proof artifacts

All written to `docs/architecture/proofs/staging/ui-acceptance-latest/` (gitignored).

| File | When written |
|------|-------------|
| `README.md` | Always — at end of run (PASS or FAIL) |
| `00-preflight-version.json` | Step 0 |
| `10-signup-page.png` | Step 10 |
| `11-home-owner.png` | Step 11 |
| `12-create-workspace.png` | Step 12 |
| `15-create-project.png` | Step 15 |
| `17-create-task-board.png` | Step 17 |
| `20-invite-accept.png` | Step 20 |
| `21-rbac-viewer.png` | Step 21 |
| `22-rbac-member.png` | Step 22 |
| `steps.log` | Appended after each step |
| `<step>-failure.html` | Only on failure |
