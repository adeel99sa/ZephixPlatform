# Monday.com Research: KPI Dashboards

## What They Do

### Dashboard Definition & Configuration

**Creating Dashboards:**
- Add new dashboard in workspace or folder
- Choose public (everyone sees) or private (only invited users)
- Manage permissions (who can view/edit)

**Connecting Boards:**
- Link boards that contain data to include
- Plan-based limits on connected boards:
  - Free: 1 board
  - Standard: ~5 boards
  - Pro: ~20 boards
  - Enterprise: ~50 boards

**Widget Selection:**
- 30+ widgets available (excluding text widgets)
- Types: charts, numbers, battery bars, workload, Gantt, timeline, pivot, etc.
- Drag-and-drop layout customization
- No-code configuration

**Column Matching:**
- If multiple boards share columns with identical types and names, can match automatically
- For missing columns, manually specify which column to use
- Supports rollups with consistent demarcations

**Filters:**
- Dashboard-wide filters by board, group, or column
- Widget-level filters (some widgets support their own filters)
- Advanced filters with AND/OR logic
- Up to 50 columns across connected boards can be used

**Data Refresh:**
- Live data (refreshes immediately) or scheduled refresh
- May need to upgrade dashboard engine for advanced refresh or data limits

### KPI Widgets

**Numbers Widget:**
- Display single-value metrics
- Examples: total revenue, open tickets, average lead time
- Can show sums, averages, counts

**Chart Widgets:**
- Bar, line, pie charts
- Show trends, comparisons over time or categories
- Data from connected boards

**Overview Widget:**
- High-level status overview across boards
- Shows project timeline/date spans
- Progress (battery bar)
- Auto-generated labels (on track / at risk / etc.)

**Battery Widget:**
- Visual progress on tasks or initiatives
- Complete vs remaining
- Percentage-based

**Workload Widget:**
- Shows capacity vs assigned tasks per person
- Can use effort estimates
- Factors in work schedules
- Split/sum effort for shared tasks

**Pivot Board/Widget:**
- Slice and group data in different ways
- Rows/columns by status, date, team
- Supports summary calculations (sums, averages, medians)

**Gantt/Timeline Widget:**
- Visualize project timelines
- Dependencies and deadlines
- Cross-project view

### Rollup & Standardization

**Column Matching:**
- Aggregate data from similarly structured columns across boards
- If each project board has "Status" column, can roll up automatically
- Supports rollups with consistent demarcations

**Summaries:**
- Calculate sums, averages, medians for grouped data
- Useful for aggregated metrics
- Available in pivot widgets and number widgets

**Standardization Practices:**
- Define template board structure in advance
- Consistent status labels/categories
- Agree on unit conventions (hours, story points, numeric values)
- Use dedicated columns (Formula, Number) for calculations
- Standard filters and naming conventions

---

## What Breaks at Scale

### Manual KPI Definition

**Problem:** KPIs must be manually defined for each dashboard:
- No reusable KPI definitions
- Each dashboard recreates same KPIs
- Inconsistent calculations across dashboards
- No standard KPI library

**Impact:**
- Duplicate work
- Inconsistent metrics
- Hard to maintain
- No org-wide KPI standards

### No KPI Packs or Templates

**Problem:** No pre-built KPI packs:
- Must build each KPI from scratch
- No standard definitions
- No default thresholds
- No reusable widgets

**Impact:**
- Slow dashboard creation
- Inconsistent KPIs
- No best practices enforced
- Teams reinvent the wheel

### Rollup Requires Manual Configuration

**Problem:** Cross-board rollups require manual setup:
- Must manually match columns across boards
- Must configure filters for each widget
- Must set up calculations manually
- No automatic rollup rules

**Impact:**
- Time-consuming dashboard setup
- Easy to make mistakes
- Inconsistent rollups
- Hard to maintain

### No KPI Governance

**Problem:** No way to enforce KPI standards:
- Teams define KPIs differently
- No org-level KPI definitions
- No versioning of KPI definitions
- No approval process

**Impact:**
- Inconsistent metrics
- Can't compare across teams
- No org-wide visibility
- Governance impossible

### Widget Limitations

**Problem:** Some widgets have limitations:
- Not all column types supported in filters
- Mirror and Connect Boards columns not supported in "All boards" filter
- Some calculations not available
- Widget count limits (30 widgets per dashboard)

**Impact:**
- Can't build desired dashboards
- Workarounds required
- Inconsistent capabilities
- User frustration

### No Automatic Dashboard Generation

**Problem:** Dashboards must be manually created:
- No automatic dashboard creation from templates
- No role-based default dashboards
- Must configure each widget individually
- No dashboard templates

**Impact:**
- Slow setup
- Inconsistent dashboards
- Teams skip dashboards
- Poor adoption

### KPI Calculation Not Standardized

**Problem:** Same KPI calculated differently:
- "On-time rate" calculated differently per team
- No standard formulas
- No shared calculation logic
- Manual errors

**Impact:**
- Inconsistent metrics
- Can't trust comparisons
- Manual reconciliation
- Poor decision-making

---

## What You Should Copy

### 1. Widget Variety

**Copy:** Rich set of widget types (numbers, charts, battery, workload, pivot, etc.).

**Why:** Different KPIs need different visualizations. Flexibility is valuable.

**Implementation:**
- Multiple widget types
- Customizable appearance
- Drag-and-drop layout

### 2. Column Matching

**Copy:** Automatic matching of similarly named/typed columns across boards.

**Why:** Enables rollups without manual configuration.

**Implementation:**
- Detect matching columns
- Auto-match when possible
- Manual override available

### 3. Filter Flexibility

**Copy:** Dashboard-wide and widget-level filters.

**Why:** Need different views of same data. Filters enable flexibility.

**Implementation:**
- Dashboard filters
- Widget filters
- Advanced filter logic

### 4. Multi-Board Support

**Copy:** Connect multiple boards to single dashboard.

**Why:** Need org-level visibility. Roll up across projects.

**Implementation:**
- Connect multiple boards
- Roll up metrics
- Cross-project visibility

---

## What You Should Avoid

### 1. Don't Make KPIs Manual

**Avoid:** Requiring manual KPI definition for each dashboard.

**Why:** Duplicate work. Inconsistent metrics. Hard to maintain.

**Instead:** KPI packs with definitions. Reusable KPIs. Standard calculations.

### 2. Don't Skip KPI Governance

**Avoid:** No org-level KPI definitions or standards.

**Why:** Teams define differently. Can't compare. No governance.

**Instead:** KPI packs with org-level definitions. Enforced standards. Versioning.

### 3. Don't Require Manual Rollup Setup

**Avoid:** Manual configuration for every cross-board rollup.

**Why:** Time-consuming. Error-prone. Hard to maintain.

**Instead:** Automatic rollup rules. KPI packs define rollup logic. One-click setup.

### 4. Don't Make Dashboards Optional

**Avoid:** Dashboards as optional feature, manually created.

**Why:** Teams skip them. Inconsistent. Poor adoption.

**Instead:** Automatic dashboard generation. Role-based defaults. Template includes dashboards.

### 5. Don't Allow Inconsistent Calculations

**Avoid:** Same KPI calculated differently across teams.

**Why:** Can't trust metrics. Poor decisions.

**Instead:** Standard formulas in KPI packs. Enforced calculations. No manual overrides.

### 6. Don't Hide KPI Configuration

**Avoid:** KPI configuration buried in widget settings.

**Why:** Hard to find. Inconsistent setup.

**Instead:** KPI packs as first-class objects. Clear configuration. Reusable definitions.

---

## Key Takeaways for Zephix

### What to Build

1. **KPI Packs System**
   - Definition, data sources, calculation, thresholds, rollup rules
   - Default widgets and dashboard placement
   - Org level overrides and workspace level tuning
   - Setup becomes selection (choose packs, pick thresholds, done)

2. **Automatic Dashboard Generation**
   - Templates include default dashboards
   - Role-based dashboards (workspace owner, org admin)
   - KPI packs wire to dashboards automatically
   - No manual dashboard creation required

3. **Standard KPI Definitions**
   - Start with 6 KPIs:
     - On-time rate
     - Overdue aging
     - Scope change count
     - Capacity utilization
     - Risk count by severity
     - Health score composite
   - Standard formulas, no variation
   - Enforced calculations

4. **KPI Governance**
   - Org-level KPI packs
   - Versioning of KPI definitions
   - Approval process for new KPIs
   - Workspace-level tuning (thresholds, not calculations)

5. **Automatic Rollups**
   - KPI packs define rollup rules
   - Automatic rollup across projects
   - Role-based dashboards (workspace owner sees workspace rollup, org admin sees org rollup)
   - No manual filter work

6. **Template Integration**
   - Pack selection at template instantiation
   - Default pack auto-attaches
   - Dashboards generated automatically
   - KPI wiring happens automatically

### What to Avoid

1. **Manual KPI Definition**
   - Don't require manual setup for each dashboard
   - KPI packs with reusable definitions

2. **No Governance**
   - Don't skip org-level standards
   - Enforce KPI definitions

3. **Manual Rollup Setup**
   - Don't require manual configuration
   - Automatic rollup rules

4. **Optional Dashboards**
   - Don't make dashboards optional
   - Automatic generation, role-based defaults

5. **Inconsistent Calculations**
   - Don't allow different calculations
   - Standard formulas in packs

6. **Hidden Configuration**
   - Don't bury KPI setup
   - KPI packs as first-class objects

---

## Implementation Priority

1. **KPI Pack v1:**
   - Start with 6 KPIs (on-time rate, overdue aging, scope change count, capacity utilization, risk count, health score)
   - Pack selection at template instantiation
   - Default pack auto-attaches
   - Generate dashboards automatically

2. **Standard Definitions:**
   - Standard formulas for each KPI
   - No variation allowed
   - Enforced calculations

3. **Automatic Rollups:**
   - KPI packs define rollup rules
   - Automatic rollup to workspace and org level
   - Role-based dashboards

4. **Governance:**
   - Org-level KPI packs
   - Versioning
   - Approval process

---

*Research Date: January 2026*
*Source: Monday.com documentation, dashboard features, KPI configuration*
