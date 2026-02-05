# PHASE 2 VERTICAL SLICE, CURSOR PROMPT

You are working on Zephix Phase 2. Do not add new features. Do not add new tables beyond what is listed below. Focus on completing the vertical slice and proving it with tests. Output your answer as a short plan plus a file by file change list with exact paths. Reference existing patterns only. No new architecture.

## Repo and version

* Branch: release/v0.5.0-alpha
* Commit: 76e9eb1b163de87cb10a9c76a3566b55573a1172
* Backend root: zephix-backend
* Frontend root: zephix-frontend

## Current state

* Step 1 complete. RequireWorkspaceModuleGuard reads workspaceId only from request.params.workspaceId.
* Step 2 is partial. JiraIntegration mock still active. JiraClientService exists but is not wired.
* Polling and webhook are out of scope for this vertical slice.

## Auth and tenancy

* All endpoints must use JwtAuthGuard.
* All queries and writes must scope by req.user.organizationId.
* Never accept organizationId from request body, query, or webhook payload.

## Response contract

* All API responses return { data: ... } using formatResponse or formatArrayResponse.
* Never return secrets in any response. Do not return apiToken or webhookSecret.

## Extra guardrails

* Tests must be deterministic. Use repository in memory patterns and mocks like existing controller specs. Do not call real Jira.
* Add fixtures for Jira issues and for integration connections so tests do not repeat inline objects.

## Scope

* Phase 2 vertical slice only. Manual sync-now first.
* Do not add polling cron jobs.
* Do not add webhook endpoint.
* Do not touch TimelineService or ResourceDailyLoad merging.
* Do not add new database tables beyond the list below.

## Vertical slice definition of done

### 1. Backend endpoints

* POST /api/integrations creates IntegrationConnection for org, scoped to req.user.organizationId. Encrypt apiToken before save. Returns { data }. No secrets in response.
* GET /api/integrations lists IntegrationConnection for org, scoped to req.user.organizationId. Returns { data }. No secrets in response.
* POST /api/integrations/:id/test validates credentials without syncing. Returns { data: { connected, message } }.
  * JiraClientService.testConnection() must return { connected: boolean, message: string } (not { success, message })
* POST /api/integrations/:id/sync-now runs a single sync using JiraClientService.searchIssues, stores ExternalTask, returns { data: { status, issuesProcessed } }.
* POST and GET external user mappings endpoints work and are tested. All scoped to req.user.organizationId.

### 2. Data

* ExternalTask upsert works with unique constraint (organizationId, externalSystem, externalId).
* ExternalTaskService resolves assigneeEmail to resourceId via ExternalUserMapping when present.
* Idempotency enforced for sync-now using external_task_events. Duplicate processing is a no-op.

### 3. Wiring

* IntegrationsModule exists and is imported into AppModule.
* IntegrationSyncService.syncNow must call JiraClientService.searchIssues.
* No code path for Phase 2 sync uses pm/integrations/jira.integration.ts. Remove it or isolate it so it cannot be used.

### 4. Tests

* Contract tests exist for new endpoints.
* CI contract gate includes workspace modules spec and new integrations specs.
* Smoke script exists and npm script added.

### 5. Workspace module change

* Unknown moduleKey returns 404. Update contract tests.

## Tables allowed, do not add more

* integration_connections
* external_tasks
* external_user_mappings
* external_task_events
* workspace_module_configs

## Questions to answer with evidence

### A. JiraIntegration mock registration

* Show exactly where it is registered now. Provide file path and provider line.
* Plan to remove or isolate it so Phase 2 uses JiraClientService.

**Evidence:**
- File: `zephix-backend/src/pm/pm.module.ts:108`
- Registration: `JiraIntegration,` in providers array
- Plan: Remove from pm.module.ts providers OR gate behind feature flag. Phase 2 IntegrationsModule will use JiraClientService instead.

### B. IntegrationsModule contents

Create `zephix-backend/src/modules/integrations/integrations.module.ts` with this structure:

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
    DomainEventsModule,
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

### C. DTOs with validation

Follow pattern from `create-workspace.dto.ts`. Create these DTOs:

**CreateIntegrationConnectionDto:**
* type: 'jira' (required, enum, only 'jira' for vertical slice)
* baseUrl (required, @IsUrl())
* email (required, @IsEmail(), @IsNotEmpty()) - Jira account email for Basic auth
* apiToken (required, @IsString(), @IsNotEmpty())
* webhookSecret (optional, @IsString(), @IsOptional())
* projectMappings (optional, array)
* jqlFilter (optional, string)
* pollingEnabled (optional, boolean, default false)
* enabled (optional, boolean, default true)

Service encrypts apiToken and webhookSecret before save. Response never returns them.

**Auth Header Generation Rule:**
* JiraClientService.getAuthHeaders() must use Basic auth: base64(email + ":" + apiToken)
* Remove any baseUrl.includes("@") logic - use connection.email field directly

**TestConnectionDto:** (empty)

**SyncNowDto:** (empty)

**CreateExternalUserMappingDto:**
* externalSystem (enum, allow 'jira' only for this slice)
* externalEmail (@IsEmail())
* externalUserId (optional)
* resourceId (required, uuid)

### D. ExternalTask upsert flow with idempotency

For each issue from JiraClientService.searchIssues:

* Generate idempotency key with `generatePollingIdempotencyKey(connectionId, issue)`
* Try insert into `external_task_events` with `idempotency_key` unique
* If insert fails due to unique constraint, skip issue and continue, do not throw
* If insert succeeds, resolve assigneeEmail to resourceId, then upsert `external_tasks` by unique key
* Emit domain event `external_task.updated`

### E. Unknown moduleKey behavior

* Change `WorkspaceModuleService.getModule` to throw `NotFoundException` when moduleKey unknown
* Update `workspace-modules.controller.spec.ts` to expect 404

### F. CI contract gate update

Update `.github/workflows/ci.yml` contract test block to include:

* `workspace-modules.controller.spec.ts`
* `integrations.controller.spec.ts`
* `external-user-mappings.controller.spec.ts`

**Current location:** `.github/workflows/ci.yml:63-72`

**Add these lines:**
```yaml
    npm test -- workspace-modules.controller.spec.ts || exit 1
    npm test -- integrations.controller.spec.ts || exit 1
    npm test -- external-user-mappings.controller.spec.ts || exit 1
```

### G. NPM scripts addition

Add to `zephix-backend/package.json` scripts:

* `smoke:workspace-modules`
* `smoke:integrations`

**Exact addition:**
```json
"smoke:workspace-modules": "ts-node -r tsconfig-paths/register src/scripts/smoke-test-workspace-modules.ts",
"smoke:integrations": "ts-node -r tsconfig-paths/register src/scripts/smoke-test-integrations.ts",
```

## Output requirements

### 1. Short ordered plan

Provide 8 steps. Each step includes the test you will run after it.

### 2. File by file diff list

For each file, one line, what changes and why.

### 3. Verification commands

Include exactly these commands:

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

## Stop conditions

If you start proposing polling, webhooks, or Step 3 merging, stop. Restate scope. Proceed only with sync-now and tests.

---

**End prompt**

