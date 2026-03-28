# Phase 2G — Attachments MVP: Proof Document

## Date
2026-02-13

## Architecture

### Upload Pattern: Presigned PUT
1. Client calls `POST /presign` → backend creates pending row, generates presigned PUT URL
2. Client PUTs file directly to S3 → server never streams bytes
3. Client calls `POST /complete` → backend marks attachment as uploaded

### Storage Key: Server-Generated Only
```
{organizationId}/{workspaceId}/{parentType}/{parentId}/{uuid}-{sanitizedFileName}
```
Client never controls the storage path. Path traversal impossible.

### File Bytes: Never Touch the Server
- No multipart upload endpoint
- No file streaming
- No temp files
- Railway-friendly: zero memory pressure from uploads

## Migration

**File**: `18000000000005-AttachmentsMvp.ts`

| Table | Description |
|-------|-------------|
| `attachments` | File metadata: parent_type (work_task, work_risk, doc, comment), status (pending/uploaded/deleted), storage_key (unique), size/mime/checksum |

All DDL idempotent. CHECK constraints on `parent_type` and `status`. Unique constraint on `storage_key`.

## Endpoints

| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| `POST` | `/work/workspaces/:wsId/attachments/presign` | Member+write, Admin | Create pending + get presigned PUT URL |
| `POST` | `/work/workspaces/:wsId/attachments/:id/complete` | Member+write, Admin | Mark as uploaded |
| `GET` | `/work/workspaces/:wsId/attachments?parentType&parentId` | All (incl. Guest) | List uploaded attachments |
| `GET` | `/work/workspaces/:wsId/attachments/:id/download` | All (incl. Guest) | Get short-lived presigned GET URL |
| `DELETE` | `/work/workspaces/:wsId/attachments/:id` | Uploader, Admin | Soft delete + storage cleanup |

## Security

| Control | Implementation |
|---------|---------------|
| Presigned GET TTL | 60 seconds |
| Presigned PUT TTL | 15 minutes |
| Content-Disposition | `attachment; filename="{sanitized}"` — forces download, no inline render |
| Max file size | 50 MB (configurable via `ATTACHMENTS_MAX_BYTES`) |
| Blocked extensions | .exe, .bat, .cmd, .com, .msi, .scr, .ps1, .sh, .vbs, .js |
| Path traversal | Stripped: `/`, `\`, `..` sequences replaced with `_` |
| Null bytes | Stripped from filenames |
| Storage URLs | Never logged — only context metadata logged |
| Org scoping | All queries include `organizationId` |
| Workspace scoping | All queries include `workspaceId` |
| Soft delete | `deleted_at` timestamp; status set to `deleted` |

## Role Rules

| Role | List/Download | Upload/Delete |
|------|--------------|---------------|
| VIEWER (Guest) | Yes (workspace read) | Blocked |
| MEMBER | Yes | Yes (if workspace write) |
| ADMIN/Owner | Yes | Yes (bypass workspace write check) |

## Test Results

### Backend (42 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| `storage.service.spec.ts` | 6 | PASS |
| `attachment-access.service.spec.ts` | 8 | PASS |
| `attachments.service.spec.ts` | 16 | PASS |
| `attachments.controller.spec.ts` | 12 | PASS |
| **Total** | **42** | **ALL PASS** |

### Frontend (12 tests)

| Suite | Tests | Status |
|-------|-------|--------|
| `attachments.test.tsx` | 12 | PASS |

### Regression

| Scope | Suites | Tests | Status |
|-------|--------|-------|--------|
| Attachments + Scenarios + Capacity | 11 | 125 | ALL PASS |

### Compilation

```
Backend tsc --noEmit:  exit 0 (clean)
Frontend tsc --noEmit: exit 0 (clean)
```

## Files Created

### Backend (11)

| File | Purpose |
|------|---------|
| `migrations/18000000000005-AttachmentsMvp.ts` | Migration |
| `modules/attachments/entities/attachment.entity.ts` | Entity |
| `modules/attachments/dto/create-presign.dto.ts` | Input DTO |
| `modules/attachments/dto/complete-upload.dto.ts` | Input DTO |
| `modules/attachments/dto/list-attachments.query.ts` | Query DTO |
| `modules/attachments/dto/attachment.dto.ts` | Response DTO + transform |
| `modules/attachments/storage/storage.service.ts` | S3-compatible presign + delete |
| `modules/attachments/services/attachment-access.service.ts` | Parent-type auth helper |
| `modules/attachments/services/attachments.service.ts` | Core service |
| `modules/attachments/controllers/attachments.controller.ts` | REST controller |
| `modules/attachments/attachments.module.ts` | NestJS module |

### Frontend (4)

| File | Purpose |
|------|---------|
| `features/attachments/attachments.api.ts` | API client + uploadFile flow |
| `features/attachments/AttachmentList.tsx` | List component with download/delete |
| `features/attachments/AttachmentUploader.tsx` | File picker + progress bar |
| `features/attachments/AttachmentSection.tsx` | Drop-in section for detail panels |

## Files Modified (2)

| File | Change |
|------|--------|
| `src/app.module.ts` | Registered `AttachmentsModule` |
| `src/config/configuration.ts` | Added `storage` config block |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_PROVIDER` | `s3` | Storage backend |
| `STORAGE_BUCKET` | `zephix-attachments` | S3 bucket name |
| `STORAGE_REGION` | `us-east-1` | AWS region |
| `STORAGE_ENDPOINT` | (empty) | S3-compatible endpoint (MinIO, R2) |
| `STORAGE_ACCESS_KEY_ID` | (empty) | AWS access key |
| `STORAGE_SECRET_ACCESS_KEY` | (empty) | AWS secret key |
| `ATTACHMENTS_MAX_BYTES` | `52428800` | 50 MB limit |

## Integration Points

`AttachmentSection` component is ready to drop into:
- Work task detail panels (`parentType="work_task"`)
- Risk detail panels (`parentType="work_risk"`)
- Docs pages (`parentType="doc"`)
- Comment threads (`parentType="comment"`)

## Roadmap (Deferred)

- Virus scan on upload (ClamAV or external service)
- Thumbnail generation for images
- Inline preview for PDFs
- Attachment version history
- Bulk upload
- Storage cost tracking per workspace
