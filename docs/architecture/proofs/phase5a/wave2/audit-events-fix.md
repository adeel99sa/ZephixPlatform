# audit_events Schema Drift Fix

**Date:** 2026-02-15
**Blocker:** Phase creation failed with `null value in column "organization_id" of relation "audit_events" violates not-null constraint`

## Root Cause

Two entities mapped to the same `audit_events` table with incompatible schemas:

| Property | Phase 3B Entity (correct) | Work-Management Entity (stale) |
|----------|--------------------------|-------------------------------|
| org id | `organizationId` → `organization_id` | **missing** |
| actor | `actorUserId` → `actor_user_id` | `userId` → `user_id` |
| role | `actorPlatformRole` → `actor_platform_role` | **missing** |
| action | `action` | `eventType` → `event_type` |
| metadata | `metadataJson` → `metadata_json` | `metadata` |
| extra | — | `projectId`, `oldState`, `newState` |

The work-management entity was from Sprint 5. The DB schema was Phase 3B
(from migration `18000000000008-AuditEvents.ts`). The entity never got updated.

## Fix Applied

1. **Entity alignment** — `work-management/entities/audit-event.entity.ts`
   - Replaced all Sprint 5 columns with Phase 3B columns
   - Added doc comment marking audit module entity as canonical source

2. **Service writes** — `work-management/services/work-phases.service.ts`
   - All 4 audit event writes (CREATED, REORDERED, RESTORED, DELETED) updated
   - Added `organizationId`, `actorPlatformRole`; replaced `userId`→`actorUserId`, `eventType`→`action`, `metadata`→`metadataJson`

3. **Safety migration** — `17980242000000-AlignAuditEventsEntitySchema.ts`
   - Ensures Phase 3B columns exist (idempotent)
   - Makes stale Sprint 5 columns nullable
   - Forward-only: no destructive rollback

4. **Schema test** — `work-management/__tests__/audit-event-entity-alignment.spec.ts`
   - 8 tests, all passing

## Migration Name

`AlignAuditEventsEntitySchema17980242000000`
