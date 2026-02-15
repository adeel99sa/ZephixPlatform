# Scenarios Route Registration Fix

**Date:** 2026-02-15
**Blocker:** POST /api/scenarios and POST /api/work/scenarios returned 404

## Root Cause

Smoke test used wrong paths. The ScenariosController uses `@Controller()` (empty)
with workspace-scoped method paths. The correct route is:
`POST /api/work/workspaces/:workspaceId/scenarios`

## Correct Route Map

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/work/workspaces/:wsId/scenarios` | Create scenario |
| GET | `/api/work/workspaces/:wsId/scenarios` | List scenarios |
| GET | `/api/work/scenarios/:id` | Get by ID |
| PATCH | `/api/work/scenarios/:id` | Update |
| DELETE | `/api/work/scenarios/:id` | Soft-delete |
| POST | `/api/work/scenarios/:id/actions` | Add action |
| DELETE | `/api/work/scenarios/:id/actions/:actionId` | Remove action |
| POST | `/api/work/scenarios/:id/compute` | Run compute |

## Fix Applied

No code change to controller. Added route registration test (7 tests).
