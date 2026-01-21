# PROMPT 8, 9, 10 - Verification Required

## Status

All implementation is complete. The following verification steps need to be run with a live database.

## 1. PROMPT 9 Backend E2E Tests

### Test File
- `zephix-backend/test/org-invite-workspace-assign.e2e-spec.ts`

### Test Cases Implemented
1. **Member invite with 2 workspace assignments**
   - Creates invite with 2 workspace assignments
   - Accepts invite
   - **EXPLICIT ASSERTION**: Verifies `workspace_members` rows exist for both workspaces with `workspace_member` role

2. **Guest invite coerces to workspace_viewer even if requested Owner**
   - Invites Guest with Owner access level
   - **EXPLICIT ASSERTION**: Verifies `workspace_members` row has `workspace_viewer` role (not `workspace_owner`)
   - Response message includes coercion note

3. **Existing org user gets workspace_members rows immediately**
   - Invites existing org user with workspace assignment
   - **EXPLICIT ASSERTION**: Verifies `workspace_members` row exists immediately (no accept needed)

4. **Cross org workspace assignment returns 409 INVALID_WORKSPACE**
   - Attempts to assign workspace from different org
   - **EXPLICIT ASSERTION**: Returns 409 with `INVALID_WORKSPACE` code

### Run Command
```bash
cd zephix-backend
npm run test:e2e -- org-invite-workspace-assign
```

### Expected Output
```
✓ 1. Member invite with 2 workspace assignments
  ✓ should create workspace_members rows for both workspaces after invite accept

✓ 2. Guest invite coerces to workspace_viewer even if requested Owner
  ✓ should create workspace_members row with workspace_viewer role

✓ 3. Existing org user gets workspace_members rows immediately
  ✓ should create workspace_members rows without invite accept

✓ 4. Cross org workspace assignment returns 409 INVALID_WORKSPACE
  ✓ should return 409 when workspace belongs to different org
```

## 2. PROMPT 10 Slug Resolve Tests

### Test File
- `zephix-backend/test/workspace-slug-resolve.e2e-spec.ts` (needs update for access checks)

### Test Cases Needed

#### A. Admin resolves valid slug
**Request:**
```bash
GET /api/workspaces/resolve/test-workspace
Authorization: Bearer <admin_token>
```

**Expected Response:**
- HTTP Status: `200`
- Body:
```json
{
  "data": {
    "workspaceId": "<uuid>"
  }
}
```

#### B. Non-member resolves valid slug
**Request:**
```bash
GET /api/workspaces/resolve/test-workspace
Authorization: Bearer <non_member_token>
```

**Expected Response:**
- HTTP Status: `403`
- Body:
```json
{
  "code": "FORBIDDEN",
  "message": "You do not have access to this workspace"
}
```
- **CRITICAL**: Body must NOT reveal `workspaceId`

#### C. Admin resolves unknown slug
**Request:**
```bash
GET /api/workspaces/resolve/non-existent-slug
Authorization: Bearer <admin_token>
```

**Expected Response:**
- HTTP Status: `404`
- Body:
```json
{
  "code": "WORKSPACE_NOT_FOUND",
  "message": "Workspace not found"
}
```

### Run Command
```bash
cd zephix-backend
npm run test:e2e -- workspace-slug-resolve
```

## 3. Real Admin Invite API Response

### Endpoint
```
POST /api/admin/organization/users/invite
Authorization: Bearer <admin_token>
```

### Test Case 1: Guest with Owner access level (coercion)
**Request Body:**
```json
{
  "emails": ["guest@test.com"],
  "platformRole": "Guest",
  "workspaceAssignments": [
    {
      "workspaceId": "<workspace_id>",
      "accessLevel": "Owner"
    }
  ]
}
```

**Expected Response:**
- HTTP Status: `200`
- Body:
```json
{
  "data": {
    "results": [
      {
        "email": "guest@test.com",
        "status": "success",
        "message": "Invitation sent (Guest platform role will coerce workspace access to Viewer)"
      }
    ]
  }
}
```

### Test Case 2: Member with 2 workspace assignments
**Request Body:**
```json
{
  "emails": ["member@test.com"],
  "platformRole": "Member",
  "workspaceAssignments": [
    {
      "workspaceId": "<workspace_id_1>",
      "accessLevel": "Member"
    },
    {
      "workspaceId": "<workspace_id_2>",
      "accessLevel": "Member"
    }
  ]
}
```

**Expected Response:**
- HTTP Status: `200`
- Body:
```json
{
  "data": {
    "results": [
      {
        "email": "member@test.com",
        "status": "success",
        "message": "Invitation sent"
      }
    ]
  }
}
```

### Test Case 3: Existing org user with workspace assignment
**Request Body:**
```json
{
  "emails": ["existing@test.com"],
  "platformRole": "Member",
  "workspaceAssignments": [
    {
      "workspaceId": "<workspace_id>",
      "accessLevel": "Member"
    }
  ]
}
```

**Expected Response:**
- HTTP Status: `200`
- Body:
```json
{
  "data": {
    "results": [
      {
        "email": "existing@test.com",
        "status": "success",
        "message": "User already in organization, workspace assignments applied"
      }
    ]
  }
}
```

## Implementation Notes

### Coercion Messages
- **Guest platform role** with non-Guest access level → Message includes: `(Guest platform role will coerce workspace access to Viewer)`
- **Existing user** with Guest platform role → Message includes: `(Guest platform role coerced workspace access to Viewer)`

### Error Handling
- **Cross-org workspace** → Returns `409` with code `INVALID_WORKSPACE`
- **Non-member slug resolve** → Returns `403` with code `FORBIDDEN` (does not reveal workspaceId)

### Database Assertions
All E2E tests explicitly assert `workspace_members` table rows:
- Role is correct (`workspace_member` or `workspace_viewer`)
- Status is `active`
- Both `workspaceId` and `userId` match expected values

## Next Steps

1. Run E2E tests with live database
2. Capture actual API responses
3. Verify coercion messages appear in responses
4. Verify workspace_members rows are created correctly
5. Verify slug resolve returns 403 for non-members without revealing workspaceId
