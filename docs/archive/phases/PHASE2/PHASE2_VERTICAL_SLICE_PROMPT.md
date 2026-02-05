# Phase 2 Vertical Slice Completion Prompt

**Copy and paste this entire document into Cursor as a single prompt.**

---

You are working on Zephix Phase 2. Do not add new features. Do not add new tables beyond what is listed below. Focus on completing the vertical slice and proving it with tests. Output your answer as a short plan plus a file by file change list with exact paths.

## Context and Constraints

### Repo and Version
- **Branch:** `release/v0.5.0-alpha`
- **Commit:** `76e9eb1b163de87cb10a9c76a3566b55573a1172`
- **Backend root:** `zephix-backend`
- **Frontend root:** `zephix-frontend`
- **Reference existing patterns only, no new architecture.**

### Current State
- **Step 1 complete.** Guard security fix applied. Guard must read workspaceId only from `request.params.workspaceId`.
- **Step 2 is 40 percent.** Jira mock still active. JiraClientService exists but is not wired.
- **Webhook route not implemented.** Idempotency not wired.

### Auth and Tenancy
- **All endpoints must use JwtAuthGuard.**
- **All queries must scope by `req.user.organizationId`.**
- **Never accept organizationId from request body, query, or webhook payload.**

### Response Contract
- All API responses must return `{ data: ... }` using `formatResponse` or `formatArrayResponse`.

### Scope
- **Phase 2 vertical slice only.** Manual sync-now first. Polling and webhook after the slice passes tests.

---

## Vertical Slice Definition of Done

### 1. Backend Endpoints
- `POST /api/integrations` creates IntegrationConnection for org (scoped to `req.user.organizationId`), encrypts apiToken, returns `{ data }` (no secrets in response).
- `GET /api/integrations` lists IntegrationConnection for org (scoped to `req.user.organizationId`), returns `{ data }` (no secrets in response).
- `POST /api/integrations/:id/test` validates credentials without syncing, returns `{ data: { connected, message } }`.
- `POST /api/integrations/:id/sync-now` runs a single sync using JiraClientService.searchIssues, stores ExternalTask, returns `{ data: { status, issuesProcessed } }`.
- `POST` and `GET` external user mappings endpoints working and tested (all scoped to `req.user.organizationId`).
- **All endpoints require JwtAuthGuard.**
- **All endpoints scope by `req.user.organizationId`, never from body/query.**

### 2. Data
- ExternalTask upsert works with unique constraint `(organizationId, externalSystem, externalId)`.
- ExternalTaskService resolves `assigneeEmail` to `resourceId` via ExternalUserMapping when present.
- Idempotency enforced for sync-now using `external_task_events`. Duplicate processing must no-op.

### 3. Wiring
- IntegrationsModule exists and is imported into AppModule.
- JiraClientService replaces mock path for sync-now. No production code path uses the old JiraIntegration mock for Phase 2.

### 4. Tests
- Contract tests added for all new endpoints and included in CI contract gate.
- Smoke scripts exist and npm scripts are added.

### 5. No Step 3 Work
- Do not touch TimelineService or ResourceDailyLoad merging yet.

---

## Questions to Answer with Evidence

### A. JiraIntegration Mock Registration

**Question:** Show exactly where JiraIntegration mock is currently registered. Provide file path and the provider registration line. Provide the plan to remove or isolate it so Phase 2 uses JiraClientService.

**Evidence:**
- File: `zephix-backend/src/pm/pm.module.ts:108`
- Registration: `JiraIntegration,` in providers array
- Plan: Remove from pm.module.ts providers OR gate behind feature flag. Phase 2 IntegrationsModule will use JiraClientService instead.

**Explicit Rule:**
- `IntegrationSyncService.syncNow()` **must** call `JiraClientService.searchIssues()`.
- **No code path should call `pm/integrations/jira.integration.ts` for Phase 2.**
- All sync operations must use the real JiraClientService, not the mock.

### B. IntegrationsModule Contents

**Question:** Provide the exact IntegrationsModule contents you will create, including imports, providers, controllers, exports.

**Required Structure:**
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegrationConnection,
      ExternalTask,
      ExternalUserMapping,
      ExternalTaskEvent,
    ]),
    ConfigModule,
  ],
  providers: [
    IntegrationEncryptionService,
    JiraClientService,
    ExternalTaskService,
    IntegrationSyncService,
  ],
  controllers: [
    IntegrationsController,
    ExternalUserMappingsController,
  ],
  exports: [
    IntegrationSyncService,
    ExternalTaskService,
  ],
})
export class IntegrationsModule {}
```

### C. DTOs with Validation

**Question:** Provide the DTOs for create connection, test, sync-now, and user mapping. Include validation decorators used in this codebase.

**Reference Pattern:** See `zephix-backend/src/modules/workspaces/dto/create-workspace.dto.ts`

**Required DTOs:**

1. **`CreateIntegrationConnectionDto`** - Accepts plain secrets, service encrypts before save:
   - `type: 'jira'` (required, enum, only 'jira' for vertical slice)
   - `baseUrl: string` (required, @IsUrl())
   - `apiToken: string` (required, @IsString(), @IsNotEmpty())
   - `webhookSecret?: string` (optional, @IsString(), @IsOptional())
   - `projectMappings?: Array<{externalProjectKey: string, zephixProjectId?: string}>` (optional)
   - `jqlFilter?: string` (optional)
   - `pollingEnabled?: boolean` (optional, default false)
   - `enabled?: boolean` (optional, default true)
   - **Service must encrypt `apiToken` and `webhookSecret` before saving.**
   - **Response must never return secrets.**

2. **`TestConnectionDto`** - (empty, uses connection ID from path)

3. **`SyncNowDto`** - (empty, uses connection ID from path)

4. **`CreateExternalUserMappingDto`** - externalSystem, externalEmail, externalUserId, resourceId

**Validation Decorators to Use:**
- `@IsString()`, `@IsOptional()`, `@IsEmail()`, `@IsUrl()`, `@IsBoolean()`, `@IsEnum()`
- `@IsNotEmpty()` for required fields

### D. ExternalTask Upsert Flow with Idempotency

**Question:** Describe the ExternalTask upsert flow including idempotency check. Include the idempotency key algorithm used for polling and for webhook. For sync-now use polling key.

**Flow:**
1. For each issue from JiraClientService.searchIssues:
   - Generate idempotency key using `generatePollingIdempotencyKey(connectionId, issue)`
   - Try to insert event record into `external_task_events` with status 'processed'
   - **If insert fails due to unique constraint on idempotency_key, treat as already processed and skip this issue (no-op, continue to next issue)**
   - If insert succeeds, continue processing:
     - Resolve assigneeEmail to resourceId via ExternalUserMapping
     - Upsert ExternalTask by unique key `(organizationId, externalSystem, externalId)`
     - Emit domain event `external_task.updated`
2. **Idempotency must be per issue event. Duplicate idempotency key insert failures must not throw errors.**

**Idempotency Key Algorithm:**
- Polling: `jira:poll:${connectionId}:${issue.id}:${issue.updated}`
- Webhook: `jira:webhook:${connectionId}:${payload.webhookEvent}:${payload.issue.id}:${payload.timestamp}`

**File:** `zephix-backend/src/modules/integrations/utils/idempotency.util.ts` (already exists)

### E. Unknown ModuleKey Behavior

**Question:** Decide and implement unknown moduleKey behavior. Return 404 and update the contract tests. Do not return 200 null.

**Current Behavior:** Returns `null` (200 OK) - **CHANGE TO 404**

**Fix Required:**
- `WorkspaceModuleService.getModule()` - throw `NotFoundException` if `getModuleDefaults()` returns null
- `WorkspaceModulesController.getModule()` - handle NotFoundException, return 404
- Update contract test to expect 404 for unknown moduleKey

### F. CI Contract Gate Update

**Question:** Update .github workflow contract gate to include workspace-modules controller spec and new integrations specs. Provide exact yaml diff.

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

**Required Addition:**
```yaml
    npm test -- workspace-modules.controller.spec.ts || exit 1
    npm test -- integrations.controller.spec.ts || exit 1
    npm test -- external-user-mappings.controller.spec.ts || exit 1
```

### G. NPM Scripts Addition

**Question:** Add npm scripts `smoke:workspace-modules` and `smoke:integrations`. Provide exact package.json diff.

**File:** `zephix-backend/package.json:8-50`

**Current scripts include:**
- `smoke:admin-access`
- `smoke:admin`
- `smoke:templates`
- `smoke:admin-endpoints`

**Required Addition:**
```json
"smoke:workspace-modules": "ts-node -r tsconfig-paths/register src/scripts/smoke-test-workspace-modules.ts",
"smoke:integrations": "ts-node -r tsconfig-paths/register src/scripts/smoke-test-integrations.ts",
```

---

## Output Requirements

### First Section: Short Ordered Plan

Provide an ordered list of the next 8 changes, each with expected test to run after it:

1. **Fix unknown moduleKey behavior** → Test: `npm test -- workspace-modules.controller.spec.ts` (expect 404)
2. **Create ExternalTaskService with upsert** → Test: Unit test for upsert with idempotency
3. **Create IntegrationSyncService with sync-now** → Test: Unit test for sync-now flow
4. **Create DTOs** → Test: TypeScript compilation
5. **Create IntegrationsController** → Test: `npm test -- integrations.controller.spec.ts`
6. **Create ExternalUserMappingsController** → Test: `npm test -- external-user-mappings.controller.spec.ts`
7. **Create IntegrationsModule and wire** → Test: App starts without errors
8. **Update CI and npm scripts** → Test: `npm run smoke:workspace-modules` and `npm run smoke:integrations`

### Second Section: File by File Diff List

For each file, include what you will change and why, one line each:

**Example Format:**
- `zephix-backend/src/modules/workspaces/services/workspace-module.service.ts` - Throw NotFoundException for unknown moduleKey instead of returning null
- `zephix-backend/src/modules/workspaces/workspace-modules.controller.spec.ts` - Update test to expect 404 for unknown moduleKey
- `zephix-backend/src/modules/integrations/services/external-task.service.ts` (NEW) - Upsert ExternalTask with idempotency check
- `zephix-backend/src/modules/integrations/services/integration-sync.service.ts` (NEW) - Sync-now logic using JiraClientService
- `zephix-backend/src/modules/integrations/dto/create-integration-connection.dto.ts` (NEW) - DTO with validation
- `zephix-backend/src/modules/integrations/integrations.controller.ts` (NEW) - All integration endpoints
- `zephix-backend/src/modules/integrations/external-user-mappings.controller.ts` (NEW) - User mapping endpoints
- `zephix-backend/src/modules/integrations/integrations.module.ts` (NEW) - Module wiring
- `zephix-backend/src/app.module.ts` - Import IntegrationsModule
- `zephix-backend/src/pm/pm.module.ts` - Remove or gate JiraIntegration mock
- `.github/workflows/ci.yml` - Add new contract test specs
- `zephix-backend/package.json` - Add smoke scripts
- `zephix-backend/src/scripts/smoke-test-integrations.ts` (NEW) - Smoke test script

### Third Section: Verification Commands

Provide the exact commands to run locally to verify:

```bash
# 1. Run migrations
cd zephix-backend && npm run migration:run

# 2. Type check
npm run typecheck:tests

# 3. Contract tests
npm test -- workspace-modules.controller.spec.ts
npm test -- integrations.controller.spec.ts
npm test -- external-user-mappings.controller.spec.ts

# 4. Smoke scripts
npm run smoke:workspace-modules
npm run smoke:integrations

# 5. App starts
npm run start:dev
# Verify no errors, IntegrationsModule loaded
```

---

## Scope Enforcement

**DO NOT:**
- Add polling service or cron jobs
- Add webhook endpoint
- Modify TimelineService or ResourceDailyLoad
- Add new database tables
- Add new features beyond the vertical slice

**DO:**
- Complete sync-now endpoint
- Wire JiraClientService
- Add contract tests
- Fix unknown moduleKey to 404
- Update CI gates

If you start proposing polling, webhooks, or Step 3 merging, stop and restate the scope: "Phase 2 vertical slice only - sync-now endpoint with tests. No polling, no webhook, no Step 3."

---

**End of Prompt**

