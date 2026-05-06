# Calendar Research Brief — PM Platform Calendar Landscape + Zephix Opportunity Analysis

**Version:** 1.2 (Cursor v1.1 review corrections applied 2026-05-06)
**Date:** 2026-05-06
**Author:** Solution Architect (Claude)
**Reviewer:** Cursor (primary-source verification + v1.1 follow-up review)
**Repo target:** `docs/architecture/research/CALENDAR-RESEARCH-2026-05-06.md` (commit when landed)
**Purpose:** Industry survey of how PM platforms implement calendars, what's table-stakes, what differentiates, and where Zephix's governance-first positioning creates differentiator opportunity.
**Source discipline:** Web search with citations + primary-source cross-check pass. Claims tagged by provenance: `[vendor-doc]`, `[analyst]`, `[Zephix-internal]`. No fabrication.
**Status:** Architectural reference — informs post-PR-3 Calendar scope decisions. Not a commitment.

---

## Changelog v1 → v1.1 → v1.2

**v1.1 (Cursor first review):** Provenance tagging applied; Monday.com bundling corrected; Whitespace claim narrowed; Capacity surface language tightened; Linear absolutism softened; Sector-specific regulatory claims gap added.

**v1.2 (Cursor v1.1 follow-up review):**
1. **ClickUp time-blocking nuance** — bridged the apparent tension between "drag tasks to specific times" and "time-blocking absent" by clarifying that calendar grid granularity ≠ separate scheduled-work-vs-due-date model.
2. **Whitespace 1 softened** — replaced "never on the calendar grid as first-class events" (overstated) with "rarely surfaced as unified governance primitives" (defensible).
3. **Monday provenance split** — "Drag-and-drop reschedule" row no longer bundles Monday with vendor-doc certainty; flagged with footnote.
4. **Product Principles cross-check noted** — Whitespace 1 "compliance windows as overlays" UI semantics flagged as subject to Zephix Product Principles (quiet capabilities, not loud badges/banners).
5. **Removed unverifiable "7 of 9" metric** from Cursor acknowledgment.
6. **Removed aspirational repo path** language — `Repo target` rather than `Repo location`.

---

## Executive Summary

Modern PM platform calendars converge on a small set of table-stakes features. Above that baseline, three differentiation axes emerge:

1. **Capacity-aware visualization** — capacity/workload is a first-class planning surface in ClickUp and Wrike, but **typically presented separately from the month calendar grid** rather than as overlay.
2. **Calendar-as-time-blocking** — Morgen, Notion Calendar, Linear-via-Morgen pattern; almost no native PM platform offers this directly.
3. **Cross-project portfolio rollup** — Asana Portfolios, Monday with cross-board automations; mostly post-MVP territory.

**For Zephix specifically, a fourth axis is a defensible product thesis:** **unifying governance signals on the calendar surface** — phase gates, approvals due, compliance windows, audit-linked scheduling. Competitors offer governance features in **other UX surfaces**, not natively unified at the calendar grid. This is a coherent strategic bet for Zephix, not a market gap proven by survey.

---

## Part 1: Industry Survey

### Asana

- `[vendor-doc]` Calendar View shows tasks per project; drag-and-drop reschedule with color-coding via custom fields, completion status, or sections
- `[vendor-doc]` Drag updates due dates; click for detail view; switch List/Board/Calendar/Timeline single click
- `[vendor-doc]` Timeline view supports milestones (green vertical lines), critical path highlighting, zoom levels, color via custom fields
- `[analyst]` Multi-select drag to bulk-reschedule

**Strengths:** View-switching parity; milestone semantics; critical path on Timeline.
**Weaknesses:** Calendar per-project (not portfolio); workload separate; no time-blocking native.

### ClickUp

**Calendar:**
- `[vendor-doc]` Drag-and-drop, customization, filtering, recurring tasks, multiple national holiday calendars
- `[analyst with caveat]` Tasks can be dragged to specific times of day in daily/weekly views. **Important nuance:** calendar grid granularity ≠ separate scheduled-work-vs-due-date model. Time positioning on grid is a display dimension; the underlying data is still due-date-anchored.

**Workload (separate surface):**
- `[vendor-doc]` Group by assignee with capacity; measure in tasks/estimates/sprint points/custom fields; capacity limits per member
- `[vendor-doc]` Daily Scheduled / Weekly/Monthly Capacity / Daily/Weekly/Monthly Availability options

**Limitation:**
- `[analyst]` Calendar view shows due dates but not work schedules. Teams treating Calendar view as their schedule overcommit because they're not accounting for actual work time. The gap: time blocking. ClickUp user feedback channels explicitly request "due date is different to a scheduled working timeframe."

**Strengths:** Workload + Calendar combined depth; capacity grouping; recurring; multiple holidays.
**Weaknesses:** Due-date-vs-schedule confusion is a documented user-feedback theme; no committed-work-block model.

### Monday.com

**Carefully scoped (Cursor v1.1 correction):**
- `[analyst]` Interactive Calendar View with drag-and-drop and day/week/month options
- `[analyst]` Calendar view, Gantt view, and cross-board automations are **different surfaces**. Calendar reflects dates; Gantt shows dependencies; cross-board sync runs via automation rules
- `[analyst]` Multiple project views toggleable; collaboration via commenting, tagging, notifications

**Strengths:** Calendar + Gantt + automations together cover cross-board workflows.
**Weaknesses:** Surface distribution can feel fragmented; advanced features paywalled.

### Linear

- `[vendor-doc]` Cycles 1-8 weeks, auto-created, repeated intervals
- `[vendor-doc]` Capacity dial from velocity of last 3 cycles
- `[vendor-doc]` Cycle calendar subscribable via Google Calendar / ICS / .ics
- `[vendor-doc]` Timeline: milestones with right-click add, drag, hold-Cmd to keep in place; chronology bar; week numbers; team cycles displayable below
- `[vendor-doc]` Project timeframes support broad ranges (next month/quarter/year)
- `[vendor-doc]` Roadmap timeline generates completion estimates from velocity; purple = no target; red = projected late
- `[vendor-doc]` Timeline available for projects, not individual issues

**Note:** Third-party calendar apps (e.g., LinCal) exist for Linear; Cycles-first is a design choice, not calendar absence.

**Strengths:** Cycles primitive; velocity-based capacity; broad-date-range timeframes.
**Weaknesses:** No native traditional calendar; not designed for non-engineering teams.

### Notion / Notion Calendar

- `[vendor-doc]` `[analyst]` Database view + separate Notion Calendar app integrated with Google/Outlook + Notion databases

**Strengths:** Database-driven (every property exposable); unification with notes/docs.
**Weaknesses:** Calendar app is consumer-grade, not multi-tenant enterprise.

### Wrike

- `[analyst]` Customizable Calendar Views with day/week/month and filters; external calendar integrations
- `[vendor-doc]` Calendar View supports drag-drop reschedule; **Workload Charts is a separate surface**
- `[analyst]` Custom workflow builder; proofing/approvals integrated into tasks (in their own surface)

**Strengths:** Enterprise workflow integration; proofing/approvals.
**Weaknesses:** Workload not on Calendar grid; pricing complexity; add-on tax.

### Smartsheet

- `[vendor-doc]` Same sheet → Grid / Gantt / Calendar; views share data, switch via toolbar

**Strengths:** Spreadsheet familiarity; view multiplexing.
**Weaknesses:** Higher pricing; spreadsheet-feel limits modern UX.

### Microsoft Project

- `[analyst]` Advanced Gantt, timelines, calendar scheduling for complex projects

**Strengths:** Enterprise depth; legacy market position.
**Weaknesses:** Legacy UI; high learning curve; weak collaboration.

### Trello / Jira

- `[analyst]` Trello: lowest learning curve; calendar power-up alongside board/table; AI added in 2026
- Trello caps fast: no native resource planning, workload, portfolio
- `[analyst]` Jira free tier: list, timeline, calendar; Standard adds AI/guests; Premium adds approvals

**Strengths:** Trello = simplicity. Jira = engineering depth.
**Weaknesses:** Trello caps; Jira calendar afterthought.

### Adjacent: Morgen / Calendar-First Tools

- `[vendor-doc]` Morgen: drag tasks from sidebar into calendar for time blocks; AI Planner; Frames (templated focus blocks)
- `[vendor-doc]` Morgen + Linear: issues in sidebar; drag into open slots; AI suggests times based on capacity

**Why this matters for Zephix:** When PM platforms cede time-blocking to a separate app, planning fragments. Native time-blocking inside the PM tool is a real differentiator.

---

## Part 2: Pattern Extraction

### Table-Stakes (Required for Zephix MVP Calendar)

| Feature | Provenance | Zephix State |
|---|---|---|
| Month / Week / Day views | `[vendor-doc]` Multiple platforms | ✅ PR 1 + PR 2 |
| Drag-and-drop reschedule (Asana, Wrike, ClickUp) | `[vendor-doc]` | 🟡 Planned in PR 3 |
| Drag-and-drop reschedule (Monday)¹ | `[analyst]` | 🟡 Planned in PR 3 |
| Color-coding by field/status | `[vendor-doc]` Asana | ⬜ Status unknown |
| Click task → detail view | `[vendor-doc]` Asana | ✅ PR 1 (deep link to Activities) |
| Filter (assignee/status/etc.) | `[analyst]` Monday, ClickUp | 🟡 Planned in PR 3 |
| Agenda / list-equivalent view | `[vendor-doc]` Multiple | ✅ PR 2 |
| External calendar sync (Google/Outlook) | `[vendor-doc]` Asana, ClickUp, Linear | ⬜ Not in MVP scope |
| Timeline/Gantt view | `[vendor-doc]` All major platforms | ✅ Existing Gantt feature |

¹ Monday: validate Calendar surface vs Gantt surface drag behavior against Monday's own docs before claiming dependency-aware drag.

### Tier 1 Differentiators (Some Have)

| Feature | Owner | Provenance |
|---|---|---|
| Workload/capacity (separate surface) | ClickUp, Wrike | `[vendor-doc]` |
| Recurring tasks | ClickUp | `[vendor-doc]` |
| Multiple holiday calendars | ClickUp | `[vendor-doc]` |
| Critical path highlighting | Asana Timeline | `[vendor-doc]` |
| Milestone visualization | Asana, Linear | `[vendor-doc]` |
| Cross-board portfolio sync | Monday automations, Asana Portfolios | `[analyst]` |
| Velocity-based capacity estimates | Linear | `[vendor-doc]` |

### Tier 2 Differentiators (Few Have)

| Feature | Owner | Provenance |
|---|---|---|
| Time-blocking native | Morgen (external) | `[vendor-doc]` |
| AI scheduling suggestions | Morgen, Airtable | `[analyst]` |
| Velocity-driven completion estimates | Linear | `[vendor-doc]` |
| Broad date ranges (week/quarter/year) | Linear | `[vendor-doc]` |

### Tier 3 (Whitespace — Zephix Strategic Bet)

`[Zephix-internal]` Reasonable product theses, not survey-proved gaps. Competitors offer governance in other surfaces; the bet is unifying governance signals on the calendar surface.

#### Whitespace 1: Governance-aware calendar (PRODUCT THESIS)

**Phase gates as calendar events.** Surveyed competitors **rarely surface phase gates as unified governance primitives on the calendar grid**. They typically live as task tags, separate workflow UI, or Gantt milestones — not as first-class calendar events with approval semantics.

**Approvals due as calendar items.** PMBOK governance requires explicit approvals. These should appear with status, approver, and one-click approve.

**Compliance windows as calendar overlays.** Pharma trials, finance audit periods, defense ITAR review windows. Calendar should visualize "we are inside a compliance window."

> **Product Principles caveat (Cursor v1.1 review):** Overlay UI semantics subject to Zephix Product Principles (quiet capabilities, not loud badges/banners). Subtle visual treatment — left border accent, dotted period bracket, tooltip on hover — beats banners.

**Audit trail for calendar mutations.** `[analyst]` Audit trails generate documentary evidence for transparency and accountability across GRC frameworks. **Caveat:** generic GRC language ≠ sector-specific framework satisfaction. Audit-trail-for-drag-reschedule must be validated against each target framework (SOC2, HIPAA, 21 CFR Part 11, GDPR, ITAR) separately.

#### Whitespace 2: Multi-perspective calendar overlays

`[Zephix-internal]` Toggle layers per session: my tasks / team tasks / phase gates / approvals due / compliance windows / holidays / external calendars.

#### Whitespace 3: Calendar-as-decision-record

`[Zephix-internal]` Hover any event → see why it's scheduled when it is. Tied to phase gates, dependencies, predecessor decisions. Distant post-MVP, moat-building.

---

## Part 3: Zephix Opportunity Analysis

### Post-PR-3 Short-Term

1. **Color-coding by phase + status** — Tier 1 baseline.
2. **Recurring tasks support** — Tier 1; backend recurrence model needed.
3. **Holiday calendars (single org-level first)** — Tier 1 enterprise differentiator.

### Post-MVP Mid-Term (Engine 4-5)

4. **Workload/capacity overlay on Calendar** — Tier 1 differentiator. Most platforms keep separate; overlay-on-calendar is Zephix's tightening.
5. **Milestone visualization on Calendar** — Tier 1; phase-gate map.
6. **Multiple holiday calendars** — Tier 1 enterprise.
7. **External calendar sync (Google/Outlook bidirectional)** — Tier 1.

### Post-MVP Long-Term

8-15. Whitespace 1-3 + Tier 2 features per Part 2 tables.

### What Zephix Should NOT Build

- AI scheduling auto-assignment (governance-first ≠ autonomous)
- Per-user time-blocking app (not Zephix's territory)
- Vertical-specific calendar templates (Zephix is horizontal-regulated)

---

## Part 4: Sequencing for Roadmap

```
PR 3 (in motion):              Drag-reschedule + filters + assigneeUserId
Post-PR-3 v1:                  Color-coding by phase/status
Post-PR-3 v2:                  Holiday calendar (single)
Engine 4-5:                    Workload overlay, Milestones, Recurring, External sync
Engine 5+:                     Phase gates / Approvals / Compliance windows / Audit on calendar
Distant post-MVP:              Multi-perspective overlays, Time-blocking, Velocity estimates, Decision-record
```

---

## Part 5: Recon Prompt Recommendations

1. Table-stakes end-to-end against `ProjectCalendarTab` + API payloads
2. Backend readiness for overlays: phase / approval / allocation / audit entities
3. Architecture distance to whitespace per feature
4. Gantt/Calendar helper duplication (backlog #29)
5. Test coverage for governance features (permission matrix + audit assertions)

Recon stays read-only.

---

## Part 6: Gaps Not Covered

- Pricing tier analysis
- Mobile calendar UX
- Accessibility (a11y)
- Performance at scale (1000+, 10000+ tasks)
- Specific PMBOK 7+8 calendar mapping
- **Sector-specific regulatory framework validation** (SOC2 / HIPAA / 21 CFR Part 11 / GDPR / ITAR — generic GRC language is for product positioning, not compliance commitments)

---

## Cursor Review Acknowledgment

v1.1 incorporated Cursor's primary-source verification pass: provenance tagging, Monday.com bundling correction, whitespace narrowing, capacity surface clarification, Linear absolutism softening, regulatory framework gap.

v1.2 incorporates Cursor's v1.1 follow-up review: ClickUp time-blocking nuance, Whitespace 1 softening from "never" to "rarely," Monday provenance split, Product Principles caveat on overlay UI, removed unverifiable metric.

Cursor's verdict on v1: directionally strong with primary-source validation requiring localized fixes, not rework. v1.1 + v1.2 apply those fixes.

---

## Document End

Research synthesis. Use to inform; don't treat as decision. PO owns scope.

**Next architectural step:** Calendar Recon Prompt + Post-PR-3 Calendar Architecture Brief (separate artifacts produced this turn).
