# Phase 2 Review Response

**Date:** 2025-12-18
**Reviewer Questions Answered**

---

## 1. Exact File List Changed

### Step 1: Workspace Module Gating

**Backend (8 files):**
1. `zephix-backend/src/modules/workspaces/entities/workspace-module-config.entity.ts` (NEW)
2. `zephix-backend/src/modules/workspaces/modules/workspace-module-registry.ts` (NEW)
3. `zephix-backend/src/migrations/1769000000001-CreateWorkspaceModuleConfigs.ts` (NEW)
4. `zephix-backend/src/modules/workspaces/services/workspace-module.service.ts` (NEW)
5. `zephix-backend/src/modules/workspaces/decorators/require-workspace-module.decorator.ts` (NEW)
6. `zephix-backend/src/modules/workspaces/guards/require-workspace-module.guard.ts` (NEW)
7. `zephix-backend/src/modules/workspaces/workspace-modules.controller.ts` (NEW)
8. `zephix-backend/src/modules/workspaces/workspace-modules.controller.spec.ts` (NEW)
9. `zephix-backend/src/scripts/smoke-test-workspace-modules.ts` (NEW)
10. `zephix-backend/src/modules/workspaces/workspaces.module.ts` (MODIFIED - added service, controller, guard)

**Frontend (3 files):**
1. `zephix-frontend/src/hooks/useWorkspaceModule.ts` (NEW)
2. `zephix-frontend/src/features/workspaces/components/WorkspaceModuleGuard.tsx` (NEW)
3. `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx` (MODIFIED - simplified empty state)

### Step 2: Integrations Foundation

**Backend (11 files):**
1. `zephix-backend/src/modules/integrations/entities/integration-connection.entity.ts` (NEW)
2. `zephix-backend/src/modules/integrations/entities/external-task.entity.ts` (NEW)
3. `zephix-backend/src/modules/integrations/entities/external-user-mapping.entity.ts` (NEW)
4. `zephix-backend/src/modules/integrations/entities/external-task-event.entity.ts` (NEW)
5. `zephix-backend/src/migrations/1769000000002-CreateIntegrationTables.ts` (NEW)
6. `zephix-backend/src/migrations/1769000000003-AddExternalTaskLoadToResourceDailyLoad.ts` (NEW)
7. `zephix-backend/src/modules/integrations/services/integration-encryption.service.ts` (NEW)
8. `zephix-backend/src/modules/integrations/utils/idempotency.util.ts` (NEW)
9. `zephix-backend/src/modules/integrations/services/jira-client.service.ts` (NEW)

**Total: 22 new files, 2 modified files**

---

## 2. Workspace Module Gating - Detailed Answers

### 2.1 Module Keys Seeded

**Registry Location:** `zephix-backend/src/modules/workspaces/modules/workspace-module-registry.ts`

**Exact Module Keys:**
1. `resource_intelligence` - enabled=true, config={hardCap: 110}
2. `risk_sentinel` - enabled=true, config={sensitivity: 'high'}
3. `portfolio_rollups` - enabled=false, config=null
4. `ai_assistant` - enabled=false, config=null
5. `document_processing` - enabled=false, config=null

### 2.2 Migration Seeding Loop

**File:** `zephix-backend/src/migrations/1769000000001-CreateWorkspaceModuleConfigs.ts:107-115`

```typescript
// Insert for each workspace
for (const workspace of workspaces) {
  for (const module of moduleDefaults) {
    await queryRunner.query(
      `
      INSERT INTO workspace_module_configs (workspace_id, module_key, enabled, config, version)
      VALUES ($1, $2, $3, $4::jsonb, 1)
      ON CONFLICT (workspace_id, module_key) DO NOTHING
    `,
      [workspace.id, module.key, module.enabled, module.config],
    );
  }
}
```

**✅ Confirmed:** Uses `ON CONFLICT (workspace_id, module_key) DO NOTHING` - idempotent, no duplicates on rerun.

### 2.3 API Contract

**GET /api/workspaces/:workspaceId/modules**
- **Response:** `{ data: WorkspaceModuleConfig[] }`
- **Sample:**
```json
{
  "data": [
    {
      "id": "uuid",
      "workspaceId": "workspace-id",
      "moduleKey": "resource_intelligence",
      "enabled": true,
      "config": { "hardCap": 110 },
      "version": 1,
      "createdAt": "2025-12-18T...",
      "updatedAt": "2025-12-18T..."
    }
  ]
}
```

**GET /api/workspaces/:workspaceId/modules/:moduleKey**
- **Response:** `{ data: WorkspaceModuleConfig | null }`
- **Sample (found):**
```json
{
  "data": {
    "id": "uuid",
    "workspaceId": "workspace-id",
    "moduleKey": "resource_intelligence",
    "enabled": true,
    "config": { "hardCap": 110 },
    "version": 1
  }
}
```
- **Sample (not found):** `{ "data": null }`

### 2.4 Guard workspaceId Source

**File:** `zephix-backend/src/modules/workspaces/guards/require-workspace-module.guard.ts:29-31`

```typescript
const request = context.switchToHttp().getRequest();
const workspaceId =
  request.params.workspaceId || request.body.workspaceId;
```

**⚠️ RISK IDENTIFIED:** Guard reads from `request.body.workspaceId` as fallback. This violates security - should only use `request.params.workspaceId`.

**FIX REQUIRED:**
```typescript
const workspaceId = request.params.workspaceId;
if (!workspaceId) {
  throw new BadRequestException('Workspace ID required in path');
}
```

### 2.5 Unknown moduleKey Behavior

**File:** `zephix-backend/src/modules/workspaces/services/workspace-module.service.ts:54-59`

```typescript
const defaults = getModuleDefaults(moduleKey);
if (!defaults) {
  // Unknown module key
  this.logger.warn(`Unknown module key: ${moduleKey}`);
  return null;
}
```

**✅ Confirmed:** Unknown moduleKey returns `null` (not enabled, safe disabled result). Controller returns `{ data: null }` (200 OK).

**Recommendation:** Consider returning 404 for unknown moduleKey to be more explicit.

---

## 3. Frontend Module Gating - Detailed Answers

### 3.1 Module Config Caching

**File:** `zephix-frontend/src/hooks/useWorkspaceModule.ts:16-28`

**React Query Key Structure:**
- Single module: `['workspace-module', workspaceId, moduleKey]`
- All modules: `['workspace-modules', workspaceId]`

**Storage:** React Query cache (in-memory, per workspaceId)

### 3.2 Cache Invalidation on Workspace Switch

**Current Implementation:** Query key includes `workspaceId`, so switching workspaces automatically triggers new queries.

**✅ Confirmed:** No stale cache - React Query refetches when `workspaceId` changes because it's part of the query key.

**Verification:**
```typescript
queryKey: ['workspace-module', workspaceId, moduleKey],
enabled: !!workspaceId && !!moduleKey,
```

When `workspaceId` changes, React Query treats it as a new query and refetches.

### 3.3 Updated WorkspaceHome Empty State

**File:** `zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx:210-246`

**Code:**
```typescript
if (hasNoProjects) {
  return (
    <div className="p-6" data-testid="workspace-home">
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {ws?.name || "Workspace"} is empty
          </h2>
          <p className="text-gray-600">
            Get started by creating your first project.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            onClick={() => setShowProjectModal(true)}
            className="px-6 py-3"
            data-testid="empty-state-new-project"
          >
            Create a project
          </Button>

          {/* Three dots menu for create project */}
          <div className="relative">
            <button
              onClick={() => setShowProjectModal(true)}
              className="p-2 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              data-testid="empty-state-new-project-menu"
              aria-label="Create project menu"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <ProjectCreateModal ... />
    </div>
  );
}
```

**✅ Confirmed:** Only "Create a project" button and three dots menu appear. All placeholders removed.

---

## 4. Integrations Foundation - Detailed Answers

### 4.1 Jira Mock Code Path

**Status:** ⚠️ **MOCK STILL EXISTS**

**Old Mock Location:** `zephix-backend/src/pm/integrations/jira.integration.ts`
- Still registered in `zephix-backend/src/pm/pm.module.ts:108`
- All methods return mock data (see line 24-26: "In a real implementation, you would make actual API calls")

**New Real Client:** `zephix-backend/src/modules/integrations/services/jira-client.service.ts`
- Real API calls using fetch
- Not yet wired into module or used anywhere

**⚠️ RISK:** Old mock path still active. New client not integrated.

**FIX REQUIRED:**
1. Remove or gate old `JiraIntegration` mock
2. Wire `JiraClientService` into `IntegrationsModule`
3. Update any code using `JiraIntegration` to use `JiraClientService`

### 4.2 IntegrationConnection Unique Constraint

**File:** `zephix-backend/src/modules/integrations/entities/integration-connection.entity.ts:14`

```typescript
@Index(['organizationId', 'type', 'baseUrl'], { unique: true })
```

**✅ Confirmed:** Unique constraint includes `baseUrl`. Allows multiple Jira sites per org.

**Migration:** `zephix-backend/src/migrations/1769000000002-CreateIntegrationTables.ts:30-35`
```typescript
new Index('UQ_integration_connections_org_type_url', ['organization_id', 'type', 'base_url'], {
  isUnique: true,
}),
```

**✅ Confirmed:** Migration matches entity index.

### 4.3 Secrets Never Logged

**Current Implementation:** No logger calls found in integration services that log secrets.

**Verification:**
```bash
grep -r "logger.*secret\|log.*secret\|encrypted.*secret" zephix-backend/src/modules/integrations
# Result: No matches
```

**✅ Confirmed:** No secrets logged in integration code.

**Recommendation:** Add explicit redaction in any future logger calls:
```typescript
this.logger.log('Connection created', {
  connectionId: connection.id,
  organizationId: connection.organizationId,
  type: connection.type,
  // DO NOT log: encryptedSecrets, webhookSecret
});
```

### 4.4 Encryption Key Validation

**File:** `zephix-backend/src/modules/integrations/services/integration-encryption.service.ts:12-17`

```typescript
constructor(private configService: ConfigService) {
  const keyString = this.configService.get<string>('INTEGRATION_ENCRYPTION_KEY');
  if (!keyString || keyString.length < 32) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY must be at least 32 characters');
  }
  this.key = Buffer.from(keyString.substring(0, 32), 'utf8');
}
```

**✅ Confirmed:** Startup fails fast if key missing or too short (throws Error in constructor).

**Behavior:**
- **Dev:** App crashes on startup if key missing
- **CI:** Build/test fails if key missing (unless mocked)

**Recommendation:** Add to `env.example` with clear instructions.

### 4.5 Webhook Route

**Status:** ⚠️ **NOT YET IMPLEMENTED**

**Planned Route:** `POST /api/integrations/jira/webhook/:connectionId`

**Controller:** Not yet created. `IntegrationsController` does not exist.

**Required Implementation:**
```typescript
@Post('/jira/webhook/:connectionId')
async handleJiraWebhook(
  @Param('connectionId') connectionId: string,
  @Headers('x-jira-webhook-signature') signature: string,
  @Body() payload: any,
): Promise<{ data: { status: string; connectionId: string } }> {
  // 1. Load connection by ID (not from payload)
  // 2. Verify signature matches connection.webhookSecret
  // 3. Process async
  // 4. Return { data: { status: 'accepted', connectionId } }
}
```

### 4.6 Idempotency Table Usage

**Table:** `external_task_events` exists with unique `idempotency_key` index.

**Utilities:** `idempotency.util.ts` has `generateWebhookIdempotencyKey` and `generatePollingIdempotencyKey`.

**Status:** ⚠️ **NOT YET USED**

**Required:** Upsert flow in `ExternalTaskService` (not yet created) should:
1. Generate idempotency key
2. Check `external_task_events` for existing key
3. If exists, return early (skip processing)
4. If not, insert event record, process, update status

---

## 5. What's Still Missing for Vertical Slice

### Step 2 Remaining Items

1. **ExternalTaskService** (`zephix-backend/src/modules/integrations/services/external-task.service.ts`)
   - Upsert ExternalTask by unique key
   - Resolve assignee_email to resource_id via ExternalUserMapping
   - Emit `external_task.updated` domain event

2. **IntegrationSyncService** (`zephix-backend/src/modules/integrations/services/integration-sync.service.ts`)
   - `syncNow(connectionId)` - manual sync endpoint logic
   - Call JiraClientService.searchIssues
   - Normalize to ExternalTask
   - Call ExternalTaskService.upsert
   - Update connection.lastSyncRunAt and status

3. **JiraPollingService** (`zephix-backend/src/modules/integrations/services/jira-polling.service.ts`)
   - Cron job every 5 minutes
   - Per-org concurrency limits
   - Pagination with safety valves
   - Backoff strategy

4. **IntegrationsController** (`zephix-backend/src/modules/integrations/integrations.controller.ts`)
   - GET /api/integrations (list)
   - POST /api/integrations (create)
   - POST /api/integrations/:id/test (test connection)
   - POST /api/integrations/:id/sync-now (manual sync)
   - POST /api/integrations/jira/webhook/:connectionId (webhook)
   - PATCH /api/integrations/:id/polling (toggle)

5. **ExternalUserMappingsController** (`zephix-backend/src/modules/integrations/external-user-mappings.controller.ts`)
   - POST /api/integrations/external-users/mappings
   - GET /api/integrations/external-users/mappings

6. **IntegrationsModule** (`zephix-backend/src/modules/integrations/integrations.module.ts`)
   - Register all services, controllers, entities
   - Import into AppModule

### Step 3 Plan

**File:** `zephix-backend/src/modules/resources/entities/resource-daily-load.entity.ts`
- Add `externalTaskLoadPercent` column (migration done)

**File:** `zephix-backend/src/modules/resources/services/resource-timeline.service.ts`
- Modify `updateTimeline()` to:
  1. Load ExternalTask entities for resource in date range
  2. Spread external task load across dates (5 days if only dueDate, or date range if both)
  3. Convert hours to percent using resource.capacityHoursPerWeek / 5 (default 8)
  4. Add `externalTaskLoadPercent` to ResourceDailyLoad upsert

**File:** `zephix-backend/src/modules/resources/resource-allocation.service.ts`
- Modify `validateGovernance()` to:
  1. Load ExternalTask entities for resource in date range
  2. Calculate external task load
  3. Include in `projectedTotal` calculation
  4. Update error message to show breakdown

---

## 6. Tests and Gates

### 6.1 Contract Tests

**File:** `zephix-backend/src/modules/workspaces/workspace-modules.controller.spec.ts`

**✅ Exists with assertions:**
- GET returns `{ data: WorkspaceModuleConfig[] }`
- GET single returns `{ data: WorkspaceModuleConfig | null }`
- PATCH returns `{ data: WorkspaceModuleConfig }`
- PATCH throws ForbiddenException for non-admin

### 6.2 Contract-Gate CI Update

**File:** `.github/workflows/ci.yml:63-72`

**Current:**
```yaml
- name: Run all contract tests
  run: |
    npm test -- admin.controller.spec.ts || exit 1
    npm test -- billing.controller.spec.ts || exit 1
    npm test -- templates.controller.spec.ts || exit 1
    npm test -- workspaces.controller.spec.ts || exit 1
    npm test -- projects.controller.spec.ts || exit 1
```

**⚠️ MISSING:** `workspace-modules.controller.spec.ts` not included.

**FIX REQUIRED:**
```yaml
npm test -- workspace-modules.controller.spec.ts || exit 1
```

### 6.3 Smoke Scripts

**Created:**
- ✅ `zephix-backend/src/scripts/smoke-test-workspace-modules.ts`

**Missing:**
- ⏳ `zephix-backend/src/scripts/smoke-test-integrations.ts`

**NPM Scripts:**
**File:** `zephix-backend/package.json`

**Current scripts:**
- `smoke:admin-access`
- `smoke:admin`
- `smoke:templates`
- `smoke:admin-endpoints`

**Missing:**
- ⏳ `smoke:workspace-modules`
- ⏳ `smoke:integrations`

**FIX REQUIRED:**
```json
"smoke:workspace-modules": "ts-node -r tsconfig-paths/register src/scripts/smoke-test-workspace-modules.ts",
"smoke:integrations": "ts-node -r tsconfig-paths/register src/scripts/smoke-test-integrations.ts",
```

---

## Critical Issues Summary

### 🔴 High Priority Fixes

1. **Guard Security Risk:** `RequireWorkspaceModuleGuard` reads from `request.body.workspaceId` - should only use `request.params.workspaceId`
2. **Jira Mock Still Active:** Old `JiraIntegration` mock still registered, new `JiraClientService` not integrated
3. **CI Contract Gate:** Missing `workspace-modules.controller.spec.ts` in CI
4. **NPM Scripts:** Missing smoke script entries in package.json

### 🟡 Medium Priority

1. **Unknown ModuleKey:** Returns `null` (200 OK) - consider 404 for clarity
2. **Webhook Not Implemented:** Controller and route not created
3. **Idempotency Not Used:** Utilities exist but not wired into upsert flow

### 🟢 Low Priority

1. **Secrets Logging:** Add explicit redaction comments for future logger calls
2. **Env Example:** Document `INTEGRATION_ENCRYPTION_KEY` requirement

---

## Next Steps Recommendation

**Before adding more files:**

1. **Fix Guard Security** (5 min)
   - Remove `request.body.workspaceId` fallback
   - Only use `request.params.workspaceId`

2. **Prove Step 1 Works** (15 min)
   - Run contract tests
   - Test new workspace shows only "Create Project"
   - Test module guard blocks disabled modules

3. **Complete Minimal Step 2 Vertical Slice** (2-3 hours)
   - Create `ExternalTaskService` with upsert
   - Create `IntegrationSyncService` with sync-now
   - Create `IntegrationsController` with test and sync-now endpoints
   - Wire into module
   - Add contract tests
   - Test with mocked Jira client

4. **Then Continue** with polling, webhook, Step 3

---

**Status:** Ready for fixes and vertical slice completion.





