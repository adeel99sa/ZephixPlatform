# Monday.com Research: Resource Planning Truth

## What They Do

### Capacity & Allocation System

**Workload View & Widget:**
- Visualizes tasks assigned to team members on calendar/timeline
- Shows overloads at a glance with colored indicators
- Requires: People Column (assignments), Date/Timeline Column (scheduling), Time Estimate (Number or Formula Column for weighting)

**Capacity Modes:**
1. **Work Schedule Mode:**
   - Uses team schedule (working days, hours, time off)
   - Computes available capacity automatically
   - Factors in holidays and time off

2. **Custom Mode:**
   - Set capacity without using real hours
   - Can use story points, task counts, or other units
   - Flexible for different estimation methods

**Resource Directory (Enterprise):**
- Central hub for all resources (people)
- Define attributes: role, skills, location, etc.
- Useful for matching resources to tasks
- Supports placeholders for planning

**Resource Planner & Capacity Manager (Enterprise):**
- **Resource Planner:** High-level planning tool
  - Assign team members or placeholders
  - Define effort (hours or %)
  - Customize distribution across timeline
  
- **Capacity Manager:** Aggregated utilization view
  - View across multiple projects
  - Spot overallocation or underutilization
  - Rebalance workload

### Conflict Detection

**Visual Indicators:**
- Colored bubbles in Workload View:
  - Red = over capacity
  - Yellow/Green = at capacity
  - Blue = under capacity
- Flags tasks overlapping beyond capacity thresholds
- Capacity Manager shows overloaded resources clearly

**Detection Logic:**
- Compares assigned work vs available capacity
- Uses work schedule or custom capacity settings
- Factors in effort estimates (hours, story points, etc.)
- Shows conflicts across all projects

### Conflict Resolution

**Tools Provided:**
1. **Drill into View:** Click bubble to see detailed tasks causing overcapacity
2. **Filters:** Isolate problematic resources, roles, skills
3. **Reassign:** Move tasks from overloaded to under-capacity people
4. **Redistribute:** Adjust allocations in Resource Planner/Capacity Manager
5. **Timeline Adjustment:** Push non-urgent tasks later
6. **Placeholders + Smart Assignment:** Plan with roles, then assign best resource based on skills/availability
7. **Capacity Modification:** Adjust work schedule, hours, or time off

**Resolution Workflow:**
- Visual identification → Drill down → Reassign/Adjust → Verify

---

## What Breaks at Scale

### Capacity Lives in Multiple Places

**Problem:** Capacity information is scattered:
- Work schedules defined at account/workspace level
- Allocations live on individual boards/projects
- No single source of truth for "who is available"
- Capacity Manager only available on Enterprise plan

**Impact:**
- Can't see true capacity across all projects
- Overallocations missed until too late
- Manual reconciliation required
- Inconsistent capacity calculations

### Allocations Are Soft, Not Enforced

**Problem:** Allocations are informational, not enforced:
- Can assign someone over capacity without blocking
- No hard stops at assignment time
- Warnings are easy to ignore
- No approval workflow for over-allocation

**Impact:**
- People get overloaded despite warnings
- No accountability for capacity decisions
- Conflicts discovered too late
- Reactive problem-solving instead of proactive planning

### No Allocation Engine at Core

**Problem:** Resource planning is a feature, not core to the platform:
- Capacity calculations happen in views/widgets, not in assignment flow
- Assignments don't check capacity before allowing
- No allocation model in the data layer
- Resource planning feels bolted on

**Impact:**
- Resource planning feels optional
- Teams skip it and work in silos
- No enforcement of capacity rules
- Can't build workflows around allocation

### Input Requirements Not Enforced

**Problem:** Workload views require specific inputs but don't enforce them:
- Time estimates are optional
- Date columns may be missing
- People columns may not exist
- Workload view shows "incomplete data" but doesn't block work

**Impact:**
- Workload views show inaccurate data
- Capacity calculations are wrong
- Users lose trust in resource planning
- Feature becomes unused

### Conflict Resolution Is Manual

**Problem:** No automated conflict resolution:
- All resolution is manual (reassign, adjust timeline)
- No suggestions for optimal reassignment
- No approval workflows
- No escalation paths

**Impact:**
- Conflicts pile up
- Resolution takes too long
- No learning from resolution patterns
- Reactive instead of proactive

### No Org-Level Capacity Rules

**Problem:** No organization-wide capacity policies:
- Can't set max utilization % per role
- No max parallel work limits
- No approval thresholds
- Each project manages capacity independently

**Impact:**
- Inconsistent capacity management
- Some teams overload, others underutilize
- No org-level visibility
- Can't enforce capacity policies

---

## What You Should Copy

### 1. Visual Workload Indicators

**Copy:** Color-coded capacity indicators (red/yellow/green) in workload views.

**Why:** Immediate visual feedback on capacity status. Users can spot problems at a glance.

**Implementation:**
- Real-time capacity calculation
- Color coding: over/at/under capacity
- Click to drill down into details

### 2. Work Schedule Integration

**Copy:** Integrate work schedules into capacity calculations (working days, hours, time off).

**Why:** Accurate capacity requires real availability data.

**Implementation:**
- Work schedules at person/role level
- Holidays and time off factored in
- Automatic capacity calculation

### 3. Resource Directory Concept

**Copy:** Central directory of resources with attributes (role, skills, location, cost rates).

**Why:** Enables smart assignment and resource matching.

**Implementation:**
- Resource catalog with attributes
- Skills matching
- Cost rate tracking
- Availability calendar

### 4. Multi-Project Capacity View

**Copy:** Capacity Manager concept—aggregated view across all projects.

**Why:** Need org-level visibility into capacity utilization.

**Implementation:**
- Rollup capacity across all projects
- Show overallocation/underutilization
- Enable rebalancing

---

## What You Should Avoid

### 1. Don't Make Capacity Optional

**Avoid:** Making capacity calculations optional or easy to skip.

**Why:** If it's optional, teams won't use it. Capacity must be enforced.

**Instead:** Capacity is required. Can't assign without capacity check.

### 2. Don't Scatter Capacity Data

**Avoid:** Having capacity live in multiple places (schedules here, allocations there).

**Why:** No single source of truth. Inconsistent calculations.

**Instead:** Capacity engine is core. Single source of truth for availability and allocations.

### 3. Don't Allow Over-Allocation Without Approval

**Avoid:** Letting users assign over capacity with just a warning.

**Why:** Warnings are ignored. People get overloaded.

**Instead:** Hard block on over-allocation. Approval workflow required.

### 4. Don't Make Inputs Optional

**Avoid:** Making time estimates, dates, assignments optional for workload views.

**Why:** Incomplete data = inaccurate capacity. Feature becomes useless.

**Instead:** Required fields enforced. Can't create task without estimate.

### 5. Don't Keep Resource Planning as a Feature

**Avoid:** Treating resource planning as a view/widget, not core to the platform.

**Why:** Feels bolted on. Teams skip it. No enforcement.

**Instead:** Resource engine is core. Allocations are first-class objects.

### 6. Don't Skip Org-Level Rules

**Avoid:** Only project-level capacity management, no org policies.

**Why:** Inconsistent. Can't enforce org standards.

**Instead:** Org-level capacity rules (max utilization, max parallel work, approval thresholds).

---

## Key Takeaways for Zephix

### What to Build

1. **Resource Engine as Core**
   - Capacity and allocation engine is primary truth source
   - Not a feature, but foundation of the platform
   - Allocations are first-class objects in data model

2. **Enforced Capacity**
   - Availability, skills, cost rates, working calendars required
   - Soft allocation for planning, hard allocation for commitment
   - Block hard assignment if exceeds capacity
   - Allow soft assignment with warning

3. **Conflict Detection & Resolution**
   - Automatic conflict detection at assignment time
   - Resolution flows with approval workflows
   - Suggestions for optimal reassignment
   - Escalation paths

4. **Org-Level Rules**
   - Max utilization % per role
   - Max parallel work limits
   - Approval thresholds
   - Enforced in UI and API

5. **Required Inputs**
   - Task estimates required for template tasks
   - Roll up estimates by role and by assignee in plan view
   - Over-allocation warnings at assignment time
   - Can't create task without required capacity inputs

6. **Allocation in Plan Flow**
   - Allocation, constraints, and forecasting sit inside plan flow
   - Not separate feature, but integrated into planning
   - Capacity visible when assigning tasks

### What to Avoid

1. **Optional Capacity**
   - Don't make capacity optional or easy to skip
   - Enforce capacity checks

2. **Scattered Capacity Data**
   - Don't have capacity in multiple places
   - Single source of truth

3. **Soft Enforcement**
   - Don't allow over-allocation with just warnings
   - Hard blocks with approval workflows

4. **Optional Inputs**
   - Don't make estimates/assignments optional
   - Required fields enforced

5. **Resource Planning as Feature**
   - Don't treat it as view/widget
   - Core to platform

6. **No Org Rules**
   - Don't skip org-level capacity policies
   - Enforce standards

---

## Implementation Priority

1. **Minimal first release:**
   - Roles, capacity per person, simple availability calendar
   - Task estimates required for template tasks
   - Roll up estimates by role and by assignee in plan view
   - Over-allocation warnings at assignment time

2. **One decision rule:**
   - Block hard assignment if exceeds capacity
   - Allow soft assignment with warning

3. **Conflict detection:**
   - Automatic detection at assignment
   - Visual indicators in plan view

4. **Org-level rules:**
   - Max utilization, max parallel work
   - Approval thresholds

---

*Research Date: January 2026*
*Source: Monday.com documentation, resource planning features, capacity management*
