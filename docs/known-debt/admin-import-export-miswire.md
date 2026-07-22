# Admin Import/Export nav is miswired and calls a non-existent API path

**Status:** known debt · **Surfaced by:** SESSION-FRONTEND-1 Item 2 recon (2026-07-21) · **Deferred:** does not block moderated sessions

## What the tester hits

Admin Console → System → **Import / Export** (`/administration/import-export`).

## Finding (three layers)

1. **Hang (fixed in #490):** with no `activeWorkspaceId`, `WorkspaceIntegrationsPage` returned early from `fetchConnections` without clearing `loading`, so the page spun forever. Cleared loading + shared workspace empty state in Item 2B.

2. **Miswire (open):** the route mounts **`WorkspaceIntegrationsPage`** (Integrations UI). There is **no** dedicated admin Import/Export page. Closest real import UI is project-scoped **`TaskImportModal`** (`zephix-frontend/src/features/importer/`).

3. **API path mismatch (open):** FE `listConnections` calls `GET /integrations/workspaces/:workspaceId`. Backend `IntegrationsController` exposes org-scoped **`GET /integrations`** (no workspace-scoped list path in that controller). With a workspace selected, loading clears then the page silently shows empty / failed state.

## Why not fix now

Sessions do not use admin Import/Export. Landing-page claim of CSV import should be cut or narrowed on the marketing surface; rushing an admin import/export module is out of scope for SESSION-FRONTEND-1.

## Suggested follow-up

- Either remove/rename the admin nav item until a real page exists, or mount a thin page that points users to project CSV import (`TaskImportModal`).
- Align FE integrations API paths with the live org-scoped controller (or add workspace-scoped backend routes intentionally).
