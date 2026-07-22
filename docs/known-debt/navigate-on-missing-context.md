# Navigate-on-missing-context silently re-routes through the destination

**Status:** known debt · **Surfaced by:** walkthrough after #489/#494 (2026-07-22) · **Deferred:** note only — no router sweep now

## Pattern

A page that **`Navigate`s away** when context is missing (no `activeWorkspaceId`, feature flag off, etc.) can be **silently re-routed by whatever it navigates to**. The user never sees the intended surface; they land somewhere the destination chose.

**Worked example (Heatmap → Inbox):**

1. Admin nav linked to `/heatmap` (or older path resolved without a workspace).
2. `ResourceHeatmapPage` did `Navigate` to `/workspaces` when context/flag was missing.
3. `WorkspacesIndexPage` auto-selects when the org has exactly one workspace and **`navigate('/inbox')`**.
4. Tester sees Inbox, not Heatmap — looks like `RequireWorkspace` failed even when it was fine.

## Why RequireWorkspace is safe

`RequireWorkspace` **renders** an in-page empty state + picker (`WorkspaceRequiredEmptyState`). It does not navigate. The URL stays on the page the user clicked.

## Latent risk

Anywhere else in the router (or page body) doing `Navigate to=…` / `navigate(…)` on a **missing-context** condition has the same bug class — especially if the target is `/workspaces`, `/home`, or another hub that itself redirects.

## Follow-up (not now)

- Prefer render-in-place empty states over `Navigate` for missing workspace / missing scope.
- Optional later: grep for `Navigate to=` / `navigate(` gated on `!activeWorkspaceId` (or equivalent) and convert high-traffic admin/resource paths. Do not sweep the whole router as a session blocker.
