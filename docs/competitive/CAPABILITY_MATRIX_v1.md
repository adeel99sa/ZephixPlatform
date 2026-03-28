# Zephix Competitive Capability Matrix v1

**Date**: 2026-02-05
**Method**: Code audit (Zephix) + documented/published features (competitors)
**Scope**: Shipped features only. No roadmaps. No aspirational claims.

---

## Step 1: Zephix Shipped Feature Surface

Audited from codebase at tag `v0.5.1-rc.1`.

| Area | What Ships | Evidence |
|------|-----------|----------|
| **Work Management** | Task CRUD, 7 statuses, 4 priority levels, 4 types (task/epic/milestone/bug), subtasks, phase grouping, sprint assignment, effort tracking, acceptance criteria, tags, bulk status update | `work-task.entity.ts`, `work-tasks.service.ts` |
| **Task Dependencies** | FS, SS, FF, SF with cycle detection via BFS | `task-dependency.entity.ts`, `task-dependencies.service.ts` |
| **Task Activity** | 50+ event types, full audit trail, comment mentions | `task-activity.entity.ts`, `task-activity.service.ts` |
| **Task Comments** | CRUD, @mention parsing, author/admin edit control | `task-comments.service.ts` |
| **Views** | Board (drag-drop), List (groupable, filterable, sortable), Gantt (read-only with dependency arrows) | `ProjectBoardTab.tsx`, `ProjectTasksTab.tsx`, `ProjectGanttTab.tsx` |
| **Projects** | CRUD, 5 statuses, priority, risk level, methodology, budget fields, definition of done, template tracking, structure locking | `project.entity.ts` |
| **Project Health** | Auto-computed (HEALTHY/AT_RISK/BLOCKED) from blocked tasks, overdue count, milestone variance. Recalculates on task changes. | `project-health.service.ts` |
| **Templates** | Template entity with versioning, scope (system/org/workspace), structure (phases+tasks), metadata (complexity, duration buckets, tags). Instantiation creates real phases and tasks transactionally. | `template.entity.ts`, `templates-instantiate-v51.service.ts` |
| **Risk Governance** | Risk entity with probability (0-1), impact cost, impact schedule days. Policy-driven risk level derivation (costExposure = probability x impactCost). Response strategies (AVOID/MITIGATE/TRANSFER/ACCEPT). Mitigation plan text. Activity logging on escalation. | `work-risk.entity.ts`, `work-risks.service.ts`, `risk-thresholds.ts` |
| **Automated Risk Detection** | Daily cron: scans for resource overallocation, timeline slippage, dependency cascade risks. Creates risk entities automatically. | `risk-detection.service.ts` |
| **Resource Risk Scoring** | 0-100 score based on max allocation %, days over threshold, concurrent projects, existing conflicts | `resource-risk-score.service.ts` |
| **Gate Enforcement** | Phase gate definitions with required documents (count+tags), checklists (items). Submission workflow: DRAFT -> SUBMITTED -> APPROVED/REJECTED/CANCELLED. Single-step approval. Policy-driven enforcement modes (SOFT/HARD/OFF). | `phase-gate-definition.entity.ts`, `phase-gate-submission.entity.ts`, `phase-gates.service.ts` |
| **Gate Evaluator** | Multi-factor blocking: document blockers, risk blockers (level threshold + aggregate exposure), budget blockers (variance + forecast overrun), resource conflict blockers. Returns structured evaluation with blockers and warnings. | `phase-gate-evaluator.service.ts` |
| **Earned Value** | BAC from approved baselines. AC from period-based actuals. EV = percentComplete x BAC. CPI = EV/AC. SPI = EV/PV (optional). EAC via CPI-based or AC_PLUS_REMAINING. ETC = EAC - AC. Variance analysis with ON_TRACK/WATCH/AT_RISK/CRITICAL status. | `budget.service.ts`, `budget.service.spec.ts` |
| **Budget Management** | Versioned baselines with approval workflow (DRAFT/APPROVED/SUPERSEDED). Period-based actual cost entries. Budget history endpoint. Category-level breakdown (JSONB). | `project-budget-baseline.entity.ts`, `project-actual-cost.entity.ts` |
| **Resource Management** | Resource entity with capacity hours/week, cost/hour. Allocations as percentage with type (HARD/SOFT/GHOST). HARD blocked at 100%. Governance validation: hardCap (default 150%), justification required above threshold. | `resource.entity.ts`, `resource-allocation.entity.ts`, `resource-allocation.service.ts` |
| **Resource Conflict Math** | Week-by-week aggregation: effectivePercent = (allocationPercent x availabilityPercent x daysInWeek) / 7. Severity classification via policy thresholds (warn/block). Day-by-day check as fallback. Daily load tracking entity. | `resource-conflict-engine.service.ts`, `resource-daily-load.entity.ts` |
| **Resource Heatmap** | Weekly heatmap data endpoint. Policy-driven status classification. Timeline view. Task-level heatmap. | `resource-heat-map.service.ts`, `ResourceHeatMap.tsx` |
| **Policy Hierarchy** | Policy definitions (system defaults) + overrides at org/workspace/project scope. Resolution: project > workspace > org > system. Used by: conflict engine, allocation service, budget service, gate evaluator, schedule enforcement. | `policy-definition.entity.ts`, `policy-override.entity.ts`, `policies.service.ts` |
| **Program Rollup** | Program entity (belongs to portfolio, workspace-scoped). Rollup aggregates: projects (total/active/at-risk), work items (open/overdue), resource conflicts, risks. Health score: computeHealthV1. Budget rollup: aggregate BAC/AC/EAC/variance/CPI. Schedule rollup: horizon dates, milestones, critical path, conflict severity. | `program.entity.ts`, `programs-rollup.service.ts`, `program-schedule-rollup.service.ts` |
| **Portfolio** | Portfolio entity. Portfolio rollup aggregates programs and projects. Workspace-scoped. | `portfolios-rollup.service.ts` |
| **Notifications** | In-app + email (SendGrid). Preferences per category (invites, mentions, assignments, dependencies, approvals, access changes, risk alerts, workflow). Email digest (hourly cron, timezone-aware, daily at 7-9 AM local). Rate limiting (1 email/min/user). Polling for unread count (30s). Slack/Teams channels defined but not implemented. No WebSocket/SSE. | `notification-dispatch.service.ts`, `email-digest.service.ts`, `notification.entity.ts` |
| **Multi-Tenant Control** | Organization isolation via TenantAwareRepository (auto-scopes all queries). Workspace membership enforcement via guards. Platform roles (ADMIN/MEMBER/VIEWER). Workspace roles (owner/member/viewer/delivery_owner/stakeholder). Cross-workspace isolation (returns 404 not 403). Feature flags. Module enable/disable per workspace. Beta tier controls (CORE/GOVERNANCE/FULL). | `tenant-aware.repository.ts`, `tenant-context.interceptor.ts`, workspace guards |
| **Auth** | JWT + cookie-based sessions. Session entity with refresh tracking. CSRF guard. Organization guard. | `auth-session.entity.ts`, `csrf.guard.ts` |

### What Does NOT Ship Yet

| Area | Status |
|------|--------|
| Real-time notifications (WebSocket/SSE) | Not implemented. Polling only. |
| Slack/Teams notification channels | Enum defined, dispatch logic is stub |
| Multi-step approval chains | Single-step only |
| Custom fields UI | metadata JSONB exists, no field definition UI |
| Gantt editing (drag to reschedule) | Read-only Gantt |
| Critical path calculation | Not implemented |
| Resource leveling | Not implemented |
| Time tracking | Effort fields exist, no time entry UI/service |
| Policy admin UI | Backend API exists, no dedicated frontend page found |
| Risk dashboard (aggregate metrics) | No dedicated endpoint for portfolio-level risk aggregation |

---

## Step 2: Competitor Selection

### Mid-Market Work Tools
1. **Monday.com** - Dominant mid-market work management
2. **ClickUp** - Feature-dense competitor, free tier, enterprise claims
3. **Linear** - Developer-focused, fast-growing, minimalist by design

### Enterprise PPM Tools
1. **Planview PPM Pro** - Established enterprise PPM
2. **Broadcom Clarity PPM** - Legacy enterprise standard (formerly CA PPM)
3. **Microsoft Project Online** - Enterprise standard (retiring Sept 2026, successor: Dynamics 365 Project Operations)

---

## Step 3: Capability Matrix

### Scoring System

| Score | Meaning |
|-------|---------|
| 0 | Not present. No documented feature. |
| 1 | Basic/partial. Field exists or simple CRUD. No business logic. |
| 2 | Functional. Working feature with real logic but limited depth. |
| 3 | Strong. Full implementation with policy, automation, or multi-factor logic. |
| 4 | Best-in-class. Deep implementation, configurable, integrated across modules. |

### Scoring Rationale Key
- **(D)** = Documented in product docs / help center
- **(C)** = Confirmed from codebase audit
- **(A)** = Available but limited per public documentation
- **(N)** = Not documented / not present

---

### Dimension 1: Risk Governance

| Platform | Score | Evidence |
|----------|-------|----------|
| **Zephix** | 3 | (C) Risk entity with probability/impact. Policy-driven risk level derivation (costExposure = prob x cost). 4 response strategies. Automated daily risk detection cron. Resource risk scoring (0-100). Activity logging on escalation. Integration with gate evaluator. Gap: no portfolio-level risk aggregation endpoint, mitigation is text-only. |
| Monday.com | 2 | (D) Centralized risk tracking, automated scoring, portfolio-wide visibility. Blog describes it but no documented risk-specific entity or calculation engine. Risk tracking via custom boards, not dedicated risk module. |
| ClickUp | 2 | (D) Risk tracking in tasks/dashboards, automated alerts, AI-powered risk prediction. Dependency insights for cascading risks. No documented risk scoring formula or dedicated risk entity. |
| Linear | 0 | (N) No risk register, no risk scoring, no risk management features documented. Project health status (On track/At risk/Off track) is manual, not risk-calculated. |
| Planview PPM Pro | 3 | (D) Risk management as part of PPM governance. NPD gated process implies risk checkpoints. Documented risk analysis capabilities. Established enterprise risk workflows. Exact calculation details behind docs paywall. |
| Broadcom Clarity | 3 | (D) Enterprise risk management integrated with project portfolios. Long-standing PMO risk capabilities. PMBOK-aligned. Details behind enterprise docs. |
| MS Project Online | 2 | (D) Risk fields exist but risk management is primarily via custom fields and workflows. No native risk scoring engine. SharePoint-based risk lists in Project Server. |

### Dimension 2: Gate Enforcement

| Platform | Score | Evidence |
|----------|-------|----------|
| **Zephix** | 4 | (C) Full gate system: definitions (required docs + checklists), submission workflow (DRAFT->SUBMITTED->APPROVED/REJECTED), policy-driven modes (SOFT/HARD/OFF). Multi-factor evaluator: document blockers, risk blockers (level + aggregate exposure thresholds), budget blockers (variance + forecast), resource conflict blockers. Template Center gate integration. All configurable via policy hierarchy. |
| Monday.com | 1 | (D) No native stage-gate. Achievable via automations and status columns. No documented gate evaluator or submission workflow. |
| ClickUp | 2 | (D) Approval workflows: centralized requests, automated notifications, real-time status visibility. Proofing tools. No documented multi-factor gate evaluation or policy-driven enforcement modes. |
| Linear | 0 | (N) No gate enforcement. No approval workflows documented. Project statuses are manual. |
| Planview PPM Pro | 3 | (D) NPD gated process documented. Stage-gate governance for product development. Portfolio-level gate management. Specific gate configuration details behind docs. |
| Broadcom Clarity | 4 | (D) Full stage-gate process management. Enterprise-grade governance workflows. Process-driven gate enforcement established over 20+ years. Multi-level approval chains documented. |
| MS Project Online | 2 | (D) Workflow-based governance via SharePoint/Power Automate. Configurable approval workflows. Not native stage-gate; requires configuration. |

### Dimension 3: Earned Value

| Platform | Score | Evidence |
|----------|-------|----------|
| **Zephix** | 3 | (C) Full EVM: BAC from versioned baselines, AC from period entries, EV = %complete x BAC, CPI = EV/AC, SPI = EV/PV, EAC (CPI-based or AC+remaining), ETC = EAC-AC. Variance analysis with status derivation. Budget baseline approval workflow. Program-level budget rollup. Unit tested. |
| Monday.com | 2 | (D) Blog describes EVM operationalization: PV, EV, AC, CPI, SPI calculation. Connected to project data/budgets/timelines. Unclear if native calculation engine or manual column setup. |
| ClickUp | 0 | (N) No earned value management documented. Time estimates rollup exists but no cost baseline, AC, or CPI/SPI calculation. |
| Linear | 0 | (N) No budget tracking. No cost fields. No EVM of any kind. |
| Planview PPM Pro | 3 | (D) Project financials management documented. Portfolio budget analysis. Enterprise-grade cost tracking. Specific EVM field documentation behind paywall. |
| Broadcom Clarity | 4 | (D) Full EVM documented: EAC, ETC calculations confirmed in Broadcom tech docs. PMBOK-compliant earned value. Decades of enterprise EVM implementation. Baseline management. |
| MS Project Online | 4 | (D) Native EVM fields: BCWP (EV), BCWS (PV), ACWP (AC), CPI, SPI, CV, SV, VAC, TCPI. Fully documented per-field calculations. Industry standard EVM since MS Project 2000. |

### Dimension 4: Resource Conflict Math

| Platform | Score | Evidence |
|----------|-------|----------|
| **Zephix** | 4 | (C) Week-by-week aggregation engine: effectivePercent = (allocation% x availability% x daysInWeek) / 7. Day-by-day fallback check. Policy-driven severity classification (warn/block thresholds). HARD allocations blocked at 100%. Governance validation with hardCap (150%), justification requirements. Daily load tracking entity. Resource heatmap. Conflict integration with gate evaluator. |
| Monday.com | 2 | (D) Workload view shows capacity and allocation. Visual overload indicators. No documented conflict calculation formula or severity classification. |
| ClickUp | 1 | (D) Workload view shows capacity by time estimates. Visual overload detection. No documented conflict math, severity levels, or policy-driven thresholds. |
| Linear | 0 | (N) No resource management. No allocation tracking. No capacity fields. |
| Planview PPM Pro | 3 | (D) What-if scenario planning for resource allocation. Visualize resource constraints. Analyze trade-offs. Documented conflict identification but specific calculation details behind paywall. |
| Broadcom Clarity | 3 | (D) Resource management with timesheet integration. Over-allocation detection. Resource optimization. Enterprise resource planning. Calculation specifics behind enterprise docs. |
| MS Project Online | 3 | (D) Resource constraint analysis in Portfolio Web App. FTE/cost-based modeling. Over-allocation detection built into scheduling engine. Resource leveling algorithm. |

### Dimension 5: Policy Hierarchy

| Platform | Score | Evidence |
|----------|-------|----------|
| **Zephix** | 4 | (C) Dedicated policy engine: definitions (system defaults) + overrides at org/workspace/project. Resolution precedence: project > workspace > org > system default. Consumed by: conflict engine, allocation service, budget service, gate evaluator, schedule enforcement, risk thresholds. 20+ policy keys. Beta tier controls (CORE/GOVERNANCE/FULL). Module enable/disable per workspace. |
| Monday.com | 1 | (D) Account-level admin settings. Board-level permissions. No documented policy cascade or hierarchy. |
| ClickUp | 1 | (D) Space/folder/list permissions. Workspace settings. No documented policy hierarchy or override cascade. |
| Linear | 0 | (N) Organization and team settings. No policy hierarchy. No configurable governance policies. |
| Planview PPM Pro | 2 | (D) Portfolio-level policies. Governance configuration. NPD process policies. No documented cascade/override hierarchy across scope levels. |
| Broadcom Clarity | 3 | (D) Enterprise configuration management. Multi-level administration. Process governance policies. OBS (Organizational Breakdown Structure) for hierarchical control. |
| MS Project Online | 2 | (D) Server-level and project-level settings. Enterprise custom fields with governance. No documented policy cascade. SharePoint-based governance. |

### Dimension 6: Program Rollup

| Platform | Score | Evidence |
|----------|-------|----------|
| **Zephix** | 3 | (C) Program entity (belongs to portfolio). Rollup service aggregates: projects (total/active/at-risk), work items (open/overdue), resource conflicts, risks. Health score rollup (computeHealthV1). Budget rollup: aggregate BAC/AC/EAC/variance/CPI across program. Schedule rollup: horizon dates, milestones, conflict severity. Workspace-scoped. Frontend pages exist. |
| Monday.com | 2 | (D) Portfolio dashboards. Cross-project visibility. Widget-based rollups. No documented formula-driven program health or budget aggregation. |
| ClickUp | 1 | (D) Spaces/Folders hierarchy provides grouping. Dashboard widgets for cross-project views. No documented program entity or structured rollup. |
| Linear | 1 | (A) Initiatives group projects. Progress monitoring across initiatives. No documented health score rollup, budget aggregation, or resource conflict rollup. |
| Planview PPM Pro | 4 | (D) Core competency. Portfolio planning and analysis. Program-level resource optimization. Predictive portfolio analysis. Strategic alignment scoring. Decades of portfolio management. |
| Broadcom Clarity | 4 | (D) Enterprise portfolio management standard. Program/portfolio hierarchy. Strategic alignment. Investment analysis. Full rollup across all dimensions. |
| MS Project Online | 3 | (D) Portfolio analysis with resource optimization. Program grouping. Portfolio dashboards. Resource scenario modeling. |

### Dimension 7: Notification Depth

| Platform | Score | Evidence |
|----------|-------|----------|
| **Zephix** | 2 | (C) In-app + email (SendGrid). 8 notification categories with per-user preferences. Email digest (timezone-aware, daily). Rate limiting. Fail-open design. Gap: no real-time (polling only), Slack/Teams are stubs, no notification templates, no webhook channel. |
| Monday.com | 3 | (D) In-app, email, mobile push, Slack/Teams integrations. Customizable notification preferences. Real-time updates. Automation-triggered notifications. |
| ClickUp | 3 | (D) In-app, email, mobile push, Slack/Teams. Granular notification settings. Real-time updates. Watcher-based notifications. |
| Linear | 2 | (D) In-app, email, Slack integration (bi-directional). Project updates via Slack. No documented webhook or custom notification channels. |
| Planview PPM Pro | 2 | (D) Email notifications. In-app alerts. Dashboard-based visibility. No documented real-time or chat integration specifics. |
| Broadcom Clarity | 2 | (D) Email notifications. Workflow-triggered alerts. Action items. No documented real-time or modern chat integrations. |
| MS Project Online | 2 | (D) Email alerts. SharePoint notifications. Teams integration via Microsoft ecosystem. No documented project-specific notification preferences. |

### Dimension 8: Multi-Tenant Control

| Platform | Score | Evidence |
|----------|-------|----------|
| **Zephix** | 4 | (C) Organization-level isolation via TenantAwareRepository (auto-scopes ALL queries). Workspace membership enforcement with guard. Platform roles (ADMIN/MEMBER/VIEWER). Workspace roles (5 levels). Cross-workspace isolation (404 not 403 for existence hiding). Feature flags. Per-workspace module config. Beta tier controls. Runtime bypass detection in dev/test. |
| Monday.com | 2 | (D) Account-based isolation. Multi-regional architecture (data residency). Board-level permissions. No documented query-level tenant scoping or workspace-within-org hierarchy. |
| ClickUp | 2 | (D) Workspace isolation. Space/folder/list permissions. Role-based access. No documented multi-org tenant control or query-level scoping. |
| Linear | 1 | (D) Organization/team structure. Basic role-based access. No documented tenant isolation patterns or multi-org architecture. |
| Planview PPM Pro | 3 | (D) Enterprise multi-tenant. OBS (Organizational Breakdown Structure). Role-based security. Resource access control. SSO/SAML. |
| Broadcom Clarity | 4 | (D) Full enterprise multi-tenant. OBS-based security partitioning. Row-level security. Complex access right groups. Decades of enterprise isolation. |
| MS Project Online | 3 | (D) SharePoint-based security model. Project Server permissions. Resource access categories. AD/Azure AD integration. Enterprise security inheritance. |

---

## Step 4: Consolidated Scoring Matrix

| Capability | Zephix | Monday | ClickUp | Linear | Planview | Clarity | MS Project |
|------------|--------|--------|---------|--------|----------|---------|------------|
| Risk Governance | **3** | 2 | 2 | 0 | 3 | 3 | 2 |
| Gate Enforcement | **4** | 1 | 2 | 0 | 3 | 4 | 2 |
| Earned Value | **3** | 2 | 0 | 0 | 3 | 4 | 4 |
| Resource Conflict Math | **4** | 2 | 1 | 0 | 3 | 3 | 3 |
| Policy Hierarchy | **4** | 1 | 1 | 0 | 2 | 3 | 2 |
| Program Rollup | **3** | 2 | 1 | 1 | 4 | 4 | 3 |
| Notification Depth | **2** | 3 | 3 | 2 | 2 | 2 | 2 |
| Multi-Tenant Control | **4** | 2 | 2 | 1 | 3 | 4 | 3 |
| **TOTAL (out of 32)** | **27** | **15** | **12** | **4** | **23** | **27** | **21** |

---

## Analysis

### Where Zephix Leads (vs all 6 competitors)

1. **Policy Hierarchy (4)** - Only platform with a dedicated policy engine cascading org > workspace > project, consumed by 6+ services. No mid-market tool has this. Clarity comes closest (3) via OBS but lacks the granular override model.

2. **Resource Conflict Math (4)** - Week-by-week aggregation with availability weighting, day-by-day fallback, policy-driven severity, and integration into gate evaluation. MS Project has leveling but not policy-driven gate integration. No mid-market tool has formal conflict math.

3. **Gate Enforcement (4, tied with Clarity)** - Multi-factor gate evaluation (documents + risks + budget + resource conflicts) with policy-driven enforcement modes. Clarity matches on workflow maturity. No mid-market tool comes close.

4. **Multi-Tenant Control (4, tied with Clarity)** - Auto-scoped queries at repository level. Workspace-within-org hierarchy with role enforcement. Existence hiding (404 vs 403). Clarity matches with OBS-based partitioning.

### Where Zephix Is Competitive (matches enterprise tools)

5. **Risk Governance (3)** - Policy-driven risk level derivation with actual math. Matches Planview and Clarity. Ahead of all mid-market tools.

6. **Earned Value (3)** - Full CPI/SPI/EAC/ETC with versioned baselines. Matches Planview. Behind Clarity (4) and MS Project (4) which have 20+ years of EVM refinement.

7. **Program Rollup (3)** - Real aggregation with health scoring and budget rollup. Behind Planview (4) and Clarity (4) which have deeper portfolio optimization.

### Where Zephix Trails

8. **Notification Depth (2)** - Polling-only, no real-time, Slack/Teams are stubs. Behind Monday (3) and ClickUp (3) which have mature real-time + chat integrations.

### Competitive Position Summary

| Segment | Zephix Position |
|---------|----------------|
| **vs Mid-Market (Monday, ClickUp, Linear)** | Zephix dominates on governance capabilities. 12-23 point gap on the 8 dimensions that matter for regulated/enterprise work. Mid-market tools are stronger on notifications and UX polish. |
| **vs Enterprise PPM (Planview, Clarity, MS Project)** | Zephix matches or leads on 5 of 8 dimensions. Tied with Clarity on total score (27). Behind on program rollup depth and EVM maturity. Ahead on policy hierarchy and resource conflict integration with gates. |

### Honest Gaps to Close

| Gap | Impact | Fix Complexity |
|-----|--------|---------------|
| Real-time notifications | UX parity with mid-market | Medium (WebSocket/SSE infra) |
| Slack/Teams channels | Enterprise table stakes | Low (webhook dispatch) |
| Multi-step approval chains | Enterprise governance depth | Medium (sequential approver entity) |
| Risk portfolio aggregation endpoint | PMO dashboard completeness | Low (query + rollup service) |
| Gantt editing | PM daily workflow | High (drag-to-reschedule + dependency cascade) |
| Policy admin UI | Governance self-service | Low (frontend for existing API) |
| Critical path calculation | Schedule management parity | Medium (algorithm + visualization) |

---

## Methodology Notes

- **Zephix scores** are derived from direct codebase audit at `v0.5.1-rc.1`. Every score references specific files, entities, and services.
- **Competitor scores** are derived from publicly documented features (help centers, product pages, technical documentation, support articles). Where documentation was behind paywalls (Clarity, Planview), scores are based on available public docs and known industry position. Scores may be conservative for these platforms.
- **No score is based on marketing copy alone.** Monday.com blog posts about EVM are scored lower (2) because the native implementation depth is unclear. Clarity's EVM is scored (4) because Broadcom's tech docs confirm specific calculation functions.
- **Linear's zeros are intentional.** Linear is an excellent issue tracker. It is not a PPM tool. Including it surfaces the category difference clearly.

---

## Source References

| Platform | Sources |
|----------|---------|
| Zephix | Codebase audit: entities, services, controllers, frontend components |
| Monday.com | support.monday.com, monday.com/blog, developer.monday.com |
| ClickUp | help.clickup.com, clickup.com/features, clickup.com/p/ |
| Linear | linear.app/docs, linear.app/features, linear.app/enterprise |
| Planview | planview.com/products-solutions/products/ppm-pro/ |
| Broadcom Clarity | techdocs.broadcom.com Clarity PPM 16.x documentation |
| MS Project Online | learn.microsoft.com/projectonline, support.microsoft.com |
