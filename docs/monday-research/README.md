# Monday.com Targeted Research

## Overview

This directory contains targeted research on six critical areas of Monday.com's platform, focusing on what works, what breaks at scale, and what Zephix should copy or avoid.

## Research Documents

### 1. [Information Architecture Defaults](./01-information-architecture-defaults.md)
**Focus:** First login experience, empty states, workspace selection, onboarding flow

**Key Findings:**
- Monday.com uses template-first approach but doesn't enforce structure
- Empty states are generic, not role-specific
- No default hierarchy enforced
- Workspace selection can be overwhelming at scale

**Zephix Takeaways:**
- Fixed default hierarchy with enforced structure
- Role-based empty states with two clear actions
- Template-first creation (primary path, not optional)
- Progressive disclosure, not feature overload

---

### 2. [Resource Planning Truth](./02-resource-planning-truth.md)
**Focus:** Capacity management, allocations, workload views, conflict resolution

**Key Findings:**
- Capacity lives in multiple places (not single source of truth)
- Allocations are soft, not enforced (warnings only)
- Resource planning is a feature, not core to platform
- No org-level capacity rules

**Zephix Takeaways:**
- Resource engine as core (not a feature)
- Enforced capacity with hard blocks on over-allocation
- Org-level rules (max utilization, max parallel work, approval thresholds)
- Required inputs (estimates, assignments) enforced

---

### 3. [Template Governance](./03-template-governance.md)
**Focus:** Template versioning, managed templates, updates, drift prevention

**Key Findings:**
- Partial update support (many changes don't propagate)
- No version history or tracking
- Destructive changes don't propagate
- No safe update path for users
- Field/status standardization not enforced

**Zephix Takeaways:**
- Template versioning with version tracking on projects
- Safe "apply updates" path for non-destructive changes
- Field & status standardization enforced
- Automatic drift detection and prevention
- Templates include: work types, required fields, views, KPIs, dashboards, RACI, automations

---

### 4. [KPI Dashboards](./04-kpi-dashboards.md)
**Focus:** KPI definition, configuration, rollups, standardization

**Key Findings:**
- Manual KPI definition for each dashboard
- No KPI packs or templates
- Rollup requires manual configuration
- No KPI governance
- No automatic dashboard generation

**Zephix Takeaways:**
- KPI packs system (definition, calculation, thresholds, rollup rules)
- Automatic dashboard generation (role-based)
- Standard KPI definitions (6 core KPIs to start)
- KPI governance (org-level packs, versioning, approval)
- Template integration (pack selection at instantiation)

---

### 5. [Permissions Model](./05-permissions-model.md)
**Focus:** Org admin vs workspace owner vs member, boundaries, access control

**Key Findings:**
- Permission complexity (too many layers)
- Boundary confusion (unclear responsibilities)
- Custom roles can only restrict, not expand
- No role-based defaults
- No permission templates

**Zephix Takeaways:**
- Simplified permission model (fewer layers, clearer defaults)
- Role-based permission templates (RACI in templates)
- Clear boundaries (documented, obvious in UI)
- Permission enforcement (account permissions as ceiling)
- Template integration (permissions included in templates)

---

### 6. [Cross-Object Rollups](./06-cross-object-rollups.md)
**Focus:** What rolls up cleanly, manual filters, conventions, aggregation

**Key Findings:**
- Manual filter configuration required
- Mirror column limitations in filters
- No automatic rollup rules
- Filter limitations (can't use Mirror/Connect columns in "All boards" filter)
- No standard rollup conventions
- No role-based rollups

**Zephix Takeaways:**
- Automatic rollups (KPI packs define rules)
- Role-based rollups (workspace owner vs org admin)
- Standard rollup rules (what rolls up cleanly defined)
- Template integration (rollup logic in templates)
- No manual filter work required

---

## Research Methodology

Each document follows this structure:
1. **What They Do** - How Monday.com handles the topic
2. **What Breaks at Scale** - Problems that emerge as organizations grow
3. **What You Should Copy** - Good patterns to adopt
4. **What You Should Avoid** - Anti-patterns to avoid
5. **Key Takeaways for Zephix** - Specific recommendations
6. **Implementation Priority** - Suggested order of implementation

## Common Themes Across Research

### What Monday.com Does Well
- Visual, intuitive interface
- Flexible customization
- Rich widget library
- Multi-level boards with rollups
- Column matching across boards

### What Breaks at Scale
- Manual configuration everywhere
- No enforcement of standards
- Optional features become unused
- Inconsistent data structures
- Governance becomes impossible

### What Zephix Should Do Better

1. **Be Opinionated**
   - Ship an operating model, not a blank canvas
   - Fixed default hierarchy and naming
   - Standard statuses per work type
   - Required fields per template
   - Guardrails enforced in UI and API

2. **Make Resources First Class**
   - Resource engine as core (not a feature)
   - Enforced capacity with hard blocks
   - Org-level rules
   - Required inputs

3. **Templates Deploy Systems**
   - Templates include: work types, required fields, views, KPIs, dashboards, RACI, automations
   - Instantiation produces: project, plan, roles, dashboards, KPI wiring, reporting
   - No manual setup required

4. **KPI Lego Blocks**
   - KPI packs with definition, calculation, thresholds, rollup rules
   - Default widgets and dashboard placement
   - Org level overrides and workspace level tuning
   - Setup becomes selection

5. **Automatic Rollups**
   - Workspace owner dashboard: workspace rollup
   - Org admin dashboard: org rollup with drilldown
   - No manual filter work
   - Role-based aggregation

6. **Reduce Configuration Surface**
   - Fewer knobs, more defaults
   - Only expose configuration when it changes a decision, report, or permission boundary
   - Templates handle most configuration

## Implementation Roadmap

Based on this research, the priority order is:

### A. Lock the MVP Loop End to End
1. Home: Clear empty state with 2 actions (select workspace, create project)
2. Workspace selection: One source of truth, one place to manage
3. Template center: Primary create project action, clear modal flow, strong success navigation
4. Project overview: Open plan always visible and reliable
5. Plan view: Shows phases and tasks with predictable loading and empty states

### B. Add First Version of Resource Reality
1. Minimal first release:
   - Roles, capacity per person, simple availability calendar
   - Task estimates required for template tasks
   - Roll up estimates by role and by assignee in plan view
   - Over-allocation warnings at assignment time
2. One decision rule:
   - Block hard assignment if exceeds capacity
   - Allow soft assignment with warning

### C. Release KPI Pack v1 Tied to Templates
1. Start with 6 KPIs:
   - On-time rate
   - Overdue aging
   - Scope change count
   - Capacity utilization
   - Risk count by severity
   - Health score composite
2. Add pack selection at template instantiation:
   - Default pack auto-attaches
3. Generate dashboards automatically:
   - Workspace owner dashboard always exists and stays consistent

### D. Governance and Drift Control
1. Template versioning:
   - Track template version on each instantiated project
   - Provide safe "apply updates" path for non-destructive changes
2. Field and status standardization enforcement:
   - Restrict uncontrolled field creation for non-admins
   - Promote field reuse via catalog

## Where Zephix Is Today

### Ahead Already
- Building a governed MVP path (Template Center → project instantiation → plan view)
- Programs and portfolios hidden behind feature flag
- Real proof mindset with network artifacts and manual proof checklists
- Removing early friction (Home loads without workspace selection)
- Workspace dropdown and selection logic getting corrected
- Treating platform as org system (org features via auth me, route gating driven by org settings)

### Behind Today
- Deep permission matrix and sharing controls (Monday/ClickUp have this)
- Mature dashboards with many widget types
- Automations ecosystem and integrations breadth
- Rich notification and activity systems
- Docs, comments, attachments, audit trails at scale
- Extensive template libraries and marketplace effects

### Biggest Current Gap
- **Resource engine is not yet the primary truth source**
  - Allocation, constraints, and forecasting need to sit inside the plan flow
- **KPI lego system is not yet productized**
  - Packs, wiring, rollups, thresholds, and governance need to exist as a system

## Next Steps

1. Review each research document
2. Prioritize implementation based on roadmap
3. Design solutions that address gaps while avoiding Monday.com's scale problems
4. Build opinionated defaults that enforce best practices
5. Make resources and KPIs first-class, not optional features

---

*Research Date: January 2026*
*Research Focus: Targeted analysis of Monday.com's platform at scale*
