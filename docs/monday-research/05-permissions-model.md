# Monday.com Research: Permissions Model

## What They Do

### User Types (Account Level)

**Admins:**
- Full account-level control
- Manage billing, security, user invitations/removals, roles
- Account-wide settings access

**Members (Team Members):**
- Internal users who can create/use boards
- Access Main boards
- Can be invited to Shareable or Private boards
- Generally have editing permissions

**Viewers:**
- Read-only access
- Can view boards and items, see updates
- Cannot edit content or structure
- Do not count against paid user seats in many plans

**Guests:**
- External collaborators
- Access limited to Shareable boards they're explicitly invited to
- Fewer capabilities than members
- Excluded from many internal features

**Custom Roles (Enterprise):**
- Admin-defined roles that inherit from default roles
- Can only restrict permissions further, not give more privilege than parent role
- Granular permission control

### Workspace-Level Access

**Workspace Owner:**
- Created workspace or granted ownership
- Crown icon indicator
- Manage workspace settings, roles, membership, permissions, boards

**Workspace Member:**
- Invited to workspace
- Access to Main boards within workspace
- Access to Shareable/Private boards if subscribed or explicitly invited
- Can be limited in creating boards/dashboards depending on workspace settings

**Workspace Non-Member:**
- Invited to board or doc inside workspace but not to workspace itself
- Only see what they've been explicitly invited to
- No membership on workspace-wide boards or views

**Workspace Types:**
- **Open:** Any member in organization can join and see Main boards
- **Closed (Enterprise):** Requires invite/approval to join; visibility limited to workspace members for Main boards

### Board & Column Permissions

**Board Types:**
- **Main:** Visible to all team members
- **Private:** Visible only to specific internal users
- **Shareable:** Used for external collaboration; only invited people (team members or guests) have access

**Board Permission Sets (Non-Enterprise):**
- "Edit everything": Can change content and structure
- "Only edit content": Can change item fields, content, but not structure (columns, views/groups)
- "Only edit assigned items": Users can only edit items or subitems assigned to them (Pro/Enterprise)
- "View and comment": Read-only with ability to comment or post updates, but no edits to content or structure

**Enterprise Board Permissions/Roles:**
- More roles: Editor, Contributor, Assigned Contributor, Viewer
- Capabilities configurable per category:
  - Items (create, edit, delete)
  - Updates (post, edit, delete)
  - Views (create, edit, delete)
  - Forms (create, edit, delete)
- Owners always bypass restrictions

**Column Permissions (Pro & Enterprise):**
- Restrict view or edit access per column
- Owners choose who sees or edits specific columns
- Important for sensitive data (budgets, salaries, etc.)

### Account Permissions (Enterprise)

**Feature-Based Permissions:**
- Who can create Private boards
- Who can export data
- Who can generate API tokens
- Who can create automations/integrations
- Who can create workspaces
- Who can invite guests
- And more

**Admin Privileges:**
- Customize which areas admins (or sub-admins) have access to
- Billing access
- Security settings access
- Teams/user management
- Content directory access
- Apps management

**Scoping Restrictions:**
- Workspace or board permissions cannot exceed what account permissions allow
- If account-level settings disable creating Private boards for Members, no workspace owner can enable that for a Member
- Account permissions are the ceiling

### Permission Hierarchy

**Layers (Broadest to Most Specific):**
1. **Account/Organization:** Admins, Members, Viewers, Guests, Custom Roles
2. **Workspace:** Owner, Member, Non-Member
3. **Board/Doc/Dashboard:** Owner(s), Editors, Contributors, Assigned-contributors, Viewers
4. **Column/Fields:** Specific permissions per column

**Boundary Rules:**
- Account permissions override workspace-level permissions
- Workspace permissions override board-level permissions
- Board permissions override column-level permissions
- Cannot grant lower-level permissions that exceed higher-level permissions

---

## What Breaks at Scale

### Permission Complexity

**Problem:** Too many permission layers and options:
- Account → Workspace → Board → Column permissions
- Multiple user types (Admin, Member, Viewer, Guest, Custom Roles)
- Multiple workspace roles (Owner, Member, Non-Member)
- Multiple board roles (Owner, Editor, Contributor, Assigned Contributor, Viewer)
- Column-level permissions
- Feature-based permissions

**Impact:**
- Hard to understand who can do what
- Permission conflicts and edge cases
- Difficult to audit
- Support burden increases

### Boundary Confusion

**Problem:** Unclear where permissions break:
- Workspace owner vs org admin responsibilities unclear
- Can workspace owner override org admin settings? (No, but not obvious)
- Where does workspace boundary end and board boundary begin?
- Member permissions vary by workspace and board

**Impact:**
- Users confused about their access
- Admins make wrong permission decisions
- Security gaps
- Inconsistent access

### Custom Roles Limitations

**Problem:** Custom roles can only restrict, not expand:
- Inherit from base role (Member, Guest, etc.)
- Can only take away permissions, not add
- Can't create "super member" with more than standard Member
- Limited flexibility

**Impact:**
- Can't model complex org structures
- Workarounds required
- Permission gaps
- Frustration

### No Role-Based Defaults

**Problem:** No default permissions based on role:
- Must configure permissions for each workspace/board
- No "project manager" default permission set
- No "team member" default permission set
- Manual configuration required everywhere

**Impact:**
- Slow setup
- Inconsistent permissions
- Errors in configuration
- Poor user experience

### Permission Inheritance Issues

**Problem:** Permission inheritance not always clear:
- When does workspace permission apply vs board permission?
- What happens when user has different permissions in different workspaces?
- How do column permissions interact with board permissions?
- Edge cases not well documented

**Impact:**
- Unexpected permission behavior
- Security gaps
- User confusion
- Support tickets

### No Permission Templates

**Problem:** Must configure permissions manually for each workspace/board:
- No permission templates
- No "standard project permissions" preset
- Must set up from scratch each time
- Easy to make mistakes

**Impact:**
- Inconsistent permissions
- Time-consuming setup
- Security risks
- Poor governance

---

## What You Should Copy

### 1. Permission Hierarchy

**Copy:** Clear hierarchy: Account → Workspace → Board → Column.

**Why:** Logical structure. Permissions cascade down. Easy to understand.

**Implementation:**
- Account-level user types
- Workspace-level roles
- Board-level permissions
- Column-level restrictions

### 2. Account Permissions as Ceiling

**Copy:** Account permissions cannot be exceeded at lower levels.

**Why:** Ensures org-level policies are enforced. Prevents permission escalation.

**Implementation:**
- Account permissions are maximum
- Workspace/board permissions cannot exceed account level
- Enforced in UI and API

### 3. Column-Level Permissions

**Copy:** Restrict view or edit access per column (Enterprise feature).

**Why:** Need granular control for sensitive data. Important for compliance.

**Implementation:**
- Column-level view/edit restrictions
- Sensitive data protection
- Compliance support

### 4. Custom Roles Concept

**Copy:** Ability to create custom roles with granular permissions (Enterprise).

**Why:** Need to model complex org structures. Flexibility is valuable.

**Implementation:**
- Custom roles inherit from base types
- Granular permission control
- Org-specific role modeling

---

## What You Should Avoid

### 1. Don't Make Permissions Too Complex

**Avoid:** Too many permission layers and options.

**Why:** Hard to understand. Permission conflicts. Support burden.

**Instead:** Simplify. Fewer layers. Clear defaults. Templates.

### 2. Don't Allow Permission Escalation

**Avoid:** Lower-level permissions exceeding higher-level permissions.

**Why:** Security risk. Policy violations.

**Instead:** Account permissions are ceiling. Enforced.

### 3. Don't Skip Role-Based Defaults

**Avoid:** Manual permission configuration for each workspace/board.

**Why:** Slow setup. Inconsistent. Errors.

**Instead:** Permission templates. Role-based defaults. One-click setup.

### 4. Don't Make Boundaries Unclear

**Avoid:** Unclear where workspace boundary ends and board boundary begins.

**Why:** User confusion. Wrong permission decisions.

**Instead:** Clear boundaries. Documented. Obvious in UI.

### 5. Don't Require Manual Setup

**Avoid:** Must configure permissions manually everywhere.

**Why:** Time-consuming. Inconsistent. Error-prone.

**Instead:** Templates include permissions. Defaults based on role. Automatic setup.

### 6. Don't Hide Permission Logic

**Avoid:** Permission inheritance not documented or obvious.

**Why:** Unexpected behavior. Security gaps.

**Instead:** Clear documentation. Obvious in UI. Predictable behavior.

---

## Key Takeaways for Zephix

### What to Build

1. **Simplified Permission Model**
   - Org admin vs workspace owner vs member
   - Clear boundaries and responsibilities
   - Fewer layers, clearer defaults

2. **Role-Based Permission Templates**
   - Templates include permission patterns
   - RACI ownership pattern built-in
   - Default permissions based on role
   - One-click setup

3. **Clear Boundaries**
   - Document where boundaries break
   - Obvious in UI
   - Predictable behavior
   - No permission escalation

4. **Permission Enforcement**
   - Account permissions are ceiling
   - Enforced in UI and API
   - No workarounds

5. **Template Integration**
   - Templates include permission patterns
   - RACI roles defined in template
   - Automatic permission setup on instantiation
   - No manual configuration

### What to Avoid

1. **Too Complex**
   - Don't create too many permission layers
   - Simplify where possible

2. **Permission Escalation**
   - Don't allow lower-level to exceed higher-level
   - Enforce ceiling

3. **Manual Setup**
   - Don't require manual configuration
   - Use templates and defaults

4. **Unclear Boundaries**
   - Don't make boundaries ambiguous
   - Document and make obvious

5. **No Defaults**
   - Don't skip role-based defaults
   - Templates include permissions

---

## Implementation Priority

1. **Define clear boundaries:**
   - Org admin responsibilities
   - Workspace owner responsibilities
   - Member permissions
   - Document where boundaries break

2. **Permission templates:**
   - Templates include permission patterns
   - RACI roles in templates
   - Automatic setup

3. **Enforcement:**
   - Account permissions as ceiling
   - Enforced in UI and API
   - No escalation

4. **Simplification:**
   - Fewer permission layers
   - Clear defaults
   - Role-based templates

---

*Research Date: January 2026*
*Source: Monday.com documentation, permissions model, access control*
