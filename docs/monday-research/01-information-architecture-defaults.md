# Monday.com Research: Information Architecture Defaults

## What They Do

### First Login & Empty State Flow

**Initial Account Setup:**
1. User signs up: name, email, password or SSO (Google, etc.)
2. Optional profile details: team role, company size
3. Invite teammates prompt (optional)
4. Profile setup: upload photo, set preferences

**Workspace Selection & Creation:**
- Brand new accounts start with a "Main" workspace (empty, no boards)
- If multiple workspaces exist (from invitations or admin setup), user selects which to start in
- UI prompts to either:
  - Create a workspace (if none exist)
  - Select an existing workspace (if multiple available)

**Empty State Handling:**
- When workspace has no boards, empty state explains:
  - What workspaces are
  - Why boards are needed
  - Options: use template or create blank board
- Clear call-to-action: "Create your first board" or "Browse templates"

**First Successful Outcome Path:**
1. User selects workspace
2. Chooses template OR creates blank board
3. If template: picks from Template Center (project board, CRM, etc.)
4. If blank: selects layout (list, kanban, etc.), configures columns
5. Adds sample items/tasks to demonstrate structure
6. Guided tour shows navigation, updates feed, notifications

**Onboarding Best Practices:**
- Reduces friction between sign-up and first meaningful action
- Template selection helps users get started quickly
- Developer apps can define starting point (feature vs template)
- Onboarding configuration allows apps to specify which workspace/board to apply to

---

## What Breaks at Scale

### Workspace Selection Complexity

**Problem:** As organizations grow, users may belong to 10+ workspaces. The selection UI becomes overwhelming:
- Long dropdown lists
- No clear indication of which workspace to choose
- No "last used" or "recommended" workspace
- Users may not understand workspace purpose from name alone

**Impact:**
- Decision paralysis on first login
- Users pick wrong workspace, create content in wrong place
- Requires admin intervention to move content
- Poor user experience leads to abandonment

### Empty State Guidance Insufficient

**Problem:** Empty states are generic and don't guide users to their specific role's first action:
- Marketing person sees same empty state as developer
- No role-based recommendations
- Template selection overwhelming (200+ templates)
- No clear "start here" path for different user types

**Impact:**
- Users don't know what to do first
- Template selection becomes random
- Inconsistent project structures across teams
- Poor adoption of best practices

### No Default Hierarchy

**Problem:** Monday.com is a blank canvas—no enforced structure:
- Users create boards with different naming conventions
- No standard folder structure
- No default workspace organization
- Each team structures differently

**Impact:**
- Hard to find content across organization
- Inconsistent data structures
- Difficult to roll up metrics
- Governance becomes impossible

### First Action Not Role-Specific

**Problem:** First login doesn't consider user's role or context:
- Admin sees same view as individual contributor
- No workspace owner vs member differentiation
- No project manager vs team member guidance
- Generic "create board" doesn't match user's actual first task

**Impact:**
- Wrong first actions taken
- Users create wrong type of content
- Requires rework and cleanup
- Poor first impression

---

## What You Should Copy

### 1. Clear Empty State with Two Actions

**Copy:** Provide exactly two clear actions on first login:
- **Select workspace** (if multiple available)
- **Create project** (primary action)

**Why:** Reduces decision paralysis. Users know immediately what to do.

**Implementation:**
- If no workspace selected: show workspace selector prominently
- If workspace selected: show "Create Project" as primary CTA
- Hide all other navigation until first action complete

### 2. Template-First Approach

**Copy:** Make template selection the primary "create project" path, not an afterthought.

**Why:** Gets users to first successful outcome faster. Templates include best practices.

**Implementation:**
- "Create Project" opens Template Center modal
- Blank project is secondary option
- Templates organized by role/use case
- Clear preview of what template creates

### 3. Workspace Context on First Login

**Copy:** Show workspace context even when empty:
- Workspace name and purpose visible
- "This workspace is for [department/team]"
- Suggested templates based on workspace type

**Why:** Helps users understand where they are and what to do.

### 4. Guided First Action

**Copy:** After template selection, guide user through first meaningful action:
- "Add your first task"
- "Invite your team"
- "Set up your project timeline"

**Why:** Ensures first successful outcome, not just empty project.

---

## What You Should Avoid

### 1. Don't Show Everything at Once

**Avoid:** Presenting all navigation, features, and options on first login.

**Why:** Overwhelming. Users don't know where to start.

**Instead:** Progressive disclosure—show only what's needed for first action.

### 2. Don't Make Workspace Selection Optional

**Avoid:** Allowing users to proceed without selecting a workspace.

**Why:** Content ends up in wrong place. Hard to organize later.

**Instead:** Require workspace selection before any content creation.

### 3. Don't Default to Blank Canvas

**Avoid:** Making "blank project" the default or primary option.

**Why:** Users create inconsistent structures. No best practices enforced.

**Instead:** Template selection is primary. Blank is advanced option.

### 4. Don't Hide the Template Center

**Avoid:** Burying template selection in menus or making it hard to find.

**Why:** Users miss best practices. Create projects from scratch unnecessarily.

**Instead:** Template Center is the primary "Create Project" action.

### 5. Don't Skip Role-Based Guidance

**Avoid:** Generic empty states that don't consider user role.

**Why:** Wrong first actions. Poor user experience.

**Instead:** Show role-appropriate templates and actions.

### 6. Don't Allow Unstructured Creation

**Avoid:** Letting users create projects with any structure they want.

**Why:** Inconsistent data. Hard to roll up. Governance impossible.

**Instead:** Templates enforce structure. Required fields. Standard naming.

---

## Key Takeaways for Zephix

### What to Build

1. **Fixed Default Hierarchy**
   - Enforce workspace → project → plan structure
   - Standard naming conventions
   - No blank canvas option for first project

2. **Role-Based First Actions**
   - Workspace owner: "Create Project" or "Invite Team"
   - Project manager: "Select Template" or "View Projects"
   - Team member: "View My Tasks" or "Join Project"

3. **Template-First Creation**
   - "Create Project" = Template Center modal
   - Blank project is advanced/hidden option
   - Templates include required fields and structure

4. **Clear Empty States**
   - Two actions maximum
   - Context-aware (workspace type, user role)
   - Guided first successful outcome

5. **Progressive Disclosure**
   - Show only what's needed for current step
   - Reveal features as user progresses
   - Don't overwhelm on first login

### What to Avoid

1. **Blank Canvas Default**
   - Don't let users create unstructured projects
   - Templates enforce best practices

2. **Generic Empty States**
   - Don't show same view to all users
   - Role and context matter

3. **Optional Workspace Selection**
   - Require workspace selection before content creation
   - One source of truth for workspace state

4. **Feature Overload**
   - Don't show all features on first login
   - Progressive disclosure

5. **No Guidance**
   - Don't leave users to figure it out
   - Guide to first successful outcome

---

## Implementation Priority

1. **Lock workspace selection** (one source of truth, required before content)
2. **Template-first creation** (primary action, not hidden)
3. **Role-based empty states** (different views for different roles)
4. **Guided first action** (ensure first successful outcome)
5. **Fixed hierarchy** (enforce structure, no blank canvas)

---

*Research Date: January 2026*
*Source: Monday.com documentation, onboarding flows, user experience analysis*
