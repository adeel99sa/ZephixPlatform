# ARCHIVED - Merged into canonical architecture docs
# Architectural Blueprint Follow-Up Answers

**Date:** 2025-12-18
**Branch:** `release/v0.5.0-alpha`
**Commit SHA:** `76e9eb1b163de87cb10a9c76a3566b55573a1172`

---

## 1. Fix Scoring - Single Table with One Computed Total

### Scored Rubric (Corrected)

| Requirement | Points | Score | Status | Evidence File:Line |
|------------|--------|-------|--------|-------------------|
| **Hexagonal Architecture** | 5 | 2 | ⚠️ PARTIAL | No adapter interfaces, no boundary enforcement |
| **WorkspaceModuleConfig** | 5 | 0 | ❌ FAIL | No entity, no workspace-level config |
| **Sync Engine (ExternalTask)** | 5 | 0 | ❌ FAIL | No entity, no real Jira integration |
| **AI Guardian** | 5 | 5 | ✅ PASS | `resource-allocation.service.ts:507-525` |
| **AI Analyst** | 5 | 2 | ⚠️ PARTIAL | Infrastructure exists, no daily snapshots |
| **Generative Dashboards** | 5 | 1 | ⚠️ PARTIAL | Form generation only, no analytics queries |
| **KPI Rollups** | 5 | 4 | ✅ PASS | `materialized-project-metrics.entity.ts:1-72` |
| **Tech Stack** | 5 | 5 | ✅ PASS | Zustand: 26 matches, TanStack Query: 106 matches |

**Total Score: 19/40 = 47.5%** (Rounded to **48%**)

**Calculation:**
- Phase 1 (Foundation): 14/15 = 93% ✅
- Phase 2 (Sync Engine): 0/15 = 0% ❌
- Phase 3 (AI Analyst): 5/10 = 50% ⚠️

**Overall Completion: 48%**

---

## 2. ResourceDailyLoad Write Paths - Exact Evidence

### Write Paths

**Service:** `ResourceTimelineService.updateTimeline()`

**File:** `zephix-backend/src/modules/resources/services/resource-timeline.service.ts`

**Write Locations:**
1. **Line 122:** `await this.dailyLoadRepository.save(existing)` - Updates existing record
2. **Line 124-135:** `await this.dailyLoadRepository.save({ ... })` - Creates new record

**When It Updates:**
- **Trigger:** Called after `ResourceAllocation` create/update/delete
- **Caller:** `ResourceAllocationService.create()` at line 95-101
- **Caller:** `ResourceAllocationService.update()` at line 206
- **Caller:** `ResourceAllocationService.remove()` at line 241

**Update Pattern:**
- **On-Demand:** Updates when allocations change (not scheduled)
- **Async:** Non-blocking (`.catch()` at line 102-105)
- **Date Range:** Updates all days in allocation date range (lines 73-140)

**Classification:**
- **Type:** **Computed Read Model** (not a snapshot table)
- **Purpose:** Pre-computed daily load for fast heatmap queries
- **Update Frequency:** On-demand when allocations change
- **Not:** Daily snapshots (no cron job, no historical preservation)

**Evidence:**
```typescript:zephix-backend/src/modules/resources/services/resource-timeline.service.ts:32-152
async updateTimeline(
  organizationId: string,
  resourceId: string,
  startDate: Date,
  endDate: Date,
): Promise<void> {
  // Gets allocations, calculates daily loads, upserts ResourceDailyLoad
  // Lines 106-136: Upsert logic
}
```

**Called From:**
```typescript:zephix-backend/src/modules/resources/resource-allocation.service.ts:95-101
this.timelineService
  .updateTimeline(
    organizationId,
    createAllocationDto.resourceId,
    new Date(createAllocationDto.startDate),
    new Date(createAllocationDto.endDate),
  )
  .catch((error) => {
    // Log but don't fail the request
  });
```

---

## 3. Hexagonal Architecture Enforcement

### Current State
- **No boundary enforcement** exists
- No dependency-cruiser rules
- No eslint boundaries
- No Nest module boundary tests

### Recommendation: Option C (Nest Module Boundary Test)

**File:** `zephix-backend/test/architecture-boundaries.spec.ts` (NEW)

**Rule:**
```typescript
describe('Architecture Boundaries', () => {
  it('should enforce: adapters do not import domain services', () => {
    // Scan all files in src/pm/integrations/
    // Assert: No imports from src/modules/*/services/* (except shared)
  });

  it('should enforce: controllers do not import repositories directly', () => {
    // Scan all files in src/**/*.controller.ts
    // Assert: No imports from @nestjs/typeorm Repository
    // Controllers must use services, not repositories
  });

  it('should enforce: domain services do not import infrastructure', () => {
    // Scan all files in src/modules/*/services/*.service.ts
    // Assert: No imports from src/config/* (except shared config)
  });
});
```

**Alternative: ESLint Rule (Option B)**

**File:** `.eslintrc.js` (add rule)

```javascript
rules: {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['**/pm/integrations/**'],
          message: 'Adapters cannot import domain services. Use interfaces instead.',
          allowTypeImports: true,
        },
        {
          group: ['@nestjs/typeorm'],
          message: 'Controllers cannot import TypeORM directly. Use services.',
          from: '**/*.controller.ts',
        },
      ],
    },
  ],
}
```

**Recommendation:** Start with **Option C (Test)** - easier to maintain, clearer failures.

---

## 4. WorkspaceModuleConfig - Migration and Defaults

### Migration File

**File:** `zephix-backend/src/migrations/1769000000001-CreateWorkspaceModuleConfigs.ts`

```typescript
import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateWorkspaceModuleConfigs1769000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'workspace_module_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'workspace_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'module_key',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'integer',
            default: 1,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['workspace_id'],
            referencedTableName: 'workspaces',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          new Index('UQ_workspace_module_config', ['workspace_id', 'module_key'], {
            isUnique: true,
          }),
          new Index('IDX_workspace_module_config_workspace', ['workspace_id']),
        ],
      }),
    );

    // Seed default modules for all existing workspaces
    await queryRunner.query(`
      INSERT INTO workspace_module_configs (workspace_id, module_key, enabled, config, version)
      SELECT
        w.id,
        unnest(ARRAY[
          'resource_intelligence',
          'risk_sentinel',
          'portfolio_rollups',
          'ai_assistant',
          'document_processing'
        ]) as module_key,
        CASE
          WHEN unnest(ARRAY[
            'resource_intelligence',
            'risk_sentinel',
            'portfolio_rollups',
            'ai_assistant',
            'document_processing'
        ]) IN ('resource_intelligence', 'risk_sentinel') THEN true
          ELSE false
        END as enabled,
        CASE
          WHEN unnest(ARRAY[
            'resource_intelligence',
            'risk_sentinel',
            'portfolio_rollups',
            'ai_assistant',
            'document_processing'
        ]) = 'resource_intelligence' THEN '{"hardCap": 110}'::jsonb
          WHEN unnest(ARRAY[
            'resource_intelligence',
            'risk_sentinel',
            'portfolio_rollups',
            'ai_assistant',
            'document_processing'
        ]) = 'risk_sentinel' THEN '{"sensitivity": "high"}'::jsonb
          ELSE NULL
        END as config,
        1 as version
      FROM workspaces w
      WHERE w.deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('workspace_module_configs', true);
  }
}
```

### Module Registry

**File:** `zephix-backend/src/modules/workspaces/modules/workspace-module-registry.ts` (NEW)

```typescript
export const WORKSPACE_MODULES = {
  resource_intelligence: {
    key: 'resource_intelligence',
    name: 'Resource Intelligence',
    defaultEnabled: true,
    defaultConfig: { hardCap: 110 },
    version: 1,
  },
  risk_sentinel: {
    key: 'risk_sentinel',
    name: 'Risk Sentinel',
    defaultEnabled: true,
    defaultConfig: { sensitivity: 'high' },
    version: 1,
  },
  portfolio_rollups: {
    key: 'portfolio_rollups',
    name: 'Portfolio Rollups',
    defaultEnabled: false,
    defaultConfig: null,
    version: 1,
  },
  ai_assistant: {
    key: 'ai_assistant',
    name: 'AI Assistant',
    defaultEnabled: false,
    defaultConfig: null,
    version: 1,
  },
  document_processing: {
    key: 'document_processing',
    name: 'Document Processing',
    defaultEnabled: false,
    defaultConfig: null,
    version: 1,
  },
} as const;

export type WorkspaceModuleKey = keyof typeof WORKSPACE_MODULES;

export function getModuleDefaults(key: string): {
  enabled: boolean;
  config: any;
  version: number;
} | null {
  const module = WORKSPACE_MODULES[key as WorkspaceModuleKey];
  if (!module) {
    return null;
  }
  return {
    enabled: module.defaultEnabled,
    config: module.defaultConfig,
    version: module.version,
  };
}
```

### Behavior When Module Key Missing

**Service Logic:**
```typescript
async getModuleConfig(workspaceId: string, moduleKey: string): Promise<WorkspaceModuleConfig | null> {
  const config = await this.repository.findOne({
    where: { workspaceId, moduleKey },
  });

  if (config) {
    return config;
  }

  // Module key not found - return default from registry
  const defaults = getModuleDefaults(moduleKey);
  if (!defaults) {
    // Unknown module key - log warning, return null
    this.logger.warn(`Unknown module key: ${moduleKey}`);
    return null;
  }

  // Return default config (not persisted)
  return {
    workspaceId,
    moduleKey,
    enabled: defaults.enabled,
    config: defaults.config,
    version: defaults.version,
  } as WorkspaceModuleConfig;
}
```

### Backend Guard Decorator

**File:** `zephix-backend/src/modules/workspaces/decorators/require-workspace-module.decorator.ts` (NEW)

```typescript
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_WORKSPACE_MODULE_KEY = 'requireWorkspaceModule';

export const RequireWorkspaceModule = (moduleKey: string) =>
  SetMetadata(REQUIRE_WORKSPACE_MODULE_KEY, moduleKey);
```

**Guard:**
```typescript
@Injectable()
export class RequireWorkspaceModuleGuard implements CanActivate {
  constructor(
    private workspaceModuleService: WorkspaceModuleService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.get<string>(
      REQUIRE_WORKSPACE_MODULE_KEY,
      context.getHandler(),
    );

    if (!moduleKey) {
      return true; // No module requirement
    }

    const request = context.switchToHttp().getRequest();
    const workspaceId = request.params.workspaceId || request.body.workspaceId;

    if (!workspaceId) {
      throw new BadRequestException('Workspace ID required');
    }

    const config = await this.workspaceModuleService.getModuleConfig(
      workspaceId,
      moduleKey,
    );

    if (!config || !config.enabled) {
      throw new ForbiddenException(
        `Module ${moduleKey} is not enabled for this workspace`,
      );
    }

    return true;
  }
}
```

**Usage:**
```typescript
@Get('/heatmap')
@RequireWorkspaceModule('resource_intelligence')
async getHeatmap(@Param('workspaceId') workspaceId: string) {
  // Only accessible if resource_intelligence module is enabled
}
```

### Frontend Route Guard Pattern

**File:** `zephix-frontend/src/hooks/useWorkspaceModule.ts` (NEW)

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useWorkspaceModule(workspaceId: string, moduleKey: string) {
  return useQuery({
    queryKey: ['workspace-module', workspaceId, moduleKey],
    queryFn: async () => {
      const response = await api.get(
        `/api/workspaces/${workspaceId}/modules/${moduleKey}`,
      );
      return response.data?.data;
    },
    enabled: !!workspaceId && !!moduleKey,
  });
}

// Route guard component
export function WorkspaceModuleGuard({
  workspaceId,
  moduleKey,
  children,
  fallback,
}: {
  workspaceId: string;
  moduleKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { data: config, isLoading } = useWorkspaceModule(workspaceId, moduleKey);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!config || !config.enabled) {
    return fallback || <div>Module {moduleKey} is not enabled</div>;
  }

  return <>{children}</>;
}
```

**Usage:**
```typescript
<WorkspaceModuleGuard workspaceId={workspaceId} moduleKey="resource_intelligence">
  <ResourceHeatmap />
</WorkspaceModuleGuard>
```

---

## 5. Sync Engine - Correct Core Semantics

### Replace "ExternalTask Always Wins" with Demand/Capacity Model

**Model:**
- **ExternalTask** = **Demand Signal** (what external system says resource needs to do)
- **ResourceAllocation** = **Capacity Commitment** (what Zephix has planned)
- **Conflicts** = Computed from **both** (demand + capacity > 100%)

### How ExternalTask Affects Workload

**Calculation:**
```typescript
// In ResourceAllocationService.recalculateConflicts()
async recalculateConflicts(
  resourceId: string,
  organizationId: string,
  dateRange: { start: Date; end: Date },
): Promise<void> {
  // 1. Get ResourceAllocations (capacity commitments)
  const allocations = await this.getAllocations(resourceId, dateRange);

  // 2. Get ExternalTasks (demand signals) - NEW in Phase 2
  const externalTasks = await this.externalTaskService.getByResource(
    resourceId,
    dateRange,
  );

  // 3. Convert ExternalTasks to "demand load" (estimateHours → %)
  const demandLoad = externalTasks.map(task => ({
    date: task.dueDate,
    loadPercent: this.convertHoursToPercent(task.estimateHours),
    source: 'external' as const,
  }));

  // 4. Combine allocations + demand load
  const totalLoad = this.combineLoads(allocations, demandLoad);

  // 5. Detect conflicts (totalLoad > 100%)
  const conflicts = this.detectOverload(totalLoad);

  // 6. Update ResourceDailyLoad with combined load
  await this.timelineService.updateTimeline(
    organizationId,
    resourceId,
    dateRange.start,
    dateRange.end,
  );
}
```

### How ResourceAllocation Affects Capacity

**Unchanged:** ResourceAllocation remains the **source of truth** for capacity commitments.

**Governance Still Applies:**
- Hard cap enforcement: `ResourceAllocation` + `ExternalTask` combined load cannot exceed hard cap
- Justification required: If combined load > threshold, require justification

### How Conflicts Are Computed

**Algorithm:**
```typescript
function combineLoads(
  allocations: ResourceAllocation[],
  externalTasks: ExternalTask[],
): DailyLoad[] {
  // Group by date
  const dailyLoads: Map<string, number> = new Map();

  // Add allocation loads
  for (const alloc of allocations) {
    for (const date of getDatesInRange(alloc.startDate, alloc.endDate)) {
      const key = date.toISOString().split('T')[0];
      dailyLoads.set(key, (dailyLoads.get(key) || 0) + alloc.allocationPercentage);
    }
  }

  // Add external task loads (convert hours to %)
  for (const task of externalTasks) {
    if (task.dueDate) {
      const key = task.dueDate.toISOString().split('T')[0];
      const loadPercent = convertHoursToPercent(task.estimateHours);
      dailyLoads.set(key, (dailyLoads.get(key) || 0) + loadPercent);
    }
  }

  return Array.from(dailyLoads.entries()).map(([date, total]) => ({
    date: new Date(date),
    totalLoad: total,
    hasConflict: total > 100,
  }));
}
```

### How Governance Applies

**When ExternalTask Pushes Load Over Hard Cap:**

```typescript
// In ResourceAllocationService.validateGovernance()
// After Phase 2, include ExternalTask demand in calculation

const externalTaskLoad = await this.getExternalTaskLoad(
  resourceId,
  startDate,
  endDate,
);

const projectedTotal =
  currentHardLoad +
  currentSoftLoad +
  newAllocationPercentage +
  externalTaskLoad; // NEW: Include external demand

if (projectedTotal > settings.hardCap) {
  throw new BadRequestException(
    `Resource allocation would exceed hard cap of ${settings.hardCap}%. ` +
    `Current load: ${currentHardLoad + currentSoftLoad}%, ` +
    `External demand: ${externalTaskLoad}%, ` +
    `Projected total: ${projectedTotal}%`
  );
}
```

**User Experience:**
- Heatmap shows **combined load** (allocations + external tasks)
- Conflicts highlight when **total > 100%**
- Governance modal shows **breakdown**: "Allocations: 80%, External Tasks: 30%, Total: 110%"
- User can **unlink ExternalTask** from resource if needed (admin action)

---

## 6. Idempotency and Security - Jira Webhook Fields

### Jira Webhook Payload Fields

**Based on Jira Cloud Webhook Documentation:**

**Idempotency Fields:**
1. **`webhookEvent`** (string) - Event type, e.g., "jira:issue_updated"
2. **`timestamp`** (number) - Unix timestamp in milliseconds
3. **`issue.id`** (string) - Jira issue ID (stable)
4. **`issue.key`** (string) - Jira issue key, e.g., "PROJ-123"
5. **`issue.fields.updated`** (string) - ISO 8601 timestamp of last update

**Idempotency Strategy:**
```typescript
function generateIdempotencyKey(jiraPayload: any): string {
  // Primary: Use webhookEvent + issue.id + timestamp
  if (jiraPayload.webhookEvent && jiraPayload.issue?.id && jiraPayload.timestamp) {
    return `${jiraPayload.webhookEvent}:${jiraPayload.issue.id}:${jiraPayload.timestamp}`;
  }

  // Fallback: Use issue.key + updated timestamp
  if (jiraPayload.issue?.key && jiraPayload.issue?.fields?.updated) {
    return `jira:${jiraPayload.issue.key}:${jiraPayload.issue.fields.updated}`;
  }

  // Last resort: Generate from payload hash
  return `jira:${createHash('sha256').update(JSON.stringify(jiraPayload)).digest('hex')}`;
}
```

### Dedupe Table Schema

**File:** `zephix-backend/src/migrations/1769000000002-CreateExternalTaskEventsTable.ts`

```typescript
await queryRunner.createTable(
  new Table({
    name: 'external_task_events',
    columns: [
      {
        name: 'id',
        type: 'uuid',
        isPrimary: true,
        generationStrategy: 'uuid',
        default: 'uuid_generate_v4()',
      },
      {
        name: 'idempotency_key',
        type: 'varchar',
        length: '500',
        isNullable: false,
        isUnique: true, // Prevents duplicate processing
      },
      {
        name: 'organization_id',
        type: 'uuid',
        isNullable: false,
      },
      {
        name: 'external_system',
        type: 'varchar',
        length: '50',
        isNullable: false,
      },
      {
        name: 'event_type',
        type: 'varchar',
        length: '100',
        isNullable: false,
      },
      {
        name: 'processed_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
      },
      {
        name: 'status',
        type: 'varchar',
        length: '50',
        default: 'processed',
      },
      {
        name: 'error_message',
        type: 'text',
        isNullable: true,
      },
    ],
    indices: [
      new Index('UQ_external_task_events_idempotency', ['idempotency_key'], {
        isUnique: true,
      }),
      new Index('IDX_external_task_events_org', ['organization_id']),
    ],
  }),
);
```

### Webhook Signature Verification

**Jira Webhook Security:**
- Jira does **not** send signature headers by default
- **Option 1:** Use webhook secret in URL: `https://api.zephix.com/webhooks/jira?secret=xxx`
- **Option 2:** Verify `organizationId` from payload matches IntegrationConnection

**Response Codes:**
```typescript
@Post('/webhook')
async handleJiraWebhook(
  @Query('secret') secret: string,
  @Body() payload: any,
  @Req() req: Request,
): Promise<{ status: string }> {
  // 1. Verify secret
  const expectedSecret = await this.getWebhookSecret(payload.organizationId);
  if (secret !== expectedSecret) {
    // Return 401 for invalid signature
    throw new UnauthorizedException('Invalid webhook secret');
  }

  // 2. Verify organizationId exists
  const org = await this.organizationRepository.findOne({
    where: { id: payload.organizationId },
  });
  if (!org) {
    // Return 403 for invalid org
    throw new ForbiddenException('Organization not found');
  }

  // 3. Process webhook (async, non-blocking)
  this.processWebhookAsync(payload).catch(error => {
    this.logger.error('Webhook processing failed', error);
    // Quarantine event
    this.quarantineEvent(payload, error);
  });

  // 4. Always return 200 OK (fast response)
  return { status: 'accepted' };
}
```

**For Polling - Monotonic Cursor:**
```typescript
// Store last processed timestamp per IntegrationConnection
interface IntegrationConnection {
  lastPolledAt: Date; // Monotonic cursor
  lastIssueUpdatedAt: Date; // Jira issue.updated field (monotonic)
}

// Polling query uses: WHERE updated > lastIssueUpdatedAt ORDER BY updated ASC
// This ensures no duplicates even if polling runs concurrently
```

---

## 7. IntegrationConnection Data Model

### Entity Schema

**File:** `zephix-backend/src/modules/integrations/entities/integration-connection.entity.ts` (NEW)

```typescript
@Entity('integration_connections')
@Index(['organizationId', 'type'], { unique: true })
@Index(['organizationId'])
export class IntegrationConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'jira' | 'linear' | 'github';

  @Column({ name: 'base_url', type: 'varchar', length: 500 })
  baseUrl: string;

  @Column({ name: 'auth_type', type: 'varchar', length: 50 })
  authType: 'api_token' | 'oauth' | 'basic';

  @Column({ name: 'encrypted_secrets', type: 'jsonb' })
  encryptedSecrets: {
    apiToken?: string; // Encrypted
    clientId?: string; // Encrypted
    clientSecret?: string; // Encrypted
    refreshToken?: string; // Encrypted
  };

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ name: 'project_mappings', type: 'jsonb', nullable: true })
  projectMappings?: Array<{
    externalProjectKey: string; // e.g., "PROJ"
    zephixProjectId?: string; // Optional: link to Zephix project
    zephixWorkspaceId?: string; // Optional: link to Zephix workspace
  }>;

  @Column({ name: 'jql_filter', type: 'text', nullable: true })
  jqlFilter?: string; // Jira JQL filter for issues to sync

  @Column({ name: 'last_polled_at', type: 'timestamp', nullable: true })
  lastPolledAt?: Date;

  @Column({ name: 'last_issue_updated_at', type: 'timestamp', nullable: true })
  lastIssueUpdatedAt?: Date; // Monotonic cursor for polling

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'error' | 'paused';

  @Column({ name: 'error_count', type: 'integer', default: 0 })
  errorCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @Column({ name: 'webhook_secret', type: 'varchar', length: 255, nullable: true })
  webhookSecret?: string; // For webhook verification

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Admin Endpoints

**File:** `zephix-backend/src/modules/integrations/integrations.controller.ts` (NEW)

```typescript
@Controller('api/integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  // List all integrations for org
  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return formatArrayResponse(
      await this.integrationsService.list(req.user.organizationId),
    );
  }

  // Create/Update integration connection
  @Post()
  async create(
    @Body() dto: CreateIntegrationConnectionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return formatResponse(
      await this.integrationsService.create(req.user.organizationId, dto),
    );
  }

  // Get integration status
  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return formatResponse(
      await this.integrationsService.getStatus(id, req.user.organizationId),
    );
  }

  // Test connection
  @Post(':id/test')
  async testConnection(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return formatResponse(
      await this.integrationsService.testConnection(id, req.user.organizationId),
    );
  }

  // Enable/Disable
  @Patch(':id/enable')
  async enable(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return formatResponse(
      await this.integrationsService.enable(id, req.user.organizationId),
    );
  }

  @Patch(':id/disable')
  async disable(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return formatResponse(
      await this.integrationsService.disable(id, req.user.organizationId),
    );
  }
}
```

---

## 8. Polling Orchestration

### Per-Org Concurrency

**Strategy:** Use Redis semaphore or in-memory queue

```typescript
@Injectable()
export class IntegrationPollingService {
  private readonly maxConcurrentPerOrg = 2; // Max 2 integrations polling per org
  private readonly orgSemaphores = new Map<string, Semaphore>();

  @Cron('*/5 * * * *') // Every 5 minutes
  async pollAllIntegrations() {
    const connections = await this.integrationConnectionRepo.find({
      where: { enabled: true, status: 'active' },
    });

    // Group by organization
    const byOrg = groupBy(connections, 'organizationId');

    // Process each org with concurrency limit
    for (const [orgId, orgConnections] of Object.entries(byOrg)) {
      const semaphore = this.getSemaphore(orgId);

      // Process up to maxConcurrentPerOrg connections per org
      const toProcess = orgConnections.slice(0, this.maxConcurrentPerOrg);

      await Promise.all(
        toProcess.map(conn =>
          semaphore.acquire().then(() =>
            this.pollConnection(conn)
              .finally(() => semaphore.release())
          )
        )
      );
    }
  }
}
```

### Per-Connection Schedule

**Strategy:** Stagger polling to avoid thundering herd

```typescript
async pollConnection(connection: IntegrationConnection) {
  // Skip if polled recently (within last 4 minutes)
  if (connection.lastPolledAt) {
    const minutesSinceLastPoll =
      (Date.now() - connection.lastPolledAt.getTime()) / 60000;
    if (minutesSinceLastPoll < 4) {
      return; // Skip this run
    }
  }

  // Poll with exponential backoff on errors
  const backoffDelay = this.calculateBackoff(connection.errorCount);
  await this.sleep(backoffDelay);

  try {
    await this.syncIssues(connection);
    await this.updateLastPolledAt(connection.id);
  } catch (error) {
    await this.incrementErrorCount(connection.id);
    throw error;
  }
}
```

### Backoff Strategy

```typescript
function calculateBackoff(errorCount: number): number {
  // Exponential backoff: 0s, 30s, 60s, 120s, 240s (max 4 minutes)
  const delays = [0, 30000, 60000, 120000, 240000];
  return delays[Math.min(errorCount, delays.length - 1)];
}
```

### Max Pages Per Run

```typescript
async syncIssues(connection: IntegrationConnection) {
  const maxPages = 10; // Safety valve
  let page = 0;
  let hasMore = true;
  let lastUpdatedAt = connection.lastIssueUpdatedAt || new Date(0);

  while (hasMore && page < maxPages) {
    const response = await this.jiraClient.searchIssues({
      jql: `updated > ${lastUpdatedAt.toISOString()} ORDER BY updated ASC`,
      startAt: page * 50,
      maxResults: 50,
    });

    for (const issue of response.issues) {
      await this.processIssue(connection, issue);
      // Update monotonic cursor
      if (new Date(issue.fields.updated) > lastUpdatedAt) {
        lastUpdatedAt = new Date(issue.fields.updated);
      }
    }

    hasMore = response.issues.length === 50;
    page++;
  }

  // Update connection cursor
  await this.updateLastIssueUpdatedAt(connection.id, lastUpdatedAt);
}
```

### Safety Valves

```typescript
// 1. Max pages per run (prevents infinite loop)
const maxPages = 10;

// 2. Max issues per run (prevents memory issues)
const maxIssuesPerRun = 500;

// 3. Error threshold (pause integration after N errors)
if (connection.errorCount > 10) {
  await this.pauseIntegration(connection.id);
  this.logger.warn(`Integration ${connection.id} paused due to errors`);
}

// 4. Rate limit per org (prevent Jira API throttling)
const rateLimiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'minute',
  keyPrefix: `jira:${connection.organizationId}`,
});
```

---

## 9. Test Suite Plan - Contract First

### Contract Tests (Following Existing Pattern)

**Pattern:** `zephix-backend/src/modules/workspaces/workspaces.controller.spec.ts`

**New Contract Tests:**

1. **`integrations.controller.spec.ts`**
```typescript
describe('IntegrationsController - Contract Tests', () => {
  describe('GET /api/integrations', () => {
    it('should return { data: IntegrationConnection[] } format', async () => {
      // Test formatResponse pattern
    });

    it('should return { data: [] } when no integrations exist', async () => {
      // Test empty array default
    });
  });

  describe('POST /api/integrations/jira/webhook', () => {
    it('should return { status: "accepted" } for valid webhook', async () => {
      // Test 200 OK response
    });

    it('should return 401 for invalid secret', async () => {
      // Test security
    });
  });
});
```

2. **`external-user-mappings.controller.spec.ts`**
```typescript
describe('ExternalUserMappingsController - Contract Tests', () => {
  describe('POST /api/integrations/external-users/mappings', () => {
    it('should return { data: ExternalUserMapping } format', async () => {
      // Test formatResponse
    });
  });
});
```

### Smoke Test Script

**File:** `zephix-backend/src/scripts/smoke-test-integrations.ts` (NEW)

```typescript
/**
 * Smoke test script for integrations endpoints
 * Run: ACCESS_TOKEN=xxx npm run smoke:integrations
 */

async function smokeTestIntegrations() {
  const token = process.env.ACCESS_TOKEN;
  if (!token) {
    throw new Error('ACCESS_TOKEN required');
  }

  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  console.log('🧪 Integrations Endpoints Smoke Test\n');

  // 1. List integrations
  const listRes = await fetch(`${baseUrl}/api/integrations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(listRes.status === 200);
  const listData = await listRes.json();
  assert(listData.data !== undefined);
  console.log('✅ GET /api/integrations - OK');

  // 2. Test webhook endpoint (with invalid secret)
  const webhookRes = await fetch(`${baseUrl}/api/integrations/jira/webhook?secret=invalid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookEvent: 'jira:issue_updated', issue: {} }),
  });
  assert(webhookRes.status === 401);
  console.log('✅ POST /api/integrations/jira/webhook - Security OK');

  // ... more tests
}
```

### Playwright E2E Test (Mocked Jira)

**File:** `zephix-frontend/tests/integrations-smoke.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Integrations Smoke Test', () => {
  test('Jira integration flow with mocked adapter', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@zephix.ai');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // 2. Navigate to integrations
    await page.goto('/admin/integrations');

    // 3. Mock Jira API responses (using Playwright route interception)
    await page.route('**/api/integrations/jira/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: {
            issues: [
              { id: '123', key: 'PROJ-123', fields: { summary: 'Test Issue' } },
            ],
          },
        }),
      });
    });

    // 4. Create Jira integration
    await page.click('button:has-text("Connect Jira")');
    await page.fill('[name="baseUrl"]', 'https://test.atlassian.net');
    await page.fill('[name="apiToken"]', 'test-token');
    await page.click('button:has-text("Save")');

    // 5. Map Jira user to Zephix resource
    await page.click('button:has-text("Map Users")');
    await page.selectOption('[name="jiraEmail"]', 'user@example.com');
    await page.selectOption('[name="resourceId"]', 'resource-123');
    await page.click('button:has-text("Save Mapping")');

    // 6. Verify ExternalTask appears in heatmap
    await page.goto('/resources/heatmap');
    await expect(page.locator('text=PROJ-123')).toBeVisible();

    // 7. Verify conflicts are highlighted
    await expect(page.locator('.conflict-warning')).toBeVisible();
  });
});
```

**Mock Adapter Pattern:**
```typescript
// In test setup, replace JiraIntegration with MockJiraIntegration
class MockJiraIntegration extends JiraIntegration {
  async searchIssues(jql: string) {
    return {
      issues: [
        {
          id: '123',
          key: 'PROJ-123',
          fields: {
            summary: 'Test Issue',
            assignee: { emailAddress: 'user@example.com' },
            updated: new Date().toISOString(),
          },
        },
      ],
    };
  }
}
```

---

## 10. AI Scope Enforcement - Exact Rules

### AI Refusal Rules in Code

**File:** `zephix-backend/src/pm/services/ai-chat.service.ts` (MODIFY)

**Add Intent Detection for Historical Queries:**
```typescript
private analyzeIntent(message: string): {
  type: string;
  confidence: number;
  requiresHistoricalData: boolean; // NEW
  entities: any;
} {
  const lowerMessage = message.toLowerCase();

  // Detect historical analysis patterns
  const historicalPatterns = [
    /(how|what).*(changed|trend|over the last|past|history|historical)/i,
    /(compare|comparison|vs|versus).*(planned|actual|budget)/i,
    /(variance|variance analysis|trend analysis)/i,
    /(last \d+ days|last \d+ weeks|last \d+ months)/i,
  ];

  const requiresHistoricalData = historicalPatterns.some(pattern =>
    pattern.test(message)
  );

  // ... existing intent detection ...

  return {
    type: intentType,
    confidence,
    requiresHistoricalData, // NEW
    entities: {},
  };
}
```

**Add Refusal Logic:**
```typescript
async processMessage(request: AIAnalysisRequest): Promise<ChatResponse> {
  const intent = this.analyzeIntent(request.message);

  // Guard: Refuse historical queries without snapshots
  if (intent.requiresHistoricalData) {
    return {
      messageId: this.generateMessageId(),
      response:
        'Historical analysis requires daily snapshots, which are not yet available. ' +
        'This feature is planned for Phase 3. ' +
        'I can help you with current state analysis instead.',
      confidence: 1.0,
      suggestedActions: [
        {
          type: 'analyze_project',
          title: 'Analyze Current Project State',
          description: 'Get analysis of current project metrics',
        },
      ],
    };
  }

  // ... continue with existing logic ...
}
```

**Policy Layer (Alternative):**
```typescript
// File: zephix-backend/src/ai/policies/ai-scope-policy.ts (NEW)
@Injectable()
export class AIScopePolicy {
  private readonly historicalKeywords = [
    'changed over',
    'trend',
    'historical',
    'past',
    'last 30 days',
    'compare planned vs actual',
  ];

  canAnswer(query: string, availableData: DataSource[]): {
    allowed: boolean;
    reason?: string;
  } {
    const requiresHistorical = this.historicalKeywords.some(keyword =>
      query.toLowerCase().includes(keyword),
    );

    const hasSnapshots = availableData.includes('daily_snapshots');

    if (requiresHistorical && !hasSnapshots) {
      return {
        allowed: false,
        reason: 'Historical analysis requires daily snapshots (Phase 3)',
      };
    }

    return { allowed: true };
  }
}
```

**Prevent AI from Inventing Historical Answers:**
```typescript
// In prompt construction
const systemPrompt = `
You are a project management assistant for Zephix.

AVAILABLE DATA SOURCES:
- Current resource allocations
- Current external tasks (Jira/Linear)
- Current project metrics
- Current risk assessments

NOT AVAILABLE:
- Historical daily snapshots (planned for Phase 3)
- Trend data over time
- Planned vs actual comparisons over time

RULES:
1. If user asks about historical trends, you MUST refuse and explain Phase 3 limitation
2. Do NOT invent or estimate historical data
3. Do NOT provide trend analysis without snapshots
4. Only answer questions about CURRENT state

${this.scopePolicy.canAnswer(query, availableData).reason || ''}
`;
```

---

## 11. Phase 2 Definition of Done - One Page

### Phase 2: Sync Engine Wedge - Definition of Done

**Vertical Slice:** Jira Project Sync → ExternalTask → Workload Impact Visible

---

### Exact Tables

1. **`external_tasks`**
   - Fields: id, organization_id, workspace_id, project_id, external_system, external_id, assignee_email, resource_id, title, status, start_date, due_date, estimate_hours, raw_payload, last_synced_at
   - Unique: (organization_id, external_system, external_id)

2. **`external_user_mappings`**
   - Fields: id, organization_id, external_system, external_email, external_user_id, resource_id
   - Unique: (organization_id, external_system, external_email)

3. **`integration_connections`**
   - Fields: id, organization_id, type, base_url, auth_type, encrypted_secrets, enabled, project_mappings, jql_filter, last_polled_at, last_issue_updated_at, status, error_count, webhook_secret
   - Unique: (organization_id, type)

4. **`external_task_events`**
   - Fields: id, idempotency_key, organization_id, external_system, event_type, processed_at, status, error_message
   - Unique: idempotency_key

5. **`workspace_module_configs`**
   - Fields: id, workspace_id, module_key, enabled, config, version
   - Unique: (workspace_id, module_key)

---

### Exact Endpoints

1. **`POST /api/integrations`** - Create integration connection
2. **`GET /api/integrations`** - List integrations (returns `{ data: IntegrationConnection[] }`)
3. **`GET /api/integrations/:id/status`** - Get polling status
4. **`POST /api/integrations/jira/webhook?secret=xxx`** - Webhook handler (returns `{ status: "accepted" }`)
5. **`POST /api/integrations/external-users/mappings`** - Map Jira user to Resource
6. **`GET /api/integrations/external-users/mappings`** - List mappings
7. **`POST /api/integrations/jira/backfill?projectKey=XXX`** - Backfill existing issues

---

### Exact Screens

1. **Admin → Integrations Page**
   - List of integration connections
   - "Connect Jira" button
   - Form: baseUrl, apiToken, project mappings
   - Status indicator: "Active", "Error", "Paused"

2. **Admin → User Mappings Page**
   - Table: Jira Email | Zephix Resource | Actions
   - "Add Mapping" button
   - Form: Select Jira user, Select Zephix resource

3. **Resources → Heatmap Page** (Enhanced)
   - Shows combined load: ResourceAllocations + ExternalTasks
   - External tasks appear as separate bars/indicators
   - Conflicts highlighted when total > 100%

---

### Exact Tests That Must Pass in CI

**Contract Tests:**
```bash
npm test -- integrations.controller.spec.ts
npm test -- external-user-mappings.controller.spec.ts
```

**Integration Tests:**
```bash
npm test -- integration-polling.service.spec.ts
npm test -- external-task.service.spec.ts
```

**E2E Test:**
```bash
npx playwright test tests/integrations-smoke.spec.ts
```

**Smoke Test:**
```bash
ACCESS_TOKEN=xxx npm run smoke:integrations
```

**All Tests Must:**
- ✅ Return `{ data: ... }` format
- ✅ Handle empty data gracefully
- ✅ Never throw 500 errors
- ✅ Use mocked Jira adapter (no real API calls)
- ✅ Pass in CI without flakiness

---

**Definition of Done Checklist:**
- [ ] All 5 tables created via migrations
- [ ] All 7 endpoints implemented with contract tests
- [ ] All 3 screens implemented with route guards
- [ ] Polling service runs every 5 minutes
- [ ] ExternalTask updates trigger conflict recalculation
- [ ] Heatmap shows combined load (allocations + external tasks)
- [ ] User mapping UI allows admin to map Jira users
- [ ] All contract tests pass
- [ ] All integration tests pass
- [ ] E2E test passes with mocked Jira
- [ ] Smoke test script passes

---

**Assessment Completed:** 2025-12-18
**Ready for Architect Review**






