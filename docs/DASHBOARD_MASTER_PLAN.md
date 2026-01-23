# Dashboard Master Plan

**Status**: Frozen for Phase 5.1 - Maintenance Only
**Last Updated**: 2026-01-XX
**Scope**: Dashboard Studio v1 and Future Roadmap

## Current State

### Phase 4.2 Backend (Complete)
- Dashboard CRUD APIs with workspace scoping
- Widget allowlist enforcement
- Template activation system
- Analytics widget endpoints (project-health, resource-utilization, conflict-trends)
- AI suggest and generate endpoints
- Share link functionality with token-based access

### Phase 4.3 UI (In Progress/Complete)
- Dashboard list view
- Dashboard view page
- Dashboard builder
- Template gallery
- Share dialog with expiry options
- Public share mode (read-only, no auth required)

### Current Widgets
- Project Health widget
- Resource Utilization widget
- Conflict Trends widget

### Current Features
- Template activation
- AI suggest (persona-based template and widget suggestions)
- AI generate (prompt-based dashboard schema generation)
- Share link with token (read-only public access)

## Dashboard Studio v1 Scope

### Core Features
- **Template Gallery**: Browse and activate pre-built dashboard templates
- **Builder Drag & Drop**: Visual dashboard builder with drag-and-drop widget layout
- **Widget Allowlist**: Server and client enforcement of allowed widget types
- **Workspace Scoped Dashboards**: All dashboards require workspace context
- **Share Link with Token**: Public read-only access via share token
- **Analytics Widgets Read-Only**: Analytics widgets show sign-in required in share mode

### API Endpoints (Frozen)
- `GET /api/dashboards` - List dashboards
- `POST /api/dashboards` - Create dashboard
- `GET /api/dashboards/:id` - Get dashboard (supports share token)
- `PATCH /api/dashboards/:id` - Update dashboard
- `DELETE /api/dashboards/:id` - Delete dashboard
- `GET /api/dashboards/templates` - List templates
- `POST /api/dashboards/activate-template` - Activate template
- `POST /api/dashboards/:id/share-enable` - Enable sharing
- `POST /api/dashboards/:id/share-disable` - Disable sharing
- `POST /api/dashboards/:id/widgets` - Add widget
- `PATCH /api/dashboards/:id/widgets/:widgetId` - Update widget
- `DELETE /api/dashboards/:id/widgets/:widgetId` - Delete widget
- `GET /api/analytics/widgets/project-health` - Project health data
- `GET /api/analytics/widgets/resource-utilization` - Resource utilization data
- `GET /api/analytics/widgets/conflict-trends` - Conflict trends data
- `POST /api/ai/dashboards/suggest` - AI suggest
- `POST /api/ai/dashboards/generate` - AI generate

## Backlog for Dashboards

### A. Widget Library Expansion

**Priority: Medium**

1. **Portfolio Summary Widget**
   - Aggregate metrics across all projects in a portfolio
   - Portfolio-level conflict counts
   - Resource allocation across portfolio

2. **Program Summary Widget**
   - Program-level health metrics
   - Cross-project dependencies
   - Program timeline visualization

3. **Risk Summary Widget**
   - Risk distribution by category
   - Risk trend over time
   - High-risk project identification

4. **Budget Variance Widget**
   - Planned vs actual budget
   - Variance by project
   - Budget trend analysis

5. **Sprint Metrics Widget**
   - Sprint velocity
   - Burndown charts
   - Sprint completion rates

6. **Delivery Throughput Widget**
   - Work items completed per time period
   - Throughput trends
   - Cycle time analysis

7. **Resource Heatmap Widget**
   - Resource allocation heatmap
   - Capacity vs demand visualization
   - Over-allocation alerts

8. **Work in Progress Aging Widget**
   - WIP items by age
   - Aging distribution
   - Blocked work identification

9. **Blocked Work Widget**
   - Blocked items count
   - Blocking reasons
   - Resolution trends

### B. Analytics Foundations

**Priority: High**

1. **Unified Metrics Query Layer**
   - Single API for all metric queries
   - Consistent response format
   - Query optimization

2. **Metric Caching and Precompute**
   - Cache frequently accessed metrics
   - Precompute expensive aggregations
   - TTL-based cache invalidation

3. **Time Series Rollups**
   - Daily, weekly, monthly rollups
   - Efficient time-based queries
   - Historical data retention

4. **Filter Semantics and Consistency**
   - Standardized filter format
   - Date range handling
   - Workspace/project scoping rules

5. **Workspace and Project Scoping Rules**
   - Consistent scoping across all widgets
   - Multi-workspace support
   - Cross-workspace aggregation (future)

### C. Dashboard Permissions

**Priority: Medium**

1. **Role Based Visibility Rules**
   - Platform role integration (ADMIN, MEMBER, VIEWER)
   - Workspace role integration
   - Dashboard-level role checks

2. **Dashboard-Level ACL**
   - Per-dashboard access control
   - User/group permissions
   - Permission inheritance

3. **Viewer Access Without Edit**
   - Read-only dashboard access
   - Viewer role enforcement
   - Edit permission checks

4. **Audit Log for Share Enable/Disable**
   - Log share enable events
   - Log share disable events
   - Track share token usage

### D. AI Dashboard Roadmap

**Priority: Low (Frozen)**

1. **Prompt Templates by Persona**
   - Persona-specific prompt templates
   - Context-aware suggestions
   - Persona-based widget recommendations

2. **Explainability for Suggestions**
   - Why this template was suggested
   - Widget selection reasoning
   - Confidence scores

3. **Validate Generated Widgets Against Allowlist**
   - Server-side validation
   - Client-side validation
   - Error messages for invalid widgets

4. **Store AI Generation Events**
   - Track AI generation requests
   - Store generated schemas
   - Analytics on AI usage

5. **AI Assisted Filter Suggestions**
   - Suggest relevant filters
   - Auto-apply filters based on context
   - Filter recommendations

### E. UX Roadmap

**Priority: Low**

1. **Widget Marketplace View**
   - Browse available widgets
   - Widget previews
   - Widget documentation

2. **Custom Formula Widgets**
   - User-defined formulas
   - Custom calculations
   - Formula validation

3. **Text and Markdown Widget**
   - Rich text widgets
   - Markdown support
   - HTML rendering

4. **Alerts and Subscriptions**
   - Dashboard change alerts
   - Metric threshold alerts
   - Email notifications

5. **Export to PDF**
   - Dashboard PDF export
   - Scheduled reports
   - Custom report templates

6. **Scheduled Email Digest**
   - Daily/weekly digests
   - Customizable content
   - Recipient management

### F. Operational Plan

**Priority: High**

1. **Verification Scripts for Dashboards**
   - ✅ `scripts/phase4-dashboard-studio-verify.sh` (complete)
   - ✅ `scripts/step8-backend-smoke.sh` (complete)
   - Maintenance: Update scripts as needed

2. **Regression Tests for Route Order**
   - ✅ CI checks for route order (complete)
   - Maintenance: Keep checks updated

3. **Seed Templates Per Org**
   - ✅ Templates seeded on org creation (complete)
   - Maintenance: Add new templates as needed

4. **Migration Proof Steps**
   - ✅ Migration verification in release log (complete)
   - Maintenance: Document new migrations

## Definition of Done for Dashboards

### Phase 4.2/4.3 Completion Criteria

- [x] End-to-end verification script passes
- [x] All dashboard endpoints require workspace header unless explicitly public share
- [x] No route shadowing. CI check enforced
- [x] Widget allowlist enforced server and client
- [ ] No P0 errors in production logs for 7 days (pending UAT)

### Maintenance Mode (Phase 5.1)

**Allowed Changes:**
- Bug fixes only
- Security patches
- Performance optimizations
- Documentation updates

**Not Allowed:**
- New dashboard endpoints
- New widget types
- AI feature expansion beyond current suggest/generate
- New dashboard features

### Future Phases

**Phase 6: Dashboards, Reporting, and Analytics (Planned)**
- See Phase 6 sections below for detailed roadmap

## Freeze Rationale

**Why Freeze Dashboards:**
1. Phase 5.1 Work Management System is critical for first customer UAT
2. Dashboard Studio v1 is feature-complete for initial release
3. Focus engineering resources on work management
4. Prevent scope creep and maintain delivery timeline

**When to Unfreeze:**
- After Phase 5.1 Work Management System is UAT-ready
- After Template Center is UAT-ready
- With explicit approval from product/engineering leadership

## Phase 6: Dashboards, Reporting, and Analytics

**Status**: Planned
**Dependencies**: Phase 5.1 UAT complete

### Phase 6.0: Objectives

1. Org and workspace dashboards as first-class entities
2. Invite-only sharing model with explicit access control
3. PDF and Excel exports with job queue
4. Audit logs for view, export, and share events
5. Performance baseline for rollups and aggregations

### Phase 6.1: Foundations and Access Control

**Status**: Planned
**Target**: Dashboard access model and permission layer

#### Deliverables

1. **Dashboard Entities**
   - Dashboard entity with scope (ORG, WORKSPACE)
   - DashboardWidget entity with type and config
   - DashboardShare entity for invite-only access
   - DashboardExportJob entity for async exports

2. **Scope Model**
   - ORG dashboards for executive rollups
   - WORKSPACE dashboards for delivery teams
   - Scope-based permission checks

3. **Permission Layer**
   - Org permissions: `org_dashboards_view`, `org_dashboards_manage`, `org_dashboards_export`
   - Workspace permissions: `workspace_dashboards_view`, `workspace_dashboards_manage`, `workspace_dashboards_export`

4. **Invite-Only Enforcement**
   - Non-admin users require share record for access
   - Viewer share is always view-only
   - Member share is view or edit based on explicit access level
   - Admin and workspace owner bypass share requirement

5. **API Skeleton**
   - Org dashboards: CRUD, shares CRUD, export job create, export job status
   - Workspace dashboards: CRUD, shares CRUD, export job create, export job status

6. **E2E Tests for Access Model**
   - Not invited returns 403
   - Viewer invited returns 200 for GET, 403 for edit and export if not granted
   - Member invited with edit returns 200 for PATCH
   - Admin bypass returns 200

### Phase 6.2: Org Rollups for Exec Reporting

**Status**: Planned
**Dependencies**: Phase 6.1 complete

#### Deliverables

1. **Org Rollup Services**
   - Projects status rollup across all workspaces
   - Resource capacity rollup across all workspaces
   - Risk rollup across all workspaces

2. **Materialized Rollups**
   - Daily snapshots plus on-demand refresh for Admin

3. **Widgets**
   - Org portfolio health
   - Cross-workspace delivery status
   - Resource capacity heatmap
   - Risk exposure summary

4. **Exports**
   - PDF: executive summary layout
   - Excel: raw tables plus charts sheet

### Phase 6.3: Workspace Dashboards for Delivery Teams

**Status**: Planned
**Dependencies**: Phase 6.2 complete

#### Deliverables

1. **Workspace Dashboard Templates**
   - Delivery overview
   - Risks and blockers
   - Capacity and allocation

2. **Widgets**
   - Work items by status
   - Burndown or burnup
   - Blockers list
   - Risks list and heatmap
   - Upcoming milestones

3. **Sharing**
   - Admin and workspace owner create and invite
   - Viewer is view-only
   - Member view or edit by invite level

### Phase 6.4: Export Engine and Report Packs

**Status**: Planned
**Dependencies**: Phase 6.3 complete

#### Deliverables

1. **Export Job Runner**
   - Async job processing
   - Status polling API
   - Error handling and retries

2. **PDF Packs**
   - Org executive pack
   - Workspace delivery pack

3. **Excel Packs**
   - Data sheets plus charts sheet

4. **Audit Logs**
   - Who exported, what, when, scope, filters

### Phase 6.5: Insights and Drilldowns

**Status**: Planned
**Dependencies**: Phase 6.4 complete

#### Deliverables

1. **Insights Panel**
   - Insights panel for dashboards
   - Automated insights generation

2. **Drilldowns**
   - Drilldown from chart to filtered list views
   - Saved filters per widget

3. **Caching Strategy**
   - Caching strategy and invalidation rules
   - Performance optimization

## Related Documents

- `docs/PHASE4_3_IMPLEMENTATION_SUMMARY.md` - Phase 4.3 implementation details
- `docs/RELEASE_LOG_PHASE4.md` - Phase 4 release log
- `docs/STEP8_RUNBOOK.md` - Share functionality runbook
- `docs/PHASE5_1_IMPLEMENTATION_PLAN.md` - Phase 5.1 implementation plan
- `docs/PHASE5_ROADMAP.md` - Phase 5 roadmap

