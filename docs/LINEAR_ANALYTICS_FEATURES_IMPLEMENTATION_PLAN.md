# Linear Analytics Features Implementation Plan
## Dashboards, Insights, Project Graph, and Data Export

**Document Version:** 1.0  
**Date:** 2025-01-27  
**Status:** Planning Phase - For Architect Review  
**Reference:** Linear Documentation Analysis

---

## Executive Summary

This document outlines a comprehensive plan to implement four major analytics features inspired by Linear's approach:
1. **Dashboards** - Centralized views combining multiple insights
2. **Insights** - Real-time analytics with interactive visualizations
3. **Project Graph** - Predictive project completion tracking
4. **Data Export** - Comprehensive CSV/PDF export capabilities

These features will transform Zephix from a project management tool into a data-driven platform that enables teams to make informed decisions through analytics.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Feature 1: Insights System](#feature-1-insights-system)
3. [Feature 2: Dashboards](#feature-2-dashboards)
4. [Feature 3: Project Graph](#feature-3-project-graph)
5. [Feature 4: Data Export](#feature-4-data-export)
6. [Technical Architecture](#technical-architecture)
7. [Data Model Design](#data-model-design)
8. [API Design](#api-design)
9. [Frontend Architecture](#frontend-architecture)
10. [Implementation Phases](#implementation-phases)
11. [Dependencies & Prerequisites](#dependencies--prerequisites)
12. [Risk Assessment](#risk-assessment)

---

## Current State Analysis

### Existing Zephix Capabilities

#### ✅ What We Have
- **Project Management**: Projects with status, health, priority, dates
- **Task Management**: Tasks with status, progress, assignments, due dates
- **Basic Analytics**: 
  - `MaterializedProjectMetrics` entity (health, schedule variance, risk exposure)
  - `MaterializedResourceMetrics` entity (capacity, workload)
  - `MaterializedPortfolioMetrics` entity (aggregated health)
  - Analytics service with metrics calculation
- **Status Reporting**: AI-powered status report generation
- **Basic Export**: CSV export for waitlist, dashboard widgets
- **Activity Tracking**: Task activity logs with status changes
- **Workspace Scoping**: Multi-tenant architecture with workspace/organization isolation

#### ❌ What We're Missing
- **Interactive Analytics UI**: No insights panel or visualization system
- **Dashboard Builder**: No customizable dashboard system
- **Time-based Metrics**: No cycle time, lead time, triage time calculations
- **Project Velocity Tracking**: No historical velocity data for predictions
- **Advanced Filtering**: Limited filtering capabilities for analytics
- **Export Infrastructure**: No comprehensive export system for projects/tasks
- **Graph Visualizations**: No scatterplots, burn-up charts, or predictive graphs

### Data Availability

**Task Data Available:**
- Status transitions (not_started → in_progress → completed)
- Created date (`createdAt`)
- Start dates (`startDate`, `actualStartDate`)
- End dates (`endDate`, `actualEndDate`, `dueDate`, `completedDate`)
- Progress percentage
- Assignee information
- Project association
- Priority, tags

**Project Data Available:**
- Status (planning, active, on-hold, completed, cancelled)
- State (DRAFT, ACTIVE, COMPLETED)
- Health (HEALTHY, AT_RISK, BLOCKED)
- Start/end dates
- Budget information
- Health metrics (schedule variance, risk exposure)

**Gaps to Address:**
- No "triage" status equivalent (Linear's triage time)
- No cycle/sprint concept (Linear's cycle time)
- Need to track status change timestamps for time-based metrics
- Need historical snapshots for project graph

---

## Feature 1: Insights System

### Overview
Real-time analytics panel that allows users to analyze task and project data through interactive visualizations. Similar to Linear's Insights panel accessible via `Cmd/Ctrl + Shift + I`.

### Core Functionality

#### 1.1 Insights Panel Access
- **Location**: Sidebar panel in project views, workspace views, custom views
- **Keyboard Shortcut**: `Cmd/Ctrl + Shift + I`
- **Context-Aware**: Shows insights for the current filtered view
- **Real-time**: Updates as filters change

#### 1.2 Measures (Y-Axis Metrics)

| Measure | Description | Calculation | Graph Type |
|---------|-------------|-------------|------------|
| **Task Count** | Total number of tasks | `COUNT(tasks)` | Bar |
| **Effort** | Total estimated hours | `SUM(estimatedHours)` | Bar |
| **Cycle Time** | Time from start to completion | `AVG(actualEndDate - actualStartDate)` for completed tasks | Scatterplot |
| **Lead Time** | Time from creation to completion | `AVG(completedDate - createdAt)` for completed tasks | Scatterplot |
| **Triage Time** | Time in "pending" status | `AVG(statusChangedAt - createdAt)` where status='pending' | Scatterplot |
| **Task Age** | Time since creation (open tasks) | `NOW() - createdAt` for non-completed tasks | Scatterplot |
| **Completion Rate** | % of tasks completed | `COUNT(completed) / COUNT(all)` | Bar |
| **Velocity** | Tasks completed per week | `COUNT(completed) / weeks` | Line |

**Zephix Adaptations:**
- **Triage Time**: Map to time spent in `not_started` or `pending` status
- **Cycle Time**: Use `actualStartDate` to `actualEndDate` (or `completedDate`)
- **Velocity**: Calculate based on completed tasks per week/month

#### 1.3 Slices (X-Axis Dimensions)

| Slice | Description | Use Cases |
|-------|-------------|-----------|
| **Assignee** | Group by task assignee | Workload distribution, performance |
| **Project** | Group by project | Project comparison |
| **Status** | Group by task status | Status distribution |
| **Priority** | Group by priority | Priority analysis |
| **Tags/Labels** | Group by tags | Category analysis |
| **Created Date** | Group by creation date (week/month) | Trend analysis |
| **Completed Date** | Group by completion date | Velocity tracking |
| **Workspace** | Group by workspace | Cross-workspace analysis |

#### 1.4 Segments (Color Coding)

- **Status**: Color by task status
- **Priority**: Color by priority level
- **Project**: Color by project
- **Assignee**: Color by assignee
- **Health**: Color by project health (for project-level insights)

#### 1.5 Graph Types

**Bar Charts:**
- Used for: Task Count, Effort, Completion Rate
- Interactive: Hover for details, click to filter
- Segmented bars for multi-dimensional analysis

**Scatterplots:**
- Used for: Cycle Time, Lead Time, Triage Time, Task Age
- X-axis: Time dimension (date or duration)
- Y-axis: Measure value
- Percentile markers: 25%, 50%, 75%, 95%
- Click points to navigate to task

**Burn-up Charts (Cumulative Flow):**
- Used for: Project progress over time
- Shows: Scope, Started, Completed over time
- Time granularity: Weekly or monthly
- Historical data visualization

**Tables:**
- Always shown below graph
- Sortable columns
- Clickable rows/cells to filter
- Export to CSV option

#### 1.6 Filtering System

**Available Filters:**
- **Created At**: Date range for task creation
- **Completed At**: Date range for task completion
- **Status**: Single or multiple status selection
- **Status Type**: Grouped status types (active, completed, blocked)
- **Project**: Single or multiple project selection
- **Assignee**: Single or multiple assignee selection
- **Priority**: Priority level filter
- **Tags**: Tag-based filtering
- **Workspace**: Workspace filter (for cross-workspace views)
- **Show Archived**: Toggle to include archived tasks

**Filter Behavior:**
- Filters apply to the underlying dataset
- Graph and table update in real-time
- Filters persist in URL query params
- Shareable filtered views

#### 1.7 Interactive Features

- **Hover**: Show detailed tooltip with exact values
- **Click to Filter**: Click bar/point/row to filter view to that subset
- **Drill Down**: Click to navigate to filtered task list
- **Percentile Zoom**: Click percentile markers to zoom scatterplot
- **Time Range Selection**: Select date range on timeline
- **Export**: Export current view data as CSV

### Technical Requirements

#### Backend Services

**New Service: `InsightsService`**
```typescript
class InsightsService {
  // Calculate measures
  calculateMeasure(measure: MeasureType, filters: InsightFilters): Promise<number>;
  
  // Get data for visualization
  getBarChartData(measure: MeasureType, slice: SliceType, filters: InsightFilters): Promise<BarChartData>;
  getScatterplotData(measure: MeasureType, slice: SliceType, filters: InsightFilters): Promise<ScatterplotData>;
  getBurnUpData(projectId: string, filters: InsightFilters): Promise<BurnUpData>;
  
  // Get table data
  getTableData(measure: MeasureType, slice: SliceType, segment: SegmentType, filters: InsightFilters): Promise<TableData>;
  
  // Time-based calculations
  calculateCycleTime(taskId: string): Promise<number | null>;
  calculateLeadTime(taskId: string): Promise<number | null>;
  calculateTriageTime(taskId: string): Promise<number | null>;
  
  // Velocity calculations
  calculateVelocity(projectId: string, timeRange: TimeRange): Promise<VelocityData>;
}
```

**New Entity: `TaskStatusHistory`** (for time tracking)
```typescript
@Entity('task_status_history')
class TaskStatusHistory {
  id: string;
  taskId: string;
  status: string;
  enteredAt: Date;
  exitedAt: Date | null;
  duration: number; // calculated
}
```

#### Frontend Components

**New Components:**
- `InsightsPanel.tsx` - Main insights sidebar
- `InsightsGraph.tsx` - Graph visualization wrapper
- `BarChart.tsx` - Bar chart component
- `Scatterplot.tsx` - Scatterplot component
- `BurnUpChart.tsx` - Burn-up chart component
- `InsightsTable.tsx` - Data table component
- `InsightsFilters.tsx` - Filter controls
- `MeasureSelector.tsx` - Measure dropdown
- `SliceSelector.tsx` - Slice dropdown
- `SegmentSelector.tsx` - Segment dropdown

**Chart Library:**
- Recommendation: **Recharts** or **Chart.js** or **D3.js**
- Consider: **Observable Plot** for modern, performant charts

---

## Feature 2: Dashboards

### Overview
Customizable dashboards that combine multiple insights (charts, tables, metrics) on a single page. Supports workspace-level, team-level, and personal dashboards.

### Core Functionality

#### 2.1 Dashboard Types

**Workspace Dashboards:**
- Visible to all workspace members
- Created by workspace admins/owners
- Can include data from all projects in workspace
- Default workspace dashboard for new workspaces

**Team Dashboards:**
- Visible to team members
- Created by team leads
- Scoped to team's projects
- Can be shared with workspace

**Personal Dashboards:**
- Private to creator
- Can include any accessible data
- Appear under "Personal dashboards" section

#### 2.2 Dashboard Components

**Insight Widgets:**
- Charts (bar, scatterplot, burn-up)
- Tables
- Single metric blocks (KPI cards)
- Text blocks (for context/notes)

**Layout System:**
- Grid-based layout (drag-and-drop)
- Responsive columns (1-4 columns)
- Widget resizing
- Widget positioning

#### 2.3 Filtering System

**Dashboard-Level Filters:**
- Apply globally to all insights
- Examples: Team filter, date range, project filter
- Can be hidden from view (saved filters)
- Persist with dashboard

**Insight-Level Filters:**
- Override dashboard filters for specific insight
- Independent filtering per widget
- Can further refine dashboard filters

**Filter Inheritance:**
- When adding existing insight to dashboard, inherits dashboard filters
- Insight may look different in dashboard vs. original view
- Both filters apply (intersection)

#### 2.4 Dashboard Management

**Creation:**
- From Dashboards tab: "New dashboard"
- From existing insight: "Add to dashboard" → create new or add to existing
- Duplicate existing dashboard

**Editing:**
- Add/remove insights
- Reorder widgets (drag-and-drop)
- Resize widgets
- Configure filters
- Change dashboard name, description
- Set owner

**Sharing:**
- Dashboard ownership (creator is default owner)
- Transfer ownership
- Move between workspace/team/personal
- Share link (read-only view)

**Refresh:**
- Manual refresh button
- Auto-refresh interval (configurable)
- Last updated timestamp

#### 2.5 Insight Management

**Adding Insights:**
- Create new insight directly in dashboard
- Add existing insight from views
- Duplicate insight from another dashboard

**Insight Configuration:**
- Measure, slice, segment selection
- Chart type selection
- Filter configuration
- Display options (title, description)

**Multiple Dashboards:**
- Same insight can appear on multiple dashboards
- Each instance has independent filters
- Changes to insight affect all dashboards

### Technical Requirements

#### Backend Services

**New Service: `DashboardsService`**
```typescript
class DashboardsService {
  // Dashboard CRUD
  createDashboard(auth: AuthContext, workspaceId: string, dto: CreateDashboardDto): Promise<Dashboard>;
  getDashboard(auth: AuthContext, dashboardId: string): Promise<Dashboard>;
  updateDashboard(auth: AuthContext, dashboardId: string, dto: UpdateDashboardDto): Promise<Dashboard>;
  deleteDashboard(auth: AuthContext, dashboardId: string): Promise<void>;
  listDashboards(auth: AuthContext, workspaceId: string, type: 'workspace' | 'team' | 'personal'): Promise<Dashboard[]>;
  
  // Insight management
  addInsightToDashboard(auth: AuthContext, dashboardId: string, insightId: string, config: InsightConfig): Promise<void>;
  removeInsightFromDashboard(auth: AuthContext, dashboardId: string, insightId: string): Promise<void>;
  updateInsightConfig(auth: AuthContext, dashboardId: string, insightId: string, config: InsightConfig): Promise<void>;
  
  // Dashboard sharing
  transferOwnership(auth: AuthContext, dashboardId: string, newOwnerId: string): Promise<void>;
  moveDashboard(auth: AuthContext, dashboardId: string, target: 'workspace' | 'team' | 'personal', targetId?: string): Promise<void>;
}
```

**New Service: `InsightsService`** (extends Feature 1)
```typescript
class InsightsService {
  // Insight CRUD
  createInsight(auth: AuthContext, workspaceId: string, dto: CreateInsightDto): Promise<Insight>;
  getInsight(auth: AuthContext, insightId: string): Promise<Insight>;
  updateInsight(auth: AuthContext, insightId: string, dto: UpdateInsightDto): Promise<Insight>;
  deleteInsight(auth: AuthContext, insightId: string): Promise<void>;
  
  // Add to dashboard
  addToDashboard(auth: AuthContext, insightId: string, dashboardId: string, config?: InsightConfig): Promise<void>;
}
```

#### Data Model

**New Entities:**

```typescript
@Entity('dashboards')
class Dashboard {
  id: string;
  workspaceId: string;
  organizationId: string;
  name: string;
  description: string | null;
  type: 'workspace' | 'team' | 'personal';
  teamId: string | null; // for team dashboards
  ownerId: string; // user ID
  layout: DashboardLayout; // JSON: grid configuration
  filters: DashboardFilters; // JSON: global filters
  isDefault: boolean; // default workspace dashboard
  createdAt: Date;
  updatedAt: Date;
}

@Entity('insights')
class Insight {
  id: string;
  workspaceId: string;
  organizationId: string;
  name: string;
  description: string | null;
  measure: MeasureType;
  slice: SliceType;
  segment: SegmentType | null;
  chartType: 'bar' | 'scatterplot' | 'burnup' | 'table' | 'metric';
  filters: InsightFilters; // JSON
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

@Entity('dashboard_insights')
class DashboardInsight {
  id: string;
  dashboardId: string;
  insightId: string;
  position: { x: number; y: number; w: number; h: number }; // grid position
  config: InsightConfig; // JSON: insight-specific config (filters, display options)
  sortOrder: number;
  createdAt: Date;
}
```

#### Frontend Components

**New Components:**
- `DashboardsPage.tsx` - Main dashboards list page
- `DashboardView.tsx` - Dashboard display/edit view
- `DashboardBuilder.tsx` - Dashboard editor
- `DashboardGrid.tsx` - Grid layout system
- `DashboardWidget.tsx` - Individual widget wrapper
- `InsightWidget.tsx` - Insight widget component
- `MetricWidget.tsx` - Single metric KPI card
- `TextWidget.tsx` - Text block widget
- `DashboardFilters.tsx` - Dashboard-level filter controls
- `AddInsightModal.tsx` - Modal to add/create insights

**Layout Library:**
- Recommendation: **react-grid-layout** for drag-and-drop grid
- Alternative: **dnd-kit** for custom implementation

---

## Feature 3: Project Graph

### Overview
Predictive project completion visualization showing scope evolution, progress tracking, and estimated completion dates based on historical velocity.

### Core Functionality

#### 3.1 Graph Components

**Scope Line (Gray):**
- Shows total planned work (estimated hours or task count)
- Updates as tasks are added/removed from project
- Decreases when tasks are cancelled/removed
- Represents project scope over time

**Started Line (Blue):**
- Shows cumulative tasks moved to "in_progress" or "started"
- Tracks work initiation
- Blue bars indicate completed tasks for clarity

**Completed Line (Purple):**
- Shows cumulative completed tasks
- Dotted extension shows predicted completion
- Based on historical velocity

**Target Date Line (Red, Vertical):**
- Shows project target/end date if set
- Visual indicator of deadline
- Helps assess if on track

#### 3.2 Predictive Completion

**Velocity Calculation:**
- Based on weekly historical data
- Weighted average (recent weeks weighted more heavily)
- Formula: `completed_points_per_week` (weighted)
- Requires at least 1 week of data

**Remaining Work Calculation:**
- Sum of incomplete task estimates
- 1/4 modifier for in-progress tasks (partial credit)
- Formula: `SUM(incomplete_estimates) + SUM(in_progress_estimates * 0.25)`

**Prediction Lines:**
- **Optimistic**: -40% buffer (faster completion)
- **Realistic**: Based on current velocity
- **Pessimistic**: +40% buffer (slower completion)

**Update Frequency:**
- Graph statistics update hourly
- Graph points granularity: Every 7 days
- Predictions recalculate on each update

#### 3.3 Interactive Features

**Hover Details:**
- Exact values for scope, started, completed at any point
- Date information
- Task breakdown

**Breakdown Views:**
- By Assignee: See contribution per person
- By Label/Tag: See distribution by category
- Percentage completed per category
- Click to filter project view

**Time Navigation:**
- Zoom in/out on time range
- Pan left/right through history
- Reset to full timeline

#### 3.4 Activation Requirements

**Project Must Be:**
- In "Started" status (state = ACTIVE)
- Have at least one task moved to "in_progress"
- Have sufficient historical data (1+ week)

**Data Requirements:**
- Tasks with estimates (hours or points)
- Status change history
- Completion dates

### Technical Requirements

#### Backend Services

**New Service: `ProjectGraphService`**
```typescript
class ProjectGraphService {
  // Graph data generation
  getProjectGraph(auth: AuthContext, projectId: string): Promise<ProjectGraphData>;
  
  // Historical snapshots
  getHistoricalSnapshots(projectId: string, startDate: Date, endDate: Date): Promise<Snapshot[]>;
  
  // Velocity calculation
  calculateVelocity(projectId: string, weeks: number): Promise<VelocityData>;
  
  // Prediction calculation
  calculateCompletionPrediction(projectId: string): Promise<CompletionPrediction>;
  
  // Breakdown data
  getBreakdownByAssignee(projectId: string): Promise<AssigneeBreakdown>;
  getBreakdownByTag(projectId: string): Promise<TagBreakdown>;
}
```

**New Entity: `ProjectSnapshot`** (for historical tracking)
```typescript
@Entity('project_snapshots')
class ProjectSnapshot {
  id: string;
  projectId: string;
  snapshotDate: Date; // Weekly snapshots
  scope: number; // Total estimated work
  started: number; // Tasks in progress
  completed: number; // Completed tasks
  velocity: number; // Weekly velocity
  metadata: {
    taskCount: number;
    completedTaskCount: number;
    inProgressTaskCount: number;
    assigneeBreakdown: Record<string, number>;
    tagBreakdown: Record<string, number>;
  };
  createdAt: Date;
}
```

**Cron Job: `ProjectGraphCronService`**
```typescript
@Cron('0 * * * *') // Every hour
async updateProjectGraphs() {
  // Update all active projects
  // Calculate snapshots
  // Update predictions
}
```

#### Frontend Components

**New Components:**
- `ProjectGraph.tsx` - Main graph component
- `ProjectGraphChart.tsx` - Chart visualization
- `ProjectGraphBreakdown.tsx` - Breakdown panel
- `ProjectGraphControls.tsx` - Zoom/pan controls
- `CompletionPrediction.tsx` - Prediction display

**Chart Library:**
- Recommendation: **Recharts** with custom time-series support
- Alternative: **D3.js** for full control

---

## Feature 4: Data Export

### Overview
Comprehensive data export system supporting CSV exports for tasks, projects, members, and workspace data. Includes PDF export for individual items and markdown export for AI tools.

### Core Functionality

#### 4.1 Export Types

**Task Exports:**
- From any task view (project, workspace, custom view)
- Filtered by current view filters
- Limit: 250 for members, 2,000 for admins/owners
- Fields: ID, Title, Description, Status, Priority, Assignee, Project, Created, Updated, Started, Completed, Due Date, Tags, etc.

**Project Exports:**
- From project list or individual project
- Includes project metadata
- Fields: Name, Description, Status, Health, Priority, Start Date, End Date, Target Date, Budget, Manager, Members, Teams, Created, Updated, etc.

**Workspace Exports:**
- Admin/Owner only
- Full workspace data export
- Includes all tasks, projects, members
- Toggle: Include private teams
- Recorded in audit log

**Member List Exports:**
- Admin/Owner only
- Workspace member list
- Fields: Name, Email, Role, Joined Date, Last Active, etc.

**Initiative/Program Exports:**
- From initiative/program views
- Similar to project exports
- Includes related projects

#### 4.2 Export Formats

**CSV:**
- Standard comma-separated values
- UTF-8 encoding
- Headers in first row
- Proper escaping for special characters
- Date formatting: ISO 8601

**Markdown (for AI/LLMs):**
- Structured markdown format
- Includes full context (title, description, comments)
- Copy command: `Cmd Opt C` (Mac) / `Ctrl Alt C` (Windows)
- Supports multiple items (select and copy)

**PDF:**
- Individual task/project export
- Print-friendly format
- Absolute timestamps (not relative)
- Includes all details and history

**JSON (API):**
- Programmatic access
- Full data structure
- For integrations and automation

#### 4.3 Export Features

**Filtering:**
- Export respects current view filters
- Can add additional filters before export
- Filtered export includes filter metadata

**Batch Export:**
- Select multiple items
- Export selected items only
- Maintains selection context

**Scheduled Exports:**
- (Future) Scheduled weekly/monthly exports
- Email delivery
- Automated reporting

**Export History:**
- Track export requests (admin)
- Audit log entry
- Compliance tracking

### Technical Requirements

#### Backend Services

**New Service: `ExportService`**
```typescript
class ExportService {
  // Task exports
  exportTasks(auth: AuthContext, workspaceId: string, filters: TaskFilters, format: 'csv' | 'json'): Promise<ExportResult>;
  
  // Project exports
  exportProjects(auth: AuthContext, workspaceId: string, filters: ProjectFilters, format: 'csv' | 'json'): Promise<ExportResult>;
  
  // Workspace exports
  exportWorkspace(auth: AuthContext, workspaceId: string, includePrivateTeams: boolean): Promise<ExportResult>;
  
  // Member exports
  exportMembers(auth: AuthContext, workspaceId: string): Promise<ExportResult>;
  
  // Markdown export
  exportAsMarkdown(auth: AuthContext, itemIds: string[], itemType: 'task' | 'project'): Promise<string>;
  
  // PDF export
  exportAsPDF(auth: AuthContext, itemId: string, itemType: 'task' | 'project'): Promise<Buffer>;
}
```

**New Controller: `ExportController`**
```typescript
@Controller('export')
class ExportController {
  @Get('tasks')
  exportTasks(@Query() filters: TaskFilters, @Res() res: Response): Promise<void>;
  
  @Get('projects')
  exportProjects(@Query() filters: ProjectFilters, @Res() res: Response): Promise<void>;
  
  @Get('workspace')
  @UseGuards(AdminGuard)
  exportWorkspace(@Query('includePrivateTeams') includePrivateTeams: boolean, @Res() res: Response): Promise<void>;
  
  @Get('members')
  @UseGuards(AdminGuard)
  exportMembers(@Res() res: Response): Promise<void>;
  
  @Post('markdown')
  exportMarkdown(@Body() dto: { itemIds: string[]; itemType: string }): Promise<{ markdown: string }>;
  
  @Get('pdf/:itemType/:itemId')
  exportPDF(@Param('itemType') itemType: string, @Param('itemId') itemId: string, @Res() res: Response): Promise<void>;
}
```

#### Frontend Components

**New Components:**
- `ExportButton.tsx` - Export trigger button
- `ExportModal.tsx` - Export options modal
- `ExportProgress.tsx` - Export progress indicator
- `MarkdownExporter.tsx` - Markdown copy functionality

**Integration Points:**
- Add export button to task views
- Add export option to command menu (`Cmd+K`)
- Add export to project/workspace settings
- Add "Copy as Markdown" to context menus

---

## Technical Architecture

### System Components

#### Backend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Insights     │  │ Dashboards   │  │ Export       │ │
│  │ Controller   │  │ Controller   │  │ Controller   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────┐
│                  Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Insights     │  │ Dashboards   │  │ Export       │ │
│  │ Service      │  │ Service      │  │ Service      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │ ProjectGraph │  │ TaskStatus    │                   │
│  │ Service      │  │ History       │                   │
│  └──────────────┘  │ Service      │                   │
│                    └──────────────┘                   │
└─────────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Insights     │  │ Dashboards   │  │ Project      │ │
│  │ Entity       │  │ Entity       │  │ Snapshots    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ TaskStatus   │  │ Dashboard    │  │ Tasks        │ │
│  │ History      │  │ Insights     │  │ Projects     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Page Components                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Dashboards  │  │ Project      │  │ Task Views   │ │
│  │ Page        │  │ Graph Page   │  │ (with        │ │
│  │             │  │             │  │  Insights)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────┐
│                  Feature Components                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Insights     │  │ Dashboard    │  │ Export       │ │
│  │ Panel        │  │ Builder      │  │ Components   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────┐
│                  Visualization Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Bar Charts   │  │ Scatterplots │  │ Burn-up      │ │
│  │              │  │              │  │ Charts       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────┐
│                  State & API Layer                       │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ React Query  │  │ Zustand      │                    │
│  │ (API calls)  │  │ (UI state)   │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### Performance Considerations

#### Caching Strategy

**Insights Data:**
- Cache calculated measures for 5 minutes
- Invalidate on task/project updates
- Use Redis for distributed caching

**Dashboard Data:**
- Cache dashboard layouts (static)
- Cache insight data per dashboard
- Refresh on demand or scheduled

**Project Graph:**
- Cache snapshots (historical data)
- Real-time calculations for current state
- Hourly updates (background job)

#### Database Optimization

**Indexes Required:**
```sql
-- Task status history
CREATE INDEX idx_task_status_history_task_status ON task_status_history(task_id, status, entered_at);
CREATE INDEX idx_task_status_history_dates ON task_status_history(entered_at, exited_at);

-- Project snapshots
CREATE INDEX idx_project_snapshots_project_date ON project_snapshots(project_id, snapshot_date);

-- Insights queries
CREATE INDEX idx_tasks_completed_date ON tasks(completed_date) WHERE completed_date IS NOT NULL;
CREATE INDEX idx_tasks_created_status ON tasks(created_at, status);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
```

**Materialized Views:**
- Consider materialized views for complex aggregations
- Refresh on schedule or trigger

#### Query Optimization

**Batch Loading:**
- Load multiple insights in parallel
- Use DataLoader pattern for N+1 prevention
- Batch database queries

**Pagination:**
- Large exports: Stream to file, paginate queries
- Table views: Virtual scrolling
- Graph data: Load in chunks for long time ranges

---

## Data Model Design

### New Entities

#### 1. TaskStatusHistory
```typescript
@Entity('task_status_history')
@Index(['taskId', 'status', 'enteredAt'])
export class TaskStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ type: 'varchar', length: 50 })
  status: string; // 'not_started', 'in_progress', 'completed', etc.

  @Column({ name: 'entered_at', type: 'timestamp' })
  enteredAt: Date;

  @Column({ name: 'exited_at', type: 'timestamp', nullable: true })
  exitedAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  duration: number; // milliseconds, calculated on exit

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;
}
```

#### 2. Dashboard
```typescript
@Entity('dashboards')
@Index(['workspaceId', 'type'])
@Index(['ownerId'])
export class Dashboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'workspace',
  })
  type: 'workspace' | 'team' | 'personal';

  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId: string | null;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ type: 'jsonb' })
  layout: DashboardLayout; // Grid configuration

  @Column({ type: 'jsonb', nullable: true })
  filters: DashboardFilters; // Global filters

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### 3. Insight
```typescript
@Entity('insights')
@Index(['workspaceId'])
export class Insight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50 })
  measure: string; // 'task_count', 'effort', 'cycle_time', etc.

  @Column({ type: 'varchar', length: 50 })
  slice: string; // 'assignee', 'project', 'status', etc.

  @Column({ type: 'varchar', length: 50, nullable: true })
  segment: string | null; // Optional color coding

  @Column({ name: 'chart_type', type: 'varchar', length: 20 })
  chartType: 'bar' | 'scatterplot' | 'burnup' | 'table' | 'metric';

  @Column({ type: 'jsonb', nullable: true })
  filters: InsightFilters;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

#### 4. DashboardInsight
```typescript
@Entity('dashboard_insights')
@Index(['dashboardId'])
export class DashboardInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'dashboard_id', type: 'uuid' })
  dashboardId: string;

  @Column({ name: 'insight_id', type: 'uuid' })
  insightId: string;

  @Column({ type: 'jsonb' })
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  config: InsightConfig; // Override filters, display options

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Dashboard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboard_id' })
  dashboard: Dashboard;

  @ManyToOne(() => Insight, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'insight_id' })
  insight: Insight;
}
```

#### 5. ProjectSnapshot
```typescript
@Entity('project_snapshots')
@Index(['projectId', 'snapshotDate'])
export class ProjectSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  scope: number; // Total estimated work

  @Column({ type: 'integer' })
  started: number; // Tasks in progress

  @Column({ type: 'integer' })
  completed: number; // Completed tasks

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  velocity: number; // Weekly velocity

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    taskCount: number;
    completedTaskCount: number;
    inProgressTaskCount: number;
    assigneeBreakdown: Record<string, number>;
    tagBreakdown: Record<string, number>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
```

### Migration Strategy

**Phase 1: Foundation**
1. Create `task_status_history` table
2. Backfill status history from task `createdAt` and status changes
3. Create trigger/hook to track future status changes

**Phase 2: Insights & Dashboards**
1. Create `insights` table
2. Create `dashboards` table
3. Create `dashboard_insights` junction table

**Phase 3: Project Graph**
1. Create `project_snapshots` table
2. Backfill historical snapshots (if historical data available)
3. Set up cron job for ongoing snapshots

**Phase 4: Export Infrastructure**
1. No new tables required (uses existing data)
2. Add export audit logging to existing audit table

---

## API Design

### Insights API

```typescript
// GET /api/insights
// List insights for workspace
GET /api/insights?workspaceId={id}&type={personal|workspace|team}

// POST /api/insights
// Create new insight
POST /api/insights
Body: {
  workspaceId: string;
  name: string;
  measure: MeasureType;
  slice: SliceType;
  segment?: SegmentType;
  chartType: ChartType;
  filters?: InsightFilters;
}

// GET /api/insights/:id
// Get insight details
GET /api/insights/:id

// GET /api/insights/:id/data
// Get insight visualization data
GET /api/insights/:id/data?filters={json}

// PUT /api/insights/:id
// Update insight
PUT /api/insights/:id

// DELETE /api/insights/:id
// Delete insight
DELETE /api/insights/:id

// POST /api/insights/:id/add-to-dashboard
// Add insight to dashboard
POST /api/insights/:id/add-to-dashboard
Body: {
  dashboardId: string;
  config?: InsightConfig;
}
```

### Dashboards API

```typescript
// GET /api/dashboards
// List dashboards
GET /api/dashboards?workspaceId={id}&type={workspace|team|personal}

// POST /api/dashboards
// Create dashboard
POST /api/dashboards
Body: {
  workspaceId: string;
  name: string;
  type: 'workspace' | 'team' | 'personal';
  teamId?: string;
  layout?: DashboardLayout;
  filters?: DashboardFilters;
}

// GET /api/dashboards/:id
// Get dashboard with insights
GET /api/dashboards/:id

// PUT /api/dashboards/:id
// Update dashboard
PUT /api/dashboards/:id

// DELETE /api/dashboards/:id
// Delete dashboard
DELETE /api/dashboards/:id

// POST /api/dashboards/:id/insights
// Add insight to dashboard
POST /api/dashboards/:id/insights
Body: {
  insightId: string;
  position: GridPosition;
  config?: InsightConfig;
}

// DELETE /api/dashboards/:id/insights/:insightId
// Remove insight from dashboard
DELETE /api/dashboards/:id/insights/:insightId

// PUT /api/dashboards/:id/insights/:insightId
// Update insight config in dashboard
PUT /api/dashboards/:id/insights/:insightId
Body: {
  position?: GridPosition;
  config?: InsightConfig;
}

// POST /api/dashboards/:id/refresh
// Refresh dashboard data
POST /api/dashboards/:id/refresh

// PUT /api/dashboards/:id/transfer-ownership
// Transfer dashboard ownership
PUT /api/dashboards/:id/transfer-ownership
Body: { newOwnerId: string }

// PUT /api/dashboards/:id/move
// Move dashboard
PUT /api/dashboards/:id/move
Body: { target: 'workspace' | 'team' | 'personal'; targetId?: string }
```

### Project Graph API

```typescript
// GET /api/projects/:id/graph
// Get project graph data
GET /api/projects/:id/graph?startDate={date}&endDate={date}

// GET /api/projects/:id/graph/breakdown
// Get breakdown data
GET /api/projects/:id/graph/breakdown?type={assignee|tag}

// GET /api/projects/:id/graph/prediction
// Get completion prediction
GET /api/projects/:id/graph/prediction

// GET /api/projects/:id/graph/velocity
// Get velocity data
GET /api/projects/:id/graph/velocity?weeks={number}
```

### Export API

```typescript
// GET /api/export/tasks
// Export tasks as CSV
GET /api/export/tasks?workspaceId={id}&format=csv&filters={json}
Response: CSV file download

// GET /api/export/projects
// Export projects as CSV
GET /api/export/projects?workspaceId={id}&format=csv&filters={json}
Response: CSV file download

// GET /api/export/workspace
// Export full workspace (admin only)
GET /api/export/workspace?workspaceId={id}&includePrivateTeams={boolean}
Response: CSV file download

// GET /api/export/members
// Export members (admin only)
GET /api/export/members?workspaceId={id}
Response: CSV file download

// POST /api/export/markdown
// Export as markdown
POST /api/export/markdown
Body: {
  itemIds: string[];
  itemType: 'task' | 'project';
}
Response: { markdown: string }

// GET /api/export/pdf/:itemType/:itemId
// Export as PDF
GET /api/export/pdf/task/:taskId
GET /api/export/pdf/project/:projectId
Response: PDF file download
```

---

## Frontend Architecture

### Component Structure

```
src/
├── features/
│   ├── insights/
│   │   ├── components/
│   │   │   ├── InsightsPanel.tsx
│   │   │   ├── InsightsGraph.tsx
│   │   │   ├── BarChart.tsx
│   │   │   ├── Scatterplot.tsx
│   │   │   ├── BurnUpChart.tsx
│   │   │   ├── InsightsTable.tsx
│   │   │   ├── InsightsFilters.tsx
│   │   │   ├── MeasureSelector.tsx
│   │   │   ├── SliceSelector.tsx
│   │   │   └── SegmentSelector.tsx
│   │   ├── hooks/
│   │   │   ├── useInsights.ts
│   │   │   └── useInsightData.ts
│   │   ├── api/
│   │   │   └── insights.api.ts
│   │   └── types/
│   │       └── insights.types.ts
│   ├── dashboards/
│   │   ├── components/
│   │   │   ├── DashboardsPage.tsx
│   │   │   ├── DashboardView.tsx
│   │   │   ├── DashboardBuilder.tsx
│   │   │   ├── DashboardGrid.tsx
│   │   │   ├── DashboardWidget.tsx
│   │   │   ├── InsightWidget.tsx
│   │   │   ├── MetricWidget.tsx
│   │   │   ├── TextWidget.tsx
│   │   │   ├── DashboardFilters.tsx
│   │   │   └── AddInsightModal.tsx
│   │   ├── hooks/
│   │   │   ├── useDashboards.ts
│   │   │   └── useDashboardBuilder.ts
│   │   ├── api/
│   │   │   └── dashboards.api.ts
│   │   └── types/
│   │       └── dashboards.types.ts
│   ├── project-graph/
│   │   ├── components/
│   │   │   ├── ProjectGraph.tsx
│   │   │   ├── ProjectGraphChart.tsx
│   │   │   ├── ProjectGraphBreakdown.tsx
│   │   │   ├── ProjectGraphControls.tsx
│   │   │   └── CompletionPrediction.tsx
│   │   ├── hooks/
│   │   │   └── useProjectGraph.ts
│   │   ├── api/
│   │   │   └── project-graph.api.ts
│   │   └── types/
│   │       └── project-graph.types.ts
│   └── export/
│       ├── components/
│       │   ├── ExportButton.tsx
│       │   ├── ExportModal.tsx
│       │   ├── ExportProgress.tsx
│       │   └── MarkdownExporter.tsx
│       ├── hooks/
│       │   └── useExport.ts
│       ├── api/
│       │   └── export.api.ts
│       └── utils/
│           ├── csvExporter.ts
│           └── markdownExporter.ts
```

### State Management

**React Query:**
- API data fetching and caching
- Automatic refetching and invalidation
- Optimistic updates

**Zustand:**
- UI state (panel open/closed, selected filters)
- Dashboard builder state
- Export progress state

### Chart Library Selection

**Recommendation: Recharts**
- Pros: React-native, good TypeScript support, active maintenance
- Cons: Limited customization for complex charts

**Alternative: Observable Plot**
- Pros: Modern, performant, great for time-series
- Cons: Smaller community, less React integration

**Alternative: D3.js**
- Pros: Full control, industry standard
- Cons: Steeper learning curve, more code required

---

## Implementation Phases

### Phase 1: Foundation & Insights (Weeks 1-4)

**Week 1-2: Data Infrastructure**
- [ ] Create `TaskStatusHistory` entity and migration
- [ ] Implement status tracking hooks/triggers
- [ ] Backfill historical status data
- [ ] Create `Insights` entity and migration
- [ ] Set up basic InsightsService

**Week 3-4: Insights Backend**
- [ ] Implement measure calculations (task count, effort)
- [ ] Implement time-based calculations (cycle time, lead time)
- [ ] Implement data aggregation for slices
- [ ] Create InsightsController with basic endpoints
- [ ] Add filtering support

**Deliverables:**
- Task status history tracking
- Basic insights API
- Measure calculation service

### Phase 2: Insights Frontend (Weeks 5-8)

**Week 5-6: Core Components**
- [ ] Build InsightsPanel component
- [ ] Implement measure/slice/segment selectors
- [ ] Build BarChart component
- [ ] Build InsightsTable component
- [ ] Add filter controls

**Week 7-8: Advanced Visualizations**
- [ ] Build Scatterplot component
- [ ] Build BurnUpChart component
- [ ] Add interactive features (hover, click to filter)
- [ ] Integrate insights panel into project/task views
- [ ] Add keyboard shortcut (Cmd+Shift+I)

**Deliverables:**
- Functional insights panel
- Interactive visualizations
- Integration with existing views

### Phase 3: Dashboards (Weeks 9-12)

**Week 9-10: Dashboard Backend**
- [ ] Create Dashboard and DashboardInsight entities
- [ ] Implement DashboardsService
- [ ] Create DashboardsController
- [ ] Add dashboard sharing/ownership logic
- [ ] Implement filter inheritance

**Week 11-12: Dashboard Frontend**
- [ ] Build DashboardsPage
- [ ] Build DashboardBuilder with drag-and-drop
- [ ] Implement grid layout system
- [ ] Build widget components (insight, metric, text)
- [ ] Add dashboard-level filters

**Deliverables:**
- Customizable dashboards
- Drag-and-drop builder
- Workspace/team/personal dashboards

### Phase 4: Project Graph (Weeks 13-16)

**Week 13-14: Project Graph Backend**
- [ ] Create ProjectSnapshot entity
- [ ] Implement snapshot generation logic
- [ ] Create ProjectGraphService
- [ ] Implement velocity calculations
- [ ] Implement prediction algorithms
- [ ] Set up cron job for hourly updates

**Week 15-16: Project Graph Frontend**
- [ ] Build ProjectGraph component
- [ ] Implement time-series chart
- [ ] Add breakdown views (assignee, tags)
- [ ] Add interactive features (hover, zoom)
- [ ] Display completion predictions

**Deliverables:**
- Project graph visualization
- Predictive completion dates
- Historical tracking

### Phase 5: Data Export (Weeks 17-20)

**Week 17-18: Export Backend**
- [ ] Implement ExportService
- [ ] Create CSV export for tasks
- [ ] Create CSV export for projects
- [ ] Implement workspace export (admin)
- [ ] Implement member export
- [ ] Add export audit logging

**Week 19-20: Export Frontend & Advanced**
- [ ] Build export UI components
- [ ] Add export to command menu
- [ ] Implement markdown export
- [ ] Implement PDF export (individual items)
- [ ] Add export to context menus
- [ ] Add batch export support

**Deliverables:**
- Comprehensive export system
- Multiple export formats
- Integration with UI

### Phase 6: Polish & Optimization (Weeks 21-24)

**Week 21-22: Performance**
- [ ] Implement caching strategy
- [ ] Optimize database queries
- [ ] Add pagination for large datasets
- [ ] Implement virtual scrolling for tables
- [ ] Add loading states and skeletons

**Week 23-24: Testing & Documentation**
- [ ] Write unit tests for services
- [ ] Write integration tests for APIs
- [ ] Write E2E tests for critical flows
- [ ] Update API documentation
- [ ] Create user documentation
- [ ] Performance testing and optimization

**Deliverables:**
- Optimized, tested system
- Complete documentation
- Production-ready features

---

## Dependencies & Prerequisites

### Backend Dependencies

**New Packages:**
```json
{
  "csv-stringify": "^6.4.0", // CSV generation
  "pdfkit": "^0.14.0", // PDF generation
  "marked": "^11.0.0", // Markdown parsing
  "@nestjs/schedule": "^4.0.0" // Cron jobs (if not already installed)
}
```

**Existing Dependencies (Verify):**
- TypeORM (entities, migrations)
- NestJS (framework)
- Redis (caching, if used)

### Frontend Dependencies

**New Packages:**
```json
{
  "recharts": "^2.10.0", // Chart library
  "react-grid-layout": "^1.4.0", // Dashboard grid
  "react-dnd": "^16.0.0", // Drag and drop (if needed)
  "date-fns": "^3.0.0", // Date utilities (if not already)
  "papaparse": "^5.4.0" // CSV parsing (for imports, if needed)
}
```

**Existing Dependencies (Verify):**
- React Query (data fetching)
- Zustand (state management)
- React Router (routing)

### Infrastructure

**Database:**
- PostgreSQL (existing)
- Ensure sufficient storage for snapshots and history
- Consider partitioning for large tables

**Caching:**
- Redis (recommended for distributed caching)
- Or in-memory cache for single-instance deployments

**Background Jobs:**
- NestJS ScheduleModule for cron jobs
- Or external job queue (Bull, BullMQ) for scale

### Permissions & Roles

**Insights:**
- All users: View insights in accessible workspaces
- All users: Create personal insights
- Workspace admins: Create workspace insights

**Dashboards:**
- All users: View workspace/team dashboards
- All users: Create personal dashboards
- Workspace admins: Create workspace dashboards
- Team leads: Create team dashboards

**Project Graph:**
- All users: View project graphs for accessible projects
- Requires project "Started" status

**Export:**
- All users: Export filtered task/project views (with limits)
- Admins/Owners: Full workspace export
- Admins/Owners: Member list export
- Limits: 250 items (members), 2,000 items (admins)

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Performance degradation with large datasets** | High | Medium | Implement pagination, caching, materialized views, query optimization |
| **Status history tracking overhead** | Medium | Low | Use efficient triggers, batch processing, optional feature flag |
| **Chart rendering performance** | Medium | Low | Virtualize large datasets, use canvas rendering for scatterplots |
| **Dashboard layout complexity** | Low | Medium | Start with simple grid, iterate based on feedback |
| **Export file size limits** | Medium | Low | Stream large exports, implement progress indicators, chunk processing |

### Data Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Missing historical data for project graph** | Medium | High | Start tracking from implementation date, backfill what's possible |
| **Inconsistent status tracking** | High | Medium | Implement robust status change hooks, validation, data migration |
| **Data privacy in exports** | High | Low | Implement access controls, audit logging, data masking for sensitive fields |

### User Experience Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Feature complexity overwhelming users** | Medium | Medium | Progressive disclosure, guided tours, default dashboards, templates |
| **Learning curve for dashboard builder** | Low | Medium | Intuitive UI, drag-and-drop, pre-built templates, help documentation |
| **Performance perceived as slow** | Medium | Low | Loading states, optimistic updates, skeleton screens, progress indicators |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Scope creep** | Medium | Medium | Phased implementation, clear acceptance criteria, regular reviews |
| **Timeline delays** | Medium | Medium | Buffer time in estimates, parallel work streams, MVP approach |
| **Integration with existing features** | High | Low | Careful API design, backward compatibility, feature flags |

---

## Success Metrics

### Adoption Metrics
- % of workspaces using insights
- % of workspaces with custom dashboards
- Average insights per workspace
- Average dashboards per workspace

### Usage Metrics
- Daily active users of insights panel
- Dashboard views per day
- Project graphs viewed
- Exports generated per week

### Performance Metrics
- API response times (p95, p99)
- Chart rendering time
- Dashboard load time
- Export generation time

### Quality Metrics
- API error rate
- Frontend error rate
- User-reported bugs
- Feature completion rate

---

## Appendix

### A. Linear Feature Comparison

| Feature | Linear | Zephix Equivalent | Gap |
|---------|--------|-------------------|-----|
| Insights Panel | ✅ | ❌ | Full implementation needed |
| Dashboards | ✅ (Business+) | ❌ | Full implementation needed |
| Project Graph | ✅ | ❌ | Full implementation needed |
| Cycle Time | ✅ | ⚠️ | Need status history tracking |
| Lead Time | ✅ | ⚠️ | Need completion date tracking |
| Triage Time | ✅ | ⚠️ | Need "triage" status or equivalent |
| CSV Export | ✅ | ⚠️ | Basic exists, needs enhancement |
| Markdown Export | ✅ | ❌ | Not implemented |
| PDF Export | ✅ | ❌ | Not implemented |

### B. Key Design Decisions

1. **Status History Tracking**: Use dedicated `TaskStatusHistory` table rather than event sourcing to keep it simple and queryable.

2. **Dashboard Layout**: Use grid-based system (react-grid-layout) for flexibility and familiarity.

3. **Chart Library**: Start with Recharts for speed, can migrate to D3.js if needed for advanced features.

4. **Caching Strategy**: 5-minute cache for insights, invalidate on data changes, use Redis for distributed deployments.

5. **Export Limits**: Match Linear's limits (250 for members, 2,000 for admins) for consistency and performance.

6. **Project Graph Snapshots**: Weekly snapshots (7-day granularity) to balance detail and storage.

### C. Open Questions for Architect Review

1. **Status History**: Should we track all status changes or only major transitions? How to handle status changes that happen outside the system (e.g., via API)?

2. **Dashboard Permissions**: Should viewers be able to create personal dashboards? Should there be read-only shared dashboards?

3. **Export Format**: Should we support Excel (.xlsx) in addition to CSV? What about JSON exports for programmatic access?

4. **Project Graph**: Should predictions be shown for all projects or only active ones? How to handle projects without estimates?

5. **Insights Caching**: What's the acceptable staleness for insights data? Should we have different cache TTLs for different measures?

6. **Performance**: What are the expected data volumes? Should we implement materialized views from the start or optimize later?

7. **Integration**: How should these features integrate with existing analytics (MaterializedProjectMetrics)? Should we consolidate or keep separate?

8. **Mobile Support**: Should dashboards and insights be mobile-responsive? What's the priority?

---

## Conclusion

This plan provides a comprehensive roadmap for implementing Linear-inspired analytics features in Zephix. The phased approach allows for iterative delivery, starting with foundational insights and building up to advanced dashboards and predictive analytics.

Key success factors:
- **Data Foundation**: Robust status tracking and historical snapshots
- **Performance**: Efficient queries, caching, and optimization
- **User Experience**: Intuitive interfaces, progressive disclosure, helpful defaults
- **Scalability**: Architecture that supports growth in data and users

The estimated timeline of 24 weeks (6 months) allows for thorough implementation, testing, and polish. However, an MVP could be delivered in 12-16 weeks by focusing on core features first.

**Next Steps:**
1. Architect review and approval
2. Refine technical design based on feedback
3. Prioritize features for MVP vs. full implementation
4. Begin Phase 1 implementation

---

**Document End**
