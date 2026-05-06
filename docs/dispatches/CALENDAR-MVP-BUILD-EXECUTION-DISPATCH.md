# Calendar MVP Build — Execution Dispatch

**Status:** Locked for PR 1 implementation.  
**Type:** Phased execution (3 PRs). This document drives **PR 1 — Foundation** only.  
**Baseline:** `origin/staging` @ `ebac4759` (PR #251).  
**Branch:** `feat/calendar-mvp-foundation` → target `staging`.

## Architect decisions (PO accepted — do not revisit)

1. **PR 3 backend addendum only:** expose `assigneeUserId` on schedule payload — **not in PR 1**.
2. **Portfolio calendar:** deferred post-MVP.
3. **Schedule helpers:** duplicate Gantt-adjacent logic in Calendar; extraction deferred.
4. **Task click:** deep link to Activities — `/projects/:projectId/tasks?taskId=<id>` (mirror Gantt).
5. **Bundle:** `ProjectCalendarTab` **must** load via `React.lazy()` in `App.tsx` — **never** add `ProjectCalendarTab` to `@/features/projects/tabs` barrel (`tabs/index.ts`).

## PR 1 scope (foundation)

- Month view (`dayGridMonth`) via FullCalendar.
- `getProjectSchedule` integration; map `ScheduleTask` → calendar events (dates mirror Gantt precedence: planned → start/due → actual).
- Lazy-loaded route + `Suspense` + skeleton fallback (pattern: `TimelineView` + `StagingMarketingLandingPage`).
- Tab rail: `calendar` in `PROJECT_TABS_ALL` and `MVP_VISIBLE_TAB_IDS`.
- Event click → Activities deep link (`useNavigate`).
- Empty / loading / error states.
- Vitest + RTL; mock `@fullcalendar/react` (precedent: `phase2c-guard-checks` mocks `gantt-task-react`).
- Playwright smoke: `navigateToProjectCalendar` + thin `tests/smoke/calendar.spec.ts`.

## PR 1 non-goals

- Week/day/list views (PR 2).
- Drag-reschedule, assignee/phase/status filters (PR 2 / PR 3).
- Backend changes.
- Gantt edits.
- Tier 3 (capacity, AI, external calendars, portfolio).

## Packages (PR 1)

```text
@fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction
```

(`interaction` installed for forward compatibility; drag not required in PR 1 UI.)

## Verification (Gate 4)

```bash
cd zephix-frontend
npx tsc -p tsconfig.app.json --noEmit
npm run build
npm run size:ci
npx vitest run src/features/projects/tabs/__tests__/ProjectCalendarTab.test.tsx --reporter=dot
npx playwright test tests/smoke/calendar.spec.ts --reporter=list
```

Expect: main bundle size-limit unchanged within noise; separate lazy chunk containing `ProjectCalendarTab` / FullCalendar in `dist/assets/`.

## HALT conditions

- PR 2/3 scope in PR 1.
- `ProjectCalendarTab` exported from `tabs/index.ts`.
- Gantt component modified.
- Backend touched in PR 1.
- Main bundle regresses due to static import of FullCalendar.

---

*Committed as repo artifact — Commit 1 on `feat/calendar-mvp-foundation`.*
