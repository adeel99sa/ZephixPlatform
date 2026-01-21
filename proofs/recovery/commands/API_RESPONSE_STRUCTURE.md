# API Response Structure Documentation

**Generated:** 2025-01-27
**Purpose:** Document expected API response structures for MVP golden path verification

## 1. GET /api/auth/me

**Endpoint:** `GET /api/auth/me`  
**Auth:** Bearer token required  
**Controller:** `zephix-backend/src/modules/auth/auth.controller.ts:210`

### Expected Response Structure

Based on `buildUserResponse()` in `auth.service.ts:322`:

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "ADMIN" | "MEMBER" | "VIEWER",
  "platformRole": "ADMIN" | "MEMBER" | "VIEWER",
  "permissions": {
    "isAdmin": true | false,
    "canManageUsers": true | false,
    "canViewProjects": true,
    "canManageResources": true | false,
    "canViewAnalytics": true
  },
  "organizationId": "org-uuid",
  "emailVerified": true | false,
  "organization": {
    "id": "org-uuid",
    "name": "Organization Name",
    "slug": "org-slug",
    "features": {
      "enableProgramsPortfolios": true | false
    }
  },
  "isEmailVerified": true | false,
  "createdAt": "2025-01-27T00:00:00.000Z",
  "updatedAt": "2025-01-27T00:00:00.000Z"
}
```

**Key Fields:**
- `permissions.isAdmin` - Single source of truth for admin status (from UserOrganization.role)
- `platformRole` - Normalized role: ADMIN, MEMBER, or VIEWER
- `organizationId` - Required for tenancy scoping

---

## 2. GET /api/workspaces

**Endpoint:** `GET /api/workspaces`  
**Auth:** Bearer token required  
**Controller:** `zephix-backend/src/modules/workspaces/workspaces.controller.ts:145`

### Expected Response Structure

Based on `formatArrayResponse()` and `listByOrg()`:

```json
{
  "data": [
    {
      "id": "workspace-uuid",
      "name": "Workspace Name",
      "slug": "workspace-slug" | null,
      "description": "Workspace description" | null,
      "organizationId": "org-uuid",
      "ownerId": "user-uuid" | null,
      "isPrivate": true | false,
      "deletedAt": null | "2025-01-27T00:00:00.000Z",
      "createdAt": "2025-01-27T00:00:00.000Z",
      "updatedAt": "2025-01-27T00:00:00.000Z"
    }
  ]
}
```

**Key Fields:**
- Always returns `{ data: Workspace[] }` format
- Returns empty array `[]` on error (never throws 500)
- Filtered by organizationId (tenant scoped)
- Filtered by workspace membership if feature flag enabled and user is not admin

**Service Logic:**
- If `ZEPHIX_WS_MEMBERSHIP_V1=1` and user is not ADMIN: returns only workspaces where user is a member
- If feature flag disabled or user is ADMIN: returns all org workspaces

---

## 3. GET /api/workspaces/:workspaceId/role

**Endpoint:** `GET /api/workspaces/:workspaceId/role`  
**Auth:** Bearer token required  
**Controller:** `zephix-backend/src/modules/workspaces/workspaces.controller.ts:520`

### Expected Response Structure

```json
{
  "data": {
    "role": "OWNER" | "ADMIN" | "MEMBER" | "GUEST",
    "canWrite": true | false,
    "isReadOnly": true | false
  }
}
```

**Role Mapping:**
- `OWNER` → Admin role in HomeRouterPage
- `ADMIN` → Admin role in HomeRouterPage  
- `MEMBER` → Member role in HomeRouterPage
- `GUEST` → Guest role in HomeRouterPage

---

## 4. POST /api/projects

**Endpoint:** `POST /api/projects`  
**Auth:** Bearer token required  
**Controller:** `zephix-backend/src/modules/projects/projects.controller.ts:59`

### Request Body

```json
{
  "name": "Project Name",
  "workspaceId": "workspace-uuid",
  "description": "Optional description",
  "status": "planning" | "active" | "on_hold" | "completed" | "cancelled",
  "templateId": "template-uuid" | null
}
```

### Expected Success Response

```json
{
  "data": {
    "id": "project-uuid",
    "name": "Project Name",
    "workspaceId": "workspace-uuid",
    "organizationId": "org-uuid",
    "status": "planning",
    "createdAt": "2025-01-27T00:00:00.000Z",
    "updatedAt": "2025-01-27T00:00:00.000Z"
  }
}
```

### Expected Error Responses

**Missing workspaceId:**
```json
{
  "statusCode": 400,
  "code": "MISSING_WORKSPACE_ID",
  "message": "Workspace ID is required"
}
```

**Missing organizationId (tenant context):**
```json
{
  "statusCode": 400,
  "code": "MISSING_ORGANIZATION_ID",
  "message": "Organization context is missing"
}
```

**Workspace not found:**
```json
{
  "statusCode": 404,
  "code": "WORKSPACE_NOT_FOUND",
  "message": "Workspace not found"
}
```

**Workspace org mismatch:**
```json
{
  "statusCode": 403,
  "code": "WORKSPACE_ORG_MISMATCH",
  "message": "Workspace does not belong to your organization"
}
```

**Permission denied (not workspace_member):**
```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

---

## How to Capture Actual Responses

### Prerequisites

1. Backend running on `http://localhost:3000`
2. Frontend running (for login to get token)
3. Valid user account with at least one workspace

### Steps

1. **Login via frontend** and get token:
   - Open browser DevTools > Application > Local Storage
   - Copy value of `zephix.at` (access token)

2. **Set environment variables:**
   ```bash
   export ZEPHIX_TOKEN="your-jwt-token-here"
   export ZEPHIX_WORKSPACE_ID="workspace-uuid-from-workspaces-list"
   ```

3. **Run capture script:**
   ```bash
   cd /Users/malikadeel/Downloads/ZephixApp
   ./proofs/recovery/commands/capture-api-responses.sh
   ```

4. **Or manually capture with curl:**
   ```bash
   # 1. GET /api/auth/me
   curl -H "Authorization: Bearer $ZEPHIX_TOKEN" \
     http://localhost:3000/api/auth/me | jq '.' > auth-me.json
   
   # 2. GET /api/workspaces
   curl -H "Authorization: Bearer $ZEPHIX_TOKEN" \
     http://localhost:3000/api/workspaces | jq '.' > workspaces-list.json
   
   # 3. GET /api/workspaces/:id/role
   curl -H "Authorization: Bearer $ZEPHIX_TOKEN" \
     http://localhost:3000/api/workspaces/$ZEPHIX_WORKSPACE_ID/role | jq '.' > workspace-role.json
   
   # 4. POST /api/projects (test create)
   curl -X POST \
     -H "Authorization: Bearer $ZEPHIX_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Project","workspaceId":"'$ZEPHIX_WORKSPACE_ID'"}' \
     http://localhost:3000/api/projects | jq '.' > create-project-response.json
   ```

5. **Check backend logs:**
   - Look for log entries with `endpoint: 'POST /api/projects'`
   - Check for error messages in console output

---

## Backend Log Format

ProjectsController logs include:
- `event: 'project.created'` on success
- `endpoint: 'POST /api/projects'`
- `organizationId`, `workspaceId`, `projectId`, `creatorUserId`
- Error details on failure

---

## Next Steps

Once actual responses are captured:

1. Compare actual vs expected structure
2. Identify any missing fields or format mismatches
3. Document any errors in project creation
4. Fix backend issues based on actual error responses
5. Add integration tests based on actual request/response patterns
