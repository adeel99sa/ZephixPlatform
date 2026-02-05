# Phase 2 Wedge Plan - Integrations + ExternalTask + Workspace Module Gating

**Date:** 2025-12-18
**Branch:** `release/v0.5.0-alpha`
**Commit SHA:** `76e9eb1b163de87cb10a9c76a3566b55573a1172`

---

## Evidence Findings

### Existing Code State

1. **JiraIntegration Class**
   - **Location:** `zephix-backend/src/pm/integrations/jira.integration.ts`
   - **Status:** Mock-only implementation (all methods return mock data)
   - **Methods:** `collectProjectData`, `getProjectIssues`, `getSprintData`, `getVelocityMetrics`
   - **Action:** Replace with real Jira API client wrapper

2. **ResourceTimelineService**
   - **Location:** `zephix-backend/src/modules/resources/services/resource-timeline.service.ts`
   - **Status:** ✅ Exists, updates `ResourceDailyLoad` on allocation changes
   - **Current Logic:** Only includes `ResourceAllocation` loads
   - **Action:** Extend to include `ExternalTask` loads

3. **ResourceDailyLoad Entity**
   - **Location:** `zephix-backend/src/modules/resources/entities/resource-daily-load.entity.ts`
   - **Status:** ✅ Exists with `hardLoadPercent`, `softLoadPercent`
   - **Missing:** `externalTaskLoadPercent` column
   - **Action:** Add migration for new column

4. **ResourceAllocationService.validateGovernance**
   - **Location:** `zephix-backend/src/modules/resources/resource-allocation.service.ts:450-546`
   - **Status:** ✅ Exists, validates hard cap and justification
   - **Current Logic:** Only includes allocation loads
   - **Action:** Include external task loads in projected total

5. **No Existing Integration Tables**
   - **Grep Results:** No matches for `IntegrationConnection`, `external_tasks`, `external_user_mappings`, `external_task_events`, `workspace_module_configs`
   - **Action:** Create all tables from scratch

---

## Decisions Taken

### 1. Workspace Module Gating
- **Decision:** New table `workspace_module_configs` (not extending `permissionsConfig`)
- **Rationale:** Better separation, supports versioning, easier queries
- **Default Modules:**
  - `resource_intelligence`: enabled=true, config={hardCap: 110}
  - `risk_sentinel`: enabled=true, config={sensitivity: 'high'}
  - `portfolio_rollups`: enabled=false
  - `ai_assistant`: enabled=false
  - `document_processing`: enabled=false

### 2. Integration Architecture
- **Decision:** Polling first, webhook later (simpler, no OAuth required)
- **Jira JQL Format:** `updated >= "yyyy-MM-dd HH:mm" ORDER BY updated ASC`
- **Idempotency:** Canonical JSON sorting + deterministic key generation
- **Secrets:** AES-256-GCM encryption with environment key

### 3. External Task Load Calculation
- **Default Daily Capacity:** 8 hours (from `capacityHoursPerWeek / 5` or default 8)
- **Date Spreading:**
  - If `startDate` and `dueDate`: spread evenly across inclusive range
  - If only `dueDate`: spread across 5 days ending on dueDate
  - If no dates: contribute 0
- **Cap:** 200% max load percent

### 4. Combined Load Model
- **Decision:** Option A - TimelineService merges allocations + external tasks
- **Rationale:** Single source of truth, matches existing pattern
- **Storage:** Add `externalTaskLoadPercent` to `ResourceDailyLoad`

---

## Exact Files to Create or Modify

### Backend - New Files

1. **Entities:**
   - `zephix-backend/src/modules/workspaces/entities/workspace-module-config.entity.ts`
   - `zephix-backend/src/modules/integrations/entities/integration-connection.entity.ts`
   - `zephix-backend/src/modules/integrations/entities/external-task.entity.ts`
   - `zephix-backend/src/modules/integrations/entities/external-user-mapping.entity.ts`
   - `zephix-backend/src/modules/integrations/entities/external-task-event.entity.ts`

2. **Migrations:**
   - `zephix-backend/src/migrations/1769000000001-CreateWorkspaceModuleConfigs.ts`
   - `zephix-backend/src/migrations/1769000000002-CreateIntegrationTables.ts`
   - `zephix-backend/src/migrations/1769000000003-AddExternalTaskLoadToResourceDailyLoad.ts`

3. **Services:**
   - `zephix-backend/src/modules/workspaces/services/workspace-module.service.ts`
   - `zephix-backend/src/modules/integrations/services/integration-encryption.service.ts`
   - `zephix-backend/src/modules/integrations/services/jira-client.service.ts`
   - `zephix-backend/src/modules/integrations/services/jira-polling.service.ts`
   - `zephix-backend/src/modules/integrations/services/integration-sync.service.ts`
   - `zephix-backend/src/modules/integrations/services/external-task.service.ts`
   - `zephix-backend/src/modules/integrations/utils/idempotency.util.ts`

4. **Controllers:**
   - `zephix-backend/src/modules/workspaces/workspace-modules.controller.ts`
   - `zephix-backend/src/modules/integrations/integrations.controller.ts`
   - `zephix-backend/src/modules/integrations/external-user-mappings.controller.ts`

5. **Guards:**
   - `zephix-backend/src/modules/workspaces/guards/require-workspace-module.guard.ts`
   - `zephix-backend/src/modules/workspaces/decorators/require-workspace-module.decorator.ts`

6. **Tests:**
   - `zephix-backend/src/modules/workspaces/workspace-modules.controller.spec.ts`
   - `zephix-backend/src/modules/integrations/integrations.controller.spec.ts`
   - `zephix-backend/src/modules/integrations/external-user-mappings.controller.spec.ts`
   - `zephix-backend/src/scripts/smoke-test-workspace-modules.ts`
   - `zephix-backend/src/scripts/smoke-test-integrations.ts`

### Backend - Modified Files

1. `zephix-backend/src/modules/resources/entities/resource-daily-load.entity.ts` - Add `externalTaskLoadPercent`
2. `zephix-backend/src/modules/resources/services/resource-timeline.service.ts` - Include external tasks
3. `zephix-backend/src/modules/resources/resource-allocation.service.ts` - Include external tasks in governance
4. `zephix-backend/src/modules/resources/resource.module.ts` - Add ExternalTask repository
5. `zephix-backend/src/modules/integrations/integrations.module.ts` - New module
6. `zephix-backend/src/app.module.ts` - Import IntegrationsModule
7. `.github/workflows/ci.yml` - Add new contract tests to gate

### Frontend - New Files

1. `zephix-frontend/src/hooks/useWorkspaceModule.ts` - Hook with unwrapData
2. `zephix-frontend/src/features/integrations/api.ts` - API client functions
3. `zephix-frontend/src/features/integrations/components/WorkspaceModuleGuard.tsx` - Route guard
4. `zephix-frontend/tests/integrations-smoke.spec.ts` - Playwright E2E

### Frontend - Modified Files

1. `zephix-frontend/src/pages/workspaces/WorkspaceHomePage.tsx` - Remove placeholders, gate modules
2. `zephix-frontend/src/pages/resources/ResourceHeatmapPage.tsx` - Show external task breakdown

---

## Test Plan

### Backend Contract Tests

1. **workspace-modules.controller.spec.ts**
   - GET /api/workspaces/:id/modules returns { data: [...] }
   - GET /api/workspaces/:id/modules/:key returns { data: {...} }
   - PATCH /api/workspaces/:id/modules/:key admin only
   - Empty workspace returns default modules
   - Disabled module returns 403

2. **integrations.controller.spec.ts**
   - GET /api/integrations returns { data: [...] }
   - POST /api/integrations returns { data: {...} }
   - POST /api/integrations/:id/sync-now returns { data: {status, issuesProcessed} }
   - POST /api/integrations/jira/webhook/:connectionId returns { data: {status, connectionId} }
   - Invalid signature returns 401

3. **external-user-mappings.controller.spec.ts**
   - POST /api/integrations/external-users/mappings returns { data: {...} }
   - GET /api/integrations/external-users/mappings returns { data: [...] }

### Smoke Scripts

1. **smoke-test-workspace-modules.ts**
   - List modules for workspace
   - Get single module
   - Verify default enabled/disabled

2. **smoke-test-integrations.ts**
   - List integrations
   - Test connection
   - Manual sync (if enabled)

### Frontend E2E

1. **integrations-smoke.spec.ts**
   - Admin login
   - Create integration connection (mocked Jira)
   - Add user mapping
   - Trigger sync-now
   - Verify external task in heatmap

---

## Implementation Order

1. ✅ Step 0: Evidence collection (DONE)
2. ⏳ Step 1: Workspace module gating
3. ⏳ Step 2: Integrations foundation
4. ⏳ Step 3: Merge external demand
5. ⏳ Step 4: Tests and CI
6. ⏳ Step 5: Documentation

---

## Risks and Mitigations

1. **Risk:** Migration conflicts with existing data
   - **Mitigation:** Use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`

2. **Risk:** Jira API rate limits
   - **Mitigation:** Per-org concurrency limits, backoff strategy, max pages

3. **Risk:** External task load calculation errors
   - **Mitigation:** Unit tests for all date spreading scenarios, cap at 200%

4. **Risk:** Secrets leakage in logs
   - **Mitigation:** Never log encrypted secrets, redact in all log statements

---

**Plan Status:** Ready for Implementation





