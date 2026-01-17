# Linear Platform: Detailed Features Guide
## Projects, Programs, Portfolios, Dashboards, Workspaces, Administration & Resources

## Table of Contents

1. [Projects, Programs & Portfolios](#projects-programs--portfolios)
2. [Dashboards](#dashboards)
3. [Workspaces & Work Organization](#workspaces--work-organization)
4. [Administration](#administration)
5. [Resources & Capacity Planning](#resources--capacity-planning)

---

## Projects, Programs & Portfolios

### Overview

Linear organizes work hierarchically through **Initiatives** (portfolios/programs), **Projects**, **Issues**, and **Sub-Issues**. This structure enables strategic alignment, progress tracking, and cross-team coordination.

### Hierarchy Structure

```
Initiative (Portfolio/Program)
├── Sub-Initiative (Level 2-5, Enterprise only)
│   ├── Projects
│   │   ├── Milestones
│   │   └── Issues
│   │       └── Sub-Issues
│   └── More Sub-Initiatives
└── Projects (Direct)
    ├── Milestones
    └── Issues
        └── Sub-Issues
```

### Initiatives (Portfolios/Programs)

**Purpose:** High-level strategic objectives that span across multiple teams and projects.

**Key Characteristics:**
- Group multiple projects
- Represent company goals, OKRs, strategic objectives
- Can span multiple teams
- Track progress at strategic level
- Available on Business and Enterprise plans

**Initiative Properties:**
- `name` (required)
- `owner` (optional)
- `targetDate` / deadline (optional)
- `teams` (multiple)
- `projects` (multiple, can be direct or via sub-initiatives)
- `description` / mission / goals / summary
- `status`: Planned / Active / Completed
- `health`: On track / At risk / Off track / No recent update
- `updates` (status updates, progress reports)
- `resources` (optional)

**Initiative Health:**
- Reflects project statuses within the initiative
- Based on latest updates from projects
- Health indicators:
  - **On track**: Projects progressing as expected
  - **At risk**: Some concerns or delays
  - **Off track**: Significant issues or delays
  - **No recent update**: Missing updates

**Initiative Updates:**
- Written summaries of progress, blockers, next steps
- Key metrics: issues completed, changes to target dates, milestone progress
- Changes to leads/teams
- Health indicator included
- Notifications/reminders can be configured
- Overdue updates affect health display

### Sub-Initiatives (Enterprise Feature)

**Purpose:** Create nesting—splitting initiatives into smaller goals or workstreams.

**Key Characteristics:**
- Available only on **Enterprise** plan
- Up to **5 levels deep** nesting
- Sub-initiatives act like child initiatives
- Can own projects directly
- Contribution rolls up to parent initiative
- Each initiative may have only one parent

**Hierarchy Levels (Typical Use):**

1. **Level 1 (Top-level Initiative)**
   - Corporate strategy / annual OKRs
   - Company-wide objectives

2. **Level 2**
   - Major "pillars" of strategy
   - Examples: Growth, Stability, Innovation
   - Department-level objectives

3. **Level 3**
   - Workstreams inside pillars
   - Departments or cross-departmental programs
   - Quarter-level planning

4. **Level 4**
   - Projects or phased initiatives within workstreams
   - Examples: Q1 product roadmap, Marketing campaigns
   - Team-level programs

5. **Level 5**
   - Tactical initiatives
   - Small deliverables
   - Special experiments

**Roll-up Behavior:**
- Parent initiative automatically includes:
  - Projects assigned directly under it
  - All projects under its sub-initiatives
- Projects belonging to any sub-initiative are included in progress/health roll-ups of all ancestor initiatives
- Enables roll-ups of work across teams, departments, quarters

**Managing Sub-Initiatives:**
- Create or assign parent when creating new initiative
- Drag-and-drop via keyboard modifiers (Option/Alt) in Initiatives view to nest or unnest
- Overview page shows sub-initiatives
- Navigate down hierarchy, showing projects at each level
- Collapse/expand nested levels (press `T` toggles collapse)

### Projects

**Purpose:** Focused effort/deliverable with clearer scope and timeline.

**Key Characteristics:**
- Group related issues
- Can span across teams
- Have defined timeframes
- Have owners (single point of responsibility)
- Belong to initiatives (or sub-initiatives)
- Never own initiatives (only belong to them)

**Project Properties:**
- `id`, `name`, `description`
- `status` (from project status workflow)
- `lead` / `leadId` (owner)
- `startDate`, `targetDate`
- `teams` (multiple teams can participate)
- `issues` (from multiple teams)
- `milestones` (subdivisions within project)
- `initiative` (belongs to initiative or sub-initiative)
- `health`: On track / At risk / Off track
- `updates` (status updates, progress reports)

**Project Statuses:**
- **Default Categories:**
  - Backlog
  - Planned
  - Started
  - Completed
  - Canceled
- **Custom Statuses:**
  - Can create custom statuses (e.g., "Paused")
  - Custom names, descriptions, colors
  - Align with org terminology
- **Status Management:**
  - Manually updated (not auto-derived from issue progress)
  - Reflect where project is in lifecycle
  - Workspace-level custom project statuses

**Project Milestones:**

**Purpose:** Divide project into meaningful stages or checkpoints.

**Key Characteristics:**
- Subdivisions within projects
- Mark meaningful phases or completion stages
- Examples: "Beta 1", "Public Launch", "Design → Dev → Test → Release"
- Not available directly inside initiatives (only in projects)

**Milestone Properties:**
- `name`
- `targetDate` (optional)
- `issues` (assigned to milestone)
- `completionPercentage` (based on issues moved to Completed status)

**Milestone Tracking:**
- Completion percentage based on number of issues in milestone moved to Completed status
- On timeline view, milestones appear as diamond icons
- Show which are pending, in progress
- Display target/completion dates

**Project Health & Progress:**

**Health Indicator:**
- **On track**: Project progressing as expected
- **At risk**: Some concerns or delays
- **Off track**: Significant issues or delays
- Included in project updates
- Based on latest updates and progress

**Project Graph:**
- Generated once project has been started and enough issue data available
- Shows:
  - Scope over time (estimated work)
  - Issues started vs completed over time
  - Projections based on velocity
- **Predicted Completion Date:**
  - Based on weekly velocity of historical issue completion
  - Projections shown with buffer ranges (optimistic / pessimistic)
  - Accounts for uncertainty
  - More weight on recent weeks

**Project Updates:**
- Written summaries of progress, blockers, next steps
- Key metrics:
  - Issues completed
  - Changes to target dates
  - Milestone progress
  - Changes to leads/teams
- Health indicator included
- Notifications/reminders can be configured
- Overdue updates affect health display

**Project Views:**
- Customizable dashboards showing collections of projects
- Filter by:
  - Health (On track, At risk, Off track)
  - Status (Backlog, Planned, Started, etc.)
  - Target date range
  - Teams
  - Owners
- See which projects are at risk, which are coming up
- Timeline view: Visualize projects and milestones across time
- Useful for roadmap planning, launch planning, identifying dependencies

### Issues & Sub-Issues

**Issues:**
- Fundamental unit of work (bugs, features, tasks, chores)
- Must belong to one team
- Can belong to projects (optional)
- Can belong to cycles (optional)
- Can have parent/sub-issues (hierarchical)

**Sub-Issues:**
- Smaller tasks or steps that make up larger issue
- Break down work into more granular chunks
- Child issues under parent issue
- Have their own assignees and statuses
- Can later be promoted to full projects if needed
- Used when issue is big or complex, requires coordination

### Best Practices

**Naming & Organization:**
- Keep initiatives broad (product/goal level)
- Projects more specific with target deliverables and due dates
- Use labels to add context across levels (components, risk, priority)
- Not everything needs its own new level

**Milestones:**
- Use milestones to track stages (Design → Dev → Test → Release)
- Not available directly inside initiatives (only in projects)
- Assign issues to milestones for tracking

**Visibility & Roll-up:**
- Parent initiatives automatically include all projects from sub-initiatives
- Useful for leadership to get high-level view
- Projects roll up through all ancestor initiatives

**Project Health Tracking:**
- Use milestones to divide work into phases
- Set project status manually as project progresses
- Include health indicator in project updates
- Review project graph frequently
- Post regular updates (weekly/biweekly)
- Create dashboards to monitor across projects/initiatives

---

## Dashboards

### Overview

Dashboards in Linear combine multiple insights into a single page for tracking metrics, monitoring trends, and analyzing data. Available on **Enterprise** plan only.

### Dashboard Features (Enterprise Only)

**What Dashboards Provide:**
- Combine insights from across teams and projects in single view
- Charts, metric blocks, and tables in dashboard layouts
- Shared vs private dashboards (workspace-level or team-level visibility, personal dashboards)
- Dashboard-level filters (global, applying to all widgets/insights)
- Insight-level filters (custom filters for individual widgets)
- Drill-down: Explore underlying issues directly by clicking into charts/metrics
- Modular and customizable layouts

### Dashboard Components

**Widget Types:**
- **Charts**: Time-series, burn-up, bar charts, line charts
- **Tables**: Tabular data with drill-down
- **Single Metrics**: Single-value displays
- **Metric Blocks**: Key performance indicators

**Layout:**
- Modular and customizable
- Place widgets how needed for reporting, dashboards, or operational views
- Drag-and-drop arrangement

### Filters

**Dashboard-Level Filters:**
- Apply to every insight/widget on the dashboard
- Example: Filtering issues "created by the Design team" updates all widgets
- Saveable, showable/hideable
- Global scope across all widgets

**Insight-Level Filters:**
- Custom filters for individual widgets/insights
- Allow refining particular chart or table without affecting others
- More granular control per widget

**Filter Inheritance:**
- When adding existing insights to dashboards, they inherit dashboard-level filters
- What you see inside dashboard might differ from original view if dashboard filters are more restrictive

**Filterable Properties:**
- Team
- Project
- Label
- Status
- Assignee
- Created by
- Date fields (created, updated, due)
- Issue properties
- And more

### Drill-Down & Exploration

**Interactive Charts:**
- Any chart or metric slice is interactive
- Clicking into it shows underlying issues/data
- Move from high-level numbers to detailed issue lists
- Stay within dashboard context
- Enables actionable insights

**Exploration Flow:**
1. View dashboard with aggregated metrics
2. Click on chart/metric to drill down
3. See underlying issues/data
4. Take action on specific items
5. Return to dashboard view

### Dashboard Sharing & Visibility

**Dashboard Types:**
- **Workspace-level**: Visible to all workspace members
- **Team-level**: Visible only to specific team
- **Personal**: Private to creator

**Sharing:**
- Share dashboards with teams or workspace
- Set visibility permissions
- Control who can view/edit

### Insights (Business Plan)

**What Insights Provide:**
- Realtime analytics across workspace
- Available on **Business** and **Enterprise** plans
- Visualize issue trends, cycle times, bug fix speed
- Access from Issues, Project, or Cycle views

**Insights Features:**
- Sidebar Insights panel
- Slice/dice data via filters (team, label, status, date fields, etc.)
- Choose measure (e.g., "cycle time", "issue count")
- Choose slice (groups like assignee, project, label)
- Optional segments
- Visualizations: graphs (time-series, burn-up), tables
- Detailed drill-downs into underlying issues

**Limitations on Business Plan:**
- Full access to Insights
- **No dashboards** (cannot pin multiple insights into single, shareable dashboard)
- Can analyze data in individual views
- Cannot combine insights into central widget-screen

### External Dashboard Tools

**Screenful:**
- Create custom charts
- Schedule reports via email or Slack
- Track metrics: throughput, cycle time, forecasts
- Works across Linear and other tools (GitHub, Jira, etc.)

**Polymer:**
- Prebuilt dashboards/templates
- Suggestions for visualization
- Shareable embeddable dashboards
- Useful for non-engineers

**Analytics Integrations:**
- Linear supports syncs/export to:
  - Airbyte
  - Fivetran
  - Google Sheets
  - Data warehouses
- Build custom dashboards in BI tools (Looker, Grafana, etc.) using Linear data

**Definite:**
- BI platform offering AI-powered analysis
- Dashboards and automations using Linear data
- Good for custom metric dashboards with more control

### Dashboard Best Practices

**Dashboard Design:**
- Start with key metrics your team needs
- Use dashboard-level filters for common scoping
- Use insight-level filters for specific widgets
- Arrange widgets logically (most important first)
- Keep dashboards focused (don't overload)

**Common Dashboard Use Cases:**
- Tracking high-priority issues over time
- SLA/Lead Time performance by severity/priority/team
- Cycle Time by assignee (detect bottlenecks)
- Scope/Investment tracking (planned vs done, work outside roadmap)
- Project health across initiatives
- Team velocity and throughput

**Maintenance:**
- Review dashboards regularly
- Update filters as needed
- Remove outdated widgets
- Share with relevant stakeholders
- Use drill-down for investigation

---

## Workspaces & Work Organization

### Workspace Structure

**Workspace:**
- Primary container for all issues, projects, documents, teams, etc.
- Represents organization's single home for collaboration
- Top-level scope: all teams, projects, issues under single workspace
- Creating workspace automatically generates default team with same name

**Multiple Workspaces:**
- Can have multiple distinct workspaces
- Each with separate member lists and billing
- Even if accessed from same user account
- Useful for separate organizations or departments

### Workspace Settings

**General Settings:**
- Workspace name & URL
- Login preferences
- App reviews configuration
- Feature toggles (Initiatives, etc.)
- Member management
- Import/export
- Billing

**Workspace-Level Features:**
- Labels (workspace-level)
- Templates (issues, projects, docs)
- Custom project statuses
- Custom emojis
- Available to all members/guests

**Deletion:**
- Workspaces can be deleted by admins
- Via Settings > Workspace > General
- Action is irreversible
- Permanently removes all data

### Teams & Sub-Teams

**Teams:**
- Logical groups representing functional groups or product areas
- Users can belong to any number of teams
- Each team has its own:
  - Workflows
  - Issue statuses
  - Templates
  - Labels
  - Cycles
  - Automations

**Team Settings:**
- General info (name, icon, identifier)
- Members management
- Labels
- Statuses
- Automations
- Cycles
- Recurring issues
- Templates
- Slack notifications

**Team Limits by Plan:**
- Free: 2 teams
- Basic: 5 teams
- Business/Enterprise: Unlimited

**Sub-Teams** (Business & Enterprise):
- Can nest teams under parent teams
- Mirror organizational hierarchy
- Some settings can be inherited from parent to sub-team:
  - Statuses
  - Cycles
  - Labels
- Other settings remain independent
- If parent team is private, sub-teams must also be private
- Visibility rules of private teams apply
- If un-nest sub-team, inherited settings may be copied or severed (used items stay safe)

**Private Teams** (Business & Enterprise):
- Limit visibility: only members can see issues, projects, children
- Non-members cannot see content
- Can convert public team to private (and vice versa)
- Owners and admins can manage membership
- When making public → private: existing assignees/subscribers outside get removed/unsubscribed

### Members, Roles & Permissions

**Roles:**

**Workspace Owner** (Enterprise only):
- Full control (billing, security, export, sensitive settings)
- Exclusive access to:
  - Billing
  - Audit logs
  - Workspace exports
  - OAuth app approvals
  - Workspace-wide settings

**Admin:**
- Elevated permissions
- Can manage many aspects of workspace
- More limited under Enterprise
- On free plan, everyone is admin
- Can:
  - Change workspace name & URL
  - Manage login methods
  - Configure features
  - Handle members/import/export
  - Manage billing details
  - Delete workspace

**Team Owner** (Business & Enterprise):
- Per-team leadership
- Can manage that team's settings and permissions
- Workspace owners/admins are automatically team owners
- Guests cannot be team owners
- Can:
  - Delete team
  - Make team private
  - Change parent team
  - Manage team templates, labels
  - Manage member lists
  - Configure status workflows

**Member:**
- Standard user
- Collaborates across teams they're in
- Access to standard features
- Can:
  - See issues, projects, documents
  - Create and use templates
  - See views in teams they join
- **No access** to workspace administration pages/settings

**Guest** (Business & Enterprise):
- Restricted access
- Only to specified teams
- Limited workspace visibility
- Ideal for external collaborators
- Can act as Member within those teams
- Cannot see workspace-wide content like initiatives or settings

**Role Management:**
- Admins can change member's role
- Admins can suspend members (lose access immediately)
- Manage members via Members page under Settings > Administration
- Role provisioning via SCIM (Enterprise workspaces)
- Sync roles and membership from identity provider

### SCIM & Identity Management (Enterprise)

**SCIM (System for Cross-domain Identity Management):**
- Automates user provisioning
- Creation, suspension, updating from identity provider
- Group Push: Map groups from IdP to Linear teams
- Membership synced
- Team membership may be managed externally

**Provisioning of Roles:**
- Define `linear-owners`, `linear-admins`, `linear-guests` groups in IdP
- Users get roles automatically
- Syncs with identity provider

### Team Visibility & Access

**Public Teams:**
- Joinable or viewable by all workspace members
- Default visibility

**Private Teams:**
- Only members invited by team owner/admins can see or join
- Issues in private teams hidden from non-members
- Owners and admins can see and configure private teams

**Access Control:**
- Team owners control permissions:
  - Labels, templates
  - Workflow/statuses, cycles, triage rules
  - Team settings (who can invite, add members, etc.)

---

## Administration

### Workspace Administration

**Administration Section:**
- Accessible by Admins and Owners only
- Settings > Administration
- Workspace-wide configurations

**Workspace Settings:**
- Workspace name & URL
- Login methods & authentication
- Feature toggles
- Member management
- Billing
- Integrations
- Plan upgrades
- Import/export

**Login Methods:**
- Email link
- Google auth
- Passkeys
- SAML (Enterprise): Manage login via Identity Provider (Okta, OneLogin, Auth0, etc.)
- JIT provisioning
- Domain approvals

**Access Restrictions** (Enterprise):
- Require specific login methods (e.g., SAML only)
- IP restrictions

### Feature Toggles

**Available Toggles:**
- **Initiatives**: Toggle on/off workspace-wide
- **Third-party app approvals**: App review requirement (for security)
- **SLA rules / Asks templates**: Only on paid plans
- **Custom project statuses**: Workspace-level
- **Workspace templates**: Custom templates
- **Custom emojis**: Workspace customization

**Third-Party App Approvals** (Enterprise):
- Require that new apps be approved before installation
- Admins/Owners control approvals
- Security feature

### Billing & Plans

**Plans:**
- Free
- Standard
- Business
- Enterprise

**Plan Differences:**
- Features (security, integrations, number of teams, guest usage)
- Limits (teams, members, features)
- Yearly plans only option for Enterprise

**Billing:**
- Per-workspace basis
- For unsuspended users
- Adding/removing users during billing period leads to prorated charges/credits
- Monthly vs annual plans
- Admins can:
  - Change plan
  - Cancel
  - View billing history
  - Update payment info
- Via Settings > Workspace > Billing/Plans

### Data Export

**Export Capabilities:**
- Full issue export to CSV
- From Settings > Administration > Import Export
- Can include private teams
- Member list export
- Project or initiative list exports
- Up to 2000 issues in view for admins
- Members limited to smaller (250) at a time

**Other Export Tools:**
- API
- Integrations (Google Sheets, Airbyte, webhooks)
- Data warehouse syncs (Fivetran, Airbyte)

### Data Import

**Import Methods:**
- In-product import assistants for:
  - Jira
  - GitHub Issues
  - Asana
  - Shortcut
- CLI importer for tools not supported by built-in assistants
- CSV, JSON as inputs
- Linear-to-Linear import between workspaces under same user/email

**Import Limitations:**
- Some items do NOT carry over:
  - View preferences
  - Favorites
  - Some workspace personal settings
  - Integrations
  - API keys
- Archived issues may or may not import depending on type

### Security & Compliance

**Security Certifications:**
- SOC 2 Type II
- GDPR
- HIPAA (with Enterprise BAA)

**Data Regions:**
- Workspaces created choose US or EU region
- Decision is permanent
- Some metadata always stored in US

**Email Domain Management:**
- Approved email domains: Auto-join without invites
- Domain-based control
- Invite links: Unique URLs managing access

**Private Team Data:**
- Guests don't see workspace-wide features
- Issues in private teams are hidden
- Admins can include private team issues when exporting data
- API/webhooks consider access
- Private team issue data may be exposed via integrations if user has access

---

## Resources & Capacity Planning

### What Linear Offers

**1. Cycles (Agile-style iterations / sprints):**
- Fixed time periods (typically one or two weeks)
- Assign issues to cycles to plan what team will do next
- Unfinished work rolls over automatically to future cycles
- Helps with pacing and prevents repeated manual slippage
- Track scope, started, completed work

**2. Projects + Milestones + Initiatives:**
- Projects group related issues
- Milestones are smaller phases or notable targets within projects
- Initiatives are higher-level strategic groupings of projects
- Map timelines with milestones
- Align across initiatives to see what work is coming up vs in progress

**3. Views & Visual Planning:**
- Different visualizations: list, board, timeline, swimlanes
- Help teams understand:
  - What work is lined up
  - What's underway
  - What's due in upcoming periods
- Supports spotting overloaded cycles or upcoming risks

**4. Triage / Incoming Work Management:**
- "Triage" workflow for incoming issues (bugs, feature requests, feedback)
- Helps shape backlog of candidate projects
- Backlog becomes starting point for next planning cycle
- Continuous planning workflow

**5. Estimations, Labels, Dependencies:**
- Assign estimates (story points, hours, etc.)
- Classify issues with labels/priorities
- Set up dependencies or "blocking" relationships between issues
- Model complexity
- Assess what can reasonably fit in cycle or project

**6. Basic Analytics / Velocity:**
- Historic data (cycle completion rates, throughput)
- Teams can gauge how much they can commit to in future cycles
- Based on past velocity
- Project Graph predictions based on velocity

### What Linear Doesn't Do Out-of-the-Box

**1. Limited Blocking of Time / Role-Based Capacity Forecasting:**
- No strong built-in capacity blocking
- Cannot reserve portions of team member's time for certain roles (e.g., support, maintenance, onboarding)
- Cannot plan across roles weeks ahead
- Workarounds: separate teams per role, assigning issues far out in cycles (but tedious when timelines shift)

**2. Handling Tasks That Span Multiple Cycles:**
- Cycles are fixed timeboxes
- When task spans multiple cycles, need to:
  - Split into separate issues
  - Manually move between cycles
- No automatic handling

**3. Rigidness When Timelines Change:**
- When project or milestone schedule shifts:
  - No automatic rescheduling of issues
  - No spill-over across cycles
  - Many manual adjustments needed

**4. Limited Visual/Resource Views:**
- No Gantt charts (native)
- No heatmaps
- No capacity dashboards
- Cannot see:
  - Resource utilization over time
  - Team members' booked vs available capacity
  - Projected overloads

### Best Practices for Capacity Planning

**1. Create Role-Based Teams:**
- If organization has multiple roles (engineer, designer, support, etc.)
- Make separate teams in Linear for each
- Track cycles of each role
- Forecast load per role

**2. Use Estimation and Historical Velocity:**
- Combine estimates of issues
- Use how much work delivered in prior cycles
- Avoid overcommitting
- Use as guardrails

**3. Do Continuous Planning:**
- Gather candidate projects early
- Keep backlog groomed
- Maintain visibility ahead of each planning cycle
- Linear promotes continuous planning workflow

**4. Break Down Large Tasks:**
- For tasks expected to exceed single cycle
- Split into subtasks or multiple issues across cycles
- Avoid overloading

**5. Regularly Review Reprioritization:**
- Since priorities and timelines shift
- Plan periodic check-ins
- Adjust plans, move issues, reassign work

**6. Consider Integrations or External Tools:**
- For visuals like Gantt charts
- Capacity forecasts
- Fine-grained time tracking
- Example: Time tracking integrations with Everhour help visualize team member load

### Resource Planning Summary

| Best Use Cases | Limitations / When You'll Need More |
|---|---|
| Planning sprints or short cycles with well-defined tasks | When you need to allocate capacity weeks/months ahead, across roles |
| Tracking dependencies & forecasting upcoming milestones | When tasks overlap or when large tasks span multiple cycles |
| Maintaining a living backlog of candidate work | When timelines shift frequently and manual updates become heavy |
| Using past velocity to predict next cycle's capacity | When you need to visually see individual load, heatmaps, or utilization dashboards |

### External Tools for Resource Planning

**Time Tracking:**
- Everhour: Visualize team member load
- Track time spent on issues
- Capacity forecasting

**Gantt Charts:**
- External tools for timeline visualization
- Resource allocation views
- Dependency tracking

**Capacity Dashboards:**
- External BI tools
- Custom dashboards
- Resource utilization views

---

## Key Takeaways

### Projects, Programs & Portfolios

**Strengths:**
- Clear hierarchy: Initiatives → Projects → Issues
- Sub-initiatives enable complex organizational structures (5 levels)
- Automatic roll-up of progress and health
- Project Graph for forecasting
- Milestones for phase tracking

**Limitations:**
- Sub-initiatives only on Enterprise
- Project statuses manually updated
- No automatic rescheduling when timelines change

### Dashboards

**Strengths:**
- Combine multiple insights in single view
- Dashboard-level and insight-level filters
- Drill-down to underlying issues
- Modular, customizable layouts

**Limitations:**
- Only available on Enterprise plan
- Business plan has Insights but no Dashboards
- May need external tools for advanced visualizations

### Workspaces & Work Organization

**Strengths:**
- Clear structure: Workspace → Teams → Issues
- Sub-teams for organizational hierarchy
- Private teams for sensitive work
- Role-based permissions
- SCIM for enterprise identity management

**Limitations:**
- Team limits on lower plans
- Some features require Business/Enterprise
- Private teams only on Business/Enterprise

### Administration

**Strengths:**
- Comprehensive workspace settings
- Feature toggles for customization
- Data export/import capabilities
- Security certifications (SOC 2, GDPR, HIPAA)
- SCIM for enterprise provisioning

**Limitations:**
- Some admin features only on Enterprise
- Data region choice is permanent
- Import limitations (some items don't carry over)

### Resources & Capacity Planning

**Strengths:**
- Cycles for sprint planning
- Velocity tracking
- Estimation support
- Project Graph forecasting
- Continuous planning workflow

**Limitations:**
- No built-in capacity blocking
- No role-based capacity forecasting
- No automatic rescheduling
- Limited visual/resource views (no Gantt, heatmaps)
- May need external tools for advanced capacity planning

---

## Recommendations

### For Projects, Programs & Portfolios

1. **Use Initiatives for Strategic Alignment:**
   - Group related projects under initiatives
   - Use sub-initiatives for complex hierarchies (Enterprise)
   - Track health and progress at initiative level

2. **Use Projects for Focused Deliverables:**
   - Clear scope and timeline
   - Set owners and target dates
   - Use milestones for phase tracking

3. **Regular Updates:**
   - Post project and initiative updates regularly
   - Include health indicators
   - Track key metrics

### For Dashboards

1. **Plan for Enterprise:**
   - Dashboards require Enterprise plan
   - Business plan has Insights but not Dashboards
   - Consider external tools if on lower plan

2. **Design Thoughtfully:**
   - Start with key metrics
   - Use dashboard-level filters for common scoping
   - Use insight-level filters for specific widgets
   - Keep focused

### For Workspaces

1. **Organize by Teams:**
   - Create teams for functional groups or product areas
   - Use sub-teams for organizational hierarchy
   - Use private teams for sensitive work

2. **Manage Permissions:**
   - Set appropriate roles (Owner, Admin, Team Owner, Member, Guest)
   - Use SCIM for enterprise provisioning
   - Configure team-level permissions

### For Administration

1. **Configure Security:**
   - Set up SAML/SSO for enterprise
   - Use approved email domains
   - Configure IP restrictions if needed

2. **Plan Data Management:**
   - Choose data region carefully (permanent)
   - Set up regular exports
   - Plan imports carefully (some items don't carry over)

### For Resources & Capacity Planning

1. **Use Cycles for Planning:**
   - Set up cycles for sprint planning
   - Track velocity over time
   - Use estimates for capacity planning

2. **Consider External Tools:**
   - For advanced capacity planning
   - For Gantt charts
   - For resource utilization dashboards
   - For time tracking

---

*Document Created: January 2026*
*Based on comprehensive review of Linear documentation and platform features*
