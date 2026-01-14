# Workspace Model Comparison: Linear vs Zephix

## Overview

This document compares Linear's workspace model (as documented at https://linear.app/docs/workspaces) with Zephix's current implementation.

---

## 1. Core Architecture

### Linear
- **Workspace = Primary Container**: Home for all issues and interactions for an organization
- **Single Workspace Recommendation**: Linear recommends organizations stay within one workspace
- **Default Team Creation**: Creating a workspace automatically creates a default team with the same name
- **Multiple Workspaces per Account**: Users can belong to multiple workspaces under a single account (same email), each with distinct members and billing

### Zephix
- **Workspace = Organization Sub-Container**: Workspaces belong to organizations (`organization_id` foreign key)
- **Multiple Workspaces per Organization**: Organizations can have multiple workspaces
- **Teams are Separate**: Teams are separate entities that can be workspace-scoped (optional `workspaceId`)
- **Multiple Workspaces per User**: Users can belong to multiple workspaces within an organization via `workspace_members` table

**Key Difference**: Linear treats workspace as the top-level container, while Zephix has Organization → Workspace hierarchy.

---

## 2. Workspace Roles & Permissions

### Linear
- **Members**: See Issues, Projects, and Features settings
- **Admins**: See additional "Administration" section
- **Guests**: Limited access (implied)

### Zephix
- **Workspace Roles** (5 types):
  - `workspace_owner`: Full control, can manage members
  - `workspace_member`: Can create projects/content, cannot manage members
  - `workspace_viewer`: Read-only access
  - `delivery_owner`: Can write within assigned containers (Sprint 6)
  - `stakeholder`: Read-only access (Sprint 6)
- **Platform Roles** (Organization-level):
  - `ADMIN`: Can create workspaces, manage org settings
  - `MEMBER`: Can access workspaces where they are members
  - `VIEWER`: Read-only at org level

**Key Difference**: Zephix has a more granular role system with both platform and workspace-level roles, plus project-scoped roles (delivery_owner, stakeholder).

---

## 3. Workspace Settings & Administration

### Linear
**Admin-Only Settings:**
- Update workspace name and URL
- Manage login preferences
- Turn on/off third-party app review requirements (Enterprise)
- Set up Project Updates
- Turn on/off Initiatives feature
- Add or remove members
- Import or export issues
- Change plans
- View or update billing information

**Admin & Member Settings:**
- Create workspace-level labels
- Create custom project statuses
- Create workspace-level templates
- Apply SLA rules (paid feature)
- Customize Asks templates (paid feature)
- Add custom emojis
- View plan type
- Configure workspace-specific integrations

### Zephix
**Current Implementation:**
- ✅ Update workspace name (`name`)
- ✅ Update workspace slug (`slug`) - but no URL routing yet
- ✅ Update description
- ✅ Change owner (`ownerId`)
- ✅ Set visibility (`isPrivate`)
- ✅ Set default methodology (`defaultMethodology`)
- ✅ Configure permissions matrix (`permissionsConfig`)
- ✅ Manage members (via `WorkspaceMembersService`)
- ✅ Soft delete workspace
- ❌ **Missing**: Workspace URL/custom domain
- ❌ **Missing**: Login preferences (handled at org level)
- ❌ **Missing**: Workspace-level billing (billing is org-level)
- ❌ **Missing**: Import/export issues
- ❌ **Missing**: Workspace-level templates (templates are org-scoped)
- ❌ **Missing**: Workspace-level integrations configuration UI

**Key Gaps**: Zephix lacks workspace-level billing, URL management, and some admin features that Linear provides.

---

## 4. Workspace Switcher & Navigation

### Linear
- **Location**: Workspace name in top left corner
- **Action**: Click workspace name → "Switch workspace" → "Create or join a workspace"
- **Keyboard Shortcut**: `O` then `W`
- **Multiple Workspaces**: Shows list of workspaces associated with user account

### Zephix
- **Location**: Sidebar workspace selector (`SidebarWorkspaces.tsx`)
- **Action**: Dropdown in sidebar with workspace list
- **Auto-Selection**: Automatically selects workspace if only one exists (Phase 5.1)
- **Multiple Workspaces**: Shows all workspaces user has access to in organization
- **Selection Screen**: Shows `WorkspaceSelectionScreen` if no workspace selected

**Key Difference**: Linear uses top-left switcher, Zephix uses sidebar. Both support multiple workspaces.

---

## 5. Workspace Creation

### Linear
- Users can create multiple workspaces under a single account
- Each workspace has distinct member lists and separate billing plans
- Recommendation: Use separate email accounts for work vs personal

### Zephix
- **Creation**: Only Platform `ADMIN` can create workspaces (enforced by `RequireOrgRoleGuard`)
- **Scope**: Workspaces belong to an organization
- **Billing**: Workspace billing is organization-level, not workspace-level
- **Members**: Workspace members are organization users

**Key Difference**: Linear allows any user to create workspaces with separate billing. Zephix restricts creation to admins and uses org-level billing.

---

## 6. Default Team Creation

### Linear
- **Automatic**: Creating a workspace automatically creates a default team with the same name
- **Purpose**: Provides immediate structure for issue organization

### Zephix
- **No Auto-Creation**: Teams are created separately
- **Optional Workspace Scoping**: Teams can optionally be workspace-scoped (`workspaceId` nullable)
- **Manual Creation**: Teams must be explicitly created

**Key Difference**: Linear auto-creates a team, Zephix requires manual team creation.

---

## 7. Workspace Deletion

### Linear
- **Location**: Settings > Workspace > General
- **Warning**: "Deleting a workspace includes deleting user and issue data"
- **Irreversible**: Action is not reversible
- **Access**: Admins only

### Zephix
- **Implementation**: Soft delete (`deletedAt`, `deletedBy`)
- **Retention**: Configurable retention period (default 30 days)
- **Access**: Platform ADMIN or workspace_owner
- **Reversible**: Can be restored from trash (soft delete)

**Key Difference**: Linear uses hard delete (irreversible), Zephix uses soft delete (reversible).

---

## 8. Billing & Plans

### Linear
- **Workspace-Level Billing**: Each workspace has separate billing plans
- **Multiple Plans**: Different workspaces can have different plans
- **Plan Management**: Admins can change plans per workspace

### Zephix
- **Organization-Level Billing**: Billing is tied to organization, not workspace
- **Single Plan**: Organization has one plan that applies to all workspaces
- **Usage Limits**: Can check workspace usage limits (`checkUsageLimit(organizationId, 'workspaces')`)

**Key Difference**: Linear has workspace-level billing, Zephix has organization-level billing.

---

## 9. Workspace URL/Slug

### Linear
- **Custom URL**: Admins can update workspace URL
- **Purpose**: Used for workspace identification and routing

### Zephix
- **Slug Field**: Workspace has `slug` field (max 50 chars, alphanumeric + hyphens)
- **No Routing**: Slug exists but is not used for URL routing yet
- **Update**: Can be updated via `UpdateWorkspaceDto`

**Key Gap**: Zephix has slug but doesn't use it for workspace URLs/routing.

---

## 10. Member Management

### Linear
- **Admin-Only**: Only admins can add/remove members
- **Distinct Lists**: Each workspace has distinct member lists
- **Billing Impact**: Member count affects workspace billing

### Zephix
- **Role-Based**: `workspace_owner` or Platform ADMIN can manage members
- **Organization Constraint**: Members must be organization users first
- **Roles**: Supports 5 workspace roles (vs Linear's simpler admin/member/guest)
- **Last Owner Protection**: Cannot remove/demote last workspace_owner

**Key Difference**: Zephix has more granular role management with last owner protection.

---

## Summary: Key Gaps in Zephix

### Missing Features (Compared to Linear)
1. ❌ **Workspace-level billing** (currently org-level)
2. ❌ **Workspace URL routing** (slug exists but unused)
3. ❌ **Auto-create default team** on workspace creation
4. ❌ **Workspace-level templates** (templates are org-scoped)
5. ❌ **Import/export issues** at workspace level
6. ❌ **Workspace-level integrations configuration UI**
7. ❌ **Keyboard shortcut for workspace switching** (`O` + `W`)

### Zephix Advantages
1. ✅ **More granular roles** (5 workspace roles vs Linear's 3)
2. ✅ **Soft delete** (reversible vs Linear's hard delete)
3. ✅ **Last owner protection** (prevents orphaned workspaces)
4. ✅ **Permissions matrix** (`permissionsConfig` for fine-grained control)
5. ✅ **Organization hierarchy** (clear org → workspace structure)
6. ✅ **Auto-selection** (automatically selects single workspace)

### Recommendations
1. **Consider workspace-level billing** if multi-tenant SaaS model requires it
2. **Implement workspace URL routing** using slug field
3. **Add keyboard shortcut** for workspace switching (`O` + `W`)
4. **Consider auto-creating default team** on workspace creation (optional)
5. **Keep org-level billing** if current model works for your use case
6. **Maintain soft delete** - it's safer than hard delete

---

## Implementation Notes

### Current Zephix Workspace Model Strengths
- Strong RBAC with platform + workspace + project roles
- Soft delete with retention
- Permissions matrix for fine-grained control
- Clear organization hierarchy

### Areas for Enhancement (Based on Linear)
- Workspace URL routing
- Keyboard shortcuts
- Workspace-level template management
- Import/export functionality
- Workspace-level integrations UI

