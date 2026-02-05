# PHASE 2 VERTICAL SLICE - DRY RUN PLAN OUTPUT

## 1. Short Ordered Plan (8 Steps)

### Step 1: Fix unknown moduleKey behavior → 404
**Test:** `npm test -- workspace-modules.controller.spec.ts`
- Change `WorkspaceModuleService.getModule()` to throw `NotFoundException` when `getModuleDefaults()` returns null
- Update `WorkspaceModulesController.getModule()` to handle `NotFoundException` (already handled by NestJS)
- Update contract test to expect 404 for unknown moduleKey

### Step 2: Create IntegrationsModule and wire to AppModule
**Test:** `npm run start:dev` (verify module loads without errors)
- Create `zephix-backend/src/modules/integrations/integrations.module.ts`
- Import `IntegrationsModule` into `AppModule`
- Remove `JiraIntegration` from `pm.module.ts` providers (line 108)

### Step 3: Create DTOs with validation
**Test:** `npm run typecheck:tests`
- Create `CreateIntegrationConnectionDto` (type, baseUrl, apiToken, webhookSecret, projectMappings, jqlFilter, pollingEnabled, enabled)
- Create `TestConnectionDto` (empty class)
- Create `SyncNowDto` (empty class)
- Create `CreateExternalUserMappingDto` (externalSystem, externalEmail, externalUserId, resourceId)

### Step 4: Create ExternalUserMappingsController with endpoints
**Test:** `npm test -- external-user-mappings.controller.spec.ts`
- Create controller with `POST /api/integrations/external-users/mappings` and `GET /api/integrations/external-users/mappings`
- Add `JwtAuthGuard` to all endpoints
- Scope all queries by `req.user.organizationId`
- Use `formatResponse` / `formatArrayResponse` for responses
- Create contract test spec with fixtures

### Step 5: Create ExternalTaskService with upsert and idempotency
**Test:** Unit test for ExternalTaskService (manual test file)
- Implement `upsertExternalTask()` method
- Resolve `assigneeEmail` to `resourceId` via `ExternalUserMapping`
- Handle unique constraint `(organizationId, externalSystem, externalId)`
- Create test fixtures for ExternalTask and ExternalUserMapping

### Step 6: Create IntegrationSyncService with sync-now
**Test:** Unit test for IntegrationSyncService (manual test file)
- Implement `syncNow(connectionId, organizationId)` method
- Call `JiraClientService.searchIssues()` (NOT pm/integrations/jira.integration.ts)
- For each issue: generate idempotency key, try insert into `external_task_events`
- If unique constraint fails, skip issue (no-op, continue)
- If insert succeeds, resolve assignee, upsert ExternalTask, emit `external_task.updated` event
- Create test fixtures for Jira issues and IntegrationConnection
- Mock `JiraClientService.searchIssues()` in tests

### Step 7: Create IntegrationsController with all endpoints
**Test:** `npm test -- integrations.controller.spec.ts`
- `POST /api/integrations` - create connection, encrypt secrets, return { data } (no secrets)
- `GET /api/integrations` - list connections for org, return { data } (no secrets)
- `POST /api/integrations/:id/test` - test connection, return { data: { connected, message } }
- `POST /api/integrations/:id/sync-now` - run sync, return { data: { status, issuesProcessed } }
- All endpoints use `JwtAuthGuard` and scope by `req.user.organizationId`
- Create contract test spec with fixtures

### Step 8: Update CI gate and npm scripts
**Test:** `npm run smoke:workspace-modules` and `npm run smoke:integrations`
- Update `.github/workflows/ci.yml` contract test block to include 3 new specs
- Add `smoke:workspace-modules` and `smoke:integrations` scripts to `package.json`
- Create `smoke-test-integrations.ts` script (if not exists)

---

## 2. File by File Diff List

### Workspace Module Changes
- `zephix-backend/src/modules/workspaces/services/workspace-module.service.ts` - Change `getModule()` to throw `NotFoundException` when moduleKey unknown (line 58)
- `zephix-backend/src/modules/workspaces/workspace-modules.controller.spec.ts` - Add test case expecting 404 for unknown moduleKey

### Integration Module Creation
- `zephix-backend/src/modules/integrations/integrations.module.ts` (NEW) - Create module with TypeOrmModule, providers, controllers, exports
- `zephix-backend/src/app.module.ts` - Import `IntegrationsModule` into imports array
- `zephix-backend/src/pm/pm.module.ts` - Remove `JiraIntegration` from providers array (line 108)

### DTOs
- `zephix-backend/src/modules/integrations/dto/create-integration-connection.dto.ts` (NEW) - DTO with validation decorators
- `zephix-backend/src/modules/integrations/dto/test-connection.dto.ts` (NEW) - Empty DTO class
- `zephix-backend/src/modules/integrations/dto/sync-now.dto.ts` (NEW) - Empty DTO class
- `zephix-backend/src/modules/integrations/dto/create-external-user-mapping.dto.ts` (NEW) - DTO with validation

### Services
- `zephix-backend/src/modules/integrations/services/external-task.service.ts` (NEW) - Upsert logic with assignee resolution
- `zephix-backend/src/modules/integrations/services/integration-sync.service.ts` (NEW) - Sync-now logic using JiraClientService

### Controllers
- `zephix-backend/src/modules/integrations/integrations.controller.ts` (NEW) - All integration endpoints
- `zephix-backend/src/modules/integrations/external-user-mappings.controller.ts` (NEW) - User mapping endpoints

### Test Files
- `zephix-backend/src/modules/integrations/integrations.controller.spec.ts` (NEW) - Contract tests with fixtures
- `zephix-backend/src/modules/integrations/external-user-mappings.controller.spec.ts` (NEW) - Contract tests with fixtures
- `zephix-backend/src/modules/integrations/__fixtures__/jira-issues.fixture.ts` (NEW) - Test fixtures for Jira issues
- `zephix-backend/src/modules/integrations/__fixtures__/integration-connections.fixture.ts` (NEW) - Test fixtures for connections

### CI and Scripts
- `.github/workflows/ci.yml` - Add 3 new contract test specs to contract gate (lines 63-72)
- `zephix-backend/package.json` - Add `smoke:workspace-modules` and `smoke:integrations` scripts
- `zephix-backend/src/scripts/smoke-test-integrations.ts` (NEW or UPDATE) - Smoke test script

---

## 3. Verification Commands

```bash
cd zephix-backend && npm run migration:run
npm run typecheck:tests
npm test -- workspace-modules.controller.spec.ts
npm test -- integrations.controller.spec.ts
npm test -- external-user-mappings.controller.spec.ts
npm run smoke:workspace-modules
npm run smoke:integrations
npm run start:dev
```

---

## ISSUES FOUND IN DRY RUN

### 🔴 Critical Issues

1. **JiraClientService.testConnection return shape mismatch**
   - **Current:** Returns `{ success: boolean, message: string }` (line 126-153)
   - **Prompt requires:** `{ connected: boolean, message: string }`
   - **Fix:** Update `JiraClientService.testConnection()` to return `{ connected, message }` OR update controller to map `success` → `connected`

2. **JiraClientService.getAuthHeaders() has bug - missing email**
   - **Issue:** Line 51 uses `connection.baseUrl.includes('@')` which is wrong. Jira Basic auth requires `email:apiToken` but `IntegrationConnection` entity has no `email` field
   - **Current code:** `Buffer.from(\`${connection.baseUrl.includes('@') ? '' : decryptedSecrets.apiToken || ''}:${decryptedSecrets.apiToken || ''}\`)`
   - **Fix required:**
     - Option A: Add `email` field to `IntegrationConnection` entity and DTO
     - Option B: Fix `getAuthHeaders()` to use proper Jira auth (may need to get email from Jira API or store it)
   - **Recommendation:** Add `email` to `CreateIntegrationConnectionDto` and `IntegrationConnection` entity (Jira Cloud API tokens require email)

3. **Domain event type missing**
   - **Issue:** Prompt says emit `external_task.updated` but `domain-events.types.ts` doesn't define this event type
   - **Fix:** Either add `ExternalTaskUpdatedEvent` type OR use generic `DomainEvent` with `name: 'external_task.updated'`
   - **Note:** `DomainEventsPublisher` exists and can publish generic events

### ⚠️ Potential Issues

4. **Test fixtures location**
   - **Question:** Should fixtures be in `__fixtures__/` subdirectory or inline in test files?
   - **Recommendation:** Check existing test patterns - if no `__fixtures__` pattern exists, use inline fixtures in test files

5. **DomainEventsPublisher import**
   - **Issue:** `IntegrationSyncService` needs to inject `DomainEventsPublisher` but `IntegrationsModule` doesn't import `DomainEventsModule`
   - **Fix:** Add `DomainEventsModule` to `IntegrationsModule` imports (it exports `DomainEventsPublisher`)
   - **Verified:** `DomainEventsModule` exists at `zephix-backend/src/modules/domain-events/domain-events.module.ts` and exports `DomainEventsPublisher`

6. **JiraClientService mock in tests**
   - **Issue:** Tests need to mock `JiraClientService.searchIssues()` but it's a provider in the module
   - **Fix:** Use `overrideProvider(JiraClientService).useValue({ searchIssues: jest.fn() })` in test setup

7. **ExternalTaskEvent entity repository** ✅ VERIFIED
   - **Status:** Entity exists at `zephix-backend/src/modules/integrations/entities/external-task-event.entity.ts`
   - **Verified:** Has unique constraint on `idempotencyKey` (line 17: `@Column({ name: 'idempotency_key', type: 'varchar', length: 500, unique: true })`)
   - **Migration:** Confirmed in `1769000000002-CreateIntegrationTables.ts` with unique index `UQ_external_task_events_idempotency`

### ✅ Good Practices Observed

- Plan follows existing test patterns (getRepositoryToken, mock repositories)
- Uses formatResponse/formatArrayResponse helpers
- Scopes all queries by organizationId
- Includes fixtures requirement
- No scope creep (no polling, no webhook, no Step 3)

---

## RECOMMENDATIONS BEFORE IMPLEMENTATION

### Must Fix Before Implementation

1. **Add email field to IntegrationConnection**
   - Add `email: string` to `CreateIntegrationConnectionDto` (required, @IsEmail())
   - Add `email` column to `IntegrationConnection` entity
   - Update migration if needed (or add new migration)
   - Fix `JiraClientService.getAuthHeaders()` to use `email:apiToken` for Basic auth

2. **Fix JiraClientService.testConnection return shape**
   - Change return type from `{ success, message }` to `{ connected, message }`
   - Update method implementation to use `connected` instead of `success`

3. **Add DomainEventsModule to IntegrationsModule**
   - Import `DomainEventsModule` in `IntegrationsModule`
   - Inject `DomainEventsPublisher` in `IntegrationSyncService`
   - Use generic `DomainEvent` with `name: 'external_task.updated'` (no need for new type)

### Should Verify

4. **Confirm fixture pattern** - Check if `__fixtures__` directory pattern exists in codebase, or use inline fixtures in test files

5. **AppModule import** - Verify `IntegrationsModule` will be added to AppModule imports array (line 82-110)

---

**Status:** Plan is solid but needs 3 critical fixes (email field, testConnection return shape, DomainEventsModule import) before implementation can proceed safely.

