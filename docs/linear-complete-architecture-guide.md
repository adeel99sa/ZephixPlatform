# Linear Platform: Complete End-to-End Architecture Guide

## Executive Summary

**Linear** is a modern issue tracking and project management platform designed specifically for software development teams. It combines speed, simplicity, and powerful automation to help teams ship products faster. Unlike traditional project management tools, Linear is opinionated about workflows while remaining flexible enough to adapt to different team structures.

**Key Differentiators:**
- **Speed-first design**: Keyboard shortcuts, instant search, fast UI
- **Developer-focused**: Built for engineering teams with deep Git integrations
- **Opinionated workflows**: Teams define custom statuses, but structure is enforced
- **AI-powered**: Agents, triage intelligence, semantic search
- **Modern architecture**: GraphQL API, real-time updates, webhooks

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Core Architecture & Data Model](#core-architecture--data-model)
3. [Key Features & Capabilities](#key-features--capabilities)
4. [API & Integration Architecture](#api--integration-architecture)
5. [Workflows & Automation](#workflows--automation)
6. [Analytics & Reporting](#analytics--reporting)
7. [Administration & Security](#administration--security)
8. [AI & Agents](#ai--agents)
9. [Best Practices & Patterns](#best-practices--patterns)

---

## Platform Overview

### What Linear Is

Linear is a **work management platform** specifically designed for software development teams. It helps teams:
- Track issues (bugs, features, chores)
- Plan work in cycles (sprints)
- Organize work into projects and initiatives
- Automate workflows
- Measure velocity and cycle time
- Collaborate across teams

### Core Philosophy

1. **Speed Matters**: Every interaction is optimized for speed (keyboard shortcuts, instant search, fast UI)
2. **Opinionated but Flexible**: Enforces structure (teams, workflows) but allows customization
3. **Developer-First**: Deep Git integrations, code-focused workflows
4. **AI-Enhanced**: Agents and intelligence to reduce manual work
5. **Modern Stack**: GraphQL API, real-time updates, webhooks

### Target Users

- **Software development teams** (primary)
- **Product teams**
- **Engineering managers**
- **Startups to enterprises** (scales from small teams to large organizations)

---

## Core Architecture & Data Model

### Hierarchical Structure

```
Workspace (Top Level)
├── Teams (Multiple)
│   ├── Issues (Many)
│   ├── Cycles (Time-boxed periods)
│   ├── Workflows (Status definitions)
│   └── Members (Users)
├── Projects (Cross-team)
│   ├── Issues (From multiple teams)
│   └── Milestones
├── Initiatives (Strategic grouping)
│   └── Projects (Multiple)
└── Users (Workspace members)
```

### Core Entities

#### 1. Workspace

**Purpose:** Top-level container for all teams, projects, issues, and users.

**Key Characteristics:**
- Single workspace per organization
- Contains all teams, projects, issues, initiatives
- Workspace-level settings (billing, security, features)
- Data region selection (US or EU) - permanent choice
- Some metadata always stored in US

**Settings:**
- Workspace name, URL
- Billing/plan management
- Feature toggles (Initiatives, Project Updates)
- Import/export capabilities
- Integration management

#### 2. Teams

**Purpose:** Organize work by function, product, or feature area.

**Key Characteristics:**
- Each team has its own workflow (status definitions)
- Teams own issues, cycles, backlogs
- Issues must belong to one team
- Team-level settings (labels, templates, automations)
- Team limits by plan:
  - Free: 2 teams
  - Basic: 5 teams
  - Business/Enterprise: Unlimited

**Team Settings:**
- Name, icon
- Estimate usage (story points, hours, etc.)
- Create-by-email
- Issue labels
- Recurring issues
- Status workflows
- Automations
- Triage features
- Cycles configuration

**Team Types:**
- **Public Teams**: Joinable or viewable by all workspace members
- **Private Teams** (Business/Enterprise): Only members invited by team owner/admins can see or join

#### 3. Issues

**Purpose:** Fundamental unit of work (bugs, features, chores, spikes).

**Key Characteristics:**
- Must belong to one team
- Has one status (from team's workflow)
- Can belong to projects (optional)
- Can belong to cycles (optional)
- Can have parent/sub-issues (hierarchical)
- Can have relations (blocked, blocking, related, duplicate)

**Issue Properties:**
- `id`, `title`, `description`
- `stateId` (workflow status)
- `assignee` (user)
- `createdAt`, `updatedAt`, `archivedAt`
- `labels` (tags)
- `project` (optional)
- `cycle` (optional)
- `estimate` (story points, hours, etc.)
- `priority`
- `dueDate`
- `parent` (for sub-issues)
- Relations (blocked, blocking, related, duplicate)

**Issue Types:**
- Feature
- Bug
- Chore
- Spike

**Issue States:**
- Archived issues are hidden by default (unless `includeArchived: true`)
- Issues can be canceled or marked as duplicate

#### 4. Workflows & Statuses

**Purpose:** Define how work progresses through states.

**Key Characteristics:**
- **Per-team**: Each team has its own workflow
- **Ordered statuses**: Statuses have an order within categories
- **Categories**: Backlog, Todo, In Progress, Done, Canceled, Triage
- **Customizable**: Teams can add, edit, remove, reorder statuses

**Default Status Categories:**
- **Backlog**: Icebox, Backlog
- **Todo**
- **In Progress**: In Progress, In Review, Ready to Merge
- **Done**
- **Canceled**: Duplicate, Won't Fix
- **Triage**: Special inbox for incoming issues

**Workflow Configuration:**
- Add new statuses
- Edit existing (name, color, description)
- Delete statuses (must keep at least one per category)
- Reorder statuses within category
- Set default status for new issues
- Configure duplicate issue status
- Auto-close/auto-archive settings

**Project Statuses:**
- Separate from issue statuses
- Categories: Backlog, Planned, Started, Completed, Canceled
- Custom states like "Paused" can be added

#### 5. Projects

**Purpose:** Group related issues to deliver something time-bound or goal-oriented.

**Key Characteristics:**
- Can span across teams
- Have statuses (separate from issue statuses)
- Have milestones (subdivisions)
- Have owners (single point of responsibility)
- Have target dates

**Project Properties:**
- `id`, `name`, `description`
- `status` (from project status workflow)
- `lead` / `leadId` (owner)
- `startDate`, `targetDate`
- `milestones` (multiple)
- `issues` (from multiple teams)

**Project Statuses:**
- Backlog
- Planned
- Started
- Completed
- Canceled
- Paused (custom)

#### 6. Initiatives

**Purpose:** Higher-level strategic groupings above projects.

**Key Characteristics:**
- Group multiple projects
- Represent company priorities/goals
- Can be hierarchical (up to 5 levels on Enterprise)
- Have updates (status updates, progress reports)

**Initiative Properties:**
- `id`, `name`, `description`
- `projects` (multiple)
- `updates` (status updates)
- Hierarchical (parent/child initiatives)

#### 7. Cycles

**Purpose:** Time-boxed periods (similar to sprints) for teams to work in.

**Key Characteristics:**
- Owned by teams
- Automatically generated when enabled
- Have scheduled time windows
- Issues can be assigned to cycles
- Work that isn't completed rolls over

**Cycle Properties:**
- `id`
- Scheduled time windows (start/end dates)
- `isActive`, `isFuture`, `isPast`, `isNext`, `isPrevious` flags
- `issues` (assigned to cycle)

**Cycle Configuration:**
- Duration (1 week, 2 weeks, etc.)
- Auto-generation of upcoming cycles
- Rollover behavior for incomplete work

#### 8. Users & Roles

**User Types:**
- **Workspace Owner** (Enterprise only): Full administrative control
- **Admin**: Manages workspace-wide tasks
- **Team Owner**: Manages specific team settings
- **Member**: Standard access to issues/projects
- **Guest** (Business/Enterprise): Restricted access to specific teams

**Permissions:**
- Workspace-level permissions
- Team-level permissions
- Project-level permissions
- Issue-level permissions

---

## Key Features & Capabilities

### 1. Issue Management

**Core Functionality:**
- Create, update, archive issues
- Assign to users
- Add labels, estimates, priorities
- Set due dates
- Link to projects, cycles
- Create parent/sub-issue hierarchies
- Define relations (blocked, blocking, related, duplicate)

**Issue Relations:**
- **Blocked**: Issue cannot proceed because of another issue
- **Blocking**: Issue prevents another issue from proceeding
- **Related**: Issues are connected but not blocking
- **Duplicate**: Issue is a duplicate of another

**Parent/Sub-Issues:**
- Break down larger tasks into smaller pieces
- Sub-issues inherit some properties from parent
- Can have multiple levels of nesting

**Triage:**
- Special inbox for incoming issues
- Issues from integrations, external contributors
- Review, prioritize, assign, move to backlogs/cycles, or decline

### 2. Views & Filters

**View Types:**
- **List View**: Traditional list of issues
- **Board View**: Kanban-style board with status columns
- **Custom Views**: Saved views with specific filters, grouping, sorting

**Filtering:**
- Filter by: Priority, Cycle, Estimate, Labels, Links
- Issue relations: Blocked, Parent, Duplicate
- Dates: Created, Due, Updated
- Users: Assignee, Created by
- Content: Title, Description search
- Operators: is/is not, includes any/all/none, before/after

**Grouping:**
- Group by: Assignee, Status, Project, etc.
- Collapse/expand group headers
- See distribution of work

**Sorting:**
- Sort by: Due date, Updated date, Priority, Target date (projects)
- Works in both list and board views

**Saved Views:**
- Persistent views with filters, grouping, sorting
- Can be shared or favorited
- Scoped to workspace or specific team
- Can set favorite view as default landing page
- Each view has an owner (creator by default)

**Default Views:**
- Per-team default views: "Active Issues", "Backlog"
- Project views for high-level tracking

### 3. Projects & Milestones

**Project Management:**
- Create projects spanning multiple teams
- Add issues from different teams
- Set project status, owner, target dates
- Create milestones (subdivisions)
- Track progress and health

**Project Views:**
- Status overview
- Health indicators
- Milestone tracking
- Issue list

**Project Updates:**
- Status updates
- Progress reports
- Team communication

### 4. Cycles (Sprints)

**Cycle Management:**
- Time-boxed periods for teams
- Automatically generated when enabled
- Assign issues to cycles
- Track scope, started, completed work
- Rollover incomplete work

**Cycle Graph:**
- Shows scope (estimated work)
- Started issues over time
- Completed issues over time
- Target trend (ahead/behind pacing)

**Cycle Success Metrics:**
- Scope: Everything estimated at close
- Completed: Sum of estimates of issues done
- Success: Completed + fraction of started work (e.g., 25% for started issues)

### 5. Labels & Types

**Labels:**
- Tags for issues (component, priority, risk, etc.)
- Not statuses (avoid mismatch)
- Limited set to maintain clarity
- Shared across teams (optional)

**Issue Types:**
- Feature
- Bug
- Chore
- Spike

### 6. Estimates & Metrics

**Estimates:**
- Story points, hours, or other units
- Attached to issues
- Used for velocity calculations
- Used in cycle/project planning

**Metrics Captured:**
- **Velocity**: Issues per cycle
- **Cycle Time**: In Progress → Done
- **Lead Time**: Backlog → Done
- **Triage Time**: Time in triage status
- **Issue Age**: How long since creation when still open
- **Carryover**: Work not completed in cycle

---

## API & Integration Architecture

### GraphQL API

**Endpoint:** `https://api.linear.app/graphql`

**Key Characteristics:**
- Full GraphQL API (queries and mutations)
- Same schema the product uses internally
- Supports schema introspection
- Complexity-based rate limits
- Hourly caps per access token

**Authentication:**
- **Personal API Keys**: For individual or internal scripts
  - Header: `Authorization: <API_KEY>`
  - Permissions & scope can be restricted
  - Can limit access to specific teams
- **OAuth2**: For third-party apps
  - Header: `Authorization: Bearer <token>`
  - Standard OAuth2 flow

**Key Operations:**
- Query teams, issues, projects, cycles, users
- Create, update, archive issues
- Create, update projects
- Manage webhooks
- Query with filters, pagination
- Support for `includeArchived` flag

**Example Queries:**

```graphql
# Query viewer (current user)
query {
  viewer {
    id
    name
    email
  }
}

# List teams
query {
  teams {
    nodes {
      id
      name
      key
    }
  }
}

# Get issues for a team
query {
  team(id: "TEAM_ID") {
    issues {
      nodes {
        id
        title
        description
        assignee { id name }
        createdAt
        archivedAt
      }
    }
  }
}

# Create an issue
mutation {
  issueCreate(input: {
    title: "New issue"
    description: "Details"
    teamId: "TEAM_ID"
  }) {
    success
    issue { id title }
  }
}
```

**Filtering:**
- Most list queries support filter arguments
- Logical AND/OR
- Relational filters
- String matches
- Status, label, project filters

**Pagination:**
- Standard GraphQL pagination
- `first`, `after`, `last`, `before` cursors
- Many list fields support `includeArchived`

### Webhooks

**Purpose:** Real-time HTTP notifications when Linear data changes.

**Events:**
- Issue created, updated, archived
- Issue attachments
- Issue labels
- Comments
- Projects
- Project updates
- Cycles
- Users
- SLA changes
- OAuthApp revoked

**Security:**
- `Linear-Signature`: HMAC-SHA256 over raw body with signing secret
- `Linear-Event`: Event type
- `Linear-Delivery`: Delivery ID
- `webhookTimestamp`: Timestamp in ms (guard against replay attacks)

**Configuration:**
- Admin permissions required
- Create webhook with URL, resource types, team scope
- Enable/disable webhooks

**Example Webhook Creation:**

```graphql
mutation {
  webhookCreate(input: {
    url: "https://your.service/webhook"
    teamId: "TEAM_ID"
    resourceTypes: ["Issue", "Comment"]
  }) {
    success
    webhook { id enabled }
  }
}
```

### Integrations

#### GitHub Integration

**Features:**
- Link Linear issues to GitHub Pull Requests and commits
- Auto-update issue status when PR moves through states (Draft → Merged)
- Sync issues between GitHub and Linear (title, description, labels, assignees, comments)
- Bidirectional sync

**Linking Methods:**
- **Magic words**: "fixes #issueID" in PR descriptions or commit messages
- **Auto-linking**: Via branch names (if starting from Linear with suggested branch name)
- **Issue IDs**: In PR titles

**Automation:**
- Workflow automations per team
- Customize issue lifecycles so PR/commit events trigger status transitions
- Personal GitHub automations: Auto-assign or move issues when branches created

**Configuration:**
- Enable webhook in GitHub: Set secret and payload URL from Linear
- Choose "Push events"
- Set content-type to `application/json`

#### Slack Integration

**Features:**
- Convert Slack messages into Linear issues (via message actions or @Linear mentions)
- Sync Slack threads with Linear issue comments
- Link previews (unfurling) for Linear issue and project links in Slack
- Notifications: Mirror Linear notifications to Slack channels

**Configuration:**
- Admins enable integration workspace-wide
- Users can then use message actions, preview links, etc.
- Designate which channels receive what kinds of updates

#### Zapier Integration

**Features:**
- Connect Linear with Slack, GitHub, Google Sheets, Notion, HubSpot, etc.
- Common automations:
  - Create Linear issue when someone reacts to Slack message
  - Send Slack messages when Linear issue created/updated
  - Push updates to Google Sheets

**Webhooks via Zapier:**
- Use "Webhooks by Zapier" as triggers or actions
- Send data from Linear to custom endpoints
- Ingest external events into Linear via Zapier

#### Other Integrations

**Built-in Integrations:**
- Notion (embed previews, query issue/project data)
- GitLab (Merge Request workflows)
- Zendesk, Intercom, Salesforce (customer feedback, support tickets)
- Figma, VS Code, Sentry, Loom (design/code context linking)

---

## Workflows & Automation

### Workflow Configuration

**Per-Team Workflows:**
- Each team defines its own status workflow
- Custom statuses per team
- Status categories: Backlog, Todo, In Progress, Done, Canceled, Triage
- Reorder statuses within categories
- Set default status for new issues

**Automation Rules:**
- Status transitions based on events
- Auto-assign based on conditions
- Auto-move issues based on triggers
- GitHub PR/commit events trigger status changes
- Personal automations (per user)

### GitHub Automations

**Workflow Automations:**
- Per-team basis
- Customize issue lifecycles
- PR/commit events trigger status transitions
- Example: PR merged → Issue status to "Done"

**Personal Automations:**
- Individual user preferences
- Auto-assign when branches created
- Auto-move issues based on branch activity

### Zapier Automations

**Common Patterns:**
- Create Linear issue from external trigger
- Update external system when Linear issue changes
- Sync data between Linear and other tools
- Multi-step workflows across tools

---

## Analytics & Reporting

### Key Metrics

**Velocity:**
- How much work team completes per cycle
- Measured in points or issue counts
- Used in Project Graph predictions
- Cycle success metrics

**Cycle Time:**
- Time from when work begins ("started") to completion
- Plotted as scatterplots in Insights
- Only for issues that have been "in progress" then completed

**Lead Time:**
- Time from issue creation to completion
- Includes cycle time + triage/reaction time
- Plotted as scatterplots in Insights
- Only for completed issues

**Other Metrics:**
- **Triage Time**: Time in triage status
- **Issue Age**: How long since creation when still open
- **Scope**: Estimated work
- **Completed**: Work actually done
- **Success**: Completed + fraction of started work

### Analytics Features

**Insights Panel:**
- Custom views by team, project, label, etc.
- Metrics vs Slices (metrics across slices of data)
- Scatterplots, bar charts, tables
- Filter by various dimensions

**Cycle Graph:**
- For any given cycle
- Shows scope (estimated work)
- Started issues over time
- Completed issues over time
- Target trend (ahead/behind pacing)
- Accounts for weekends in target line

**Project Graph:**
- Shows how scope and completion evolve over time
- Predictive completion dates based on recent weekly velocity
- Projects need "Started" status for issues to be included
- More weight on recent weeks for predictions

**Dashboards** (Business/Enterprise):
- Highly customizable
- Combine multiple insights (charts/tables)
- Filtered globally or per-insight
- Ability to drill down issues from visuals
- Embedding capabilities

### External Analytics Tools

**Screenful Integration:**
- Velocity by cycle
- Lead time vs cycle time vs reaction time
- Burndown charts
- Cumulative flow charts
- Filter by labels, teams, cycles

**Data Export:**
- CSV export
- Google Sheets integration
- Warehouse sync support
- Feed BI tools for customized analysis

### Dashboard Examples

**Common Use Cases:**
- Tracking high-priority issues over time
- SLA/Lead Time performance by severity/priority/team
- Cycle Time by assignee (detect bottlenecks)
- Scope/Investment tracking (planned vs done, work outside roadmap)

---

## Administration & Security

### Workspace Administration

**General Settings:**
- Workspace name, URL
- Billing/plan management
- Feature toggles (Initiatives, Project Updates)
- Import/export issues
- Integration management
- Deleting workspace (permanent, admin only)

**Data Regions:**
- Choose US or EU region at workspace creation
- Decision is permanent
- Some metadata always stored in US

### Teams Management

**Team Settings:**
- Name, icon
- Estimate usage
- Create-by-email
- Issue labels
- Recurring issues
- Status workflows
- Automations
- Triage features
- Cycles configuration
- Share templates, labels across teams

**Team Limits:**
- Free: 2 teams
- Basic: 5 teams
- Business/Enterprise: Unlimited

**Private Teams:**
- Business/Enterprise only
- Sensitive work hidden from non-members
- When making public → private: Existing assignees/subscribers outside get removed/unsubscribed

### Permissions & Roles

**Role Types:**

| Role | Permissions |
|------|-------------|
| **Workspace Owner** (Enterprise) | Full administrative control (billing, audit logs, workspace exports, OAuth app approvals) |
| **Admin** | Manages routine workspace-wide tasks; on Enterprise may have restricted permissions; Free plan makes everyone admin by default |
| **Team Owner** | Manages specific team settings (member additions, workflow customization); Workspace admins/owners automatically team owners |
| **Member** | Standard access to issues/projects for teams they're in; Cannot change admin-only or workspace-wide settings |
| **Guest** (Business/Enterprise) | Restricted access—only to specific teams, no workspace-level views/settings |

**Access Control:**
- Team visibility: Public (joinable/viewable) vs Private
- Private: Only members invited by team owner/admins can see or join
- Team owners control permissions (labels, templates, workflow, etc.)

### Security

**Authentication Methods:**
- Email link
- Google auth
- Passkeys
- SAML (Enterprise): Manage login via Identity Provider (Okta, OneLogin, Auth0, etc.)
- JIT provisioning
- Domain approvals

**Access Restrictions** (Enterprise):
- Require specific login methods (e.g., SAML only)
- IP restrictions

**Security Certifications:**
- SOC 2 Type II
- GDPR
- HIPAA (with Enterprise BAA)

**Email Domain Management:**
- Approved email domains: Auto-join without invites
- Domain-based control
- Invite links: Unique URLs managing access

---

## AI & Agents

### AI Features

**Product Intelligence:**
- Automatically suggest and apply issue properties (assignees, labels, teams, projects) based on historical patterns
- Detect duplicates or related issues
- Configure different behaviors per team (auto-apply vs suggestions)
- Limit suggestions to sub-teams

**Semantic Search:**
- Search across issues, descriptions, customer feedback, docs
- Relevant results even if keywords don't match exactly

**Summaries:**
- Summaries of updates to docs, project descriptions
- Email or Slack digests
- Pulse updates: Periodic summaries (daily/weekly)
- Audio digests

### AI Agents

**What Are Agents:**
- Full "users" in the workspace
- Act autonomously to help with tasks
- Human remains responsible (accountability preserved)

**Agent Capabilities:**
- Being mentioned or assigned to issues
- Creating issues
- Writing or updating content
- Commenting
- Collaborating on specs
- Picking up tasks across backlog
- Scaling workflows
- Automating parts of product development lifecycle

**Agent Customization:**
- **Agent Guidance**: Admins provide instructions (Markdown) that agents consistently follow
  - Naming conventions for commits/PRs
  - Preferred repositories
  - Review process rules
- Team-level guidance overrides workspace-level
- Workspace and team permissions: Admins choose which teams agent has access to
- Agents can be installed or suspended

**Agent Sessions:**
- Every mention/delegation creates a session
- Session lifecycle states: `pending`, `active`, `awaitingInput`, `error`, `complete`
- Track agent work and progress

**Agent Activities:**
- Emitted during sessions
- Indicate progress, ask clarification, report results, show failures
- Can create a plan within session (multi-step tasks)

**Pre-built Agents:**
- Codex, Cursor, GitHub Copilot, Devin, ChatPRD
- Cover different use cases (requirements, code generation, debugging, PR drafting)

**Custom Agents:**
- Build via developer platform using Linear APIs
- Can be private (workspace) or shared community-wide

**Security & Privacy:**
- Data used for AI features not used to train models outside purposes needed
- Enterprise-grade security around agent behavior and data handling

---

## Best Practices & Patterns

### Workflow Design

**Status Categories:**
- Keep status categories clear and consistent
- Use standard categories: Backlog, Todo, In Progress, Done, Canceled
- Add Triage category for incoming issues
- Avoid too many statuses (maintain clarity)

**Workflow Best Practices:**
- Define workflow states cleanly (what "Started", "In Progress", "Triage" mean)
- All timing metrics rely on these states
- Use consistent estimation across issues
- Account for non-working days (weekends, holidays)

### Team Organization

**Team Structure:**
- Organize by function (Engineering, Marketing) or product
- Keep teams focused (not too large)
- Use private teams for sensitive work
- Share templates and labels across teams when appropriate

**Team Settings:**
- Configure workflows per team
- Set up cycles if using sprints
- Configure triage for incoming issues
- Set up automations per team

### Project Management

**Project Organization:**
- Use projects for time-bound, goal-oriented work
- Projects can span teams
- Use milestones to mark meaningful phases
- Set clear owners and target dates

**Initiative Management:**
- Use initiatives for strategic grouping
- Group multiple projects under initiatives
- Represent company priorities/goals
- Keep hierarchy manageable (up to 5 levels)

### Issue Management

**Issue Creation:**
- Use triage for incoming issues
- Assign appropriate types (Feature, Bug, Chore, Spike)
- Add labels for categorization
- Set estimates for planning

**Issue Relations:**
- Use blocked/blocking for dependencies
- Mark duplicates clearly
- Link related issues
- Use parent/sub-issues for breakdown

**Issue Maintenance:**
- Archive old issues
- Use auto-close/auto-archive settings
- Keep backlogs clean
- Regular triage reviews

### Views & Filters

**Custom Views:**
- Create views for common workflows
- Share views across teams
- Favorite frequently used views
- Set default landing page

**Filtering:**
- Use filters to focus on relevant work
- Combine filters for complex queries
- Save views with filters
- Group by relevant dimensions

### Analytics & Metrics

**Metrics Best Practices:**
- Review metrics by filtered dimensions (team, assignee, label)
- Don't rely on one-off cycles (use historical trends)
- Ensure workflow states are cleanly defined
- Use consistent estimation
- Account for non-working days

**Dashboard Usage:**
- Build dashboards for key metrics
- Track high-priority issues over time
- Monitor SLA/Lead Time performance
- Detect bottlenecks (Cycle Time by assignee)
- Track scope/investment (planned vs done)

### Integration Patterns

**GitHub Integration:**
- Use magic words for linking
- Enable automations for status transitions
- Configure personal automations
- Set up webhooks properly

**Slack Integration:**
- Use message actions to create issues
- Sync comment threads
- Configure notifications appropriately
- Use link previews

**Zapier/Webhooks:**
- Build automations for common workflows
- Sync data between tools
- Create custom integrations
- Handle webhook security properly

### Security & Administration

**Access Control:**
- Use private teams for sensitive work
- Configure SAML for enterprise
- Set up approved email domains
- Use invite links appropriately

**Data Management:**
- Choose data region carefully (permanent)
- Export data regularly
- Archive old issues
- Clean up unused teams/projects

---

## Architecture Patterns & Design Decisions

### Data Model Patterns

**Hierarchical Structure:**
- Workspace → Teams → Issues
- Projects span teams (many-to-many)
- Initiatives group projects (hierarchical)
- Issues can have parent/sub-issues (hierarchical)

**Relationships:**
- Issues belong to one team (required)
- Issues can belong to projects (optional)
- Issues can belong to cycles (optional)
- Issues can have relations (blocked, blocking, related, duplicate)

**Status Management:**
- Statuses defined per team (not global)
- Statuses organized into categories
- Statuses have order within categories
- Project statuses separate from issue statuses

### API Design Patterns

**GraphQL API:**
- Single endpoint for all operations
- Schema introspection supported
- Complexity-based rate limits
- Pagination via cursors
- Filtering via arguments
- `includeArchived` flag for archived data

**Webhooks:**
- Event-driven architecture
- HMAC-SHA256 signatures for security
- Timestamp guards against replay attacks
- Admin permissions required
- Team-scoped or workspace-scoped

### Workflow Patterns

**Team-Based Workflows:**
- Each team has its own workflow
- Statuses are team-specific
- Automations are team-specific
- Cycles are team-specific

**Project Patterns:**
- Projects span teams
- Projects have their own status workflow
- Projects have milestones
- Projects have owners

### Integration Patterns

**GitHub Integration:**
- Magic words in PR/commit messages
- Auto-linking via branch names
- Webhook-based status updates
- Bidirectional sync

**Slack Integration:**
- Message actions
- Thread sync
- Link previews
- Notification mirroring

**Zapier/Webhooks:**
- External trigger → Linear action
- Linear event → External action
- Multi-step workflows
- Custom integrations

---

## Comparison with Other Platforms

### Linear vs Jira

**Linear Advantages:**
- Faster, more modern UI
- Better keyboard shortcuts
- Simpler workflow configuration
- Better Git integration
- AI-powered features
- More opinionated (less configuration)

**Jira Advantages:**
- More mature ecosystem
- More integrations
- More customization options
- Better for non-engineering teams
- More reporting options

### Linear vs Monday.com

**Linear Advantages:**
- Developer-focused
- Better Git integration
- Faster UI
- Simpler structure
- Better for engineering teams

**Monday.com Advantages:**
- More flexible (blank canvas)
- Better for non-engineering teams
- More template options
- More visual customization
- Better for project management

### Linear vs ClickUp

**Linear Advantages:**
- Faster, more focused
- Better Git integration
- Simpler structure
- Better for engineering teams
- More opinionated

**ClickUp Advantages:**
- More features
- Better for general project management
- More customization
- More integrations
- Better for non-engineering teams

---

## Key Takeaways for Architects

### What Linear Does Well

1. **Speed & Performance**
   - Fast UI with keyboard shortcuts
   - Instant search
   - Real-time updates
   - Optimized for developer workflows

2. **Opinionated Structure**
   - Teams define workflows
   - Enforced structure (teams, statuses)
   - Reduces configuration burden
   - Consistent across organization

3. **Developer-First**
   - Deep Git integrations
   - Code-focused workflows
   - PR/commit linking
   - Branch name suggestions

4. **Modern Architecture**
   - GraphQL API
   - Real-time updates
   - Webhooks
   - Modern tech stack

5. **AI-Enhanced**
   - Agents for automation
   - Triage intelligence
   - Semantic search
   - Summaries

### What Linear Doesn't Do

1. **General Project Management**
   - Focused on software development
   - Not ideal for non-engineering teams
   - Limited project management features

2. **Extensive Customization**
   - Less flexible than Jira/Monday
   - Opinionated structure
   - Limited visual customization

3. **Enterprise Features**
   - Some features require Enterprise plan
   - Limited reporting on lower plans
   - Some integrations require higher plans

### Design Principles to Learn From

1. **Opinionated but Flexible**
   - Enforce structure where it matters
   - Allow customization where needed
   - Reduce configuration burden
   - Maintain consistency

2. **Speed Matters**
   - Optimize for common operations
   - Keyboard shortcuts
   - Instant search
   - Fast UI

3. **Developer-First**
   - Deep integrations with developer tools
   - Code-focused workflows
   - Git integration
   - Branch name suggestions

4. **AI as Enhancement**
   - Agents for automation
   - Intelligence for suggestions
   - Semantic search
   - Summaries

5. **Modern Architecture**
   - GraphQL API
   - Real-time updates
   - Webhooks
   - Modern tech stack

---

## Conclusion

Linear is a modern, developer-focused issue tracking and project management platform that combines speed, simplicity, and powerful automation. Its opinionated structure reduces configuration burden while remaining flexible enough for different team needs. The GraphQL API, real-time updates, and webhooks provide a modern integration architecture, while AI features enhance productivity.

**Key Strengths:**
- Speed and performance
- Developer-first design
- Opinionated but flexible structure
- Modern architecture
- AI-enhanced features

**Key Limitations:**
- Focused on software development (not general project management)
- Less customization than competitors
- Some enterprise features require higher plans

**For Architects:**
- Study the opinionated structure (teams, workflows, statuses)
- Learn from the speed optimizations
- Understand the GraphQL API design
- Consider AI-enhanced features
- Balance opinionated structure with flexibility

---

## References

- Linear Documentation: https://linear.app/docs
- Linear Developers: https://linear.app/developers
- Linear API: https://linear.app/docs/api-and-webhooks
- Linear Integrations: https://linear.app/integrations
- Linear AI: https://linear.app/ai
- Linear Insights: https://linear.app/insights

---

*Document Created: January 2026*
*Based on comprehensive review of Linear documentation, API, and platform features*
