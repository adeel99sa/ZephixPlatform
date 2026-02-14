# Project Clone Specification

**Version:** 1.0
**Status:** Draft
**Author:** Solution Architect
**Date:** 2026-02-12

---

## 1. Overview

A transactional project duplication engine with two controlled modes.
Phase 1 ships **Mode A (Structure Only)**.
Phase 2 ships **Mode B (Full Clone)**.

Both modes use the same `ProjectCloneService` with a strategy interface.

---

## 2. Clone Modes

### 2.1 Mode A — Structure Only

Creates a clean operational shell. No work data.

| Entity | Table | Copy | Field Reset Rules |
|--------|-------|------|-------------------|
| **Project** | `projects` | Yes | See §3.1 |
| **WorkPhase** | `work_phases` | Yes | See §3.2 |
| **PhaseGateDefinition** | `phase_gate_definitions` | Yes | See §3.3 |
| **ProjectWorkflowConfig** | `project_workflow_configs` | Yes | See §3.4 |
| **ProjectKpi** | `project_kpis` | Yes | See §3.5 |
| **ProjectView** | `project_views` | Yes | See §3.6 |

**Explicit skip set (Mode A):**

| Entity | Table | Reason |
|--------|-------|--------|
| WorkTask | `work_tasks` | Operational data |
| WorkItem | `work_items` | Operational data |
| WorkTaskDependency | `work_task_dependencies` | Requires tasks |
| WorkResourceAllocation | `work_resource_allocations` | Operational data |
| ResourceAllocation | `resource_allocations` | Operational data |
| PhaseGateSubmission | `phase_gate_submissions` | Decision history |
| GateApproval | `gate_approvals` | Identity-bound |
| KpiValue | `kpi_values` | Operational data |
| WorkRisk | `work_risks` | Operational data |
| TaskComment | `task_comments` | Identity-bound |
| TaskActivity | `task_activities` | Identity-bound |
| WorkItemComment | `work_item_comments` | Identity-bound |
| WorkItemActivity | `work_item_activities` | Identity-bound |
| AuditEvent | `audit_events` | Non-transferable |
| AckToken | `ack_tokens` | Identity-bound |
| DocumentInstance | `document_instances` | Operational data |
| MaterializedProjectMetrics | `materialized_project_metrics` | Recomputed |

### 2.2 Mode B — Full Operational Clone (Phase 2)

Everything in Mode A, plus:

| Entity | Table | Copy | Field Reset Rules |
|--------|-------|------|-------------------|
| WorkTask | `work_tasks` | Yes | See §3.7 |
| WorkTaskDependency | `work_task_dependencies` | Yes | See §3.8 |
| WorkResourceAllocation | `work_resource_allocations` | Yes | See §3.9 |
| WorkRisk | `work_risks` | Yes | See §3.10 |
| KpiValue (latest only) | `kpi_values` | Yes | See §3.11 |
| DocumentInstance | `document_instances` | Yes | See §3.12 |

**Mode B additional skip set:**

| Entity | Table | Reason |
|--------|-------|--------|
| TaskActivity | `task_activities` | History |
| TaskComment | `task_comments` | User references |
| WorkItemActivity | `work_item_activities` | History |
| WorkItemComment | `work_item_comments` | User references |
| AuditEvent | `audit_events` | Non-transferable |
| PhaseGateSubmission | `phase_gate_submissions` | Decision history |
| GateApproval | `gate_approvals` | Approval history |
| AckToken | `ack_tokens` | Identity-bound |

---

## 3. Field Reset Rules Per Entity

### 3.1 Project

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | `uuid_generate_v4()` |
| `name` | Input or derive | `newName` from request, or `"${source.name} (Copy)"` |
| `description` | Copy | from source |
| `status` | Reset | `ProjectStatus.PLANNING` |
| `priority` | Copy | from source |
| `startDate` | Copy | from source |
| `endDate` | Copy | from source |
| `estimatedEndDate` | Copy | from source |
| `workspaceId` | Set | `targetWorkspaceId` from request |
| `organizationId` | Set | from source (must match; cross-org clone is forbidden) |
| `projectManagerId` | Reset | `null` (new project has no manager until assigned) |
| `budget` | Copy | from source |
| `actualCost` | Reset | `0` |
| `riskLevel` | Reset | `ProjectRiskLevel.MEDIUM` |
| `createdById` | Set | requesting `userId` |
| `createdAt` | Generate | `now()` |
| `updatedAt` | Generate | `now()` |
| `portfolioId` | Reset | `null` (clone is unlinked from portfolio) |
| `programId` | Reset | `null` (clone is unlinked from program) |
| `size` | Copy | from source |
| `methodology` | Copy | from source |
| `templateId` | Copy | from source (preserves template provenance) |
| `templateVersion` | Copy | from source |
| `templateLocked` | Reset | `false` (clone is unlocked) |
| `templateSnapshot` | Copy | from source (preserves applied snapshot) |
| `state` | Reset | `ProjectState.DRAFT` |
| `startedAt` | Reset | `null` |
| `structureLocked` | Reset | `false` |
| `structureSnapshot` | Reset | `null` |
| `health` | Reset | `ProjectHealth.HEALTHY` |
| `behindTargetDays` | Reset | `null` |
| `healthUpdatedAt` | Reset | `null` |
| `deliveryOwnerUserId` | Reset | `null` |
| `activeKpiIds` | Copy | from source |
| `definitionOfDone` | Copy | from source |
| **`sourceProjectId`** | Set | source `project.id` (NEW COLUMN) |
| **`cloneDepth`** | Set | `source.cloneDepth + 1` (NEW COLUMN) |
| **`clonedAt`** | Set | `now()` (NEW COLUMN) |
| **`clonedBy`** | Set | requesting `userId` (NEW COLUMN) |

### 3.2 WorkPhase

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `organizationId` | Set | from source project |
| `workspaceId` | Set | `targetWorkspaceId` |
| `projectId` | Set | new project ID |
| `programId` | Set | `null` |
| `name` | Copy | from source |
| `sortOrder` | Copy | from source |
| `reportingKey` | Copy | from source |
| `isMilestone` | Copy | from source |
| `startDate` | Copy | from source |
| `dueDate` | Copy | from source |
| `sourceTemplatePhaseId` | Copy | from source (preserves template lineage) |
| `isLocked` | Reset | `false` |
| `createdByUserId` | Set | requesting `userId` |
| `createdAt` | Generate | `now()` |
| `updatedAt` | Generate | `now()` |
| `deletedAt` | Reset | `null` |
| `deletedByUserId` | Reset | `null` |

**ID Map:** `Map<string, string>` — `oldPhaseId → newPhaseId`

### 3.3 PhaseGateDefinition

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `organizationId` | Set | from source project |
| `workspaceId` | Set | `targetWorkspaceId` |
| `projectId` | Set | new project ID |
| `phaseId` | Remap | via phase ID map |
| `name` | Copy | from source |
| `gateKey` | Copy | from source |
| `status` | Copy | from source |
| `reviewersRolePolicy` | Copy | from source |
| `requiredDocuments` | Copy | from source |
| `requiredChecklist` | Copy | from source |
| `thresholds` | Copy | from source |
| `createdByUserId` | Set | requesting `userId` |
| `createdAt` | Generate | `now()` |
| `updatedAt` | Generate | `now()` |
| `deletedAt` | Reset | `null` |

**Constraint:** `Unique(phaseId)` — safe because phaseId is new.

### 3.4 ProjectWorkflowConfig

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `organizationId` | Set | from source project |
| `workspaceId` | Set | `targetWorkspaceId` |
| `projectId` | Set | new project ID |
| `defaultWipLimit` | Copy | from source |
| `statusWipLimits` | Copy | from source |
| `createdAt` | Generate | `now()` |
| `updatedAt` | Generate | `now()` |

**Constraint:** `Unique(projectId)` — safe because projectId is new.

### 3.5 ProjectKpi

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `projectId` | Set | new project ID |
| `kpiDefinitionId` | Copy | from source |
| `isRequired` | Copy | from source |
| `source` | Copy | from source |
| `createdAt` | Generate | `now()` |

**ID Map:** `Map<string, string>` — `oldProjectKpiId → newProjectKpiId` (needed for Mode B KpiValue copy)

**Constraint:** `Unique(projectId, kpiDefinitionId)` — safe because projectId is new.

### 3.6 ProjectView

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `projectId` | Set | new project ID |
| `type` | Copy | from source |
| `label` | Copy | from source |
| `sortOrder` | Copy | from source |
| `isEnabled` | Copy | from source |
| `config` | Copy | from source |
| `createdAt` | Generate | `now()` |
| `updatedAt` | Generate | `now()` |

**Constraint:** `Unique(projectId, type)` — safe because projectId is new.

### 3.7 WorkTask (Mode B only)

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `organizationId` | Set | from source project |
| `workspaceId` | Set | `targetWorkspaceId` |
| `projectId` | Set | new project ID |
| `phaseId` | Remap | via phase ID map |
| `title` | Copy | from source |
| `description` | Copy | from source |
| `status` | Copy | from source (keep current status) |
| `priority` | Copy | from source |
| `assigneeId` | Copy | from source |
| `dueDate` | Copy | from source |
| `position` | Copy | from source |
| `acceptanceCriteria` | Copy | from source |
| `definitionOfDone` | Copy | from source |
| `storyPoints` | Copy | from source |
| `deletedAt` | Reset | `null` |

**ID Map:** `Map<string, string>` — `oldTaskId → newTaskId`

### 3.8 WorkTaskDependency (Mode B only)

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `projectId` | Set | new project ID |
| `predecessorId` | Remap | via task ID map |
| `successorId` | Remap | via task ID map |
| `type` | Copy | from source |

**Rule:** If either `predecessorId` or `successorId` is not in the task ID map (points to a task in another project), **skip** that dependency. Do not create cross-project dependencies during clone.

### 3.9 WorkResourceAllocation (Mode B only)

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `organizationId` | Set | from source project |
| `workspaceId` | Set | `targetWorkspaceId` |
| `projectId` | Set | new project ID |
| `userId` | Copy | from source |
| `allocationPercentage` | Copy | from source |
| `startDate` | Copy | from source |
| `endDate` | Copy | from source |
| `deletedAt` | Reset | `null` |

**Cross-workspace rule:** If `targetWorkspaceId` differs from source, skip allocations for users who are not members of the target workspace.

### 3.10 WorkRisk (Mode B only)

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `organizationId` | Set | from source project |
| `workspaceId` | Set | `targetWorkspaceId` |
| `projectId` | Set | new project ID |
| All other fields | Copy | from source |
| `deletedAt` | Reset | `null` |

### 3.11 KpiValue — Latest Only (Mode B only)

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `projectKpiId` | Remap | via ProjectKpi ID map |
| `recordedAt` | Set | `now()` (snapshot moment) |
| `value` | Copy | latest from source (ORDER BY recordedAt DESC LIMIT 1) |
| `valueText` | Copy | from same latest row |
| `metadata` | Set | `{ "cloned_from_value_id": "<original_id>" }` |

**Rule:** One KpiValue per ProjectKpi. Take only the most recent.

### 3.12 DocumentInstance (Mode B only)

| Field | Rule | Value |
|-------|------|-------|
| `id` | Generate | new UUID |
| `projectId` | Set | new project ID |
| `workspaceId` | Set | `targetWorkspaceId` |
| All other fields | Copy | from source |

---

## 4. Name Generation Rules

Projects do not have a `slug` column. There is no unique constraint on `(workspaceId, name)`.

**Rule:**
1. If `newName` is provided in the request, use it.
2. If `newName` is not provided, derive: `"${source.name} (Copy)"`.
3. If deriving and a project with that name already exists in the target workspace, append a counter: `"${source.name} (Copy 2)"`, `"${source.name} (Copy 3)"`, etc.
4. Maximum name length: 255 characters (varchar column constraint).

**Implementation:**

```typescript
async generateCloneName(
  sourceName: string,
  targetWorkspaceId: string,
  organizationId: string,
  manager: EntityManager,
  requestedName?: string,
): Promise<string> {
  const baseName = requestedName || `${sourceName} (Copy)`;

  // Check if name already exists in target workspace
  const existing = await manager.find(Project, {
    where: { workspaceId: targetWorkspaceId, organizationId },
    select: ['name'],
  });

  const existingNames = new Set(existing.map(p => p.name));

  if (!existingNames.has(baseName)) return baseName;

  // Append counter
  for (let i = 2; i <= 100; i++) {
    const candidate = requestedName
      ? `${requestedName} (${i})`
      : `${sourceName} (Copy ${i})`;
    if (!existingNames.has(candidate)) return candidate;
  }

  // Fallback: append timestamp
  return `${baseName} ${Date.now()}`;
}
```

---

## 5. Domain Event: `project.cloned`

### 5.1 Event Type Definition

```typescript
export interface ProjectClonedEvent extends DomainEvent {
  name: 'project.cloned';
  data: {
    newProjectId: string;
    sourceProjectId: string;
    cloneMode: 'structure_only' | 'full_clone';
    targetWorkspaceId: string;
    sourceWorkspaceId: string;
    cloneDepth: number;
    entityCounts: {
      phases: number;
      gateDefinitions: number;
      kpiAssignments: number;
      views: number;
      workflowConfig: boolean;
      // Mode B only:
      tasks?: number;
      dependencies?: number;
      allocations?: number;
      risks?: number;
      kpiValues?: number;
      documents?: number;
    };
  };
}
```

### 5.2 Emission Timing

Emit **after** the transaction commits successfully.
Do NOT emit inside the transaction — if the transaction rolls back, the event must not fire.

```typescript
// In ProjectCloneService.clone():
const result = await queryRunner.commitTransaction();
// Emit AFTER commit
await this.domainEventsPublisher.publish({
  name: 'project.cloned',
  orgId: organizationId,
  workspaceId: targetWorkspaceId,
  projectId: newProjectId,
  actorId: userId,
  occurredAt: new Date(),
  data: { ... },
});
```

---

## 6. Endpoint Contract

### 6.1 Request

```
POST /api/workspaces/:workspaceId/projects/:projectId/clone
```

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `workspaceId` | uuid | Source workspace ID |
| `projectId` | uuid | Source project ID |

**Body:**

```typescript
{
  "mode": "structure_only" | "full_clone",
  "newName"?: string,            // Optional. Defaults to "${sourceName} (Copy)"
  "targetWorkspaceId"?: string   // Optional. Defaults to source workspaceId
}
```

**Validation rules:**

| Field | Rule |
|-------|------|
| `mode` | Required. Must be `structure_only` or `full_clone`. Phase 1: reject `full_clone` with 400. |
| `newName` | Optional. Max 255 chars. |
| `targetWorkspaceId` | Optional. Must be a workspace in the same organization. User must be a member. |

### 6.2 Response

**200 OK:**

```json
{
  "data": {
    "newProjectId": "uuid",
    "sourceProjectId": "uuid",
    "mode": "structure_only",
    "cloneRequestId": "uuid",
    "name": "My Project (Copy)",
    "workspaceId": "uuid"
  }
}
```

**Error responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_CLONE_MODE` | `mode` is `full_clone` and Phase 2 is not enabled |
| 400 | `CLONE_MODE_REQUIRED` | `mode` is missing |
| 403 | `SOURCE_ACCESS_DENIED` | User is not a member of source workspace |
| 403 | `TARGET_ACCESS_DENIED` | User is not a member of target workspace |
| 403 | `CROSS_ORG_CLONE_FORBIDDEN` | Target workspace is in a different organization |
| 404 | `PROJECT_NOT_FOUND` | Source project does not exist |
| 404 | `WORKSPACE_NOT_FOUND` | Target workspace does not exist |
| 409 | `CLONE_IN_PROGRESS` | A clone request for same source+target+mode+user is already `IN_PROGRESS` |
| 422 | `CLONE_POLICY_DISABLED` | Policy `project_clone_enabled` is `false` |

### 6.3 Guards

```typescript
@UseGuards(JwtAuthGuard, RequireWorkspaceAccessGuard)
```

Target workspace membership is checked inside the service.

---

## 7. Idempotency: ProjectCloneRequest Table

### 7.1 Entity

```typescript
@Entity('project_clone_requests')
@Index(['sourceProjectId', 'targetWorkspaceId', 'mode', 'requestedBy', 'status'],
  { unique: true, where: `"status" = 'in_progress'` })
export class ProjectCloneRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'source_project_id' })
  sourceProjectId: string;

  @Column({ type: 'uuid', name: 'target_workspace_id' })
  targetWorkspaceId: string;

  @Column({ type: 'varchar', length: 30 })
  mode: string; // 'structure_only' | 'full_clone'

  @Column({ type: 'uuid', name: 'requested_by' })
  requestedBy: string;

  @Column({ type: 'varchar', length: 30, default: 'in_progress' })
  status: string; // 'in_progress' | 'completed' | 'failed'

  @Column({ type: 'uuid', name: 'new_project_id', nullable: true })
  newProjectId: string | null;

  @Column({ type: 'text', name: 'failure_reason', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;
}
```

### 7.2 Behavior

1. Before starting clone, INSERT into `project_clone_requests` with `status = 'in_progress'`.
2. If INSERT violates unique index → 409 `CLONE_IN_PROGRESS`. Return existing request with `newProjectId` if already completed.
3. On clone success → UPDATE `status = 'completed'`, set `newProjectId`, `completedAt`.
4. On clone failure → UPDATE `status = 'failed'`, set `failureReason`.

---

## 8. Clone Execution Sequence

```
1. Parse and validate request DTO
2. Check policy: project_clone_enabled
3. Resolve source project (with orgId tenancy check)
4. Resolve target workspace (with membership check)
5. Validate cross-org is forbidden
6. Insert ProjectCloneRequest (idempotency gate)
7. Create QueryRunner, connect, startTransaction
8. SELECT source project FOR UPDATE (pessimistic lock)
9. Generate clone name (§4)
10. Create new Project with lineage fields (§3.1)
11. Copy WorkPhases → build phaseIdMap (§3.2)
12. Copy PhaseGateDefinitions using phaseIdMap (§3.3)
13. Copy ProjectWorkflowConfig (§3.4)
14. Copy ProjectKpis → build kpiIdMap (§3.5)
15. Copy ProjectViews (§3.6)
16. [Mode B] Copy WorkTasks → build taskIdMap (§3.7)
17. [Mode B] Copy WorkTaskDependencies using taskIdMap (§3.8)
18. [Mode B] Copy WorkResourceAllocations (§3.9)
19. [Mode B] Copy WorkRisks (§3.10)
20. [Mode B] Copy latest KpiValues using kpiIdMap (§3.11)
21. [Mode B] Copy DocumentInstances (§3.12)
22. Commit transaction
23. Update ProjectCloneRequest → completed
24. Emit project.cloned event (§5)
25. Return response (§6.2)
```

**On failure at any step 7-21:**
- Rollback transaction
- Update ProjectCloneRequest → failed
- Throw appropriate error

---

## 9. Feature Flag

**Policy key:** `project_clone_enabled`
**Default value:** `false`
**Value type:** `boolean`
**Resolution:** Organization > Workspace (project-level override not applicable)

Phase 1: Only `structure_only` mode allowed.
Phase 2: Both modes allowed when `full_clone` feature is enabled.

Add a `PolicyDefinition` seed:

```typescript
{
  key: 'project_clone_enabled',
  category: 'projects',
  description: 'Enable project duplication feature',
  valueType: 'boolean',
  defaultValue: 'false',
}
```

---

## 10. Cross-Workspace Clone Rules

| Scenario | Allowed | Notes |
|----------|---------|-------|
| Same workspace | Yes | Standard case |
| Different workspace, same org | Yes | User must be member of both |
| Different org | No | Hard block. organizationId must match. |
| Target workspace does not exist | No | 404 |
| User is VIEWER on target | No | Requires MEMBER or ADMIN |

---

## 11. Concurrency Safety

| Risk | Mitigation |
|------|------------|
| Concurrent clone of same project | `ProjectCloneRequest` unique index blocks duplicate `in_progress` |
| Source project modified during clone | `SELECT ... FOR UPDATE` locks source project row |
| Source project deleted during clone | FK integrity; lock prevents deletion |
| Partial clone on crash | Transaction rollback; `ProjectCloneRequest` stays `in_progress`, cleaned up by periodic job or manual retry |

---

## 12. Future Extensions (Not in Phase 1 or 2)

| Extension | Notes |
|-----------|-------|
| Clone across organizations | Requires data export/import pattern |
| Clone with time shift | Shift all dates by delta |
| Clone as template | "Save project as template" reverse flow |
| Selective clone | Checkbox-based entity selection |
| Clone queue | Background job for large projects |
| Clone preview | Dry-run showing what will be copied |
