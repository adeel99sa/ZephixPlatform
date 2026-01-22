# Monday.com Research: Cross-Object Rollups

## What They Do

### Dashboard Filters

**Capabilities:**
- Filter dashboards by board, group, column, etc.
- Advanced filters with AND/OR logic
- Filters for subitems
- Up to 50 columns across connected boards can be used

**Limitations:**
- Mirror and Connect Boards columns *not* supported in "All boards" filter
- Some column types have filter limitations
- Board-specific filter limitations may require repeat configuration per widget/board

### Multi-Level Boards & Rollup Columns

**New Feature (2026):**
- Supports up to **five layers** of subitems under parent items
- New rollup columns that summarize child-item data
- Rollup types: date, status, number
- Rollups are read-only at parent level (when children exist)
- Generally available on project boards

**Rollup Behavior:**
- Automatically summarizes child data into parent
- Date rollups: earliest start, latest end
- Status rollups: aggregated status (e.g., "In progress" if any child is in progress)
- Number rollups: sum, average, etc.

### API Aggregation

**Capabilities:**
- `aggregate` query allows grouping and summarizing board data via API
- Can apply filters in the query
- Useful for custom tooling or integrations
- Not all aggregation needs covered in UI

### Column Matching

**Automatic Matching:**
- If multiple boards share columns with identical types and names, can match automatically
- Supports rollups with consistent demarcations
- For missing columns, manually specify which column to use

**Manual Matching:**
- Must manually map columns if names/types don't match
- Time-consuming for many boards
- Easy to make mistakes

### Widget Summaries

**Available Calculations:**
- Sums, averages, medians for grouped data
- Useful for aggregated metrics
- Available in pivot widgets and number widgets
- Can group by status, date, team, etc.

---

## What Breaks at Scale

### Manual Filter Configuration

**Problem:** Must manually configure filters for each dashboard/widget:
- No saved filter templates
- Must repeat filter logic across dashboards
- Easy to make mistakes
- Inconsistent filters

**Impact:**
- Time-consuming setup
- Inconsistent rollups
- Maintenance burden
- Poor user experience

### Mirror Column Limitations

**Problem:** Mirror columns cannot be filtered in dashboards:
- Can't filter by selected values in mirrored/rolled-up status columns
- Hard to hide "Completed" or "Done" tasks in cumulative status columns
- Limits dashboard functionality

**Impact:**
- Can't build desired dashboards
- Workarounds required
- Inconsistent capabilities
- User frustration

### No Automatic Rollup Rules

**Problem:** Rollups require manual configuration:
- Must set up rollup columns manually
- Must configure which child items to include
- No automatic rollup rules
- Must repeat for each board

**Impact:**
- Slow setup
- Inconsistent rollups
- Easy to make mistakes
- Hard to maintain

### Filter Limitations

**Problem:** "All boards" filter doesn't support Mirror or Connect Boards columns:
- Can't filter across boards using connected data
- Must filter each board separately
- Limits cross-board rollups

**Impact:**
- Can't build desired dashboards
- Manual workarounds
- Inconsistent results
- Poor user experience

### No Standard Rollup Conventions

**Problem:** No standard way to roll up data:
- Teams develop manual conventions
- Inconsistent rollup logic
- Hard to compare across teams
- No governance

**Impact:**
- Inconsistent metrics
- Can't trust rollups
- Manual reconciliation
- Poor decision-making

### Subitem Filter Complexity

**Problem:** Subitem filters only work via advanced filters:
- Not available in simple filters
- Complex to set up
- Easy to make mistakes
- Limited functionality

**Impact:**
- Hard to filter subitems
- Workarounds required
- Inconsistent results
- Poor user experience

### No Role-Based Rollups

**Problem:** Same rollup logic for all users:
- Workspace owner sees same rollup as team member
- No role-based aggregation
- Can't customize by role

**Impact:**
- Too much or too little data
- Poor user experience
- Manual filtering required
- Inconsistent views

---

## What You Should Copy

### 1. Multi-Level Boards Concept

**Copy:** Support for nested items (subitems) with rollup columns.

**Why:** Enables hierarchical data structures. Automatic rollups from children to parents.

**Implementation:**
- Multi-level items (tasks → subtasks)
- Rollup columns (date, status, number)
- Automatic summarization

### 2. Column Matching

**Copy:** Automatic matching of similarly named/typed columns across boards.

**Why:** Enables rollups without manual configuration.

**Implementation:**
- Detect matching columns
- Auto-match when possible
- Manual override available

### 3. Widget Summaries

**Copy:** Calculation capabilities (sums, averages, medians) in widgets.

**Why:** Need aggregated metrics. Summaries enable rollups.

**Implementation:**
- Summary calculations in widgets
- Group by various dimensions
- Flexible aggregation

### 4. API Aggregation

**Copy:** API support for aggregation queries.

**Why:** Enables custom tooling. Programmatic rollups.

**Implementation:**
- Aggregate queries in API
- Filter support
- Custom rollup logic

---

## What You Should Avoid

### 1. Don't Require Manual Filter Setup

**Avoid:** Manual filter configuration for each dashboard/widget.

**Why:** Time-consuming. Error-prone. Inconsistent.

**Instead:** Automatic rollup rules. KPI packs define rollup logic. One-click setup.

### 2. Don't Skip Automatic Rollups

**Avoid:** Requiring manual setup for every rollup.

**Why:** Slow setup. Inconsistent. Hard to maintain.

**Instead:** Automatic rollup rules. KPI packs define rollups. Template includes rollup logic.

### 3. Don't Make Rollups Manual Conventions

**Avoid:** No standard rollup logic. Teams develop manual conventions.

**Why:** Inconsistent. Can't trust. Poor governance.

**Instead:** Standard rollup rules in KPI packs. Enforced logic. No variation.

### 4. Don't Hide Rollup Configuration

**Avoid:** Rollup logic buried in widget settings or filters.

**Why:** Hard to find. Inconsistent setup.

**Instead:** Rollup rules in KPI packs. Clear configuration. Reusable definitions.

### 5. Don't Make Rollups Same for All Roles

**Avoid:** Same rollup logic for workspace owner and team member.

**Why:** Too much or too little data. Poor user experience.

**Instead:** Role-based rollups. Workspace owner sees workspace rollup. Org admin sees org rollup.

### 6. Don't Require Manual Column Matching

**Avoid:** Must manually match columns across boards.

**Why:** Time-consuming. Error-prone.

**Instead:** Automatic matching. Standard column names in templates. Enforced structure.

---

## Key Takeaways for Zephix

### What to Build

1. **Automatic Rollups**
   - KPI packs define rollup rules
   - Automatic rollup across projects
   - No manual filter work
   - Template includes rollup logic

2. **Role-Based Rollups**
   - Workspace owner dashboard: delivery health, capacity, risk, financials, exceptions (workspace rollup)
   - Org admin dashboard: rollup across workspaces with drilldown (org rollup)
   - No manual filter work
   - Automatic aggregation

3. **Standard Rollup Rules**
   - What rolls up cleanly: defined in KPI packs
   - Standard formulas, no variation
   - Enforced logic
   - No manual conventions

4. **Template Integration**
   - Templates include rollup logic
   - Standard column names enable automatic matching
   - KPI packs wire rollups automatically
   - No manual configuration

5. **Cross-Object Aggregation**
   - Projects roll up to workspace
   - Workspaces roll up to org
   - Automatic, not manual
   - Role-based views

### What to Avoid

1. **Manual Filter Setup**
   - Don't require manual configuration
   - Automatic rollup rules

2. **No Standard Rules**
   - Don't allow manual conventions
   - Enforced rollup logic

3. **Hidden Configuration**
   - Don't bury rollup logic
   - KPI packs define rollups

4. **Same for All Roles**
   - Don't show same rollup to all
   - Role-based aggregation

5. **Manual Column Matching**
   - Don't require manual matching
   - Automatic via standard names

6. **Manual Conventions**
   - Don't rely on manual conventions
   - Enforced standards

---

## Implementation Priority

1. **Automatic rollups:**
   - KPI packs define rollup rules
   - Automatic rollup to workspace and org level
   - Role-based dashboards

2. **Standard rollup rules:**
   - What rolls up cleanly (defined)
   - Standard formulas
   - Enforced logic

3. **Role-based aggregation:**
   - Workspace owner sees workspace rollup
   - Org admin sees org rollup
   - No manual filters

4. **Template integration:**
   - Templates include rollup logic
   - Standard column names
   - Automatic matching

---

*Research Date: January 2026*
*Source: Monday.com documentation, cross-board rollups, dashboard filters, aggregation*
