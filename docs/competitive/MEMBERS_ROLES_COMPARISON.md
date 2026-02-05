# Members and Roles Comparison: Linear vs Zephix

## Overview

This document compares Linear's members and roles system (as documented at https://linear.app/docs/members-roles) with Zephix's current implementation.

---

## 1. Role Types Overview

### Linear
**Workspace-Level Roles:**
- **Workspace Owner** (Enterprise only): Full administrative control, access to billing, security, audit log
- **Admin**: Elevated permissions for routine workspace operations
- **Team Owner** (Business/Enterprise): Delegated control over individual teams
- **Member**: Standard collaboration access, cannot access workspace-level administration
- **Guest** (Business/Enterprise): Restricted access to specified teams only

**Plan-Based Behavior:**
- **Free Plan**: All members become admins automatically
- **Basic/Business**: User who upgrades becomes admin
- **Enterprise**: Admins have limited permissions (workspace owners have full control)

### Zephix
**Workspace-Level Roles:**
- **workspace_owner**: Full control over workspace, can manage members
- **workspace_member**: Can create projects and content, cannot manage members
- **workspace_viewer**: Read-only access to workspace content
- **delivery_owner**: Can write within assigned containers (project-scoped)
- **stakeholder**: Read-only access (project-scoped)

**Platform-Level Roles (Organization):**
- **ADMIN**: Can create workspaces, manage org settings, implicit workspace_owner
- **MEMBER**: Can access workspaces where they are members
- **VIEWER**: Read-only at organization level

**Team-Level Roles:**
- **OWNER**: Team owner (creator becomes owner automatically)
- **MEMBER**: Team member

**Key Difference**: Linear has 5 workspace roles (including Guest), Zephix has 5 workspace roles (including project-scoped delivery_owner/stakeholder) plus platform and team roles.

---

## 2. Workspace Owner Role

### Linear
- **Availability**: Enterprise plans only
- **Permissions**:
  - Full administrative control
  - Access to billing, security, audit log
  - Workspace exports
  - OAuth application approvals
  - Team access management
- **Admin Comparison**: Admins have more limited permissions (ideal for routine management)
- **Configurable Restrictions**: Can configure which roles can perform workspace-level actions via "Workspace restrictions" in Security settings
- **SCIM**: Should create `linear-owners` group for SCIM-managed workspaces

### Zephix
- **Availability**: All plans (not Enterprise-only)
- **Permissions**:
  - Full control over workspace
  - Can manage members
  - Can change workspace settings
  - Implicit workspace_owner for Platform ADMIN
- **Last Owner Protection**: Cannot demote or remove the last workspace_owner
- **Owner Field**: Workspace has separate `ownerId` field (can be different from workspace_owner role)
- **No Configurable Restrictions**: Permissions are fixed, not configurable per workspace

**Key Difference**: Linear's workspace owner is Enterprise-only with configurable restrictions. Zephix's workspace_owner is available on all plans with fixed permissions.

---

## 3. Admin Role

### Linear
**Free Plan:**
- All workspace members become admins automatically

**Basic and Business Plans:**
- User who upgrades workspace is granted admin role

**Enterprise Plan:**
- Admins have limited permissions (workspace owners have full control)
- Ideal for managers, team leads, operations-focused members

**Permissions:**
- Manage routine workspace operations
- Cannot access most sensitive settings (billing, security, audit log)

### Zephix
**Platform ADMIN:**
- Organization-level role
- Can create workspaces
- Implicit workspace_owner for all workspaces in organization
- Can manage organization settings and billing

**No Workspace-Level Admin:**
- Zephix does not have a separate "workspace admin" role
- Uses workspace_owner for workspace management
- Platform ADMIN serves as organization-level admin

**Key Difference**: Linear has workspace-level admins with plan-based behavior. Zephix uses platform ADMIN (org-level) and workspace_owner (workspace-level).

---

## 4. Team Owner Role

### Linear
- **Availability**: Business and Enterprise plans
- **Purpose**: Delegated control over individual teams without routing through workspace owners/admins
- **Configuration**:
  - Team settings > Access and permissions
  - Adjust settings to be restrictive to team owners only
  - Promote members to team owners via Team settings > Members
- **No Limit**: Teams can have unlimited team owners
- **Not Required**: Teams are not required to have a team owner
- **Automatic Team Owners**:
  - Workspace admins and owners are automatically team owners for all accessible teams
  - Creator becomes team owner by default
  - Team owners in parent team are team owners in sub-teams
  - Guests cannot be team owners
- **Team Owner Only Operations**:
  - Deleting a team
  - Making a team private
  - Changing a team's parent
- **Configurable Permissions**:
  - Issue Label Management
  - Template Management
  - Team Settings Management
  - Member Management (team owners can always add guests)
- **Team Access**: Can restrict how members join (default: any workspace member can join non-private teams)

### Zephix
- **Team Owner Role**: `TeamMemberRole.OWNER`
- **Automatic Assignment**: Creator becomes team owner automatically
- **Team Member Role**: `TeamMemberRole.MEMBER`
- **No Configurable Permissions**: Team permissions are not configurable
- **No Team Owner Restrictions**: No explicit "team owner only" operations defined
- **Team Visibility**: Teams have visibility settings (`TeamVisibility` enum: ORG, TEAM, PRIVATE)
- **Workspace Scoping**: Teams can be workspace-scoped (optional `workspaceId`)

**Key Difference**: Linear has extensive team owner configuration and permissions. Zephix has basic team owner role without configurable permissions.

---

## 5. Member Role

### Linear
- **Permissions**:
  - Collaborate across accessible teams
  - Use all standard workspace features
  - **Cannot access** workspace-level administration pages
- **Access**: Based on team membership and team visibility settings

### Zephix
- **workspace_member**:
  - Can create projects and content
  - Cannot manage members
  - Cannot change workspace settings
- **Team MEMBER**:
  - Standard team member access
  - No special permissions

**Key Difference**: Similar permissions, but Zephix has more granular workspace roles (workspace_member vs workspace_viewer).

---

## 6. Guest Role

### Linear
- **Availability**: Business and Enterprise plans only
- **Billing**: Billed as regular members
- **Purpose**: Restricted access for contractors, clients, cross-company collaborators
- **Permissions**:
  - **Can**: Access issues, projects, documents for explicitly added teams
  - **Can**: Take same actions as Members within those teams
  - **Cannot**: View workspace-wide features (workspace views, customer requests, initiatives)
  - **Cannot**: Access settings beyond own Account tab
  - **Cannot**: Be team owners
- **Project Sharing**:
  - If project spans multiple teams, guests only see issues from teams they're part of
  - See project shell but only with allowed team's issues visible
- **Integration Security**:
  - Integrations enabled for workspace are accessible to guests
  - Could allow access to Linear data from teams outside their access
  - Recommendations provided for different integration types

### Zephix
- **Status**: ❌ **Not Implemented**
- **Gap**: No guest role concept
- **Alternative**: Uses `workspace_viewer` for read-only access, but not team-scoped
- **Impact**: Cannot restrict access to specific teams only

**Key Gap**: Zephix lacks guest role with team-scoped restrictions.

---

## 7. Member Management

### Linear
**Location**: Settings > Administration > Members

**Features:**
- Lists all active and suspended members
- Filter by role or status:
  - Pending invites
  - Suspended
  - Users who have left the workspace
- Change member's role via overflow menu (⋯)
- Suspend member (loses access immediately, removed from billing)
- View workspace admins:
  - Command menu (Cmd/Ctrl K) → "View workspace admins"
  - Direct URL: `linear.app/settings/view-admins`

**SCIM-Managed Workspaces:**
- Some or all member management via IdP instead of Members page

### Zephix
**Location**: Workspace Settings > Members tab

**Features:**
- Lists all workspace members
- Grouped by role (Owners, Members, Viewers)
- Change member's role via dropdown
- Remove member (delete from workspace)
- **No Suspend**: Only remove (soft delete via workspace member removal)
- **No Status Filtering**: No filtering by pending/suspended/left
- **No View Admins Shortcut**: No quick way to view all admins

**Key Gaps**:
- No suspend functionality
- No status filtering
- No quick admin view

---

## 8. Changing Member Roles

### Linear
**Process:**
1. Go to Settings > Administration > Members
2. Hover over member's row
3. Click overflow menu (⋯)
4. Select "Change role..."

**Restrictions:**
- Administrative roles can change roles
- SCIM-managed workspaces may restrict role changes

### Zephix
**Process:**
1. Go to Workspace Settings > Members
2. Select role from dropdown in member row
3. Role updates immediately

**Restrictions:**
- Only `workspace_owner` or Platform `ADMIN` can change roles
- Cannot demote last `workspace_owner`
- Last owner protection enforced

**Key Difference**: Linear uses overflow menu, Zephix uses inline dropdown. Both enforce permissions.

---

## 9. Suspending Members

### Linear
**Process:**
1. Go to Settings > Administration > Members
2. Hover over member's row
3. Click overflow menu (⋯)
4. Select "Suspend user..."

**Effects:**
- User loses all access immediately
- Removed from next billing cycle
- Remains visible in members list for historical purposes
- Can view issue activity on their profile page: `linear.app/<workspace-name>/profiles/<username>`
- Admins can access via user's avatar or filter for "Suspended" users

### Zephix
- **Status**: ❌ **Not Implemented**
- **Current**: Only "Remove member" (deletes workspace membership)
- **Gap**: No suspend functionality
- **Impact**: Cannot temporarily disable access without removing membership
- **Workaround**: Remove and re-add member (loses historical context)

**Key Gap**: Zephix lacks suspend functionality for temporary access revocation.

---

## 10. Viewing Workspace Admins

### Linear
**Two Methods:**
1. **Command Menu**:
   - Press `Cmd/Ctrl K`
   - Select "View workspace admins"
2. **Direct URL**:
   - Navigate to `linear.app/settings/view-admins`

**Purpose**: Quick identification of workspace administrators

### Zephix
- **Status**: ❌ **Not Implemented**
- **Current**: Must filter members list manually or check each member's role
- **Gap**: No quick way to view all workspace owners/admins
- **Workaround**: Filter members by `workspace_owner` role in UI

**Key Gap**: Zephix lacks quick admin view feature.

---

## 11. Member Filtering

### Linear
**Filter Options:**
- By role (Workspace Owner, Admin, Team Owner, Member, Guest)
- By status:
  - Pending invites
  - Suspended
  - Users who have left the workspace
- Active members (default view)

### Zephix
**Current Filtering:**
- By role (workspace_owner, workspace_member, workspace_viewer)
- Grouped display by role (Owners, Members, Viewers sections)
- **No Status Filtering**: Cannot filter by pending/suspended/left
- **No Search**: Basic list view without search functionality

**Key Gap**: Zephix lacks status-based filtering and search.

---

## 12. SCIM Integration

### Linear
**SCIM-Managed Workspaces:**
- Some or all member management via IdP
- Role groups: `linear-owners`, `linear-admins`, `linear-members`, `linear-guests`
- **Permission Conflict**: If user is in both admin and owner groups, gets permission of most recent group pushed

### Zephix
- **Status**: ❌ **Not Implemented**
- **Gap**: No SCIM support
- **Impact**: All member management must be done manually

**Key Gap**: Zephix lacks SCIM integration for automated user provisioning.

---

## 13. Project-Scoped Roles

### Linear
- **No Project-Scoped Roles**: Roles are workspace or team-level only
- **Team-Based Access**: Access controlled via team membership

### Zephix
- **delivery_owner**: Can write within assigned containers (projects)
- **stakeholder**: Read-only access (projects)
- **Purpose**: Project-level role assignment for specific work items
- **Scope**: These roles are project-scoped, not workspace-scoped

**Key Difference**: Zephix has project-scoped roles (delivery_owner, stakeholder) that Linear doesn't have.

---

## Summary: Key Gaps in Zephix

### Missing Features (Compared to Linear)

1. ❌ **Guest Role** - No team-scoped restricted access
2. ❌ **Suspend Member** - Cannot temporarily disable access
3. ❌ **Status Filtering** - Cannot filter by pending/suspended/left
4. ❌ **View Workspace Admins** - No quick admin view feature
5. ❌ **Team Owner Configurable Permissions** - No granular team permissions
6. ❌ **SCIM Integration** - No automated user provisioning
7. ❌ **Workspace Owner Restrictions** - Cannot configure which roles can perform actions
8. ❌ **Member Search** - No search functionality in members list

### Zephix Advantages

1. ✅ **More Granular Roles** - 5 workspace roles + platform + team roles
2. ✅ **Project-Scoped Roles** - delivery_owner and stakeholder for project-level access
3. ✅ **Last Owner Protection** - Prevents orphaned workspaces
4. ✅ **Platform Hierarchy** - Clear org → workspace → team structure
5. ✅ **Role Grouping** - Members grouped by role in UI

### Recommendations

#### High Priority
1. **Add Suspend Functionality**
   - Implement suspend status for workspace members
   - Preserve historical data (issues, assignments)
   - Remove from billing but keep in list
   - Add status filter to members list

2. **Add Guest Role**
   - Implement team-scoped guest access
   - Restrict to specific teams only
   - Cannot access workspace-wide features
   - Billed as regular members

3. **Add Status Filtering**
   - Filter by pending invites
   - Filter by suspended
   - Filter by active/left
   - Add search functionality

#### Medium Priority
4. **Add View Workspace Admins**
   - Command menu shortcut (Cmd/Ctrl K)
   - Direct URL route
   - Quick admin identification

5. **Team Owner Configurable Permissions**
   - Issue Label Management
   - Template Management
   - Team Settings Management
   - Member Management
   - Team Access restrictions

6. **Workspace Owner Restrictions**
   - Configurable permissions matrix
   - Allow workspace owners to restrict role actions
   - Add to Security settings

#### Low Priority (Enterprise Features)
7. **SCIM Integration**
   - Implement SCIM protocol
   - Role group mapping
   - Automated provisioning/deprovisioning
   - Handle permission conflicts

---

## Implementation Notes

### Current Zephix Role Architecture

**Workspace Roles:**
- Entity: `WorkspaceMember` (`workspace_members` table)
- Roles: `workspace_owner`, `workspace_member`, `workspace_viewer`, `delivery_owner`, `stakeholder`
- Service: `WorkspaceMembersService`
- Protection: Last owner protection enforced

**Platform Roles:**
- Entity: `UserOrganization` (`user_organizations` table)
- Roles: `owner`, `admin`, `pm`, `viewer` (maps to PlatformRole: ADMIN, MEMBER, VIEWER)
- Service: Organization-level services

**Team Roles:**
- Entity: `TeamMember` (`team_members` table)
- Roles: `OWNER`, `MEMBER`
- Service: `TeamsService`

### Recommended Implementation Order

1. **Phase 1: Core Member Management**
   - Add suspend functionality
   - Add status filtering
   - Add member search
   - Add view workspace admins

2. **Phase 2: Guest Role**
   - Implement guest role
   - Team-scoped access restrictions
   - Integration security considerations

3. **Phase 3: Advanced Permissions**
   - Team owner configurable permissions
   - Workspace owner restrictions
   - Enhanced role management

4. **Phase 4: Enterprise Features**
   - SCIM integration
   - Automated provisioning
   - Role group management

---

## References

- [Linear Members and Roles Documentation](https://linear.app/docs/members-roles)
- Zephix Codebase:
  - `zephix-backend/src/modules/workspaces/entities/workspace.entity.ts`
  - `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts`
  - `zephix-backend/src/modules/workspaces/services/workspace-access.service.ts`
  - `zephix-frontend/src/features/workspaces/settings/tabs/MembersTab.tsx`
  - `zephix-backend/src/modules/teams/entities/team-member.entity.ts`

