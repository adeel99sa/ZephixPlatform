# MVP Final Four — Verification Checklist

## Pre-deployment (env var — ops action)
- [ ] Set `ZEPHIX_WS_MEMBERSHIP_V1=1` on Railway backend staging service
- [ ] Verify workspace_members rows exist for at least one non-admin test user
- [ ] Redeploy backend (env var change requires restart)

## Item 1: Sidebar role-based visibility (P-6)
- [ ] Login as Admin — sidebar shows ALL workspaces
- [ ] Login as Member — sidebar shows ONLY workspaces where user has workspace_members row
- [ ] Login as Viewer — sidebar shows ONLY workspaces where user has workspace_members row
- [ ] Admin still sees "Administration Console" in profile dropdown
- [ ] Member does NOT see "Administration Console" in profile dropdown

## Item 2: Gear icon popover
- [ ] Open a Waterfall project — Activities tab — gear icon visible in toolbar above table
- [ ] Open an Agile project — Activities tab — gear icon visible in toolbar
- [ ] Open a Kanban project — Activities tab — gear icon visible in toolbar
- [ ] Click gear icon (Waterfall) — popover appears anchored below button (not full-height slide-over)
- [ ] Click gear icon (non-Waterfall) — "Coming soon" popover appears
- [ ] Popover is ~320px wide with scroll
- [ ] Click outside popover — closes
- [ ] Press Escape — closes
- [ ] Fields tab shows column toggles (Waterfall only)
- [ ] View tab shows "Coming soon" message (Waterfall only)

## Item 3: Admin overview page
- [ ] Open Admin Console — Overview page loads without "Failed to load" error
- [ ] Governance Health widget shows data OR "No governance alerts"
- [ ] Decisions Required widget shows "No governance decisions pending" (graceful empty)
- [ ] Workspace Snapshot widget shows data OR "No workspaces available"
- [ ] Recent Activity widget shows "No recent governance activity"
- [ ] Quick Actions section renders correctly

## Item 4: Board view for non-waterfall projects
- [ ] Create project from Waterfall template — Board tab — tasks in status columns
- [ ] Create project from Agile template — Board tab — tasks in status columns
- [ ] Create project from Kanban template — Board tab — tasks in status columns
- [ ] Drag a task card between columns — status updates
- [ ] Return to Activities tab — task status reflects the board change

## End-to-end demo flow
- [ ] Admin: sign in — Admin Console — Overview loads — People page works
- [ ] Admin: create workspace — invite member
- [ ] Member: sign in — sees only assigned workspace(s) in sidebar
- [ ] Member: create project from Agile template — project appears in sidebar
- [ ] Member: Activities tab — TaskListSection renders — can create tasks
- [ ] Member: Board tab — tasks in columns — can drag to change status
- [ ] Member: gear icon opens "Coming soon" popover
