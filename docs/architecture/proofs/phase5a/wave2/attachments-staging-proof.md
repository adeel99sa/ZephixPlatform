# Attachments Module Route Fix

**Date:** 2026-02-15
**Blocker:** POST /api/work/workspaces/:wsId/attachments returned 404

## Root Cause

Smoke test used the wrong endpoint path. The module uses a **presigned upload** flow.
There is no `@Post()` handler at the base path.

## Correct Route Map

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/work/workspaces/:wsId/attachments/presign` | Create pending + presigned URL |
| POST | `/api/work/workspaces/:wsId/attachments/:id/complete` | Mark as uploaded |
| GET | `/api/work/workspaces/:wsId/attachments` | List for parent |
| GET | `/api/work/workspaces/:wsId/attachments/:id/download` | Presigned download URL |
| PATCH | `/api/work/workspaces/:wsId/attachments/:id/retention` | Override retention |
| DELETE | `/api/work/workspaces/:wsId/attachments/:id` | Soft-delete |

## Fix Applied

No code change to module. Added route registration test (7 tests).
