# Deprecated: pages/admin/

All files in this directory are stale legacy admin pages.

They were replaced by the `features/administration/pages/` module which renders under the `/administration/*` routes. The old `/admin/*` routes redirect to `/administration` in App.tsx.

These files are kept temporarily to avoid breaking any hidden imports. They should be deleted once import analysis confirms zero live references.

Per ADR-003: Administration is accessed from the Admin profile menu via `/administration`, not from these legacy `/admin/*` pages.

Replaced by:
- `AdministrationOverviewPage` → `/administration`
- `AdministrationUsersPage` → `/administration/users`
- `AdministrationWorkspacesPage` → `/administration/workspaces`
- `AdministrationTemplatesPage` → `/administration/templates`
- `AdministrationGovernancePage` → `/administration/governance`
- `AdministrationAuditLogPage` → `/administration/audit`
- `AdministrationSettingsPage` → `/administration/settings`
- `AdministrationBillingPage` → `/administration/billing`
