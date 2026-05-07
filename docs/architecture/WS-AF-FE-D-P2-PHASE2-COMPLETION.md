# WS-AF-FE-D-P2 Phase 2 (Frontend RBAC Canonical Helpers) — Completion Summary

Branch: **`ws-af-fe-d-p2`** — integration target **`staging`** (push/PR authorized only after architect final Gate).

## Scope recap

Incremental migration replacing raw platform/workspace role compares with **`@/utils/access`** + **`@/utils/roles`**, gated per batch with **HALT-FED2-1** (failed tests ≤ **116**, baseline locked at **111** after Batch 5).

### Batch artifact map (abbrev.)

| Milestone | Focus |
|-----------|-------|
| Commit 1 / early | `roles.test-mock.ts`, TaskListSection, shared Vitest mocks |
| Batches 2–5 | Shell, workspaces, projects, members — `isPlatformAdmin`, `PLATFORM_ROLE`, `isAdminRole` |
| Batch 6 | Administration pages (Org/Workspace permissions tabs use `normalizePlatformRole` pattern) |
| Batch 7 | `administration.api` listUsers mapping, legacy admin users routes, workspace-access-levels, **TemplateCenterPage** (later **partially superseded**) |
| Batch 8 | **Restored** TemplateCenter **`canPublish`** to pre-Batch-7 parity; **`LEGACY_ORG_ROLE`** → `roles.ts`, **`isLegacyOrgDirectoryOwner`** → `access.ts`; App **`isPlatformViewer`**; workspace Zustand flags via **`isWorkspaceStoreReadOnlyRole` / `isWorkspaceStoreWriterRole`** |

## Canonical helpers (Phase 2 touchpoints)

- **Platform:** `isPlatformAdmin`, `isPlatformMember`, `isPlatformViewer`, `platformRoleFromUser`, `normalizePlatformRole`, `PLATFORM_ROLE`
- **Org directory (legacy API):** `LEGACY_ORG_ROLE`, `isLegacyOrgDirectoryOwner`
- **Workspace store (Zustand):** `isWorkspaceStoreReadOnlyRole`, `isWorkspaceStoreWriterRole` — see **Role classification** below
- **Workspace API strings:** existing `isWorkspaceOwner` / `isWorkspaceMember` / `isWorkspaceViewer` unchanged; **`WORKSPACE_HOOK_ROLE`** exported from `workspace-access-levels.ts` for `/workspaces/:id/role` hook strings

### Workspace store role classification (Batch 9 verification)

|`WorkspaceRole` (store)| `isWorkspaceStoreReadOnlyRole` | `isWorkspaceStoreWriterRole` |
|---|---|---|
| **`stakeholder`** | ✅ true | false |
| **`workspace_viewer`** | ✅ true (via `isWorkspaceViewer`) | false |
| **`workspace_member`** | false | false |
| **`workspace_owner`** | false | ✅ true |
| **`delivery_owner`** | false | ✅ true |

- **Non-canonical / legacy:** `delivery_owner` is intentional (AD workspace model).
- **`null` / `undefined` / unknown:** both helpers return **`false`** (no write, not classified read-only stakeholder path).

These mirror the **prior inline** comparisons in `workspace.store.ts` / `stores/workspaceStore.ts` (behavior preserved).

## Regression tests (Batch 9)

| File | Intent |
|------|--------|
| `src/pages/templates/__tests__/TemplateCenterPage.can-publish.test.tsx` | Locks **ORG** (`user.role === 'admin'`) + **WORKSPACE** (`!isReadOnly`) + **SYSTEM** false |
| `src/utils/__tests__/access.test.ts` | **`isWorkspaceStoreReadOnlyRole`**, **`isWorkspaceStoreWriterRole`**, **`isLegacyOrgDirectoryOwner`** |
| `src/utils/__tests__/roles.test.ts` | **`LEGACY_ORG_ROLE`** literals vs `PLATFORM_ROLE` |

## Architectural carries (explicitly out of Batch 9)

1. **Lint Rule A** extension to **`features/administration/**`** — separate dispatch (Lesson **#28**).
2. **Template publish permission policy** — `TemplateCenterPage` retains **ARCHITECT NOTE** breadcrumb post-Batch-8 restoration; canonical migration requires **explicit product/architect dispatch** (Lessons **#30**, **#32**).
3. **Long-term fate** of **`isWorkspaceStoreReadOnlyRole` / WriterRole** vs richer capability model (`complexity_mode`) — PO/architect brief item.

## Verification snapshot (latest local run)

- `npx tsc --noEmit` — clean
- `npm run lint:new` — 0 ESLint errors (allowlisted warnings unchanged)
- `npm run test:run` — **111 failed, 904 passed**, **118** files (HALT satisfied)
