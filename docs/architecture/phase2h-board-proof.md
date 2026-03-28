# Phase 2H — Board View MVP — Proof Document

## Date: 2026-02-13

---

## What Was Built

Board view for work_tasks with:
- HTML5 native drag-and-drop (no new dependency)
- WIP limit enforcement on column transitions (reuses existing `WipLimitsService`)
- Rank-based ordering within columns
- Role-based gating: Guest read-only, Member can drag, Admin/Owner full control
- Optimistic UI with rollback on API error
- WIP limit badges on column headers
- Priority, assignee, date, and estimate badges on cards

---

## Migration

| Migration | Table | Action |
|---|---|---|
| `18000000000006-WorkTaskBoardRank` | `work_tasks` | Added composite index `(project_id, status, rank)` |
| | | Backfilled null ranks to `0` |

### Idempotency

- `CREATE INDEX IF NOT EXISTS` — safe for double-run
- `UPDATE ... WHERE rank IS NULL` — idempotent (second run touches 0 rows)

---

## Endpoint Contract

No new endpoints. Reused existing:

| Method | Path | Purpose | Guard |
|---|---|---|---|
| `GET` | `/work/tasks` | List tasks with `sortBy=rank` | JwtAuthGuard + workspace read |
| `PATCH` | `/work/tasks/:id` | Update status + rank (board move) | JwtAuthGuard + workspace write |
| `GET` | `/work/projects/:id/workflow-config` | WIP limits for column badges | JwtAuthGuard + workspace read |

### New DTO Fields

- `UpdateWorkTaskDto.rank` — optional numeric field for board reordering
- `ListWorkTasksQueryDto.sortBy` — added `'rank'` option

### Sort Column Map

Added `rank: 'task.rank'` to backend `SORT_COLUMN_MAP`.

---

## Files Created

| File | Purpose |
|---|---|
| `zephix-backend/src/migrations/18000000000006-WorkTaskBoardRank.ts` | Board rank index migration |
| `zephix-backend/src/modules/work-management/services/__tests__/work-tasks.board-move.spec.ts` | Board move tests (15) |
| `zephix-backend/src/modules/work-management/services/__tests__/wip-limits.board.spec.ts` | WIP limits board tests (10) |
| `zephix-frontend/src/features/projects/tabs/__tests__/board-view.test.tsx` | Frontend board tests (18) |

## Files Modified

| File | Change |
|---|---|
| `zephix-backend/src/modules/work-management/entities/work-task.entity.ts` | Added `@Index(['projectId', 'status', 'rank'])` |
| `zephix-backend/src/modules/work-management/dto/update-work-task.dto.ts` | Added `rank?: number` |
| `zephix-backend/src/modules/work-management/dto/list-work-tasks.query.ts` | Added `'rank'` to `SORT_BY_VALUES` |
| `zephix-backend/src/modules/work-management/services/work-tasks.service.ts` | Added `rank` to `SORT_COLUMN_MAP` and `updateTask` handler |
| `zephix-frontend/src/features/work-management/workTasks.api.ts` | Added `rank` to `UpdateTaskPatch` and `SortBy` |
| `zephix-frontend/src/features/projects/tabs/ProjectBoardTab.tsx` | Complete rewrite: drag-and-drop, WIP badges, role gating |

---

## Tests

### Backend — 25 tests

**work-tasks.board-move.spec.ts (15 tests)**
- Status transition TODO → IN_PROGRESS
- Status transition IN_PROGRESS → IN_REVIEW
- Status transition IN_REVIEW → DONE (with completedAt)
- completedAt set on DONE from IN_REVIEW
- Rank update via DTO
- Combined status + rank update
- Rank-only update skips WIP check
- WIP enforcement called on status change
- WIP blocks when limit exceeded
- WIP override flag passed through
- Invalid transition blocked (DONE → IN_REVIEW)
- assertWorkspaceAccess called on every update
- Deleted task blocked
- Activity recorded on status change
- Estimation mode enforcement during board move

**wip-limits.board.spec.ts (10 tests)**
- No WIP limit configured → passes
- Count below limit → passes
- Count equals limit → blocks
- Correct WIP_LIMIT_EXCEEDED error code
- DONE exempt from WIP
- BACKLOG exempt from WIP
- CANCELED exempt from WIP
- ADMIN override allowed with actorRole
- Override activity recorded
- Query scoped by project

### Frontend — 18 tests

**board-view.test.tsx (18 tests)**
- Renders 5 board columns
- Renders tasks as cards
- Displays task count
- Shows WIP badges
- VIEWER sees read-only badge
- VIEWER no drag handles
- VIEWER no status dropdown
- MEMBER sees drag handles
- MEMBER no read-only badge
- ADMIN sees drag handles
- Status dropdown triggers API
- WIP error shows warning + reverts
- Priority badge display
- Estimate points display
- Estimate hours display
- Rank-sorted request
- Loading state
- Error state

---

## Verification Results

```
Backend tsc --noEmit:        exit 0 (clean)
Frontend tsc --noEmit:       exit 0 (clean)
Backend work-management:     29 suites, 254 tests, 0 failures
Frontend board-view:         1 suite, 18 tests, 0 failures
Regressions:                 0
```

---

## Security Checklist

- [x] All task mutations require JwtAuthGuard + workspace write
- [x] VIEWER cannot modify tasks (no drag, no dropdown)
- [x] WIP enforcement blocks transitions to over-limit columns
- [x] WIP override requires ADMIN role via actorRole
- [x] Rank updates go through same auth as status updates
- [x] Cross-org isolation maintained (assertWorkspaceAccess)
- [x] Deleted tasks blocked from mutation

---

## Roadmap Items (Phase 3)

- Board swimlanes by assignee
- Board filters persistence per user
- Column collapse and custom ordering
- Gantt dependency drag UX
- Multi-project board per workspace
