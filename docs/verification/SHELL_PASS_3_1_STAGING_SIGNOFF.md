# Shell Pass 3.1 — staging sign-off

**Status:** Merged and deployed successfully (operator confirmation).

**Scope (frontend shell correction pass):** left-rail hierarchy, workspace row truth (`workspaceCount` vs none selected), anchored workspace menus, Inbox operational modules, My Tasks real links where routes exist, first-workspace empty state honesty.

## Post-deploy verification (recommended)

Run staging smoke on:

| Case | What to confirm |
|------|------------------|
| 0 workspaces | First-workspace empty state; no fake workspace row or selector. |
| 1 workspace | Auto-select once; row reads as navigation; refresh keeps honest state. |
| 2+ workspaces, none selected | “Choose a workspace” — not “no workspaces” when org reports workspaces. |
| 2+ workspaces, after select + refresh | No fallback to misleading empty copy. |

## Primary truthfulness watch

Compare **org-level `workspaceCount`** (e.g. onboarding / `useOrgHomeState`) with **`listWorkspaces()`** results. If they diverge, sidebar copy can still be wrong — not a deploy blocker but should be tracked if observed.

## Local branch hygiene (developers)

Unrelated work (`MyWorkPage.tsx`, `signals.module.ts`) may exist in **local stash** — do not pop onto shell release branches without intent.

## Reference

- PR: Pass 3.1 truthfulness / shell work as merged to `staging` (see repository PR history).
- Frontend shell commit example: `8002cea8` (`fix(frontend-shell): rail hierarchy, workspace truth, inbox ops surface`).
