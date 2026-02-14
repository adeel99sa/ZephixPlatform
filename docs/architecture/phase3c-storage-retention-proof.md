# Phase 3C: Storage Metering, Retention, and Attachment Governance — Proof Document

## Summary

Phase 3C hardens the attachment subsystem with provable quota accuracy, a reserved-vs-used metering model, plan-based retention policies, expiry enforcement, and a cleanup job. Integrates with Phase 3A entitlements and Phase 3B audit trail.

---

## Schema Changes

### Migration: `18000000000009-AttachmentRetentionAndMetering.ts`

**Attachments table additions:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| retention_days | int | null | Days before expiry |
| expires_at | timestamptz | null | Computed from uploadedAt + retentionDays |
| last_downloaded_at | timestamptz | null | Tracks last download issuance |

**workspace_storage_usage additions:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| reserved_bytes | bigint | 0 | Bytes reserved by pending presigns |

**Constraints added:**

| Constraint | Table | Rule |
|-----------|-------|------|
| CHK_attachments_retention_days | attachments | retention_days IS NULL OR (1..3650) |
| CHK_storage_used_nonneg | workspace_storage_usage | used_bytes >= 0 |
| CHK_storage_reserved_nonneg | workspace_storage_usage | reserved_bytes >= 0 |

**Indexes added:**

| Index | Columns | Condition |
|-------|---------|-----------|
| IDX_attachments_org_ws_expires | (org_id, ws_id, expires_at) | WHERE expires_at IS NOT NULL |
| IDX_attachments_org_ws_status_uploaded | (org_id, ws_id, status, uploaded_at DESC) | — |

All DDL is idempotent. Down migration uses IF EXISTS for every DROP.

---

## Reserved vs Used Metering Model

### Problem
The old model only tracked `used_bytes`. Between presign and complete, quota could be exceeded by concurrent uploads because reserved space wasn't counted.

### Solution

| Operation | reserved_bytes | used_bytes |
|-----------|---------------|------------|
| createPresign | +sizeBytes | — |
| completeUpload | -sizeBytes | +sizeBytes |
| delete (pending) | -sizeBytes | — |
| delete (uploaded) | — | -sizeBytes |
| retention purge | — | -sizeBytes |

**Quota check formula:**
```
effective_usage = SUM(used_bytes + reserved_bytes) WHERE organization_id = ?
if effective_usage + new_size > max_storage_bytes → STORAGE_LIMIT_EXCEEDED
```

**Safety:**
- All SQL uses `GREATEST(0, ...)` to prevent negative byte counts
- Uses `INSERT ... ON CONFLICT DO UPDATE` for atomic upsert on reserve
- Single query per operation — no read-then-write race conditions

---

## Retention Matrix by Plan

| Plan | attachment_retention_days | Behavior |
|------|--------------------------|----------|
| FREE | 30 | Expires 30 days after upload |
| TEAM | 180 | Expires 180 days after upload |
| ENTERPRISE | null | No expiry |
| CUSTOM | null | No expiry |

- Set automatically on `completeUpload` via `entitlementService.getLimit('attachment_retention_days')`
- Admin/workspace_owner/delivery_owner can override per-attachment via PATCH endpoint

---

## Endpoints

### New Endpoints

| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| PATCH | `/work/workspaces/:wsId/attachments/:id/retention` | ADMIN, workspace_owner, delivery_owner | Override retention for single attachment |
| POST | `/admin/attachments/purge-expired` | Platform ADMIN only | Manually trigger retention cleanup |

### Modified Endpoints (Download Tightening)

| Condition | Response |
|-----------|----------|
| status = pending | 404 Not Found |
| status = deleted | 404 Not Found |
| expires_at < now() | 410 Gone (ATTACHMENT_EXPIRED) |
| Successful download | Updates last_downloaded_at, emits download_link audit |

---

## Retention Cleanup Job

`AttachmentsService.purgeExpired(limit = 500)`:

1. Finds attachments: `status = 'uploaded' AND expires_at < NOW() AND deleted_at IS NULL`
2. For each expired attachment:
   - Sets `status = 'deleted'`, `deleted_at = NOW()`
   - Decrements `used_bytes` atomically
   - Calls `storageService.deleteObject()` (best-effort)
   - Emits audit event: `action = delete`, `metadata.source = retention_job`
3. Individual item failures do not block batch processing
4. Returns `{ purged: number }`

---

## Audit Events Emitted (Phase 3C)

| Event | Action | Source |
|-------|--------|--------|
| Presign creates | presign_create | attachments |
| Upload completes | upload_complete | attachments |
| Manual delete | delete | attachments |
| Retention override | update | attachments |
| Download link issued | download_link | attachments |
| Retention purge | delete | retention_job |

No presigned URLs or storage keys are stored in any audit payload.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/migrations/18000000000009-AttachmentRetentionAndMetering.ts` | Schema extensions |
| `src/modules/attachments/services/__tests__/storage-metering.spec.ts` | 12 metering tests |
| `src/modules/attachments/services/__tests__/attachments-retention.spec.ts` | 18 retention tests |
| `src/modules/attachments/services/__tests__/retention-job.spec.ts` | 7 cleanup job tests |
| `src/modules/attachments/services/__tests__/download-audit.spec.ts` | 7 download audit tests |
| `src/modules/attachments/controllers/__tests__/controller-gating.spec.ts` | 7 gating tests |
| `src/modules/attachments/__tests__/retention-entitlement.spec.ts` | 8 entitlement tests |
| `src/modules/attachments/__tests__/migration-idempotency.spec.ts` | 6 migration tests |
| `src/modules/attachments/__tests__/entity-fields.spec.ts` | 12 entity field tests |

## Files Modified

| File | Changes |
|------|---------|
| `src/modules/attachments/entities/attachment.entity.ts` | Added retentionDays, expiresAt, lastDownloadedAt fields + indexes |
| `src/modules/billing/entities/workspace-storage-usage.entity.ts` | Added reservedBytes field |
| `src/modules/billing/entitlements/entitlement.registry.ts` | Added attachment_retention_days to EntitlementKey and all plans |
| `src/modules/attachments/services/attachments.service.ts` | Rewrote with reserved vs used model, retention, purge, download tightening |
| `src/modules/attachments/controllers/attachments.controller.ts` | Added PATCH retention endpoint, WorkspaceRoleGuardService injection |
| `src/modules/attachments/dto/attachment.dto.ts` | Added retentionDays, expiresAt, lastDownloadedAt to DTO |
| `src/admin/admin.controller.ts` | Added POST purge-expired endpoint |
| `src/admin/admin.module.ts` | Added AttachmentsModule import |
| `src/modules/attachments/controllers/__tests__/attachments.controller.spec.ts` | Added WorkspaceRoleGuardService mock |

---

## Test Results

### Phase 3C New Tests: 8 suites, 71 tests — ALL PASS

### Regression: attachment + billing + entitlement + audit
- **29 suites, 306 tests — ALL PASS**

### Work-management regression
- **30 suites, 260 tests — ALL PASS**

### Compilation
- `npx tsc --noEmit` (backend): **exit 0**
- `npx tsc --noEmit` (frontend): **exit 0**

---

## Security Checklist

- [x] Never log presigned URLs
- [x] Never store presigned URLs in DB or audit
- [x] All queries scoped by organizationId and workspaceId
- [x] Download blocked for pending/deleted/expired
- [x] Retention override gated by ADMIN/workspace_owner/delivery_owner
- [x] Purge endpoint gated by platform ADMIN only
- [x] No negative byte counts possible (GREATEST(0, ...) SQL)
- [x] Entitlement checks use reserved + used for quota accuracy
