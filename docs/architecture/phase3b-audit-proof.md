# Phase 3B: Audit Trail & Compliance Layer — Proof Document

## Overview

Phase 3B introduces an immutable, append-only audit log for Zephix, covering all critical write actions from Phases 2A through 3A. The audit system enforces organization and workspace scoping, sanitizes sensitive data, supports transactional writes, and provides admin-only query endpoints with pagination.

---

## Migration Summary

| Migration | Table | Purpose |
|-----------|-------|---------|
| `18000000000008-AuditEvents.ts` | `audit_events` | Immutable audit log — no `updated_at`, no `deleted_at` |

### Table: `audit_events`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid (PK) | NOT NULL | `gen_random_uuid()` |
| organization_id | uuid | NOT NULL | Scoping |
| workspace_id | uuid | YES | Null for org-level events |
| actor_user_id | uuid | NOT NULL | Who performed the action |
| actor_platform_role | varchar(30) | NOT NULL | CHECK: ADMIN, MEMBER, VIEWER, OWNER, SYSTEM |
| actor_workspace_role | varchar(30) | YES | |
| entity_type | varchar(40) | NOT NULL | CHECK: 17 allowed values |
| entity_id | uuid | NOT NULL | |
| action | varchar(40) | NOT NULL | CHECK: 18 allowed values |
| before_json | jsonb | YES | Sanitized |
| after_json | jsonb | YES | Sanitized |
| metadata_json | jsonb | YES | Sanitized |
| ip_address | varchar(45) | YES | |
| user_agent | varchar(512) | YES | Truncated |
| created_at | timestamptz | NOT NULL | `DEFAULT now()` |

### Indexes

| Index | Columns | Notes |
|-------|---------|-------|
| `IDX_audit_events_org_created` | (organization_id, created_at DESC) | Primary query pattern |
| `IDX_audit_events_org_entity` | (organization_id, entity_type, entity_id, created_at DESC) | Entity lookup |
| `IDX_audit_events_org_ws_created` | (organization_id, workspace_id, created_at DESC) | Workspace scoped, partial WHERE workspace_id IS NOT NULL |

### Idempotency

- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `ADD CONSTRAINT` with `DO $$ EXCEPTION WHEN duplicate_object THEN NULL; END $$`
- Down: `DROP INDEX IF EXISTS`, `DROP TABLE IF EXISTS audit_events`

---

## Endpoints & Gating

| Method | Route | Role Gate | Pagination |
|--------|-------|-----------|------------|
| GET | `/work/workspaces/:wsId/audit` | ADMIN, workspace_owner, delivery_owner | Yes (page, pageSize max 200) |
| GET | `/audit/org` | Platform ADMIN only | Yes (page, pageSize max 200) |

### Query Parameters

- `page` (default 1)
- `pageSize` (default 50, max 200)
- `entityType` (optional filter)
- `entityId` (optional filter)
- `action` (optional filter)
- `actorUserId` (optional filter)
- `from` (ISO date, optional)
- `to` (ISO date, optional)

### Response Format

```json
{
  "data": {
    "items": [AuditEventDto],
    "page": 1,
    "pageSize": 50,
    "total": 123
  }
}
```

---

## Event Matrix

| Subsystem | Entity Type | Action | Where Emitted | Transactional |
|-----------|------------|--------|---------------|---------------|
| **Attachments** | attachment | presign_create | AttachmentsService.createPresign | No |
| **Attachments** | attachment | upload_complete | AttachmentsService.completeUpload | No |
| **Attachments** | attachment | delete | AttachmentsService.deleteAttachment | No |
| **Scenarios** | scenario_plan | create | ScenariosService.create | No |
| **Scenarios** | scenario_plan | update | ScenariosService.update | No |
| **Scenarios** | scenario_plan | delete | ScenariosService.softDelete | No |
| **Scenarios** | scenario_action | create | ScenariosService.addAction | No |
| **Scenarios** | scenario_action | delete | ScenariosService.removeAction | No |
| **Scenarios** | scenario_result | compute | ScenariosService.upsertResult | No |
| **Baselines** | baseline | create | BaselineService.createBaseline | **Yes** (manager) |
| **Baselines** | baseline | activate | BaselineService.setActiveBaseline | **Yes** (manager) |
| **Schedule Drag** | work_task | update | ScheduleRescheduleService.applyGanttDrag | **Yes** (manager) |
| **Capacity** | capacity_calendar | update | CapacityCalendarController.setCapacity | No |
| **Portfolio** | portfolio | attach | PortfoliosService.addProjects | No |
| **Portfolio** | portfolio | detach | PortfoliosService.removeProjects | No |
| **Board Moves** | work_task | update | WorkTasksService.updateTask | No |
| **Role Changes** | workspace | role_change | WorkspaceMembersService.changeRole | No |
| **Invites** | workspace | accept | WorkspaceInviteService.joinWorkspace | No |

---

## Sanitization Rules

### Stripped Keys

All JSONB payloads (before_json, after_json, metadata_json) are sanitized before persistence:

- `token`, `refresh`, `refreshToken`, `password`, `secret`
- `signature`, `presigned`, `presignedUrl`, `presignedPutUrl`, `presignedGetUrl`
- `url`, `storageEndpoint`, `accessKey`, `secretKey`
- `apiKey`, `authorization`, `cookie`
- Any key containing a forbidden substring (case-insensitive)

### Special Rules

- **Attachments**: Never store presigned URLs, bucket names, or storage endpoints. Only store attachmentId, parentType, parentId, fileName, sizeBytes, mimeType.
- **Invites**: Token is never stored. Only email domain is logged.
- **Schedule Drag**: Cascaded task IDs capped at 50, with overflowCount for larger sets.

---

## Double-Logging Prevention

`metadata.source` field distinguishes audit event origin:

| Source | Used By |
|--------|---------|
| `attachments` | AttachmentsService |
| `scenarios` | ScenariosService |
| `baselines` | BaselineService |
| `schedule_drag` | ScheduleRescheduleService |
| `capacity` | CapacityCalendarController |
| `portfolio` | PortfoliosService |
| `board` | WorkTasksService.updateTask |
| `role_change` | WorkspaceMembersService |
| `invite` | WorkspaceInviteService |

`WorkTasksService.updateTask` accepts optional `auditSource` parameter. When provided (e.g., by schedule drag), the board audit emission is suppressed.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/migrations/18000000000008-AuditEvents.ts` | Migration |
| `src/modules/audit/audit.constants.ts` | Enums + constants |
| `src/modules/audit/audit.module.ts` | Global module |
| `src/modules/audit/entities/audit-event.entity.ts` | TypeORM entity |
| `src/modules/audit/services/audit.service.ts` | Core service + sanitization |
| `src/modules/audit/controllers/audit.controller.ts` | Query endpoints |
| `src/modules/audit/dto/audit-event.dto.ts` | Response DTO |
| `src/modules/audit/dto/list-audit.query.ts` | Query DTO |
| `src/shared/request/request-context.ts` | IP + UA extraction |
| `src/modules/audit/__tests__/audit.service.spec.ts` | 21 tests |
| `src/modules/audit/__tests__/audit.controller.spec.ts` | 15 tests |
| `src/modules/audit/__tests__/attachments.audit.spec.ts` | 8 tests |
| `src/modules/audit/__tests__/scenarios.audit.spec.ts` | 9 tests |
| `src/modules/audit/__tests__/baselines.audit.spec.ts` | 6 tests |
| `src/modules/audit/__tests__/worktasks.audit.spec.ts` | 5 tests |
| `src/modules/audit/__tests__/audit.constants.spec.ts` | 8 tests |
| `src/modules/audit/__tests__/audit-entity.spec.ts` | 6 tests |
| `src/modules/audit/__tests__/request-context.spec.ts` | 10 tests |
| `src/modules/audit/__tests__/audit-dto.spec.ts` | 2 tests |

## Files Modified

| File | Change |
|------|--------|
| `src/app.module.ts` | Import + register AuditModule |
| `src/modules/attachments/services/attachments.service.ts` | +AuditService, 3 audit calls |
| `src/modules/scenarios/services/scenarios.service.ts` | +AuditService, 7 audit calls |
| `src/modules/scenarios/controllers/scenarios.controller.ts` | Pass actor context |
| `src/modules/work-management/services/baseline.service.ts` | +AuditService, 2 audit calls (transactional) |
| `src/modules/work-management/services/schedule-reschedule.service.ts` | +AuditService, 1 audit call (transactional) |
| `src/modules/work-management/controllers/capacity-calendar.controller.ts` | +AuditService, 1 audit call |
| `src/modules/portfolios/services/portfolios.service.ts` | +AuditService, attach/detach audit |
| `src/modules/work-management/services/work-tasks.service.ts` | +AuditService, board move audit |
| `src/modules/workspaces/services/workspace-members.service.ts` | +AuditService, role_change audit |
| `src/modules/workspaces/services/workspace-invite.service.ts` | +AuditService, invite accept audit |

---

## Test Results

### Audit Module Tests: 90 passed

```
Test Suites: 10 passed, 10 total
Tests:       90 passed, 90 total
```

### Regression Tests

```
Backend tsc --noEmit: exit 0
Frontend tsc --noEmit: exit 0

work-management:      29 suites, 254 tests — ALL PASS
billing/entitlement:   7 suites, 103 tests — ALL PASS
audit module:         10 suites,  90 tests — ALL PASS
scenarios:             2 suites,  19 tests — ALL PASS
attachments:           2 suites,  23 tests — ALL PASS
workspaces:            8 suites,  63 tests — ALL PASS
portfolios:            1 suite,   17 tests — ALL PASS

Combined Phase 2A-3B: 59 suites, 591 tests — ALL PASS
```

---

## Design Decisions

1. **Append-only**: No `updated_at`, no `deleted_at`, no update/delete endpoints. Compliance-grade immutability.
2. **Fail-safe**: `AuditService.record()` catches all errors and logs them. Audit never breaks business flow.
3. **Transactional where possible**: Baselines and schedule drag use `EntityManager` for same-transaction audit writes.
4. **Global module**: `@Global()` on `AuditModule` makes `AuditService` injectable everywhere without explicit module imports.
5. **No secrets**: Comprehensive sanitization strips 15+ forbidden key patterns including substring matching.
6. **Double-logging prevention**: `metadata.source` and `auditSource` parameter prevent duplicate events when services chain.
