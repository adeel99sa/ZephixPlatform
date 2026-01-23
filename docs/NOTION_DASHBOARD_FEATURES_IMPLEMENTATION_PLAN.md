# Notion Dashboard Features Implementation Plan
## Personal Dashboards, Chart Views, Linked Views, and Analytics

**Document Version:** 1.0  
**Date:** 2025-01-27  
**Status:** Planning Phase - For Architect Review  
**Reference:** Notion Dashboard & Analytics Documentation Analysis

---

## Executive Summary

This document outlines a comprehensive plan to implement dashboard and analytics features inspired by Notion's approach:
1. **Personal/Workspace Dashboards** - Customizable dashboards with flexible layouts
2. **Chart Views** - Database-driven visualizations (donut, bar, line charts)
3. **Linked Views** - Filtered database views across multiple pages
4. **Page Analytics** - View tracking and engagement metrics
5. **Workspace Analytics** - Organization-wide usage insights
6. **Block-Based Content** - Flexible content blocks for dashboard building

These features will transform Zephix into a flexible, customizable workspace where users can build personalized dashboards that adapt to their workflow, similar to Notion's block-based, database-driven approach.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Feature 1: Personal & Workspace Dashboards](#feature-1-personal--workspace-dashboards)
3. [Feature 2: Chart Views](#feature-2-chart-views)
4. [Feature 3: Linked Database Views](#feature-3-linked-database-views)
5. [Feature 4: Page Analytics](#feature-4-page-analytics)
6. [Feature 5: Workspace Analytics](#feature-5-workspace-analytics)
7. [Feature 6: Block-Based Content System](#feature-6-block-based-content-system)
8. [Technical Architecture](#technical-architecture)
9. [Data Model Design](#data-model-design)
10. [API Design](#api-design)
11. [Frontend Architecture](#frontend-architecture)
12. [Implementation Phases](#implementation-phases)
13. [Dependencies & Prerequisites](#dependencies--prerequisites)
14. [Risk Assessment](#risk-assessment)

---

## Current State Analysis

### Existing Zephix Capabilities

#### ✅ What We Have
- **Project Management**: Projects with status, health, priority, dates
- **Task Management**: Tasks with status, progress, assignments, due dates
- **Database Structure**: TypeORM entities (projects, tasks, workspaces)
- **Basic Dashboards**: Simple dashboard views (existing `DashboardView.tsx`)
- **Basic Analytics**: Materialized metrics entities
- **Workspace Scoping**: Multi-tenant architecture
- **Views**: Some existing view components

#### ❌ What We're Missing
- **Flexible Dashboard Builder**: No drag-and-drop, block-based dashboard system
- **Chart Views**: No database-driven chart visualizations
- **Linked Views**: No ability to create filtered views of databases across pages
- **Page Analytics**: No view tracking or engagement metrics
- **Workspace Analytics**: No organization-wide usage insights
- **Block System**: No flexible block-based content system
- **View Customization**: Limited ability to create custom views of data

### Notion vs. Zephix Comparison

| Feature | Notion | Zephix Equivalent | Gap |
|---------|--------|-------------------|-----|
| Personal Dashboards | ✅ | ⚠️ | Need flexible builder |
| Chart Views | ✅ | ❌ | Not implemented |
| Linked Databases | ✅ | ❌ | Not implemented |
| Page Analytics | ✅ | ❌ | Not implemented |
| Workspace Analytics | ✅ (Enterprise) | ❌ | Not implemented |
| Block System | ✅ | ❌ | Not implemented |
| Database Views | ✅ | ⚠️ | Limited views |
| Custom Properties | ✅ | ⚠️ | Fixed schema |

---

## Feature 1: Personal & Workspace Dashboards

### Overview
Flexible, customizable dashboards that allow users to organize their work using a block-based layout system. Users can create personal dashboards for their own work, and workspace admins can create shared dashboards for teams.

### Core Functionality

#### 1.1 Dashboard Types

**Personal Dashboards:**
- Private to the creator
- Can include any accessible data
- Multiple personal dashboards allowed
- Default "My Dashboard" for each user

**Workspace Dashboards:**
- Shared with all workspace members
- Created by workspace admins/owners
- Can be set as default workspace dashboard
- Multiple workspace dashboards allowed

**Team Dashboards:**
- Shared with team members
- Created by team leads
- Scoped to team's projects and data

#### 1.2 Block-Based Layout System

**Block Types:**
- **Database Views**: Linked views of tasks, projects, etc.
- **Chart Blocks**: Visualizations from databases
- **Text Blocks**: Headings, paragraphs, notes
- **To-Do Blocks**: Simple checklists
- **Toggle Blocks**: Collapsible content sections
- **Column Blocks**: Multi-column layouts
- **Metric Blocks**: Single KPI displays
- **Embed Blocks**: External content (future)

**Layout Features:**
- Drag-and-drop block positioning
- Resizable blocks (for charts, tables)
- Full-width or column-based layouts
- Nested blocks (toggle blocks, columns)
- Block templates for quick insertion

#### 1.3 Dashboard Creation & Editing

**Creation Methods:**
- "New Dashboard" button
- Duplicate existing dashboard
- Start from template
- Convert page to dashboard

**Editing Interface:**
- Visual block editor
- Slash commands (`/database`, `/chart`, `/todo`)
- Block menu (three dots) for options
- Drag handles for reordering
- Block settings panel

**Block Actions:**
- Move (drag-and-drop)
- Duplicate
- Delete
- Convert (e.g., text to heading)
- Add to template library

#### 1.4 Dashboard Sharing & Permissions

**Sharing Levels:**
- **Private**: Only creator can view/edit
- **Workspace**: All workspace members can view
- **Team**: Team members can view
- **Custom**: Specific users/groups

**Permission Levels:**
- **Viewer**: Can view dashboard
- **Editor**: Can edit blocks and layout
- **Owner**: Full control, can delete/share

**Default Dashboards:**
- Personal default dashboard (auto-created)
- Workspace default dashboard (admin-set)
- Can be changed by user/admin

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
  listDashboards(auth: AuthContext, workspaceId: string, type: 'personal' | 'workspace' | 'team'): Promise<Dashboard[]>;
  
  // Block management
  addBlock(auth: AuthContext, dashboardId: string, blockType: BlockType, config: BlockConfig): Promise<Block>;
  updateBlock(auth: AuthContext, blockId: string, config: BlockConfig): Promise<Block>;
  deleteBlock(auth: AuthContext, blockId: string): Promise<void>;
  reorderBlocks(auth: AuthContext, dashboardId: string, blockIds: string[]): Promise<void>;
  
  // Sharing
  shareDashboard(auth: AuthContext, dashboardId: string, dto: ShareDashboardDto): Promise<void>;
  setDefaultDashboard(auth: AuthContext, dashboardId: string, scope: 'personal' | 'workspace'): Promise<void>;
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
  type: 'personal' | 'workspace' | 'team';
  teamId: string | null;
  ownerId: string;
  isDefault: boolean;
  sharingLevel: 'private' | 'workspace' | 'team' | 'custom';
  sharedWith: string[]; // User/group IDs for custom sharing
  createdAt: Date;
  updatedAt: Date;
  blocks: Block[]; // One-to-many relationship
}

@Entity('dashboard_blocks')
class DashboardBlock {
  id: string;
  dashboardId: string;
  type: BlockType; // 'database_view', 'chart', 'text', 'todo', 'toggle', 'column', 'metric'
  sortOrder: number;
  config: BlockConfig; // JSON: block-specific configuration
  parentBlockId: string | null; // For nested blocks
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Feature 2: Chart Views

### Overview
Database-driven chart visualizations that automatically update when underlying data changes. Charts can be created as database views or embedded as blocks in dashboards.

### Core Functionality

#### 2.1 Chart Types

**Donut Charts:**
- Simple distribution visualization
- Best for: Status distribution, assignee workload, tag distribution
- Shows: Percentage or count per category
- Limit: Up to 200 groups

**Bar Charts (Horizontal/Vertical):**
- Multi-dimensional categorization
- Best for: Comparing categories with sub-groups
- Shows: Count or sum with grouping
- Example: Tasks by status and priority

**Line Charts:**
- Progress over time
- Best for: Tracking trends, completion rates over time
- Shows: Time series data with optional sub-group comparison
- Example: Tasks completed per week by team

#### 2.2 Chart Configuration

**X-Axis Configuration:**
- **What to show**: Property to display (status, assignee, date, etc.)
- **Sort by**: Ascending/descending, custom order
- **Visible groups**: Show/hide specific groups
- **Omit zero values**: Toggle to exclude empty categories

**Y-Axis Configuration:**
- **What to show**: Count, Sum, or specific property
- **Group by**: Optional second dimension for sub-grouping
- **Cumulative**: Toggle for cumulative totals over time
- **Omit zero values**: Toggle to exclude empty values

**Style Options:**
- **Color palette**: Auto, colorful, or custom
- **Height**: Small to extra large
- **Grid lines**: Show/hide grid lines
- **Axis labels**: Show/hide axis names
- **Data labels**: Show values on chart
- **Smooth line**: Curved vs. angular (line charts)
- **Gradient area**: Fill under line (line charts)
- **Legend**: Show/hide legend

#### 2.3 Chart Creation

**Methods:**
1. **As Database View**: Click `+` next to database → Select "Chart"
2. **As Block**: Type `/chart` in dashboard/page → Select database

**Process:**
1. Select database to visualize
2. Choose chart type
3. Configure X and Y axes
4. Apply filters (optional)
5. Customize style
6. Save as view or embed as block

#### 2.4 Chart Features

**Real-time Updates:**
- Charts automatically refresh when database changes
- No manual refresh needed
- Updates propagate to all instances

**Drilldowns:**
- Click chart elements to see underlying data
- Opens filtered table view
- Can save drilldown as new view

**Export:**
- Export as PNG (with/without background)
- Export as SVG
- Copy chart image
- Share chart link

**Limitations:**
- Max 200 groups, 50 sub-groups
- Cannot edit database entries from chart view
- Complex formulas may slow loading

### Technical Requirements

#### Backend Services

**New Service: `ChartViewsService`**
```typescript
class ChartViewsService {
  // Chart creation
  createChartView(auth: AuthContext, databaseId: string, dto: CreateChartDto): Promise<ChartView>;
  getChartView(auth: AuthContext, chartId: string): Promise<ChartView>;
  updateChartView(auth: AuthContext, chartId: string, dto: UpdateChartDto): Promise<ChartView>;
  deleteChartView(auth: AuthContext, chartId: string): Promise<void>;
  
  // Chart data
  getChartData(auth: AuthContext, chartId: string): Promise<ChartData>;
  
  // Drilldown
  getDrilldownData(auth: AuthContext, chartId: string, groupKey: string): Promise<DrilldownData>;
  
  // Export
  exportChartAsImage(auth: AuthContext, chartId: string, format: 'png' | 'svg', options: ExportOptions): Promise<Buffer>;
}
```

#### Data Model

```typescript
@Entity('chart_views')
class ChartView {
  id: string;
  databaseId: string; // Which database (tasks, projects, etc.)
  databaseType: 'tasks' | 'projects' | 'custom';
  name: string;
  chartType: 'donut' | 'bar_horizontal' | 'bar_vertical' | 'line';
  
  // X-axis config
  xAxisProperty: string;
  xAxisSort: 'asc' | 'desc' | 'custom';
  xAxisVisibleGroups: string[];
  xAxisOmitZero: boolean;
  
  // Y-axis config
  yAxisType: 'count' | 'sum' | 'property';
  yAxisProperty: string | null;
  yAxisGroupBy: string | null;
  yAxisOmitZero: boolean;
  yAxisCumulative: boolean;
  
  // Style
  colorPalette: string;
  height: 'small' | 'medium' | 'large' | 'extra_large';
  showGridLines: boolean;
  showAxisLabels: boolean;
  showDataLabels: boolean;
  smoothLine: boolean; // line charts
  gradientArea: boolean; // line charts
  showLegend: boolean;
  
  // Filters
  filters: ChartFilters; // JSON
  
  // Metadata
  workspaceId: string;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Feature 3: Linked Database Views

### Overview
Create filtered, customized views of databases that can be embedded across multiple pages/dashboards. Changes to data reflect in all linked views, but filters and view settings are independent per instance.

### Core Functionality

#### 3.1 Linked View Concept

**What is a Linked View:**
- A "smart window" into existing database data
- Same data, different perspective
- Filters apply only to the linked instance
- Data changes reflect in original and all linked views

**Use Cases:**
- Show "My Tasks" in personal dashboard
- Show "High Priority Tasks" in project page
- Show "Tasks Due This Week" in meeting notes
- Create multiple filtered views of same database

#### 3.2 Creating Linked Views

**Methods:**
1. Type `/linked` or `/linked view of database`
2. Select source database
3. Choose to copy existing view or create new
4. Apply filters and sorts
5. Embed in page/dashboard

**View Types:**
- **Table View**: Rows and columns
- **Board View**: Kanban-style grouping
- **Calendar View**: Date-based visualization
- **Chart View**: Visual representation
- **List View**: Simple list format

#### 3.3 Filtering & Customization

**Filter Options:**
- **Status**: Filter by task status
- **Assignee**: Filter by assigned user
- **Project**: Filter by project
- **Priority**: Filter by priority level
- **Tags**: Filter by tags
- **Date Range**: Filter by created/due dates
- **Custom Properties**: Filter by any property

**Advanced Filtering:**
- AND/OR logic combinations
- Multiple filter conditions
- Nested filter groups
- Save filter presets

**Sorting:**
- Sort by any property
- Multiple sort levels
- Ascending/descending
- Custom sort order

**Grouping:**
- Group by property (for board view)
- Sub-grouping support
- Collapsible groups

#### 3.4 View Independence

**Independent Settings:**
- Filters (per linked view)
- Sorts (per linked view)
- View type (per linked view)
- Column visibility (per linked view)
- Grouping (per linked view)

**Shared Data:**
- All data changes reflect everywhere
- Adding/editing/deleting items updates all views
- Real-time synchronization

### Technical Requirements

#### Backend Services

**New Service: `LinkedViewsService`**
```typescript
class LinkedViewsService {
  // Create linked view
  createLinkedView(auth: AuthContext, sourceDatabaseId: string, dto: CreateLinkedViewDto): Promise<LinkedView>;
  
  // Get linked view
  getLinkedView(auth: AuthContext, viewId: string): Promise<LinkedView>;
  
  // Update view configuration (filters, sorts, etc.)
  updateViewConfig(auth: AuthContext, viewId: string, config: ViewConfig): Promise<LinkedView>;
  
  // Get view data
  getViewData(auth: AuthContext, viewId: string, pagination: PaginationOptions): Promise<ViewData>;
  
  // Delete linked view
  deleteLinkedView(auth: AuthContext, viewId: string): Promise<void>;
  
  // List all linked views for a database
  listLinkedViews(auth: AuthContext, databaseId: string): Promise<LinkedView[]>;
}
```

#### Data Model

```typescript
@Entity('linked_views')
class LinkedView {
  id: string;
  sourceDatabaseId: string; // Original database
  sourceDatabaseType: 'tasks' | 'projects' | 'custom';
  name: string;
  viewType: 'table' | 'board' | 'calendar' | 'chart' | 'list';
  
  // Configuration
  filters: ViewFilters; // JSON: filter conditions
  sorts: ViewSort[]; // JSON: sort configuration
  groups: ViewGroup[]; // JSON: grouping configuration
  columns: string[]; // Visible columns (for table view)
  
  // Metadata
  workspaceId: string;
  organizationId: string;
  createdById: string;
  parentPageId: string | null; // Where it's embedded
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Feature 4: Page Analytics

### Overview
Track page views, identify viewers, and monitor content engagement at the page level. Helps content creators understand who's viewing their work and when.

### Core Functionality

#### 4.1 Page View Tracking

**Metrics Tracked:**
- **Total Views**: Count of all page views
- **Unique Views**: Count of unique viewers
- **View Timeline**: Views over time (graph)
- **Viewers List**: Who viewed and when
- **Last Viewed**: Most recent view timestamp

**Tracking Scope:**
- All pages in workspace
- Web-shared pages (if applicable)
- Anonymous views (counted but not identified)

#### 4.2 Viewer Information

**Viewer List:**
- List of all users who viewed page
- Last viewed timestamp per user
- View count per user (optional)
- Excludes anonymous/non-member viewers

**Creator & Editor Info (Business/Enterprise):**
- Page creator and creation date
- List of all editors
- Last edited timestamp
- Edit history (if available)

#### 4.3 Analytics Access

**Access Levels:**
- **Page Owners/Editors**: Full analytics access
- **Viewers**: No analytics access (privacy)
- **Workspace Admins**: Can view all page analytics

**Access Method:**
- Click `🕘 View all updates` icon (top right)
- Select "Analytics" tab in sidebar
- Or via page menu → "Analytics"

#### 4.4 Privacy & Opt-Out

**User Privacy:**
- Users can opt out of analytics tracking
- Global opt-out in Settings → Preferences → Privacy
- Per-page opt-out option
- Opt-out users not shown in viewer lists

**Data Retention:**
- View data tracked for 365 days
- Historical data available for analysis
- Export capability for compliance

### Technical Requirements

#### Backend Services

**New Service: `PageAnalyticsService`**
```typescript
class PageAnalyticsService {
  // Track page view
  trackPageView(auth: AuthContext, pageId: string, pageType: 'dashboard' | 'project' | 'task' | 'custom'): Promise<void>;
  
  // Get page analytics
  getPageAnalytics(auth: AuthContext, pageId: string): Promise<PageAnalytics>;
  
  // Get viewer list
  getViewers(auth: AuthContext, pageId: string): Promise<Viewer[]>;
  
  // Get edit history
  getEditHistory(auth: AuthContext, pageId: string): Promise<EditHistory[]>;
  
  // Export analytics
  exportAnalytics(auth: AuthContext, pageId: string, format: 'csv' | 'json'): Promise<ExportResult>;
}
```

#### Data Model

```typescript
@Entity('page_views')
@Index(['pageId', 'viewedAt'])
@Index(['userId', 'viewedAt'])
class PageView {
  id: string;
  pageId: string;
  pageType: 'dashboard' | 'project' | 'task' | 'custom';
  userId: string | null; // null for anonymous
  workspaceId: string;
  organizationId: string;
  viewedAt: Date;
  sessionId: string | null; // for anonymous tracking
  userAgent: string | null;
  referrer: string | null;
}

@Entity('page_analytics_summary')
@Index(['pageId', 'date'])
class PageAnalyticsSummary {
  id: string;
  pageId: string;
  date: Date; // Daily summary
  totalViews: number;
  uniqueViews: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Feature 5: Workspace Analytics

### Overview
Enterprise-level analytics providing organization-wide insights into workspace usage, member engagement, content performance, and search behavior. Helps IT managers and knowledge managers optimize workspace effectiveness.

### Core Functionality

#### 5.1 Analytics Tabs

**Overview Tab:**
- Key metrics at a glance
- Recent activity summary
- Top content, top users
- Quick insights

**Members Tab (Workspace Owners Only):**
- Active members over last 90 days
- Adoption metrics
- Sort by: Page views, edits, last active
- Teamspace membership
- Power users identification
- Inactive members identification

**Content Tab (All Members with Edit Access):**
- Engagement metrics per page
- Views, unique viewers, last edited date
- Filter by: Creation date, creator, teamspace
- Identify popular pages
- Identify outdated content
- Export to CSV

**Search Tab (Workspace Owners Only):**
- Search queries and frequency
- Unique searchers count
- Click-through rates
- Identify content gaps
- Popular search terms
- Failed searches (no results)

#### 5.2 Member Engagement Analytics

**Metrics:**
- **Active Members**: Members active in last 90 days
- **Page Views**: Total views per member
- **Edits**: Total edits per member
- **Last Active**: Most recent activity date
- **Teamspaces**: Which teamspaces member belongs to

**Use Cases:**
- Identify power users (training champions)
- Identify users needing support
- Track adoption rates
- Measure engagement trends

#### 5.3 Content Analytics

**Metrics Per Page:**
- Total views
- Unique viewers
- Last edited date
- Creator
- Teamspace
- Page audience (who can view)

**Filtering:**
- Time period (last 7 days, month, etc.)
- Creation date range
- Creator filter
- Teamspace filter
- Sort by popularity, last edited, etc.

**Use Cases:**
- Identify popular content
- Find outdated content needing updates
- Prioritize content creation
- Understand content consumption patterns

#### 5.4 Search Analytics

**Metrics:**
- **Search Queries**: What people search for
- **Search Frequency**: How often each query is used
- **Unique Searchers**: How many people search
- **Click-Through Rate**: % of searches that result in clicks
- **No Results**: Searches with no matches

**Use Cases:**
- Identify content gaps (searches with no results)
- Understand information needs
- Improve content discoverability
- Optimize search experience

#### 5.5 Data Export

**Export Options:**
- Export analytics as CSV
- Custom date ranges
- Filter before export
- Scheduled exports (future)

**Data Retention:**
- Analytics data tracked for 365 days
- Historical trends available
- Compliance-ready exports

### Technical Requirements

#### Backend Services

**New Service: `WorkspaceAnalyticsService`**
```typescript
class WorkspaceAnalyticsService {
  // Overview
  getOverview(auth: AuthContext, workspaceId: string, timeRange: TimeRange): Promise<AnalyticsOverview>;
  
  // Member analytics
  getMemberAnalytics(auth: AuthContext, workspaceId: string, filters: MemberFilters): Promise<MemberAnalytics[]>;
  getMemberEngagement(auth: AuthContext, workspaceId: string, memberId: string): Promise<MemberEngagement>;
  
  // Content analytics
  getContentAnalytics(auth: AuthContext, workspaceId: string, filters: ContentFilters): Promise<ContentAnalytics[]>;
  getContentTrends(auth: AuthContext, workspaceId: string, pageId: string, timeRange: TimeRange): Promise<ContentTrends>;
  
  // Search analytics
  getSearchAnalytics(auth: AuthContext, workspaceId: string, filters: SearchFilters): Promise<SearchAnalytics[]>;
  getSearchTrends(auth: AuthContext, workspaceId: string, timeRange: TimeRange): Promise<SearchTrends>;
  
  // Export
  exportAnalytics(auth: AuthContext, workspaceId: string, type: 'members' | 'content' | 'search', format: 'csv'): Promise<ExportResult>;
}
```

#### Data Model

```typescript
@Entity('workspace_analytics_members')
@Index(['workspaceId', 'date'])
class WorkspaceMemberAnalytics {
  id: string;
  workspaceId: string;
  organizationId: string;
  userId: string;
  date: Date; // Daily summary
  pageViews: number;
  edits: number;
  lastActiveAt: Date;
  teamspaceIds: string[];
}

@Entity('workspace_analytics_content')
@Index(['workspaceId', 'pageId', 'date'])
class WorkspaceContentAnalytics {
  id: string;
  workspaceId: string;
  organizationId: string;
  pageId: string;
  pageType: string;
  date: Date; // Daily summary
  totalViews: number;
  uniqueViews: number;
  lastEditedAt: Date;
  creatorId: string;
  teamspaceId: string | null;
}

@Entity('workspace_search_logs')
@Index(['workspaceId', 'searchedAt'])
class WorkspaceSearchLog {
  id: string;
  workspaceId: string;
  organizationId: string;
  userId: string;
  query: string;
  searchedAt: Date;
  resultsCount: number;
  clickedResult: boolean;
  clickedPageId: string | null;
}
```

---

## Feature 6: Block-Based Content System

### Overview
Flexible block system that allows users to build rich, customizable content using different block types. Blocks can be nested, reordered, and combined to create personalized dashboards and pages.

### Core Functionality

#### 6.1 Block Types

**Content Blocks:**
- **Text Block**: Paragraph text
- **Heading Block**: H1, H2, H3 headings
- **Quote Block**: Blockquote styling
- **Code Block**: Syntax-highlighted code
- **Divider Block**: Horizontal rule

**Interactive Blocks:**
- **To-Do Block**: Checkbox list items
- **Toggle Block**: Collapsible content
- **Callout Block**: Highlighted info/warning/tip

**Layout Blocks:**
- **Column Block**: Multi-column layout (2-4 columns)
- **Container Block**: Grouping container

**Data Blocks:**
- **Database View Block**: Linked database view
- **Chart Block**: Chart visualization
- **Metric Block**: Single KPI display
- **Table Block**: Simple table (future)

**Media Blocks (Future):**
- **Image Block**: Image embedding
- **Video Block**: Video embedding
- **File Block**: File attachment

#### 6.2 Block Operations

**Creation:**
- Slash commands (`/todo`, `/toggle`, `/heading`)
- Block menu (`+` button)
- Keyboard shortcuts
- Drag from block library

**Editing:**
- Click to edit (inline editing)
- Block menu for options
- Formatting toolbar
- Markdown support (optional)

**Manipulation:**
- Drag-and-drop reordering
- Drag handles for moving
- Resize (for charts, tables)
- Duplicate block
- Delete block
- Convert block type

**Nesting:**
- Blocks can contain other blocks
- Toggle blocks can nest any content
- Column blocks contain column content
- Indentation for hierarchy

#### 6.3 Block Configuration

**Text Blocks:**
- Font size, weight, color
- Text alignment
- Lists (bulleted, numbered)
- Links, bold, italic, underline

**To-Do Blocks:**
- Checkbox state
- Due date (optional)
- Assignee (optional)
- Reminder (optional)

**Toggle Blocks:**
- Default state (open/closed)
- Icon customization
- Nested content

**Column Blocks:**
- Number of columns (2-4)
- Column width ratios
- Responsive behavior

**Database View Blocks:**
- Source database selection
- View type (table, board, etc.)
- Filters and sorts
- Size/responsiveness

**Chart Blocks:**
- Source database
- Chart type
- Configuration (axes, style)
- Size options

#### 6.4 Block Templates

**Template Library:**
- Save blocks as templates
- Share templates with workspace
- Quick insertion from templates
- Template categories

**Common Templates:**
- Status update block
- Meeting notes block
- Project summary block
- KPI dashboard block

### Technical Requirements

#### Backend Services

**Extend `DashboardsService`** (from Feature 1)
- Block CRUD operations
- Block reordering
- Block templates
- Block conversion

#### Data Model

**Extend `DashboardBlock` entity:**
```typescript
enum BlockType {
  // Content
  TEXT = 'text',
  HEADING = 'heading',
  QUOTE = 'quote',
  CODE = 'code',
  DIVIDER = 'divider',
  
  // Interactive
  TODO = 'todo',
  TOGGLE = 'toggle',
  CALLOUT = 'callout',
  
  // Layout
  COLUMN = 'column',
  CONTAINER = 'container',
  
  // Data
  DATABASE_VIEW = 'database_view',
  CHART = 'chart',
  METRIC = 'metric',
}

@Entity('dashboard_blocks')
class DashboardBlock {
  id: string;
  dashboardId: string;
  type: BlockType;
  sortOrder: number;
  parentBlockId: string | null;
  
  // Block content (varies by type)
  content: BlockContent; // JSON: type-specific content
  
  // Configuration
  config: BlockConfig; // JSON: styling, options
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Technical Architecture

### System Components

#### Backend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Dashboards   │  │ Chart Views  │  │ Analytics    │ │
│  │ Controller   │  │ Controller   │  │ Controller   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Linked Views│  │ Blocks       │                    │
│  │ Controller   │  │ Controller   │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────┐
│                  Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Dashboards   │  │ Chart Views  │  │ Page         │ │
│  │ Service      │  │ Service      │  │ Analytics    │ │
│  └──────────────┘  └──────────────┘  │ Service      │ │
│  ┌──────────────┐  ┌──────────────┐  └──────────────┘ │
│  │ Linked Views │  │ Workspace    │  ┌──────────────┐ │
│  │ Service      │  │ Analytics    │  │ Block        │ │
│  └──────────────┘  │ Service      │  │ Service      │ │
│                    └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────────┐
│                  Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Dashboards   │  │ Chart Views  │  │ Linked Views │ │
│  │ Blocks       │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Page Views   │  │ Workspace    │  │ Search Logs  │ │
│  │ Analytics    │  │ Analytics    │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Frontend Architecture

```
src/
├── features/
│   ├── dashboards/
│   │   ├── components/
│   │   │   ├── DashboardBuilder.tsx
│   │   │   ├── DashboardView.tsx
│   │   │   ├── BlockEditor.tsx
│   │   │   └── blocks/
│   │   │       ├── TextBlock.tsx
│   │   │       ├── TodoBlock.tsx
│   │   │       ├── ToggleBlock.tsx
│   │   │       ├── ColumnBlock.tsx
│   │   │       ├── DatabaseViewBlock.tsx
│   │   │       ├── ChartBlock.tsx
│   │   │       └── MetricBlock.tsx
│   │   ├── hooks/
│   │   │   ├── useDashboard.ts
│   │   │   └── useBlockEditor.ts
│   │   └── api/
│   │       └── dashboards.api.ts
│   ├── charts/
│   │   ├── components/
│   │   │   ├── ChartView.tsx
│   │   │   ├── DonutChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   └── LineChart.tsx
│   │   ├── hooks/
│   │   │   └── useChart.ts
│   │   └── api/
│   │       └── charts.api.ts
│   ├── linked-views/
│   │   ├── components/
│   │   │   ├── LinkedView.tsx
│   │   │   ├── ViewFilters.tsx
│   │   │   └── ViewConfig.tsx
│   │   └── api/
│   │       └── linked-views.api.ts
│   └── analytics/
│       ├── components/
│       │   ├── PageAnalytics.tsx
│       │   ├── WorkspaceAnalytics.tsx
│       │   └── AnalyticsDashboard.tsx
│       └── api/
│           └── analytics.api.ts
```

### Performance Considerations

#### Caching Strategy

**Dashboard Data:**
- Cache dashboard layouts (static)
- Cache block configurations
- Invalidate on block updates
- Redis for distributed caching

**Chart Data:**
- Cache chart calculations (5 minutes)
- Invalidate on database changes
- Pre-compute common chart queries

**Analytics Data:**
- Daily aggregation for summaries
- Cache popular analytics queries
- Background job for daily summaries

#### Database Optimization

**Indexes Required:**
```sql
-- Dashboard blocks
CREATE INDEX idx_dashboard_blocks_dashboard_order ON dashboard_blocks(dashboard_id, sort_order);
CREATE INDEX idx_dashboard_blocks_parent ON dashboard_blocks(parent_block_id);

-- Page views
CREATE INDEX idx_page_views_page_date ON page_views(page_id, viewed_at);
CREATE INDEX idx_page_views_user_date ON page_views(user_id, viewed_at);

-- Workspace analytics
CREATE INDEX idx_workspace_analytics_members_workspace_date ON workspace_analytics_members(workspace_id, date);
CREATE INDEX idx_workspace_analytics_content_workspace_date ON workspace_analytics_content(workspace_id, date);
CREATE INDEX idx_workspace_search_logs_workspace_date ON workspace_search_logs(workspace_id, searched_at);
```

**Materialized Views:**
- Daily analytics summaries
- Popular content rankings
- Member engagement scores

---

## Data Model Design

### New Entities Summary

1. **Dashboard** - Dashboard container
2. **DashboardBlock** - Individual blocks in dashboard
3. **ChartView** - Chart configuration and metadata
4. **LinkedView** - Linked database view configuration
5. **PageView** - Individual page view tracking
6. **PageAnalyticsSummary** - Daily page analytics aggregation
7. **WorkspaceMemberAnalytics** - Member engagement data
8. **WorkspaceContentAnalytics** - Content engagement data
9. **WorkspaceSearchLog** - Search query logging

### Migration Strategy

**Phase 1: Foundation**
1. Create dashboard and block tables
2. Create chart view table
3. Create linked view table

**Phase 2: Analytics**
1. Create page view tracking table
2. Create analytics summary tables
3. Set up background jobs for aggregation

**Phase 3: Workspace Analytics**
1. Create workspace analytics tables
2. Set up search logging
3. Create daily aggregation jobs

---

## API Design

### Dashboards API

```typescript
// GET /api/dashboards
GET /api/dashboards?workspaceId={id}&type={personal|workspace|team}

// POST /api/dashboards
POST /api/dashboards
Body: {
  workspaceId: string;
  name: string;
  type: 'personal' | 'workspace' | 'team';
  teamId?: string;
}

// GET /api/dashboards/:id
GET /api/dashboards/:id

// PUT /api/dashboards/:id
PUT /api/dashboards/:id

// DELETE /api/dashboards/:id
DELETE /api/dashboards/:id

// POST /api/dashboards/:id/blocks
POST /api/dashboards/:id/blocks
Body: {
  type: BlockType;
  config: BlockConfig;
  sortOrder: number;
  parentBlockId?: string;
}

// PUT /api/blocks/:id
PUT /api/blocks/:id

// DELETE /api/blocks/:id
DELETE /api/blocks/:id

// PUT /api/dashboards/:id/blocks/reorder
PUT /api/dashboards/:id/blocks/reorder
Body: { blockIds: string[] }
```

### Charts API

```typescript
// POST /api/charts
POST /api/charts
Body: {
  databaseId: string;
  databaseType: 'tasks' | 'projects';
  chartType: 'donut' | 'bar_horizontal' | 'bar_vertical' | 'line';
  xAxisConfig: XAxisConfig;
  yAxisConfig: YAxisConfig;
  style: ChartStyle;
  filters?: ChartFilters;
}

// GET /api/charts/:id
GET /api/charts/:id

// GET /api/charts/:id/data
GET /api/charts/:id/data

// GET /api/charts/:id/drilldown
GET /api/charts/:id/drilldown?groupKey={key}

// GET /api/charts/:id/export
GET /api/charts/:id/export?format=png|svg&background={boolean}
```

### Linked Views API

```typescript
// POST /api/linked-views
POST /api/linked-views
Body: {
  sourceDatabaseId: string;
  sourceDatabaseType: 'tasks' | 'projects';
  name: string;
  viewType: 'table' | 'board' | 'calendar' | 'chart';
  filters: ViewFilters;
  sorts: ViewSort[];
  groups?: ViewGroup[];
}

// GET /api/linked-views/:id
GET /api/linked-views/:id

// GET /api/linked-views/:id/data
GET /api/linked-views/:id/data?page={number}&limit={number}

// PUT /api/linked-views/:id
PUT /api/linked-views/:id
```

### Analytics API

```typescript
// POST /api/analytics/page-view
POST /api/analytics/page-view
Body: {
  pageId: string;
  pageType: 'dashboard' | 'project' | 'task';
}

// GET /api/analytics/pages/:id
GET /api/analytics/pages/:id

// GET /api/analytics/pages/:id/viewers
GET /api/analytics/pages/:id/viewers

// GET /api/analytics/workspace/:id/overview
GET /api/analytics/workspace/:id/overview?timeRange={7d|30d|90d}

// GET /api/analytics/workspace/:id/members
GET /api/analytics/workspace/:id/members?sortBy={views|edits|lastActive}

// GET /api/analytics/workspace/:id/content
GET /api/analytics/workspace/:id/content?filter={json}&sortBy={views|lastEdited}

// GET /api/analytics/workspace/:id/search
GET /api/analytics/workspace/:id/search?timeRange={7d|30d|90d}
```

---

## Implementation Phases

### Phase 1: Foundation & Dashboards (Weeks 1-6)

**Week 1-2: Database & Backend Foundation**
- [ ] Create Dashboard and DashboardBlock entities
- [ ] Create migrations
- [ ] Implement DashboardsService (CRUD)
- [ ] Create DashboardsController

**Week 3-4: Block System Backend**
- [ ] Implement block CRUD operations
- [ ] Block reordering logic
- [ ] Block template system
- [ ] Block validation

**Week 5-6: Dashboard Frontend**
- [ ] Build DashboardBuilder component
- [ ] Implement drag-and-drop
- [ ] Create basic block components (text, todo, toggle)
- [ ] Block editor interface

**Deliverables:**
- Functional dashboard builder
- Basic block types
- Personal dashboards

### Phase 2: Chart Views (Weeks 7-12)

**Week 7-8: Chart Backend**
- [ ] Create ChartView entity
- [ ] Implement ChartViewsService
- [ ] Chart data calculation logic
- [ ] Chart configuration validation

**Week 9-10: Chart Visualization**
- [ ] Build chart components (donut, bar, line)
- [ ] Chart configuration UI
- [ ] Real-time data updates
- [ ] Chart export functionality

**Week 11-12: Chart Integration**
- [ ] Integrate charts into dashboards
- [ ] Chart drilldown functionality
- [ ] Chart as database view
- [ ] Chart templates

**Deliverables:**
- Full chart system
- Chart blocks in dashboards
- Chart export

### Phase 3: Linked Views (Weeks 13-16)

**Week 13-14: Linked Views Backend**
- [ ] Create LinkedView entity
- [ ] Implement LinkedViewsService
- [ ] View filtering logic
- [ ] View data aggregation

**Week 15-16: Linked Views Frontend**
- [ ] Build LinkedView component
- [ ] Filter/sort UI
- [ ] View type switching
- [ ] Embed in dashboards

**Deliverables:**
- Linked database views
- Filtered views across pages
- View embedding

### Phase 4: Page Analytics (Weeks 17-20)

**Week 17-18: Analytics Backend**
- [ ] Create PageView entity
- [ ] Implement page view tracking
- [ ] Create PageAnalyticsService
- [ ] Daily aggregation jobs

**Week 19-20: Analytics Frontend**
- [ ] Build PageAnalytics component
- [ ] Viewer list display
- [ ] View timeline graph
- [ ] Privacy controls

**Deliverables:**
- Page view tracking
- Analytics UI
- Privacy compliance

### Phase 5: Workspace Analytics (Weeks 21-24)

**Week 21-22: Workspace Analytics Backend**
- [ ] Create workspace analytics entities
- [ ] Implement WorkspaceAnalyticsService
- [ ] Search logging
- [ ] Daily aggregation jobs

**Week 23-24: Workspace Analytics Frontend**
- [ ] Build WorkspaceAnalytics dashboard
- [ ] Member engagement views
- [ ] Content analytics views
- [ ] Search analytics views
- [ ] Export functionality

**Deliverables:**
- Complete workspace analytics
- All analytics tabs
- Export capabilities

### Phase 6: Polish & Advanced Features (Weeks 25-28)

**Week 25-26: Advanced Blocks**
- [ ] Column blocks
- [ ] Metric blocks
- [ ] Callout blocks
- [ ] Block templates library

**Week 27-28: Performance & Testing**
- [ ] Performance optimization
- [ ] Caching implementation
- [ ] Unit and integration tests
- [ ] E2E tests
- [ ] Documentation

**Deliverables:**
- Production-ready system
- Complete documentation
- Performance optimized

---

## Dependencies & Prerequisites

### Backend Dependencies

**New Packages:**
```json
{
  "node-cron": "^3.0.0", // For scheduled jobs
  "sharp": "^0.33.0" // For chart image export
}
```

### Frontend Dependencies

**New Packages:**
```json
{
  "react-dnd": "^16.0.0", // Drag and drop
  "react-dnd-html5-backend": "^16.0.0",
  "recharts": "^2.10.0", // Charts
  "dnd-kit": "^6.0.0" // Alternative drag and drop
}
```

### Infrastructure

**Background Jobs:**
- NestJS ScheduleModule for cron jobs
- Or Bull/BullMQ for distributed jobs

**Caching:**
- Redis for distributed caching
- Or in-memory cache for single instance

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Block editor complexity** | High | Medium | Start with simple blocks, iterate |
| **Chart rendering performance** | Medium | Low | Virtualization, canvas rendering |
| **Analytics data volume** | High | Medium | Aggregation, archiving, limits |
| **Real-time sync complexity** | Medium | Medium | Event-driven updates, WebSockets |

### User Experience Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Learning curve** | Medium | Medium | Templates, guided tours, defaults |
| **Dashboard builder complexity** | Medium | Medium | Progressive disclosure, simple start |
| **Performance with many blocks** | Medium | Low | Lazy loading, virtualization |

### Data Privacy Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Analytics privacy concerns** | High | Low | Opt-out, anonymization, clear policies |
| **View tracking sensitivity** | Medium | Low | User controls, transparency |

---

## Success Metrics

### Adoption Metrics
- % of users with personal dashboards
- Average blocks per dashboard
- % of workspaces using workspace dashboards
- Chart views created per workspace

### Usage Metrics
- Daily dashboard views
- Blocks created per day
- Linked views created
- Analytics pages viewed

### Performance Metrics
- Dashboard load time
- Chart rendering time
- Analytics query performance
- Block editor responsiveness

---

## Appendix

### A. Notion Feature Comparison

| Feature | Notion | Zephix Plan | Status |
|--------|--------|-------------|--------|
| Personal Dashboards | ✅ | ✅ | To implement |
| Workspace Dashboards | ✅ | ✅ | To implement |
| Chart Views | ✅ | ✅ | To implement |
| Linked Databases | ✅ | ✅ | To implement |
| Page Analytics | ✅ | ✅ | To implement |
| Workspace Analytics | ✅ (Enterprise) | ✅ | To implement |
| Block System | ✅ | ✅ | To implement |
| To-Do Blocks | ✅ | ✅ | To implement |
| Toggle Blocks | ✅ | ✅ | To implement |
| Column Layouts | ✅ | ✅ | To implement |

### B. Key Design Decisions

1. **Block System**: Use JSON-based block content storage for flexibility, similar to Notion's approach.

2. **Chart Library**: Start with Recharts for speed, can migrate to D3.js if needed.

3. **Analytics Privacy**: Opt-in by default with clear opt-out options, following privacy best practices.

4. **Real-time Updates**: Use WebSockets or Server-Sent Events for live dashboard updates.

5. **View Independence**: Linked views have independent filters but share underlying data, matching Notion's model.

### C. Open Questions for Architect Review

1. **Block Storage**: Should block content be stored as JSON or normalized into separate tables? JSON is more flexible but harder to query.

2. **Analytics Retention**: Should we store raw page views indefinitely or aggregate and archive? What's the compliance requirement?

3. **Real-time Updates**: WebSockets vs. Server-Sent Events vs. polling? What's the scale requirement?

4. **Chart Limits**: Should we enforce Notion's limits (200 groups, 50 sub-groups) or allow more?

5. **Block Templates**: Should templates be workspace-wide, user-specific, or both?

6. **Workspace Analytics Access**: Should all members see content analytics or only admins? What about member analytics?

7. **Linked View Performance**: How to handle performance with many linked views of large databases?

8. **Migration Path**: How to migrate existing dashboards to new block-based system?

---

## Conclusion

This plan provides a comprehensive roadmap for implementing Notion-inspired dashboard and analytics features in Zephix. The block-based, database-driven approach will give users the flexibility to create personalized workspaces that adapt to their workflow.

Key success factors:
- **Flexibility**: Block-based system allows infinite customization
- **Real-time**: Charts and views update automatically
- **Privacy**: Analytics with user control and opt-out
- **Performance**: Efficient queries and caching for scale

The estimated timeline of 28 weeks (7 months) allows for thorough implementation. An MVP could be delivered in 16-20 weeks focusing on core dashboard and chart features.

**Next Steps:**
1. Architect review and approval
2. Refine technical design based on feedback
3. Prioritize features for MVP vs. full implementation
4. Begin Phase 1 implementation

---

**Document End**
