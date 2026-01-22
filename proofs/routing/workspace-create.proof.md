# Workspace Create Fix - Proof Documentation

## Summary

Fixed workspace creation to remove `ownerId` from request payload. Backend now derives owner from auth context automatically.

## Before Fix - Real UI Request

**Request:**
```bash
POST /api/workspaces
Content-Type: application/json
Authorization: Bearer [token]

{
  "name": "Data Management",
  "slug": "data-management",
  "ownerId": "b2302296-ab2a-4372-8b3d-ab3b4b0e6c42"
}
```

**Response:**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Query parameter 'ownerId' is not allowed"
}
```
Status: 400 Bad Request

**Bug:** 
- UI sends `ownerId` in body (WorkspaceCreateModal.tsx:37)
- Backend rejects it as non-whitelisted property
- Error message incorrectly says "Query parameter" when property is in body

## After Fix - Real UI Request

**Request:**
```bash
POST /api/workspaces
Content-Type: application/json
Authorization: Bearer [token]

{
  "name": "Data Management",
  "slug": "data-management"
}
```

**Response:**
```json
{
  "data": {
    "workspaceId": "d93d50b0-6e48-4733-ba24-90f3d7cf95a1"
  }
}
```
Status: 201 Created

## Verification

✅ **No query params** - Request URL has no query parameters
✅ **Payload only name and slug** - Request body contains only `name` and optional `slug`
✅ **Backend derives owner from auth** - Owner is automatically set from `@CurrentUser()` auth context

## Changes Made

### Frontend (UI Call Site Only)
- `zephix-frontend/src/features/workspaces/WorkspaceCreateModal.tsx` - Removed `ownerId: user.id` from call
- `zephix-frontend/src/features/workspaces/api.ts` - Created strict `CreateWorkspaceInput` type, enforces payload

### Backend
- `zephix-backend/src/modules/workspaces/dto/create-workspace.dto.ts` - Made `ownerUserIds` optional
- `zephix-backend/src/modules/workspaces/workspaces.controller.ts` - Derives owner from auth context
- `zephix-backend/src/shared/utils/build-validation-error.ts` - Fixed error message (was saying "Query parameter" for body properties)

## Query Parameters

Query parameters are **not read** by the controller and are **ignored**. The endpoint does not validate query parameters. Error messages only reference body properties, not query parameters.

## Artifacts

- `proofs/routing/workspace-create.ui.before.network.txt` - Real failing request from UI path
- `proofs/routing/workspace-create.ui.before.curl.txt` - curl output of failure
- `proofs/routing/workspace-create.ui.after.network.txt` - Real successful request
- `proofs/routing/workspace-create.ui.after.curl.txt` - curl output of success
