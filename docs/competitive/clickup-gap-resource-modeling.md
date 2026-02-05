# ClickUp Gap: Resource Modeling Failures

## Where Customers Lose Trust

**Answer:** Customers lose trust when estimates, workloads, and assignees produce inconsistent, unreliable numbers that don't match reality.

## The Failure Points

### 1. Estimate Roll-Up Failures

**Problem:**
- Subtask time estimates don't roll up into parent tasks properly
- Workload views show under-reported total expected hours
- Leads to overcommitment without visibility

**Customer Impact:**
- Teams commit to more work than they can deliver
- Missed deadlines due to inaccurate planning
- Distrust in tool's metrics ("numbers don't match reality")

**Where Trust Breaks:**
- PMO can't rely on workload reports for planning
- Delivery leads can't trust capacity calculations
- Teams lose confidence in system accuracy

### 2. Multiple Assignee Math Errors

**Problem:**
- Tasks with multiple assignees count full estimate for each person
- Doesn't divide or proportionally assign
- Inflates totals, doesn't reflect reality

**Customer Impact:**
- Over-allocation appears normal
- True capacity is hidden
- Burnout from invisible overload

**Where Trust Breaks:**
- Resource managers can't trust workload calculations
- Team leads see false capacity
- Executives get inaccurate resource reports

### 3. Workload View Inconsistencies

**Problem:**
- Tasks with estimates and dates show 0 hours in workload view
- Different views (Team, List, etc.) show inconsistent totals
- Filtered views hide actual work

**Customer Impact:**
- Can't see true capacity
- Planning based on wrong numbers
- Manual reconciliation required

**Where Trust Breaks:**
- PMO loses confidence in capacity planning
- Delivery leads can't make reliable commitments
- Teams don't trust the system

### 4. Performance Degradation Under Load

**Problem:**
- Large workspaces (many tasks/subtasks, dashboards, automations) cause sluggish loading
- Slow filter operations in critical views (Timeline, Workload)
- Dashboard complexity degrades performance

**Customer Impact:**
- Can't use system for real-time planning
- Delays in critical workflows
- Frustration and workarounds

**Where Trust Breaks:**
- System becomes unusable at scale
- Teams abandon workload views
- PMO can't get timely reports

## What Zephix Must Do Differently

**Enforce Correctness:**
- Estimates roll up correctly (non-negotiable)
- Multiple assignees handled correctly (proportional allocation)
- Consistent calculations across all views
- Performance doesn't degrade under load

**Make Resources Unavoidable:**
- Cannot assign without checking capacity
- Cannot commit work without consuming capacity
- Over-allocation blocks by default
- Visual warnings in plan view

**Single Source of Truth:**
- Resource engine is core, not a feature
- Capacity calculations are authoritative
- No view-specific inconsistencies
- Performance guaranteed at scale

---

*Research Date: January 2026*
*Focus: Where customers lose trust in ClickUp's resource modeling*
