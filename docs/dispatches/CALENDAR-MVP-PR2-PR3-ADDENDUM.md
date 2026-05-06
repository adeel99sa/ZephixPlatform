# Calendar MVP Build Execution Dispatch — PR 2 + PR 3 Addendum

**Status:** Addendum authored 2026-05-05. Extends original Calendar MVP Build Execution Dispatch (which detailed PR 1 fully but defined PR 2 + PR 3 only as scope overview).  
**Author:** Solution Architect (Claude)  
**Predecessor:** `CALENDAR-MVP-BUILD-EXECUTION-DISPATCH.md` (original) + PR #252 merged successfully (PR 1 closed).  
**Trigger:** Cursor PR 2 Phase 0 reconnaissance flagged that original dispatch lacked PR 2 implementation detail.

---

## Context

PR 1 (foundation) successfully shipped via PR #252 (merge `f6bfdc80`). Engineering proven:

- Lazy chunk isolation works (~232 KB min, ~70 KB gzip)
- Main bundle delta ~0 (`size-limit` 432.83 KB brotlied, under 700 KB limit)
- Component test pattern works (mock `@fullcalendar/react`)
- Tab integration + Activities deep link integrate cleanly
- Status color coding + accessibility patterns established

This addendum details PR 2 + PR 3 implementation grounded in PR 1's actual implementation (not assumptions).

---

## PR 2: Additional views (week + day + agenda) — Detailed Implementation

### Scope

- Add week view (`@fullcalendar/timegrid` plugin)
- Add day view (same plugin)
- Add agenda/list view (`@fullcalendar/list` plugin) — mobile responsive
- View switcher UI (FullCalendar `headerToolbar` config)
- URL-driven view state via `useSearchParams` (`?view=month|week|day|agenda`)
- Mobile breakpoint default: agenda (`listWeek`) on `<sm`, month grid otherwise
- Component tests for view switching + URL state
- Update existing E2E to cover view switching

### Out of scope (preserved deferred items)

- Drag-to-reschedule (PR 3)
- Filters (assignee, phase, status) (PR 3)
- Backend addendum (`assigneeUserId` on `ScheduleTask` DTO) (PR 3)
- Tier 3 features (post-MVP)

### Phase 0 (already completed by Cursor)

- ✓ HEAD at `f6bfdc80` (PR #252 merged)
- ✓ FullCalendar core + react + daygrid + interaction packages present
- ✓ ProjectCalendarTab.tsx present
- ✓ Lazy import in App.tsx (NOT in tabs/index.ts barrel)
- ✓ URL state pattern identified: `useSearchParams` (mirror `ProjectTasksTab` / `ProjectGanttTab`)

### Phase 1 (PR 2 implementation steps)

**Step 1:** `npm install --save @fullcalendar/timegrid @fullcalendar/list` (^6.1.20)

**Step 2:** Update `ProjectCalendarTab.tsx` — plugins `timeGridPlugin`, `listPlugin`; `headerToolbar` with `dayGridMonth,timeGridWeek,timeGridDay,listWeek`; map FC view types ↔ URL slugs (`month` | `week` | `day` | `agenda`).

**Step 3:** `useSearchParams` for `view` query; sync on `datesSet` when calendar view changes; `calendarRef` + `getApi().changeView()` when URL changes (e.g. back/forward).

**Step 4:** `useMediaQueryMatch('(max-width: 640px)')` defined locally in the same file (no app-wide hook).

**Step 5:** Expand `ProjectCalendarTab.test.tsx` — desktop default, mobile default, URL-driven initial view, invalid URL fallback, view change → URL.

**Step 6:** Extend `tests/smoke/calendar.spec.ts` — toolbar switches + URL (where FullCalendar exposes `.fc-*` buttons).

### Phase 2 (PR 2 verification)

```bash
cd zephix-frontend
npx tsc -p tsconfig.app.json --noEmit
npm run build
npm run size:ci
npx vitest run src/features/projects/tabs/__tests__/ProjectCalendarTab.test.tsx --reporter=dot
npx playwright test tests/smoke/calendar.spec.ts --reporter=list
ls dist/assets/ | grep -i calendar
```

---

## PR 3: Tier 2 features + Backend Addendum — Detailed Implementation

### Scope

**Backend addendum (small):**

- Add `assigneeUserId` to `ScheduleTask` DTO + `ProjectScheduleController` task mapping.

**Frontend Tier 2:**

- Drag-to-reschedule with persistence (`patchTaskSchedule`, mirror Gantt).
- Filter UI: assignee, phase, status (URL-driven).
- Optimistic UI + rollback on error.

### Out of scope

- Tier 3 (capacity, AI, portfolio, external, recurring).
- Gantt edits (Frontend Audit stream).
- Backend beyond the single field.
- Shared scheduling helper extraction (deferred).

### Phase 0 (PR 3 recon — run after PR 2 merges)

```bash
cd /Users/malikadeel/Downloads/ZephixApp
git fetch origin
git checkout -B feat/calendar-mvp-tier2-features origin/staging
git log --oneline origin/staging | head -5
grep -E "@fullcalendar/(timegrid|list)" zephix-frontend/package.json
grep "@fullcalendar/interaction" zephix-frontend/package.json
grep -A 15 "patchTaskSchedule" zephix-frontend/src/features/work-management/schedule.api.ts
head -100 zephix-backend/src/modules/work-management/controllers/project-schedule.controller.ts
grep -rn "FilterBar" zephix-frontend/src --include="*.tsx" | head -10
grep -A 20 "handleDateChange\|onDateChange" zephix-frontend/src/features/projects/tabs/ProjectGanttTab.tsx
```

### Phase 1 — Backend addendum

In `project-schedule.controller.ts` task map, add `assigneeUserId: t.assigneeUserId`.

In `schedule.api.ts` `ScheduleTask`, add `assigneeUserId: string | null`.

Add or extend test asserting field appears in schedule JSON.

### Phase 2 — Frontend Tier 2

- `editable`, `eventDrop`, `eventResize` on FullCalendar; call `patchTaskSchedule` with `cascade: 'forward'`; `revert()` on failure.
- Filters: read assignee/phase/status from `useSearchParams`; filter client-side; extend `extendedProps` on events when mapping tasks (after backend field exists for assignee).
- Tests: drag payload, rollback, filters, URL persistence.
- E2E: drag + refresh (where stable).

### Phase 3 — Verification

```bash
cd zephix-backend && npx tsc --noEmit && npm run build
cd ../zephix-frontend && npx tsc -p tsconfig.app.json --noEmit && npm run build && npm run size:ci
```

---


## Hard constraints (PR 2 + PR 3)

All 11 hard constraints from original dispatch still apply.

- **CONSTRAINT 12 (PR 2):** NO drag/filter features in PR 2.
- **CONSTRAINT 13 (PR 2):** URL state via `useSearchParams` only (no new global state).
- **CONSTRAINT 14 (PR 2):** Mobile breakpoint via `window.matchMedia` in-file helper only.
- **CONSTRAINT 15 (PR 3):** Backend addendum is single field `assigneeUserId` only.
- **CONSTRAINT 16 (PR 3):** Filters client-side on loaded schedule data.

---

## Sequencing reminder

PR 1 ✓ MERGED (#252) → PR 2 → PR 3 (sequential). Each PR closes before the next begins.

**HALT discipline mandatory throughout. Phased PR sequencing preserved. Each PR closes before next begins.**
