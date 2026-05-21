# Session Handoff — 2026-05-20

## Platform state at handoff
- Staging branch: fcee5ecf (includes PRs #286–#293)
- 8 PRs merged this session — all verified on staging
- TypeScript: 0 errors across backend and frontend
- Jest wave9 governance smoke: 10/10 passing

## Key architectural changes since last handoff
- work_tasks.status converted from Postgres enum
  to VARCHAR(50) — TaskStatus const kept with
  @deprecated JSDoc, 39 import sites unaffected
- project_statuses table added — 7 status rows
  per project backfilled (952 rows total for 136 projects)
- INSTANTIATE_TEMPLATE_SEED_TASKS = true —
  templates now seed phases and tasks on instantiation
- notification bridge wired — activity.recorded
  emits from TaskActivityService, workspace.created
  and project.created dispatch to notification bus
- Template debris cleaned — 7 CI smoke rows removed

## P9 — Staging verification requires authenticated URL

Staging verification after PRs must use an
authenticated app session, not the root URL.

Root URL shows marketing/waitlist landing page.
App URL requires sign-in session.

For UI verification: navigate to a signed-in
project view after deployment.
For SQL verification: use railway run with
DATABASE_PUBLIC_URL environment variable.

Never report staging as verified based on
the marketing shell root URL alone.

## Active optimization plan
Full plan: docs/ai/zephix-ai-developer-optimization-plan.md
(if not in repo, see session output document)

Key rules for all future sessions:
- git worktree list at session start
- git branch --show-current — fix detached HEAD
  before any commit
- Jest: always --forceExit --testTimeout=30000
- Migrations: SELECT preview before DELETE/UPDATE
- tsc after each file change, not just at end
- No browser prompt() confirm() alert() in frontend
- Write domain: Claude Code = backend only,
  Cursor = frontend only
- Read domain: both developers can read full repo

## Next sprint queue (in priority order)
1. Remove native browser dialogs from frontend
   (Cursor — in progress)
2. Complete task row menu redesign
3. Completion % rollup backend hook
4. Column header menus with sort/hide/rollup toggle
5. Admin plan setter endpoint
6. Hide 5 stub governance policies
