# Invite Members Comparison: Linear vs Zephix

## Overview

This document compares Linear's invite members functionality (as documented at https://linear.app/docs/invite-members) with Zephix's current implementation.

---

## 1. Core Invitation Flow

### Linear
- **Location**: Settings > Administration > Members
- **Action**: Click "Invite" button
- **Multi-Invite**: Enter multiple email addresses separated by commas
- **Role Selection**: Select role when inviting (paid plans only)
- **Team Assignment**: Select team(s) for auto-join during invitation
- **Email Delivery**: Invite link sent via email with steps to join workspace

### Zephix
- **Organization-Level**: Invitations are sent at organization level, not workspace level
- **Location**: Admin console (`/admin/invite`) or organization settings
- **Single Invite**: One email per invitation
- **Role Selection**: Select organization role (`admin`, `pm`, `viewer`)
- **Workspace Constraint**: Workspace members can only be added from existing organization users
- **Email Delivery**: Token-based invitation link sent via email service

**Key Difference**: Linear invites directly to workspace with role selection. Zephix requires two-step process: invite to organization first, then add to workspace.

---

## 2. Invitation Permissions

### Linear
**Free Plan:**
- All members are considered Admins
- Anyone can send invitations

**Paid Plans:**
- Only Admins can invite by default
- Admins can toggle "Allow users to send invites" in Settings > Workspace > Security

**Enterprise (SAML & SCIM):**
- SAML: Users with IdP access can login without invitation (JIT provisioning)
- SCIM: Manual invitations disabled, managed via IdP

### Zephix
**Current Implementation:**
- Only Platform `ADMIN` or organization `owner`/`admin` can create invitations
- Workspace members can only be added by `workspace_owner` or Platform `ADMIN`
- No toggle to allow all users to invite
- No SAML/SCIM support

**Key Difference**: Linear has plan-based permission tiers and allows toggling invite permissions. Zephix has fixed admin-only permissions.

---

## 3. Approved Email Domains

### Linear
- **Location**: Settings > Administration > Security
- **Purpose**: Streamline joining process for matching email domains
- **Behavior**:
  - Users with matching domain can join workspace without invitation
  - New account creation shows prompt to join workspace during onboarding
  - Existing accounts see workspace in "Switch workspace" menu
- **Security Note**: Does not prevent users from creating new workspaces with that domain
- **Maintenance**: Admins must review and update list regularly

### Zephix
- **Status**: ❌ **Not Implemented**
- **Gap**: No approved email domains feature
- **Impact**: All users must be explicitly invited, even if they share the organization's email domain

**Key Gap**: Zephix lacks this convenience feature for organizations with shared email domains.

---

## 4. Invite Links

### Linear
- **Location**: Settings > Administration > Security
- **Type**: Persistent, reusable invite links
- **Security**: Unique link per workspace
- **Management**: Can reset link with "Reset invite link" button
- **Warning**: Should only be shared internally within organization

### Zephix
- **Status**: ❌ **Not Implemented**
- **Current**: Token-based invitations (single-use, expire after 72 hours or 7 days)
- **Gap**: No persistent invite links for workspace joining

**Key Gap**: Zephix uses expiring tokens instead of persistent invite links.

---

## 5. Invite & Assign Feature

### Linear
**Two Methods:**
1. **From Issue/Project**:
   - Open assignee selection menu
   - Choose "Invite and assign..."
   - Invite user, then assign issue/project
2. **From User Page**:
   - Send invite from workspace settings
   - Create issues from invited user's page
   - Issues automatically assigned to them

**Purpose**: Allows assigning work to users before they accept invitation

### Zephix
- **Status**: ❌ **Not Implemented**
- **Current**: Users must be organization members before they can be assigned to projects/tasks
- **Gap**: Cannot invite and assign work simultaneously

**Key Gap**: Zephix requires users to be members before assignment, limiting workflow flexibility.

---

## 6. SAML & SCIM Support

### Linear
**SAML:**
- Users with IdP access can login without invitation
- Just-In-Time (JIT) provisioning creates account automatically
- Email domain must match approved domains in SAML config
- Support contact required if email doesn't match workspace domain

**SCIM:**
- When enabled, manual invitations are disabled
- User management handled entirely through IdP
- Automatic provisioning and deprovisioning

### Zephix
- **Status**: ❌ **Not Implemented**
- **Gap**: No SAML or SCIM support
- **Impact**: All users must be manually invited and managed

**Key Gap**: Zephix lacks enterprise SSO and automated user provisioning.

---

## 7. Email Invitation Details

### Linear
- **Email From**: `notifications@linear.app` or `pm_bounces@pm-bounces.linear.app`
- **Content**: Invite link with steps to join workspace
- **Recommendation**: Add Linear email addresses to email allowlist

### Zephix
- **Email From**: Configurable via `EMAIL_FROM_ADDRESS` (default: `noreply@zephix.com`)
- **Content**: Token-based invitation link with expiration date
- **Expiry**:
  - Organization invitations: 7 days (`OrgInvitesService`)
  - Team invitations: 72 hours (`InvitationService`)
- **Link Format**: `${FRONTEND_URL}/invites/accept?token=${token}` or `${FRONTEND_URL}/invitations/${token}`

**Key Difference**: Linear uses persistent links, Zephix uses expiring tokens.

---

## 8. API Token Management

### Linear
- **Revocation**: API tokens revoked when user is suspended or converted to guest
- **Security**: Automatic invalidation on role changes

### Zephix
- **Status**: ⚠️ **Partially Implemented**
- **Current**: Token-based invitations expire, but API token revocation on role changes not explicitly documented
- **Gap**: Need to verify if API tokens are revoked on user suspension/role changes

**Key Gap**: Unclear if Zephix automatically revokes API tokens on user status changes.

---

## 9. Workspace Member Addition

### Linear
- **Direct Invitation**: Invite directly to workspace with role selection
- **Team Assignment**: Can assign teams during invitation
- **Role Types**: Admin, Member, Guest (simplified)

### Zephix
- **Two-Step Process**:
  1. User must be invited to organization first
  2. Then added to workspace from existing org users
- **Error Message**: "User must be an active member of the organization. Only existing organization users can be added to workspaces. Use /admin/invite to add new users to the organization."
- **Role Types**: 5 workspace roles (`workspace_owner`, `workspace_member`, `workspace_viewer`, `delivery_owner`, `stakeholder`)

**Key Difference**: Linear has direct workspace invitation, Zephix requires organization membership first.

---

## 10. Billing Impact

### Linear
- **Workspace-Level**: Each workspace has separate billing
- **Member Count**: Adding members affects workspace billing
- **Documentation**: Learn how adding/removing users affects billing

### Zephix
- **Organization-Level**: Billing is at organization level, not workspace level
- **Member Count**: Organization member count affects billing
- **Workspace Members**: Workspace membership doesn't directly affect billing (org-level)

**Key Difference**: Linear tracks workspace member count for billing, Zephix tracks organization member count.

---

## Summary: Key Gaps in Zephix

### Missing Features (Compared to Linear)

1. ❌ **Approved Email Domains** - No automatic join for matching domains
2. ❌ **Persistent Invite Links** - Only expiring tokens, no reusable links
3. ❌ **Invite & Assign** - Cannot assign work to users before they accept
4. ❌ **SAML/SCIM Support** - No enterprise SSO or automated provisioning
5. ❌ **Multi-Email Invitations** - Can only invite one email at a time
6. ❌ **Team Auto-Join** - Cannot assign teams during invitation
7. ❌ **Toggle Invite Permissions** - Fixed admin-only, no user toggle
8. ❌ **Direct Workspace Invitation** - Requires organization membership first

### Zephix Advantages

1. ✅ **More Granular Roles** - 5 workspace roles vs Linear's 3
2. ✅ **Organization Hierarchy** - Clear org → workspace structure
3. ✅ **Token Security** - Expiring tokens may be more secure than persistent links
4. ✅ **Two-Step Validation** - Ensures users are org members before workspace access

### Recommendations

#### High Priority
1. **Add Approved Email Domains**
   - Implement at organization level
   - Allow automatic workspace join for matching domains
   - Add to Security settings UI

2. **Implement Persistent Invite Links**
   - Add workspace-level invite links
   - Make them reusable and resettable
   - Add to Security settings

3. **Add "Invite & Assign" Feature**
   - Allow inviting users and assigning work simultaneously
   - Support from project/task assignment UI
   - Create issues from invited user's page

#### Medium Priority
4. **Support Multi-Email Invitations**
   - Allow comma-separated email addresses
   - Batch process invitations
   - Show status for each invitation

5. **Add Toggle for Invite Permissions**
   - Allow admins to enable "All users can invite"
   - Add to Security settings
   - Respect workspace role permissions

6. **Direct Workspace Invitation**
   - Allow inviting directly to workspace (create org membership if needed)
   - Simplify two-step process for common cases
   - Keep existing org-first flow as option

#### Low Priority (Enterprise Features)
7. **SAML Support**
   - Implement SAML authentication
   - JIT provisioning for IdP users
   - Domain matching validation

8. **SCIM Support**
   - Implement SCIM protocol
   - Automated user provisioning/deprovisioning
   - Disable manual invitations when SCIM enabled

---

## Implementation Notes

### Current Zephix Invitation Architecture

**Organization Invitations:**
- Entity: `OrgInvite` (`org_invites` table)
- Service: `OrgInvitesService`
- Token: Hashed tokens (HMAC-SHA256)
- Expiry: 7 days
- Endpoint: `/admin/invite` (organization-level)

**Team Invitations:**
- Entity: `Invitation` (`invitations` table)
- Service: `InvitationService`
- Token: Random token (crypto.randomBytes)
- Expiry: 72 hours
- Endpoint: Organization-level team invitations

**Workspace Members:**
- Entity: `WorkspaceMember` (`workspace_members` table)
- Service: `WorkspaceMembersService`
- Constraint: User must be organization member first
- Endpoint: `/workspaces/:id/members` (POST)

### Recommended Implementation Order

1. **Phase 1: Core Improvements**
   - Add approved email domains (org-level)
   - Implement persistent invite links (workspace-level)
   - Support multi-email invitations

2. **Phase 2: Workflow Enhancements**
   - Add "Invite & Assign" feature
   - Direct workspace invitation (with org auto-creation)
   - Toggle invite permissions

3. **Phase 3: Enterprise Features**
   - SAML authentication
   - SCIM provisioning
   - Advanced security settings

---

## References

- [Linear Invite Members Documentation](https://linear.app/docs/invite-members)
- Zephix Codebase:
  - `zephix-backend/src/modules/auth/services/org-invites.service.ts`
  - `zephix-backend/src/organizations/services/invitation.service.ts`
  - `zephix-backend/src/modules/workspaces/services/workspace-members.service.ts`
  - `zephix-frontend/src/features/workspaces/settings/tabs/MembersTab.tsx`

