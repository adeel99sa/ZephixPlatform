# Zephix AI Developer Optimization Plan
See: docs/ai/SESSION_HANDOFF_2026-05-20.md for summary.

Full plan produced: 2026-05-20
Source: Analysis of Claude Code + Cursor
interactions from PRs #286-#293

## Quick reference — session opening (Claude Code)
git worktree list
git branch --show-current
git pull origin staging
git switch -c feat/<task-name>
Jest: always --forceExit --testTimeout=30000
Migrations: SELECT preview before DELETE/UPDATE
tsc after each file change

## Quick reference — session opening (Cursor)
git worktree list
git branch --show-current
git pull origin staging
git switch -c feat/<task-name>
No browser prompt() confirm() alert() — ever
tsc --noEmit -p tsconfig.app.json after each file

## Domain rules
Claude Code WRITE domain: zephix-backend/ only
Cursor WRITE domain: zephix-frontend/ only
READ domain: both can read full repo

## Known issues resolved
P1 Git state drift — git branch check at start
P2 Two-worktree confusion — worktree list at start
P3 Jest hanging — --forceExit mandatory
P4 Migration SQL precedence — SELECT preview first
P5 Unstaged cross-domain noise — domain isolation
P6 Wrong prompt pasted — no advance batches
P7 browser prompt() — banned, use inline React
P8 tsc not per-file — checkpoint after each file
P9 Staging wrong URL — use authenticated app URL
