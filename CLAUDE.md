# Zephix — Claude Operating Rules

## Identity

Zephix is an enterprise project management platform. One shared shell, one workspace model, governance-aware execution. Not a tool builder, not a boilerplate SaaS.

## Non-Negotiables

- **Home is not Inbox.** Home is the personalized operational landing. Inbox is the notifications feed.
- **Workspace is the container.** All work (projects, tasks, dashboards, risks) lives inside a workspace.
- **Administration is accessed from the Admin user profile menu.** Administration must not appear in the left navigation. Home page links may temporarily expose Administration during transition, but this is implementation drift, not the target architecture. Any work touching shell, navigation, profile menu, or admin access must preserve or move toward Admin-profile-menu access.
- **AI is advisory only.** No autonomous AI actions. Suggestions and explanations only.
- **No auto-created workspace** unless the operator explicitly approves it.
- **No auto-created project during onboarding.** Template-first creation is the only canonical path.
- **No duplicate onboarding surfaces.** One onboarding flow, one setup card, one state model.
- **All PRs target `staging`, never `main`.** Promotion to main requires explicit operator approval.
- **One branch, one intent.** No mixed work across domains.

## Source of Truth Files

| File | What it governs |
|------|----------------|
| `~/.claude/projects/.../memory/platform_map.md` | Shell, routing, state models, role matrix |
| `~/.claude/projects/.../memory/project_mvp_program.md` | MVP phases, engine maturity, build order |
| `~/.claude/projects/.../memory/project_operating_model.md` | Branch rules, prompt checklist, completion criteria |
| `~/.claude/projects/.../memory/feedback_enterprise_execution.md` | Migration, mutation, and release discipline |
| `~/.claude/projects/.../memory/MEMORY.md` | Current state index, known gaps, staging config |

## Branch and Release Rules

- `main` = production. Do not merge without operator approval.
- `staging` = integration branch. All new work targets staging.
- Deploy backend from `ZephixApp-main-sync` worktree (zero untracked files).
- Never deploy from main `ZephixApp` directory (untracked files break the build).

## Every Feature Prompt Must Include

1. Cleanup scope — what old code/routes/surfaces are removed
2. Out-of-scope — explicitly listed to prevent drift
3. Source of truth — which state model drives the feature
4. Routing behavior — exact routes, guards, redirects
5. Role behavior — Admin, Member, Viewer differences
6. Empty-state behavior
7. Verification checklist — staging deploy, smoke, role check, regression check

## Completion Criteria

No feature is complete until:
- Staging deployed and verified
- Role-based verification (Admin, Member, Viewer)
- Duplicate surface check (no old code left behind)
- Regression check (previously verified endpoints still work)

## Architecture-Sensitive Areas (extra caution required)

- **Onboarding state** — user-level `onboardingStatus` column is source of truth. Dual-write to org settings is temporary.
- **Dashboard publishing** — `isPublished` + `audience` JSONB on dashboard entity. Admin-only mutations.
- **Template instantiation** — `POST /templates/:id/instantiate-v5_1` is the canonical path. No other creation surfaces.
- **CSRF** — all POST/PATCH/DELETE need `X-CSRF-Token`. Smoke paths exempt.
- **JWT** — 15m access tokens, 7d refresh tokens. Production template must use 15m.
- **Workspace scoping** — `x-workspace-id` header required for workspace-scoped endpoints.

## Tech Stack

- **Backend:** NestJS, TypeORM, PostgreSQL, Jest
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query
- **Infra:** Railway (staging + production), nixpacks build
- **Testing:** Jest (backend), Vitest (frontend), Playwright (e2e), bash smoke scripts

## Current Phase

Phase 2 — Governance Where Work Happens (capacity, budget, exception, risk).
See `project_mvp_program.md` for full sequence.