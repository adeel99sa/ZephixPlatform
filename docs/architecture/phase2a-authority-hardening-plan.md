# Phase 2A — UX Authority Hardening Plan

## Repo Reality Map

### Placeholder Pages Found

| File | Line | Visible Text | Route | Entry Point | Decision |
|------|------|-------------|-------|-------------|----------|
| `components/shell/Sidebar.tsx` | 237 | "Coming soon" toast (sort workspace) | Sidebar menu | Workspace kebab menu | Remove entry point |
| `components/shell/Sidebar.tsx` | 256 | "Coming soon" toast (save as template) | Sidebar menu | Workspace kebab menu | Remove entry point |
| `pages/organizations/OrganizationSettings.tsx` | 524 | "Coming soon in a future update" | Org settings appearance | Settings page | Remove text |
| `features/admin/overview/AdminOverviewPage.tsx` | 137, 269 | "TODO: Connect to projects API", "TODO: Add charts" | `/admin/overview` | Admin nav (hidden) | Remove TODO text |
| `pages/auth/InvitePage.tsx` | 28 | "coming soon..." | `/invite` | Direct URL | Replace with redirect |
| `pages/DocsPage.tsx` | 41, 74 | "coming soon" re AI and API | `/docs/:docId` | Docs link | Remove text |
| `pages/teams/TeamsPage.tsx` | 31 | "Teams Management Coming Soon" | Not routed | None | Safe (unreachable) |
| `pages/admin/AdminAuditPage.tsx` | 16 | "coming soon" | Not routed | None | Safe (unreachable) |
| `pages/BlogPage.tsx` | 16 | "Coming Soon" | Not routed | None | Safe (unreachable) |
| `App.tsx` | 151 | `<div>Workspace Settings</div>` stub | `/workspaces/:id/settings` | Sidebar link | Redirect to workspace home |
| `features/projects/views/ProjectShellPage.tsx` | 163 | "View disabled in MVP" | Not routed | None | Safe (unreachable) |
| `pages/admin/AdminSecurityPage.tsx` | 56 | TODO stubs | `/admin/security` | Not in nav | Safe (hidden) |
| `components/landing/FeaturesSection.tsx` | 337 | "Coming Soon" badge | Landing page | Public | Safe for MVP |

### Role Visibility Matrix

| Route/Feature | Admin | Member | Guest (VIEWER) |
|--------------|-------|--------|----------------|
| Home | Yes | Yes | Yes |
| My Work | Yes | Yes | No |
| Inbox | Yes | Yes | No |
| Workspaces | Yes | Yes | Yes (read-only) |
| Projects | Yes | Yes | Yes (read-only) |
| Template Center | Yes | Yes | No |
| Administration | Yes | No | No |
| Settings | Yes | Yes | Yes |
| Billing | Yes | No | No |
| Cost summaries | Yes | Yes | No |
| Workspace Members | Yes | Yes | No |
| Workspace Settings | Yes (+ ws_owner) | ws_owner only | No |
