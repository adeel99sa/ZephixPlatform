# Engine Reality Report

Generated: 2026-04-24T23:45:00-05:00
Branch: chore/engine-reality-audit
Audit commit: e3bf8c6f277a8452ad682760899bb9ec507e659d
Auditor: Cursor (read-only audit, no code changes)

## Audit Methodology

- Tool usage: Glob for file discovery, rg for content search, ReadFile for file content inspection.
- DB schema verification: skipped - DATABASE_URL unavailable.
- Tests were NOT executed - file existence only.
- Migrations were NOT applied - filename inspection only.
- Maturity scores are estimates from visible artifacts, not runtime proof.

## Summary Table

| Engine | Entities | Services | Endpoints | Frontend Pages | Tests | Migrations | Maturity |
|---|---|---|---|---|---|---|---|
| Work Management | High | High | High | Medium | High | High | 75% |
| Risk Management | Medium | Medium | Medium | Low-Medium | Medium | Medium | 40% |
| Resources/Capacity | High | High | High | Medium | High | High | 62% |
| Governance | High | High | Medium-High | Medium | High | High | 58% |
| AI | Medium | Medium | Low-Medium | Low | Low | Low-Medium | 35% |

Maturity scoring rubric (be honest, not optimistic):
- 0-20%: entity or stub only - no working flows
- 21-40%: backend partial, no UI
- 41-60%: backend complete, UI partial or untested
- 61-80%: backend + UI working, tests partial
- 81-100%: production-ready, tested, used in real flows

## Per-Engine Detail

### 1. Work Management

**Entities found:**
- `zephix-backend/src/modules/work-management/entities/work-task.entity.ts` - `WorkTask` - large task model with schedule, hierarchy, iteration, rank, tags, approval, soft-delete, and project/phase/iteration relations.
- `zephix-backend/src/modules/work-management/entities/work-phase.entity.ts` - `WorkPhase` - phase model with project/program relations and task children.
- `zephix-backend/src/modules/work-management/entities/iteration.entity.ts` - `Iteration` - sprint/iteration model.
- `zephix-backend/src/modules/work-management/entities/task-dependency.entity.ts` - task dependency links.
- `zephix-backend/src/modules/work-management/entities/task-comment.entity.ts` and `task-activity.entity.ts` - comments and activity.
- `zephix-backend/src/modules/work-management/entities/work-risk.entity.ts` and `work-resource-allocation.entity.ts` - work risks and work allocation links.
- `zephix-backend/src/modules/work-management/entities/project-workflow-config.entity.ts` - workflow config.
- `zephix-backend/src/modules/work-management/entities/schedule-baseline*.ts`, `earned-value-snapshot.entity.ts`, `workspace-member-capacity.entity.ts` - waterfall, EV, and capacity support.
- Parallel model: `zephix-backend/src/modules/work-items/entities/*` - separate `work_items` persistence remains live.
- Project views: `zephix-backend/src/modules/projects/entities/project-view.entity.ts` - `ProjectView`.

**Services found:**
- `zephix-backend/src/modules/work-management/services/work-tasks.service.ts` - central task CRUD/list/bulk/status service.
- `work-phases.service.ts`, `work-plan.service.ts`, `project-overview.service.ts`, `project-start.service.ts`, `iterations.service.ts`.
- `task-dependencies.service.ts`, `task-comments.service.ts`, `task-activity.service.ts`.
- `workflow-config.service.ts`, `wip-limits.service.ts`.
- `critical-path-engine.service.ts`, `schedule-reschedule.service.ts`, `baseline.service.ts`, `earned-value.service.ts`.
- `capacity-calendar.service.ts`, `demand-model.service.ts`, `capacity-analytics.service.ts`, `capacity-leveling.service.ts`, `capacity-governance.service.ts`.
- Parallel services under `zephix-backend/src/modules/work-items/`, including `work-item.service.ts`, `my-work.service.ts`, and `work-items-simple.service.ts`.

**Controllers and endpoints exposed:**
- `zephix-backend/src/modules/work-management/controllers/work-tasks.controller.ts` - `/api/work/tasks` - list, stats, create, patch, bulk update, restore, comments, dependencies, activity.
- `work-phases.controller.ts` - `/api/work/phases` - list/create/reorder/update/delete/restore.
- `work-plan.controller.ts` - `/api/work/projects/:projectId/plan`, overview, start, delivery owner.
- `iterations.controller.ts` - `/api/work/projects/:projectId/sprints`, sprint lifecycle, task commit, velocity, metrics.
- `work-risks.controller.ts` - `/api/work/risks` - work-risk CRUD.
- `work-resource-allocations.controller.ts` - `/api/work/resources/allocations` - work allocation CRUD.
- `workflow-config.controller.ts`, `project-schedule.controller.ts`, `schedule-baselines.controller.ts`, `earned-value.controller.ts`, `project-health.controller.ts`, `schedule-integrity.controller.ts`, `project-cost.controller.ts`.
- Gate/capacity controllers under `/api/work/...`.
- Parallel `work-item.controller.ts` - `/api/work-items`.
- `projects-view.controller.ts` - workspace-scoped project views.
- Legacy `projects/:projectId/tasks` controller exists but writes are intentionally blocked by `LegacyTasksGuard` with 410.

**Frontend feature folder:**
- `zephix-frontend/src/features/work-management/` - exists.
- Related UI is spread across `features/projects/`, `features/sprints/`, `features/work-items/`, and `views/work-management/`.

**Frontend components:**
- `zephix-frontend/src/features/work-management/workTasks.api.ts`, `workTasks.stats.api.ts`, `workPhases.api.ts`, `schedule.api.ts`.
- `WorkItemDetailPanel.tsx`, `DefinitionOfDonePanel.tsx`, `CompletionBar.tsx`, `ExecutionEvidencePanel.tsx`.
- `zephix-frontend/src/features/projects/waterfall/WaterfallTable.tsx`, `ProjectTasksTab.tsx`, `ProjectBoardTab.tsx`, `ProjectWorkToolbar.tsx`.
- `zephix-frontend/src/views/work-management/ProjectPlanView.tsx`.
- `zephix-frontend/src/features/sprints/SprintsTab.tsx`, `sprints.api.ts`.

**Tests:**
- Backend specs: about 33 `*.spec.ts` files under `zephix-backend/src/modules/work-management/` plus about 18 work-management E2E files under `zephix-backend/test/`.
- Work-items specs: multiple unit/integration specs under `zephix-backend/src/modules/work-items/`.
- Frontend specs: work-management, plan view, board, sprints, task panel, and smoke files exist.

**Migrations:**
- `1767637754000-Phase5WorkManagementCore.ts`
- `1767752663000-AddWorkPhaseAndPhaseIdToTasks.ts`
- `17980202300000-WorkTasksWorkPhasesSoftDelete.ts`
- `17980202400000-WorkTasksListIndexes.ts`
- `17980202500001-WorkTasksStatsIndexes.ts`
- `17980202500002-AddDeletedByUserIdToWorkTasksAndPhases.ts`
- `17980208000000-CreateTaskCommentsTable.ts`
- `17980209000000-CreateWorkTaskDependenciesTable.ts`
- `17980215000000-AddAcceptanceCriteriaAndDoD.ts`
- `18000000000000-AddEstimationAndIterations.ts`
- `18000000000002-WaterfallCoreScheduleBaselinesEV.ts`
- `18000000000006-WorkTaskBoardRank.ts`
- `18000000000065-AddWaterfallRowFieldsToWorkTasks.ts`
- Work-items lineage includes `CreateWorkItemsTable`, comments/activity/dependencies, and project views.

**DB schema vs Entity:** skipped - DATABASE_URL unavailable.

**Honest assessment:**
- What works end-to-end (based on file presence): canonical work task API, phases, plan/overview, sprints, comments/dependencies, waterfall UI, and substantial test coverage.
- What's wired but untested (no runtime run here): advanced schedule, EV, capacity, gates, and some project views.
- What's stubbed or partial: `work_items` remains a parallel model beside `work_tasks`; `WorkItemsSimpleController` appears unwired; some frontend API paths may be stale.
- What's missing: a fully consolidated single work model and verified runtime proof that every advanced backend capability is surfaced in UX.

**Maturity: 75%** - Strong backend and UI foundation with many tests, reduced by dual persistence (`work_items` vs `work_tasks`) and some stale/unwired client paths.

### 2. Risk Management

**Entities found:**
- `zephix-backend/src/modules/work-management/entities/work-risk.entity.ts` - `WorkRisk` - workspace/org-scoped risk register path.
- `zephix-backend/src/modules/risks/entities/risk.entity.ts` - `Risk` for `risks` table used by detection/rollups.
- `zephix-backend/src/pm/entities/risk.entity.ts` - PM risk model targeting `risks` with a different shape.
- `zephix-backend/src/pm/entities/risk-response.entity.ts`, `risk-monitoring.entity.ts`, `risk-assessment.entity.ts`, `project-risk.entity.ts`.

**Services found:**
- `zephix-backend/src/modules/work-management/services/work-risks.service.ts` - CRUD against `work_risks`, domain events, tenancy checks.
- `zephix-backend/src/modules/risks/risk-detection.service.ts` - cron/rules detecting risk rows.
- `zephix-backend/src/pm/risk-management/risk-management.service.ts` - Claude-based identify/assess/respond/forecast flow.
- `zephix-backend/src/pm/services/status-reporting.service.ts` - risk metrics path appears stubbed with empty list.
- `zephix-backend/src/modules/resources/services/resource-risk-score.service.ts` - resource capacity risk, separate domain.

**Controllers and endpoints exposed:**
- `zephix-backend/src/modules/work-management/controllers/work-risks.controller.ts` - `/api/work/risks` - CRUD.
- `zephix-backend/src/pm/risk-management/risk-management.controller.ts` - `/api/pm/risk-management/...` - analyze, register, status, monitoring.
- `zephix-backend/src/pm/controllers/status-reporting.controller.ts` - project risk reporting, but service appears stubbed.
- No confirmed backend route for frontend `projectsApi.getProjectRisks` at `/projects/:id/risks`.

**Frontend feature folder:**
- `zephix-frontend/src/features/risks/` - exists.
- `zephix-frontend/src/features/projects/tabs/ProjectRisksTab.tsx` - real work-risks tab, gated by feature flags.
- `zephix-frontend/src/components/pm/risk-management/` - PM dashboard/register components.

**Frontend components:**
- `features/risks/risks.api.ts` - calls `/work/risks`.
- `features/risks/api/useRisks.ts` - calls `/risks`, likely stale/wrong path.
- `ProjectRisksTab.tsx` - UI exists but main `App.tsx` project risks route is mapped to `NotEnabledInProject`.
- `features/projects/projects.api.ts` includes `getProjectRisks` calling `/projects/:id/risks`, with no matching backend route found.
- PM components call `/pm/risk-management/...`; at least one forecasting endpoint appears missing server-side.

**Tests:**
- Backend specs/e2e: `work-risks-crud.spec.ts`, `work-risks.e2e-spec.ts`, resource risk tests, portfolio/program KPI rollup tests, PM guard specs.
- Frontend specs/e2e: `ProjectRisksTab.test.tsx`, `tests/smoke/risks.spec.ts`, `e2e/m2.risks.spec.ts` (appears stale against current routing).

**Migrations:**
- `1786000000003-CreateRisksTable.ts`
- `17980203000000-WorkRisksTable.ts`
- `18000000000001-BudgetCostRiskGovernance.ts`
- `1765000000007-AddRiskAndKpiPresetsToTemplates.ts`
- Disabled/manual PM migrations exist for risk responses/monitoring.

**DB schema vs Entity:** skipped - DATABASE_URL unavailable.

**Honest assessment:**
- What works end-to-end (based on file presence): `/work/risks` backend CRUD has strongest evidence.
- What's wired but untested: rollup/detection paths and PM AI analysis paths.
- What's stubbed or partial: PM risk/status reporting, missing forecasting route, disabled/manual PM child-table migrations.
- What's missing: one coherent risk engine; current risk concept is split across `work_risks`, `risks`, and PM risk-management paths.

**Maturity: 40%** - A useful work-risk slice exists, but the broader risk engine is fragmented across three data/API models and several frontend routes are disabled or stale.

### 3. Resources/Capacity

**Entities found:**
- `zephix-backend/src/modules/resources/entities/resource.entity.ts` - `Resource`.
- `resource-allocation.entity.ts` - `resource_allocations`.
- `user-daily-capacity.entity.ts`, `resource-conflict.entity.ts`, `resource-daily-load.entity.ts`, `audit-log.entity.ts`.
- `zephix-backend/src/modules/work-management/entities/work-resource-allocation.entity.ts` - `work_resource_allocations`.
- `zephix-backend/src/modules/work-management/entities/workspace-member-capacity.entity.ts` - `workspace_member_capacity`.
- `zephix-backend/src/modules/analytics/entities/materialized-resource-metrics.entity.ts`.

**Services found:**
- `resources.service.ts`, `resource-allocation.service.ts`, `resource-heat-map.service.ts`, `resource-timeline.service.ts`, `resource-risk-score.service.ts`, `resource-calculation.service.ts`.
- Work capacity services: `capacity-calendar.service.ts`, `demand-model.service.ts`, `capacity-analytics.service.ts`, `capacity-leveling.service.ts`, `capacity-governance.service.ts`.
- `work-resource-allocations.service.ts` backs `/work/resources/allocations`.
- Scenario, dashboards, programs, portfolios, and risks read resource/capacity data.

**Controllers and endpoints exposed:**
- `zephix-backend/src/modules/resources/resources.controller.ts` - `/api/resources` - collection, heat map, conflicts, capacity/resources, skills, risk-score, timeline, task heat map, capacity summary.
- `resource-allocation.controller.ts` - `/api/resource-allocations` - allocation CRUD and resource/project list endpoints.
- `work-resource-allocations.controller.ts` - `/api/work/resources/allocations` - work allocation CRUD.
- `capacity-calendar.controller.ts`, `capacity-analytics.controller.ts`, `capacity-leveling.controller.ts` - `/api/work/workspaces/:workspaceId/capacity...` and require `capacity_engine` entitlement.

**Frontend feature folder:**
- `zephix-frontend/src/features/capacity/` - exists.
- `zephix-frontend/src/features/resources/` - exists.
- `zephix-frontend/src/pages/resources/` and `zephix-frontend/src/components/resources/` - exist.

**Frontend components:**
- `features/capacity/CapacityPage.tsx`, `capacity.api.ts`.
- `features/resources/allocations/allocations.api.ts` and allocation UI.
- `features/projects/tabs/ProjectResourcesTab.tsx` - uses `/work/resources/allocations`.
- `pages/resources/ResourceHeatmapPage.tsx`, `ResourceTimelinePage.tsx`.
- Project route `projects/:projectId/resources` is blocked with `NotEnabledInProject`; project tabs omit resources in MVP visible tab set.

**Tests:**
- Backend specs: resources service/allocation/risk-score plus capacity-calendar, capacity-analytics, capacity-leveling, demand-model, and capacity-controller specs.
- Backend E2E: resources, conflicts, intelligence, risk, timeline/heatmap, seed guard, work-resource-allocations.
- Frontend tests: `capacity-gating.test.tsx`, `ProjectResourcesTab.test.tsx`, `ResourcesPage.test.tsx`, resource modals/heatmap tests and smoke/e2e files.

**Migrations:**
- `1757227595840-CreateResourceManagementSystem.ts`
- `1757227595841-CreateAuditAndIndexes.ts`
- `1766000000001-CreatePhase8AnalyticsTables.ts`
- `1767000000002-CreateResourceDailyLoadTable.ts`
- `1767000000003-AddResourceIntelligenceFields.ts`
- `1767376476696-AddConflictLifecycleFields.ts`
- `1786000000001-CreateResourceConflictsTable.ts`
- `1786000000002-Phase2ResourceSchemaUpdates.ts`
- `17980204000000-WorkResourceAllocationsTable.ts`
- `18000000000003-ResourceCapacityEngine.ts`

**DB schema vs Entity:** skipped - DATABASE_URL unavailable.

**Honest assessment:**
- What works end-to-end (based on file presence): backend resource CRUD/allocation, work allocations, capacity calendar/utilization/leveling APIs, and capacity frontend page.
- What's wired but untested: project resource allocation tab and dashboard/analytics materialization.
- What's stubbed or partial: unified resource model; `materialized_resource_metrics` pipeline appears thin/placeholder.
- What's missing: coherent product integration between classic `resource_allocations` and work/capacity `work_resource_allocations`; project Resources tab is disabled in MVP shell.

**Maturity: 62%** - Backend Phase 2E capacity slice is relatively strong, but product coherence is reduced by parallel allocation models and hidden project resource UX.

### 4. Governance

**Entities found:**
- `zephix-backend/src/modules/governance-rules/entities/governance-rule-set.entity.ts` - scoped rule sets.
- Governance rule, active version, and evaluation entities under `governance-rules`.
- `zephix-backend/src/modules/governance-exceptions/entities/governance-exception.entity.ts`.
- Template and project entities carry governance fields/source data.
- Phase gate entities under `work-management` support a parallel gate workflow.

**Services found:**
- `GovernanceRuleEngineService` - evaluate, task status, change-request status, phase-gate transition method.
- `GovernanceRuleResolverService` - precedence merge and cache.
- `GovernanceRulesAdminService` - admin rule/rule-set operations.
- `GovernanceTemplateService` - policy catalog and template governance toggles.
- `GovernanceExceptionsService` - exception queue and resolution.
- Related but separate services: `BudgetGovernanceService`, `CapacityGovernanceService`, resource allocation governance checks, gate approval services.

**Controllers and endpoints exposed:**
- `governance-rules.controller.ts` - `/api/admin/governance-rules` - catalog, rule sets, rules, evaluations.
- `governance-exceptions.controller.ts` - `/api/admin/governance` - health, exceptions, pending decisions, recent activity, approvals, create/approve/reject/request-info.
- `templates.controller.ts` - template governance GET/PATCH endpoints.

**Frontend feature folder:**
- Governance UI lives primarily under `zephix-frontend/src/features/administration/`.
- Related template and work evidence UI lives under templates/projects/work-management.

**Frontend components:**
- `AdministrationGovernancePage.tsx` - catalog, buckets, policy UI.
- `GovernanceManageScopeModal.tsx`.
- `administration.api.ts` - admin governance and governance-rules calls.
- `governance-policies.ts` and tests.
- `TemplateDetailPanel.tsx`, `AdministrationTemplatesPage.tsx` - template governance.
- `ExecutionEvidencePanel.tsx` and project shell hints.
- `policies/policies.api.ts` appears separate from governance-rules engine.

**Tests:**
- Backend: governance-rule engine/resolver/cache/snapshot/default seeds/route registration, governance-exceptions, migrations, task update governance, project governance inheritance and DTO tests.
- Frontend: governance policies constants, admin pages, template detail panel, template governance smoke/e2e.

**Migrations:**
- `17980255000000-CreateGovernanceRulesTables.ts`
- `17980253000000-AddPortfolioGovernanceFlags.ts`
- `17980254000000-AddProjectGovernanceSource.ts`
- `17980256000000-HardenGovernanceEvaluationsIndexes.ts`
- `18000000000058-AddGovernanceEvaluateAuditAction.ts`
- `18000000000059-CreateGovernanceExceptions.ts`
- `18000000000067-SeedGovernancePolicyCatalog.ts`
- `18000000000068-StabilizeGovernanceCatalogRuleDefinitions.ts`
- `18000000000069-EnforceableScopeChangeAndTaskSignoffCatalog.ts`
- `18000000000070-RemovePmbokGovernanceRuleSetDescriptions.ts`
- `18000000000071-GovernanceCatalogNinePolicies.ts`

**DB schema vs Entity:** skipped - DATABASE_URL unavailable.

**Honest assessment:**
- What works end-to-end (based on file presence): task-level governance evaluation, rule resolver/engine, admin catalog APIs, template governance toggles, exception lifecycle.
- What's wired but untested: change-request approval governance backend, admin health/decision UI.
- What's stubbed or partial: activity/recent and approvals endpoints return empty arrays; health metrics are simplified; pending decisions use placeholder workspace name.
- What's missing: phase-gate transitions are defined in rule engine but not called in live phase/gate flows; not all catalog policies are uniformly enforced through the rule engine.

**Maturity: 58%** - Strong backend rule engine and admin plane exist, but several advertised governance surfaces are partial, parallel, or not wired into runtime flows.

### 5. AI

**Entities found:**
- `zephix-backend/src/ai/entities/ai-analysis.entity.ts` - `ai_analyses`, but no clear migration found for that exact table.
- RAG tables in migration `1766000000002-CreateSignalsAndRagTables.ts`.
- BRD analysis/generated plan tables in BRD/PM migration trees.
- Workspace module configs seed `ai_assistant` and `document_processing`.

**Services found:**
- `zephix-backend/src/ai/llm-provider.service.ts` - Anthropic HTTP client and compliance checks.
- `zephix-backend/src/ai/claude.service.ts` - wrapper for LLM provider.
- `embedding.service.ts`, `vector-database.service.ts`, `document-parser.service.ts`.
- `ai-mapping.service.ts`, `ai-suggestions.service.ts`, `ai-analysis.service.ts`, `ai-analysis.repository.ts`.
- PM/intelligence services: `zephix-ai-intelligence.service.ts`, `document-intelligence.service.ts`.
- Duplicate/scaffolded module under `zephix-backend/src/modules/ai/` with policy matrix, context builder, action registry, and `ai-assistant.service.ts`.

**Controllers and endpoints exposed:**
- Wired via backend app: `ai/mapping`, `ai/suggestions`, document upload, project generation, and `ai/dashboards` routes.
- `ai/dashboards/suggest` and `generate` appear deterministic/rules-based, not LLM-backed.
- PM `ai-intelligence`, `ai-pm-assistant`, `ai-chat`, and intelligence controllers exist but appear not mounted through `AppModule`.
- Frontend calls `/ai/assist`, but no matching backend route was found.
- Frontend admin AI calls `/admin/ai/*`, but matching backend routes were not found.

**Frontend feature folder:**
- `zephix-frontend/src/features/ai-assistant/` - exists.
- `zephix-frontend/src/pages/ai/` and `pages/intelligence/` exist.
- Dashboard AI/coplilot UI exists under dashboards.

**Frontend components:**
- `features/ai-assistant/AiSuggestionsPanel.tsx`, `aiAssistant.api.ts` - `/ai/assist`, appears orphaned/missing backend.
- `features/projects/tabs/ProjectAiTab.tsx`, `ProjectAiPanel.tsx`.
- `features/dashboards/AICopilotPanel.tsx`, dashboard builder API calls to `ai/dashboards`.
- `components/intelligence/DocumentIntelligence.tsx`, `DocumentIntelligencePage.tsx`.
- Current `App.tsx` does not expose `/ai/*` or `/intelligence` routes; backup route files reference them.

**Tests:**
- Backend: `llm-provider.service.spec.ts`; document upload e2e minimal; BRD e2e imports BRD module but BRD is not confirmed mounted in production app; resource intelligence e2e is not generative AI.
- Suspicious dashboard workflow spec imports non-existent `modules/ai/services/*` paths.
- Frontend: little/no focused AI feature tests found.

**Migrations:**
- `1766000000002-CreateSignalsAndRagTables.ts`
- `1769000000001-CreateWorkspaceModuleConfigs.ts`
- BRD migrations under BRD/PM migration paths.
- No clear `ai_analyses` migration found.

**DB schema vs Entity:** skipped - DATABASE_URL unavailable.

**Honest assessment:**
- What works end-to-end (based on file presence): shared LLM provider if env keys are configured; dashboard AI routes as deterministic helpers; some guarded AI mapping/upload routes.
- What's wired but untested: AI mapping/analyze pipeline and document upload generation path.
- What's stubbed or partial: suggestions list returns empty; dashboard AI is not LLM; intelligence/PM AI modules appear unmounted.
- What's missing: `/ai/assist` backend route, `/admin/ai/*` backend API, role-scoped AI request pipeline, many frontend routes are not mounted in current app.

**Maturity: 35%** - Useful AI infrastructure exists, but product-level AI is fragmented, partially unmounted, and missing key frontend/backend contracts.

## Cross-Engine Dependencies

Discovered by static searches for imports and endpoint use:

- Work Management depends on Projects, Templates, Governance, Dashboards, KPIs, Resources/Capacity, and Workspaces. Template instantiation creates work phases/tasks and uses project structure guards.
- Risk reads from Work Management (`work_risks`) and also feeds KPI/program/portfolio/dashboard rollups through a separate `risks` table.
- Resources/Capacity depends on Work Management task demand, project capacity flags, resource allocation tables, entitlements, dashboards, scenarios, programs, portfolios, and risk detection.
- Governance evaluates Work Management task transitions and Change Request approvals, reads template/project governance settings, writes audit events, and runs partly in parallel with budget/resource/capacity governance services.
- AI depends on shared LLM/Claude provider, dashboards, document/BRD code, resource intelligence, and workspace module configs; role-scoped AI policy scaffolding is not clearly wired into request paths.

## Identified Risks for Sequencing

1. **Engines claimed in Knowledge Transfer doc that don't exist in code:**
   - Not verified in this audit because Knowledge Transfer/Master Status content was not used as source of truth; however, AI product claims and Risk engine claims should be treated skeptically until reconciled against this report.

2. **Engines that exist but aren't documented:**
   - Parallel `work_items` vs `work_tasks` models.
   - Parallel risk models: `work_risks`, `risks`, and PM risk-management.
   - Parallel resource models: `resource_allocations` and `work_resource_allocations`.
   - Multiple AI surfaces: `src/ai`, `src/modules/ai`, PM AI, dashboards AI, frontend AI assistant.

3. **Tests that exist but were not run during audit:**
   - Work Management has many unit/e2e specs.
   - Risk has work-risk CRUD/e2e plus stale-looking frontend/e2e risk tests.
   - Resources/Capacity has service, controller, e2e, and frontend gating tests.
   - Governance has engine/resolver/migration/admin/template tests.
   - AI has limited targeted tests; some imports appear suspicious.

4. **Migrations that exist but application status unknown:**
   - All migration application status is unknown because DB verification was skipped.
   - Duplicate/out-of-main migration trees exist for PM/BRD/risk and root `src/migrations`.
   - AI `ai_analyses` entity has no clear matching migration in inspected paths.

5. **First paying customer requirements (EPIC):** UNVERIFIED. No evidence in project knowledge or chat history that EPIC's specific requirements have been documented or confirmed. Sequencing without confirmed customer needs is a forecasting risk.

## Honest Per-Engine Recommendations

- **Work Management:** Strongest foundation. Ready to ship MVP after consolidation work around `work_items` vs `work_tasks`, stale client paths, and a focused runtime smoke of the main project/task flows.
- **Risk Management:** Not ready as one coherent engine. A work-risk CRUD slice can be shaped into MVP, but PM AI risk, dashboard risk, and `risks` rollup paths should be reconciled or explicitly scoped out.
- **Resources/Capacity:** Backend capacity and allocation artifacts are strong enough for an MVP slice, but product coherence needs work because classic resources and work-capacity allocations are parallel and the project Resources tab is currently hidden.
- **Governance:** Strong control-plane foundation with real task/template/admin/exception pieces. Needs phase-gate wiring, stub cleanup, and clearer distinction between rule-engine governance vs budget/resource/capacity governance before claiming full engine maturity.
- **AI:** Infrastructure exists, but product contracts are partial. Treat AI as advisory and cross-cutting, not as an engine-ready MVP pillar, until `/ai/assist`, admin AI APIs, role/workspace scoping, and mounted routes are verified or deliberately cut.

DO NOT recommend a sequence. DO NOT prioritize. The user will sequence after reading this report.

## Audit Limitations

- Audit is based on file presence and content inspection, not runtime behavior.
- "Wired" does not mean "working." Endpoints exist; whether they return correct data was not tested.
- Maturity scores are estimates based on visible artifacts. Real maturity requires user testing.
- DB schema verification: skipped - DATABASE_URL unavailable.
- Test execution: NOT performed. Test count reflects file presence only.
