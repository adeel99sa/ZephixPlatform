# Zephix Platform — Cross-Book Gap Analysis

> **Purpose**: Identify every project management capability described across 4 reference books, map each to Zephix's current state, and prioritize what to build.
>
> **Books Analyzed** (no content reproduced — concepts only):
> 1. *Essential Scrum* — Kenneth S. Rubin (Agile/Scrum framework)
> 2. *Information Technology Project Management, 9th ed.* — Kathy Schwalbe (PMBOK 6th Edition, 10 knowledge areas)
> 3. *Rita Mulcahy's PMP Exam Prep, 11th ed.* — Rita Mulcahy (PMBOK 7th / ECO, predictive + adaptive)
> 4. *The Effective Change Manager's Handbook* — Richard Smith et al. (Change management body of knowledge)
>
> **Date**: 2026-02-07

---

## How to Read This Document

| Symbol | Meaning |
|--------|---------|
| **FULL** | Zephix has this capability implemented and working |
| **PARTIAL** | Core exists but depth or UX is incomplete |
| **GAP** | Not implemented — represents a feature opportunity |
| **N/A** | Not applicable to a SaaS PM platform (e.g., paper-based processes) |

Each row shows: the PM concept, which book(s) cover it, Zephix status, and a brief note.

---

## 1. PROJECT INITIATION & SELECTION

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 1.1 | Project charter | 2, 3 | **GAP** | No formal charter document per project. Could auto-generate from template metadata. |
| 1.2 | Business case / ROI justification | 2, 3 | **GAP** | Projects have no business case field. Add optional fields: expected ROI, payback period, strategic alignment score. |
| 1.3 | Project selection criteria (NPV, IRR, weighted scoring) | 2, 3 | **GAP** | No portfolio-level scoring. Future: template-driven scoring rubric during project creation. |
| 1.4 | Strategic alignment | 2, 3, 4 | **GAP** | No linkage between projects and organizational strategy/OKRs. |
| 1.5 | Stakeholder register | 2, 3 | **PARTIAL** | Workspace members exist but no dedicated stakeholder register with interest/influence mapping. |
| 1.6 | Kick-off meeting artifacts | 2 | **GAP** | No meeting template or kick-off checklist. Could be a template lego block. |
| 1.7 | Assumption log | 2, 3 | **GAP** | No assumptions tracking per project. Add as a project-level list. |

---

## 2. SCOPE MANAGEMENT

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 2.1 | Scope management plan | 2, 3 | **N/A** | Handled implicitly through template + plan structure. |
| 2.2 | Requirements collection | 2, 3 | **GAP** | No requirements module. Tasks serve as work items but not as formal requirements with traceability. |
| 2.3 | Requirements traceability matrix | 2, 3 | **GAP** | No RTM linking requirements → tasks → test cases. High-value feature for enterprise. |
| 2.4 | Work Breakdown Structure (WBS) | 2, 3 | **PARTIAL** | Plan → Phase → Task hierarchy serves as a WBS. Missing: WBS dictionary, WBS numbering scheme. |
| 2.5 | Product backlog | 1, 3 | **PARTIAL** | Task list exists but lacks formal backlog ranking, story points column, and product-owner workflow. |
| 2.6 | Product roadmap | 3 | **GAP** | No visual roadmap view across releases. High demand feature. |
| 2.7 | User stories (INVEST criteria) | 1, 3 | **GAP** | Tasks exist but no user-story template with "As a... I want... So that..." and acceptance criteria fields. |
| 2.8 | Acceptance criteria per item | 1, 3 | **GAP** | No dedicated acceptance criteria field on tasks. |
| 2.9 | Definition of Done (DoD) | 1, 3 | **GAP** | No global or project-level DoD checklist. Critical for Scrum teams. |
| 2.10 | Scope baseline / change control | 2, 3 | **GAP** | No formal scope baseline snapshot or change request log. |
| 2.11 | MVP / Minimum Viable Product | 3 | **GAP** | No way to tag scope as MVP vs. stretch. Could be a task label/flag. |
| 2.12 | Scope creep detection | 2, 3 | **GAP** | No alerts when tasks are added after baseline. AI assistant could flag this. |
| 2.13 | Gold plating prevention | 3 | **N/A** | Process discipline; platform can warn but can't enforce. |

---

## 3. SCHEDULE MANAGEMENT

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 3.1 | Activity list & attributes | 2, 3 | **FULL** | Tasks with title, description, status, assignee, dates. |
| 3.2 | Milestone tracking | 2, 3 | **GAP** | No milestone entity. Phases serve as groupings but not as zero-duration milestones. |
| 3.3 | Task dependencies (FS, FF, SS, SF) | 2, 3 | **GAP** | No dependency linking between tasks. Critical gap. |
| 3.4 | Network diagram / precedence diagram | 2, 3 | **GAP** | Requires dependencies first. |
| 3.5 | Critical path calculation | 2, 3 | **GAP** | Requires dependencies. Would be a major differentiator with auto-calculation. |
| 3.6 | Gantt chart view | 2, 3 | **GAP** | No timeline visualization. High demand from PM users. |
| 3.7 | Sprint / iteration timeboxing | 1, 3 | **GAP** | No sprint entity with start/end dates, velocity, and sprint goal. |
| 3.8 | Sprint goal | 1 | **GAP** | No sprint goal field. |
| 3.9 | Velocity tracking | 1, 3 | **GAP** | No story-point velocity calculation across sprints. |
| 3.10 | Burndown chart | 1, 3 | **GAP** | No burndown visualization. |
| 3.11 | Burnup chart | 1, 3 | **GAP** | No burnup visualization. |
| 3.12 | Calendar view | 2 | **GAP** | No calendar view for tasks by date. |
| 3.13 | Duration estimation (analogous, parametric, 3-point/PERT) | 2, 3 | **GAP** | No estimation support beyond manual entry. Could add AI-assisted estimation. |
| 3.14 | Schedule baseline | 2, 3 | **GAP** | No snapshot of original schedule to compare against actuals. |
| 3.15 | Schedule compression (crashing, fast-tracking) | 2, 3 | **N/A** | Process technique; platform could suggest via AI. |
| 3.16 | Lead and lag time | 2 | **GAP** | Requires dependencies. |

---

## 4. COST / BUDGET MANAGEMENT

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 4.1 | Project budget | 2, 3 | **PARTIAL** | Budget field exists on project entity but limited to a single number. |
| 4.2 | Budget line items | 2, 3 | **PARTIAL** | Budget line items exist in seed script but may not be fully implemented in UI. |
| 4.3 | Cost baseline | 2, 3 | **GAP** | No baseline snapshot of planned costs. |
| 4.4 | Earned Value Management (EVM) | 2, 3 | **GAP** | No PV, EV, AC, CPI, SPI calculations. Major enterprise feature. |
| 4.5 | Cost aggregation (activity → WP → control account) | 2, 3 | **GAP** | No roll-up of task-level costs to phase/project. |
| 4.6 | Contingency reserves | 3 | **GAP** | No reserve tracking. Could add as budget line item category. |
| 4.7 | Management reserves | 3 | **GAP** | Same as above. |
| 4.8 | Budget forecasting (EAC, ETC, VAC) | 2, 3 | **GAP** | No forecasting. AI assistant could compute these. |
| 4.9 | Variance analysis | 2, 3 | **GAP** | No cost/schedule variance reporting. |
| 4.10 | Burn rate tracking | 3 | **GAP** | No burn rate visualization for agile teams. |

---

## 5. RESOURCE MANAGEMENT

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 5.1 | Resource allocation (% or hours) | 1, 2, 3 | **FULL** | Core resource engine with percentage-based allocation. |
| 5.2 | Capacity management / limits | 1, 2, 3 | **PARTIAL** | Allocation thresholds exist (warning → approval → block). Full enforcement in progress. |
| 5.3 | Resource breakdown structure | 2, 3 | **GAP** | No visual breakdown of resources by type/department. |
| 5.4 | Team charter | 2 | **GAP** | No team charter document per project. |
| 5.5 | RACI matrix | 2, 3 | **GAP** | No Responsible/Accountable/Consulted/Informed matrix. |
| 5.6 | Resource calendar | 2, 3 | **GAP** | No availability calendar per resource (vacations, capacity). |
| 5.7 | Resource leveling / smoothing | 2, 3 | **GAP** | No automatic resource conflict resolution. |
| 5.8 | Workload view (person-centric) | 2, 3 | **PARTIAL** | Heatmap exists; dedicated workload view per person planned. |
| 5.9 | Cross-project resource view | 2, 3 | **GAP** | No single view of a person's allocation across all projects. |
| 5.10 | Skill / competency tracking | 2, 3 | **GAP** | No skills database. Would enable smart assignment suggestions. |
| 5.11 | Team velocity (story points/sprint) | 1, 3 | **GAP** | Requires sprint entity and story points. |

---

## 6. RISK MANAGEMENT

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 6.1 | Risk register | 1, 2, 3, 4 | **FULL** | Risks with probability, impact, status, owner. |
| 6.2 | Risk identification (categories, prompt lists) | 2, 3, 4 | **PARTIAL** | Risks can be created but no category taxonomy or risk prompt lists. |
| 6.3 | Qualitative risk analysis (probability × impact matrix) | 2, 3 | **PARTIAL** | Probability and impact fields exist. Missing: visual P×I matrix/heatmap. |
| 6.4 | Quantitative risk analysis (EMV, Monte Carlo) | 2, 3 | **GAP** | No quantitative analysis. EMV could be calculated from existing fields. |
| 6.5 | Risk response strategies (avoid, mitigate, transfer, accept, escalate) | 2, 3 | **GAP** | No response strategy field on risks. Simple enum addition. |
| 6.6 | Risk owner assignment | 2, 3 | **FULL** | Owner field exists on risk entity. |
| 6.7 | Risk-to-task linking | 1, 2, 3 | **GAP** | Cannot link a risk to specific tasks or milestones. |
| 6.8 | Risk-adjusted backlog | 3 | **GAP** | No way to factor risk into backlog priority. |
| 6.9 | Risk monitoring / triggers | 2, 3 | **GAP** | No trigger conditions or automated alerts when risk conditions are met. |
| 6.10 | Risk dashboard rollup | 2, 3, 4 | **PARTIAL** | Risks appear in project overview. Missing: org-level risk dashboard. |
| 6.11 | Change risk assessment (strategic, business, project) | 4 | **GAP** | No risk classification by perspective. |

---

## 7. QUALITY MANAGEMENT

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 7.1 | Quality management plan | 2, 3 | **GAP** | No quality planning per project. |
| 7.2 | Quality metrics | 2, 3 | **GAP** | No quality KPIs (defect rates, test coverage). |
| 7.3 | Quality control (inspection, testing) | 2, 3 | **GAP** | No test case management or inspection workflow. |
| 7.4 | Definition of Done as quality gate | 1, 3 | **GAP** | Covered in Scope (2.9). |
| 7.5 | Continuous improvement / retrospectives | 1, 3 | **GAP** | No retrospective module or lessons learned repository. |
| 7.6 | Checklists | 2 | **GAP** | No checklist support on tasks. Common feature in competitors. |

---

## 8. COMMUNICATIONS MANAGEMENT

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 8.1 | Communications management plan | 2, 3 | **N/A** | Process document; not a platform feature. |
| 8.2 | Status reporting | 2, 3 | **PARTIAL** | Dashboard exists but no automated status report generation. |
| 8.3 | Information radiators (Kanban board) | 1, 3 | **GAP** | No Kanban board view. High demand for agile teams. |
| 8.4 | Activity feed / audit trail | 3 | **PARTIAL** | Some audit exists; needs comprehensive activity feed per project. |
| 8.5 | Notifications / alerts | 2, 3 | **GAP** | No in-app or email notification system for assignments, due dates, status changes. |
| 8.6 | Comments / discussions on items | 2, 3 | **GAP** | No comment thread on tasks or risks. Standard in all competitors. |
| 8.7 | @mentions | 3 | **GAP** | Requires comments system first. |
| 8.8 | File attachments | 2, 3 | **GAP** | No file upload on tasks or projects. |
| 8.9 | Meeting minutes / action items | 2 | **GAP** | No meeting module. AI assistant could auto-generate. |
| 8.10 | Daily standup support | 1, 3 | **GAP** | No standup module or "what I did / will do / blockers" capture. |

---

## 9. STAKEHOLDER MANAGEMENT

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 9.1 | Stakeholder identification | 2, 3, 4 | **PARTIAL** | Members exist but not classified as stakeholders with interest/influence. |
| 9.2 | Stakeholder engagement assessment matrix | 3, 4 | **GAP** | No tracking of stakeholder engagement levels (unaware → leading). |
| 9.3 | Stakeholder personas | 3, 4 | **GAP** | No persona support. |
| 9.4 | Power/interest grid | 2, 4 | **GAP** | No stakeholder mapping visualization. |

---

## 10. PROCUREMENT MANAGEMENT

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 10.1 | Procurement management plan | 2, 3 | **N/A** | External to PM platform. |
| 10.2 | Vendor tracking | 2, 3 | **GAP** | No vendor/supplier module. Low priority for MVP. |
| 10.3 | Contract management | 2, 3 | **GAP** | Not in scope for MVP. |

---

## 11. AGILE / ADAPTIVE PRACTICES

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 11.1 | Scrum framework support | 1, 3 | **GAP** | No sprint entity, sprint planning, sprint review, sprint retrospective ceremonies. |
| 11.2 | Kanban board | 3 | **GAP** | No drag-and-drop Kanban view. |
| 11.3 | WIP limits | 1, 3 | **GAP** | No work-in-progress limits per column/status. |
| 11.4 | Story points | 1, 3 | **GAP** | No story point field on tasks. |
| 11.5 | Planning Poker / estimation | 1, 3 | **GAP** | No collaborative estimation tool. |
| 11.6 | Cumulative flow diagram | 3 | **GAP** | No CFD visualization. |
| 11.7 | Velocity chart | 1, 3 | **GAP** | Requires sprints + story points. |
| 11.8 | Release planning | 1, 3 | **GAP** | No release entity grouping sprints. |
| 11.9 | Epics → Stories → Tasks decomposition | 1, 3 | **GAP** | No epic or sub-task hierarchy. Currently flat task list within phases. |
| 11.10 | Spike / research task type | 3 | **GAP** | No task type differentiation. |
| 11.11 | SAFe / scaled agile support | 3 | **GAP** | No program increment, ART, or portfolio-level agile. Future consideration. |
| 11.12 | Hybrid methodology support | 2, 3 | **PARTIAL** | Project has methodology field (waterfall, agile, scrum, kanban, hybrid) but no methodology-specific behavior changes. |

---

## 12. CHANGE MANAGEMENT (From Change Manager's Handbook)

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 12.1 | Change impact assessment | 4 | **GAP** | No change impact tracking. Could integrate with risk module. |
| 12.2 | Change readiness assessment | 4 | **GAP** | No organizational readiness scoring. |
| 12.3 | Benefits management (identification, mapping, realization) | 4 | **GAP** | No benefits tracking per project. Add expected benefits, actual benefits, realization date. |
| 12.4 | Benefits realization dashboard | 4 | **GAP** | No post-project benefits tracking. |
| 12.5 | Organizational heat map (change load) | 4 | **GAP** | No view showing cumulative change load across business units. |
| 12.6 | Change resistance tracking | 4 | **GAP** | No resistance/adoption metrics. |
| 12.7 | Training needs assessment | 4 | **GAP** | No training module. Low priority for MVP. |

---

## 13. INTEGRATION & GOVERNANCE

| # | Concept | Books | Zephix Status | Notes |
|---|---------|-------|---------------|-------|
| 13.1 | Project management plan (consolidated) | 2, 3 | **PARTIAL** | Plan entity exists but doesn't consolidate all sub-plans. |
| 13.2 | Change control board / integrated change control | 2, 3 | **GAP** | No formal change request workflow with approval. |
| 13.3 | Lessons learned repository | 2, 3 | **GAP** | No lessons learned capture or retrieval. AI assistant could mine these. |
| 13.4 | Project closure checklist | 2, 3 | **GAP** | No formal close-out workflow with sign-off. |
| 13.5 | Phase gate reviews | 2 | **GAP** | Phases exist but no gate review/approval workflow between phases. |
| 13.6 | Portfolio management / project prioritization | 2, 3 | **GAP** | No portfolio-level view for prioritizing across projects. |
| 13.7 | Program management (grouping related projects) | 2, 3 | **GAP** | No program entity above project level. |
| 13.8 | Configuration management | 2, 3 | **N/A** | Software-specific; not a PM platform concern. |

---

## SUMMARY SCORECARD

| Category | FULL | PARTIAL | GAP | N/A | Total Items |
|----------|------|---------|-----|-----|-------------|
| 1. Initiation & Selection | 0 | 1 | 6 | 0 | 7 |
| 2. Scope Management | 0 | 2 | 10 | 1 | 13 |
| 3. Schedule Management | 1 | 0 | 14 | 1 | 16 |
| 4. Cost / Budget | 0 | 2 | 8 | 0 | 10 |
| 5. Resources | 1 | 2 | 8 | 0 | 11 |
| 6. Risk Management | 2 | 3 | 6 | 0 | 11 |
| 7. Quality | 0 | 0 | 6 | 0 | 6 |
| 8. Communications | 0 | 2 | 8 | 1 | 11 |
| 9. Stakeholder | 0 | 1 | 3 | 0 | 4 |
| 10. Procurement | 0 | 0 | 2 | 1 | 3 |
| 11. Agile Practices | 0 | 1 | 11 | 0 | 12 |
| 12. Change Management | 0 | 0 | 7 | 0 | 7 |
| 13. Integration & Governance | 0 | 1 | 6 | 1 | 8 |
| **TOTALS** | **4** | **15** | **95** | **5** | **119** |

**Current Coverage**: 4 FULL + 15 PARTIAL = **19 of 119 concepts** addressed (16%)

This is expected — Zephix is in early MVP. The important thing is that the **architectural foundation** (orgs, workspaces, projects, plans, phases, tasks, risks, resources, budgets, templates, RBAC) is solid and designed to support all of these.

---

## TOP 25 FEATURES TO ADD (Prioritized by Impact × Feasibility)

Priority is scored: **Critical** (blocks core PM workflows), **High** (expected by enterprise buyers), **Medium** (nice-to-have, competitive), **Low** (niche or future).

| Rank | Feature | Gap # | Priority | Effort | Rationale |
|------|---------|-------|----------|--------|-----------|
| 1 | **Task dependencies** | 3.3 | Critical | Medium | Foundation for critical path, Gantt, network diagrams. Every PM book requires this. |
| 2 | **Gantt chart view** | 3.6 | Critical | Large | Most requested PM visualization. Requires dependencies. |
| 3 | **Kanban board view** | 8.3/11.2 | Critical | Medium | Required for agile teams. Drag-and-drop status changes. |
| 4 | **Comments on tasks** | 8.6 | Critical | Small | Table stakes for any PM tool. Thread per work item. |
| 5 | **Sprint entity + sprint planning** | 11.1/3.7 | Critical | Medium | Enables Scrum workflow. Sprint with goal, start/end, capacity. |
| 6 | **Story points on tasks** | 11.4 | High | Small | Simple field addition. Unlocks velocity, burndown, estimation. |
| 7 | **Burndown/burnup charts** | 3.10/3.11 | High | Medium | Core agile metric. Requires sprints + story points. |
| 8 | **Notifications system** | 8.5 | High | Medium | Assignment, due date, status change, @mention notifications. |
| 9 | **Task comments + @mentions** | 8.6/8.7 | High | Medium | Contextual collaboration. Reduces email dependency. |
| 10 | **Milestone tracking** | 3.2 | High | Small | Zero-duration markers on timeline. Key for executive reporting. |
| 11 | **Acceptance criteria field** | 2.8 | High | Small | Checklist or text field per task. Enables DoD enforcement. |
| 12 | **Definition of Done (project-level)** | 2.9 | High | Small | Configurable checklist template per project/workspace. |
| 13 | **Risk response strategy field** | 6.5 | High | Small | Enum: avoid, mitigate, transfer, accept, escalate. Trivial addition. |
| 14 | **Risk-to-task linking** | 6.7 | High | Small | Foreign key relationship. Enables risk traceability. |
| 15 | **WIP limits** | 11.3 | High | Small | Per-status column limit. Kanban essential. |
| 16 | **Probability × Impact matrix view** | 6.3 | High | Medium | Visual risk heatmap. Data already exists. |
| 17 | **Velocity chart** | 11.7 | High | Medium | Requires sprints + story points. Key agile metric. |
| 18 | **File attachments** | 8.8 | High | Medium | Upload on tasks, risks, projects. Storage via S3/equivalent. |
| 19 | **Calendar view** | 3.12 | Medium | Medium | Tasks displayed on calendar by due date. |
| 20 | **Activity feed per project** | 8.4 | Medium | Medium | Chronological log of all project changes. |
| 21 | **Sub-tasks / task hierarchy** | 11.9 | Medium | Medium | Epics → Stories → Tasks. Enables WBS depth. |
| 22 | **Cross-project resource view** | 5.9 | Medium | Medium | See a person's commitments across all projects. |
| 23 | **Product roadmap view** | 2.6 | Medium | Large | Visual timeline of releases and features. |
| 24 | **Earned Value Management** | 4.4 | Medium | Large | PV, EV, AC, CPI, SPI. Major enterprise differentiator. |
| 25 | **Lessons learned repository** | 13.3 | Medium | Small | Simple text entries per project, searchable across org. AI can mine. |

---

## STRATEGIC INSIGHTS FROM THE BOOKS

### What Zephix Already Gets Right (Validated by All 4 Books)

1. **Enforced structure** — All books emphasize that PM discipline comes from structure, not optional tooling. Zephix's enforced hierarchy (Org → Workspace → Project → Plan → Phase → Task) is exactly what PMBOK calls a "project management methodology."

2. **Resources as core, not feature** — Schwalbe (Book 2) and Mulcahy (Book 3) dedicate entire chapters to resource management. Most competitors treat it as optional. Zephix's resource engine with hard allocation limits is architecturally superior.

3. **Multi-tenancy and RBAC** — All books emphasize organizational boundaries and role-based access. Zephix's org-level isolation with 5 workspace roles exceeds what most tools offer.

4. **Template-deployed projects** — Schwalbe emphasizes organizational process assets and standard templates. Zephix's template system that deploys complete project structures (not just starting points) is exactly what the PMBOK PMO chapter recommends.

5. **Risk as first-class citizen** — Risk management is a full knowledge area in PMBOK and dedicated chapters in all books. Zephix having risk as a core entity (not a plugin) is correct architecture.

### What the Books Say Zephix Must Prioritize

1. **Dependencies are non-negotiable** — Every book, every methodology (waterfall, agile, hybrid) requires understanding task relationships. This is the single biggest platform gap.

2. **Visualization is how PMs work** — Gantt charts (Books 2, 3), Kanban boards (Books 1, 3), burndown charts (Books 1, 3), and roadmaps (Book 3) are not luxuries. They are how project managers think, communicate, and decide.

3. **Agile is 50%+ of the market** — Mulcahy's book (Book 3) notes that the PMP exam is now 50% adaptive/agile content. Zephix supports agile in name (methodology field) but not in practice (no sprints, no velocity, no Kanban, no burndown).

4. **Communication is the PM's primary job** — Books 2 and 3 estimate 90% of a PM's time is communication. Comments, notifications, and activity feeds are not optional features — they are the platform's communication layer.

5. **Change management is the missing discipline** — Book 4 introduces concepts (change impact, readiness, benefits realization) that no competitor has built well. This is a blue ocean opportunity for Zephix to differentiate at the enterprise level.

---

## IMPLEMENTATION ROADMAP RECOMMENDATION

### Phase 1: Foundation (Sprint 5-6)
- Task dependencies (3.3)
- Comments on tasks (8.6)
- Story points field (11.4)
- Risk response strategy enum (6.5)
- Risk-to-task linking (6.7)
- Acceptance criteria field (2.8)
- Milestone entity (3.2)

### Phase 2: Visualization (Sprint 7-8)
- Kanban board view (11.2)
- Gantt chart view (3.6)
- Burndown/burnup charts (3.10/3.11)
- P×I risk matrix view (6.3)
- Calendar view (3.12)

### Phase 3: Agile Core (Sprint 9-10)
- Sprint entity + planning (11.1)
- WIP limits (11.3)
- Velocity chart (11.7)
- Definition of Done (2.9)
- Sub-tasks hierarchy (11.9)

### Phase 4: Communication (Sprint 11-12)
- Notifications system (8.5)
- @mentions (8.7)
- File attachments (8.8)
- Activity feed (8.4)
- Daily standup capture (8.10)

### Phase 5: Enterprise Differentiation (Sprint 13+)
- Earned Value Management (4.4)
- Cross-project resource view (5.9)
- Product roadmap view (2.6)
- Portfolio management (13.6)
- Benefits management (12.3)
- Change impact tracking (12.1)
- Lessons learned repository (13.3)

---

## WHAT MAKES ZEPHIX UNIQUE (No Competitor Has All Of These)

Based on the gap analysis, Zephix's competitive moat consists of:

1. **Enforced project structure** (no other tool forces proper PM discipline)
2. **Resource engine with hard limits** (others only warn)
3. **Template-deployed complete systems** (others give starting points)
4. **Risk as core entity** (others add it as a plugin)
5. **AI assistant integrated into PM workflow** (others bolt on chat)
6. **Multi-tenant org-level isolation** (others isolate at workspace)

**The gap analysis confirms: Zephix has the right architecture. It needs to fill in the PM features that the architecture was designed to support.**

---

*This analysis was produced by reading concepts from 4 PM reference books without reproducing copyrighted content. All insights are synthesized from publicly known PM methodologies (PMBOK, Scrum, Kanban, Change Management BoK).*
