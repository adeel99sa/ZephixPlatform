# Workspace Feature Phases B, C, D - Roadmap

**Status**: Planned, not yet implemented
**Reference**: `.cursorrules` PART 4

## Phase B - Ownership Transfer and Self Removal

### Requirements
- ADMIN and workspace_owner can transfer workspace ownership
- An owner can remove themself only after another owner exists
- Transfer logs must include: fromUserId, toUserId, workspaceId, actorUserId, oldRole, newRole

### Implementation Checklist

#### Backend
- [ ] Create `POST /workspaces/:id/transfer-ownership` endpoint
- [ ] Create `POST /workspaces/:id/members/:userId/make-owner` endpoint
- [ ] Add guards using effective role helper
- [ ] Implement transfer logic in `WorkspaceMembersService`
- [ ] Add structured logging for transfer events
- [ ] Add unit tests for transfer logic
- [ ] Add tests for last owner protection during transfer

#### Frontend
- [ ] Add "Make Owner" button in MembersTab (for workspace_owner and ADMIN)
- [ ] Add "Transfer Ownership" modal/action
- [ ] Show confirmation dialog before transfer
- [ ] Update UI after successful transfer
- [ ] Disable self-removal if last owner
- [ ] Add E2E test for ownership transfer flow

#### Documentation
- [ ] Update `docs/RBAC_AND_WORKSPACE_BEHAVIOR.md`
- [ ] Add API documentation for new endpoints

## Phase C - Project Transfer Between Workspaces

### Requirements
- Only workspace_owner or platform ADMIN starts a transfer
- Transfer keeps project ID, work items, history, RACI values, AI context
- Risk and audit trail must show the move

### Implementation Checklist

#### Backend
- [ ] Create `ProjectTransferService`
- [ ] Create `POST /projects/:id/transfer` endpoint
- [ ] Validate source and destination workspace access
- [ ] Implement transaction-based transfer:
  - Move project and all children
  - Update workspaceId and workspace-scoped foreign keys
  - Preserve project ID, work items, history, RACI, AI context
- [ ] Emit audit event "project_workspace_transferred"
- [ ] Add structured logging
- [ ] Add unit tests:
  - Success case
  - No permission case
  - Partial failure rollback case

#### Frontend
- [ ] Add "Move to another workspace" action in project settings
- [ ] Create transfer modal with workspace selector
- [ ] Show confirmation with project details
- [ ] Handle transfer success/error states
- [ ] Update project view after transfer
- [ ] Add E2E test for project transfer

#### Documentation
- [ ] Document transfer behavior and data preservation
- [ ] Update API documentation

## Phase D - Project Duplication Modes

### Requirements
- Support two modes: "template" (structure only) and "full" (with data)
- Only workspace_owner or Platform ADMIN can duplicate
- Link to source in audit field

### Implementation Checklist

#### Backend
- [ ] Create `ProjectDuplicationService`
- [ ] Create `POST /projects/:id/duplicate` endpoint with `mode: "template" | "full"`
- [ ] Implement template mode:
  - Copy structure (phases, tasks, columns, views)
  - Drop assignments, comments, attachments, RACI values
- [ ] Implement full mode:
  - Copy everything except IDs and timestamps
  - Link to source in audit field
- [ ] Add RBAC checks (workspace_owner or ADMIN)
- [ ] Add structured logging
- [ ] Add unit tests for each mode
- [ ] Add permission check tests

#### Frontend
- [ ] Add "Duplicate project" action in project settings
- [ ] Create duplication modal with mode selector:
  - "Duplicate as template" (structure only)
  - "Duplicate with data" (full copy)
- [ ] Show preview of what will be copied
- [ ] Handle duplication success/error states
- [ ] Navigate to new project after duplication
- [ ] Add E2E tests for both modes

#### Documentation
- [ ] Document duplication modes and behavior
- [ ] Update API documentation

## Implementation Order

1. **Phase B** (highest priority) - Needed before testers work with multiple admins
2. **Phase C** - Project transfer is a common enterprise need
3. **Phase D** - Project duplication enhances productivity

## Testing Strategy

### For Each Phase
- Unit tests for service logic
- Integration tests for API endpoints
- E2E tests for user flows
- Permission tests (ADMIN, workspace_owner, workspace_member, workspace_viewer)
- Last owner protection tests (Phase B)

### Test Users Required
- ADMIN user
- MEMBER user (workspace_owner in some workspaces)
- MEMBER user (workspace_member in some workspaces)
- VIEWER user (workspace_viewer in some workspaces)

## Success Criteria

### Phase B
- ✅ ADMIN can transfer ownership
- ✅ workspace_owner can transfer ownership
- ✅ Last owner cannot remove self
- ✅ Transfer logs include all required fields
- ✅ UI shows transfer options correctly

### Phase C
- ✅ workspace_owner can transfer projects
- ✅ ADMIN can transfer projects
- ✅ All project data preserved
- ✅ Audit trail shows transfer
- ✅ Transaction rollback works on failure

### Phase D
- ✅ Template mode copies structure only
- ✅ Full mode copies everything
- ✅ Only workspace_owner/ADMIN can duplicate
- ✅ Source link preserved in audit field

---

**See `.cursorrules` PART 4 for detailed requirements.**







