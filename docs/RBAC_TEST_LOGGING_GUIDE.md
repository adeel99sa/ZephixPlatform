# RBAC Test Failure - Log Checking Guide

When a RBAC test fails, use this guide to find the relevant logs and diagnose the issue.

## Quick Log Search Commands

### By Request ID (Full Request Flow)
```bash
# If you have a requestId or correlationId from the test
grep -r "requestId.*<ID>" logs/
# Or
grep -r "correlationId.*<ID>" logs/
```

### By Workspace ID
```bash
# Find all logs related to a specific workspace
grep -r "workspaceId.*<workspace-id>" logs/
```

### By Actor User ID
```bash
# Find all actions by a specific user
grep -r "actorUserId.*<user-id>" logs/
```

### By Organization ID
```bash
# Find all logs for an organization
grep -r "organizationId.*<org-id>" logs/
```

## Structured Log Fields to Check

### Workspace Creation
Look for logs with:
- `event: "workspace.created"`
- `organizationId`
- `workspaceId`
- `creatorUserId`
- `creatorPlatformRole` (should be "ADMIN")
- `createdAsWorkspaceRole` (should be "workspace_owner")

### Member Addition
Look for logs with:
- `event: "workspace.member.added"`
- `organizationId`
- `workspaceId`
- `actorUserId`
- `actorPlatformRole`
- `targetUserId`
- `newRole`

### Role Change
Look for logs with:
- `event: "workspace.role.changed"`
- `organizationId`
- `workspaceId`
- `actorUserId`
- `actorPlatformRole`
- `targetUserId`
- `oldRole`
- `newRole`
- `isLastOwner` (important for last owner protection)

### Member Removal
Look for logs with:
- `event: "workspace.member.removed"`
- `organizationId`
- `workspaceId`
- `actorUserId`
- `actorPlatformRole`
- `targetUserId`
- `removedRole`
- `isLastOwner` (important for last owner protection)

## Common Failure Patterns

### Permission Denied (403)
**Check:**
- `actorPlatformRole` - Is it ADMIN, MEMBER, or VIEWER?
- `workspaceRole` - What is the effective workspace role?
- `organizationId` - Does it match the workspace's organization?

**Example log:**
```json
{
  "event": "workspace.member.added",
  "organizationId": "org-123",
  "workspaceId": "ws-456",
  "actorUserId": "user-789",
  "actorPlatformRole": "MEMBER",
  "error": "Insufficient permissions to add members"
}
```

### Last Owner Protection
**Check:**
- `isLastOwner: true` - This should block the action
- `ownerCount` - Should be 1 for last owner

**Example log:**
```json
{
  "event": "workspace.role.changed",
  "workspaceId": "ws-456",
  "targetUserId": "user-789",
  "oldRole": "workspace_owner",
  "newRole": "workspace_member",
  "isLastOwner": true,
  "error": "Cannot demote the last workspace owner"
}
```

### Workspace Access Denied
**Check:**
- `actorPlatformRole` - MEMBER/VIEWER need WorkspaceMember record
- `workspaceRole` - Should be null if no membership
- `organizationId` - Must match

**Example log:**
```json
{
  "event": "workspace.access.denied",
  "workspaceId": "ws-456",
  "actorUserId": "user-789",
  "actorPlatformRole": "MEMBER",
  "workspaceRole": null,
  "reason": "No workspace membership found"
}
```

## Log Format Reference

All RBAC logs follow this structure:
```json
{
  "event": "<event-name>",
  "level": "info",
  "timestamp": "2025-01-XXT...",
  "organizationId": "<org-id>",
  "workspaceId": "<workspace-id>",
  "actorUserId": "<user-id>",
  "actorPlatformRole": "ADMIN|MEMBER|VIEWER",
  "workspaceRole": "workspace_owner|workspace_member|workspace_viewer|null",
  // Event-specific fields:
  "targetUserId": "<user-id>", // For member operations
  "oldRole": "...", // For role changes
  "newRole": "...", // For role changes
  "isLastOwner": true|false // For ownership operations
}
```

## Debugging Workflow

1. **Identify the failing test** - Which test failed?
2. **Get the workspace/user IDs** - From test setup or fixtures
3. **Search logs by workspaceId** - See all workspace-related activity
4. **Check actorPlatformRole** - Verify role is correct
5. **Check effective workspaceRole** - Verify membership exists
6. **Look for error messages** - Check for permission denials
7. **Verify last owner protection** - If removing/demoting owner

## Example: Debugging a Failed Test

```bash
# Test: "MEMBER cannot create workspace"
# Expected: 403 Forbidden
# Actual: 200 OK (BUG!)

# Step 1: Find the test workspace/user
grep -r "test.*member.*workspace" test/

# Step 2: Search logs for that user's actions
grep -r "actorUserId.*test-member-user-id" logs/

# Step 3: Check what role was used
grep -r "actorPlatformRole.*MEMBER" logs/ | grep "workspace.created"

# Step 4: Verify guard was called
grep -r "RequireOrgRoleGuard" logs/ | grep "workspace.created"

# Step 5: Check if guard allowed the request (BUG!)
grep -r "workspace.created" logs/ | grep "test-member-user-id"
```

---

**Remember:** All RBAC logs include `platformRole` and `workspaceRole`. Use these fields to verify permission checks are working correctly.






