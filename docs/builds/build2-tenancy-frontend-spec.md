# Build 2 — Tenancy & Workspace (Frontend)

This document captures the locked frontend scope for Build 2 (Streams A/B). Operator dispatch **STREAM B (CURSOR) — BUILD 2 FRONTEND DISPATCH** is the authoritative checklist for sequencing PR1–PR3.

## Summary

- **PR1** (`build2/tenancy-frontend-foundations`): Types, API clients for workspace complexity mode, error-code UX copy, route guard fix (`/w/:slug/*` under auth), scaffolding components (`ComplexityModeSelector`, `ProgramsTierGate`), tests. Ship with **`B2_TENANCY_V2_ENABLED`** off unless intentionally enabling cutover UI.
- **PR2** (`build2/tenancy-frontend-cutover`): Wire complexity mode into create/settings/onboarding, slug redirects from `/workspaces/:id/*`, Programs tier gating, snapshot UNKNOWN styling, free-tier error surfaces.
- **PR3** (`build2/tenancy-frontend-cleanup`): Remove deprecated ID routes after soak; eliminate `WorkspaceIdRedirect`.

## Locked decisions (frontend)

| ID | Decision |
|----|----------|
| D1 | Slug-canonical URLs: `/w/:slug/...` for user-facing navigation; ID routes deprecated then removed. |
| D2 | All workspace routes require authentication at route layer (`ProtectedRoute`). |
| D3 | Universal landing after login: `/inbox` unless `returnUrl` query is safe and present. |
| D4 | `complexity_mode` UI: **Workspace Create Modal** + **Settings → General**; options **`lean` \| `standard` \| `governed`**. |
| D5 | UI labels match enum strings (Lean, Standard, Governed) — no translation layer. |
| D6 | Only Org Admins may change complexity mode; others read-only + tooltip. |
| D7 | Programs: governed-only creation/editing; lean/standard show banner + read-only for existing data (PR2). |
| D8 | Handle `MAX_USERS_LIMIT_EXCEEDED`, `MAX_WORKSPACES_LIMIT_EXCEEDED` with upgrade prompt (PR2). |
| D9 | Snapshot: show real `projectCount` / owners when present; mute UNKNOWN budget/capacity (PR2). |

## API contracts (PR1 client stubs)

- `GET /api/v1/workspaces/:id/complexity-mode` → `{ mode }`
- `PATCH /api/v1/workspaces/:id/complexity-mode` → `{ mode, updatedAt, updatedBy }` (403 `WORKSPACE_COMPLEXITY_MODE_ADMIN_ONLY`)

Relative to frontend axios `baseURL` (`/api` in dev): `/v1/workspaces/:id/complexity-mode`.

## Feature flag

- **`B2_TENANCY_V2_ENABLED`**: env `VITE_B2_TENANCY_V2_ENABLED=true|1` or comma flag `B2_TENANCY_V2_ENABLED` in `VITE_FLAGS`. When off, `ProgramsTierGate` is a pass-through (no fetch).

## Related ADRs

- `docs/adrs/ADR-B2-FE-001-slug-canonical-urls.md`
- `docs/adrs/ADR-B2-FE-002-universal-inbox-landing.md`
- `docs/adrs/ADR-B2-FE-003-complexity-mode-vocabulary.md`
- `docs/adrs/ADR-B2-FE-004-programs-tier-read-only.md`
