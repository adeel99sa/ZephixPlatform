# Phase 6.1 Dashboard Structure Alignment

## Current Dashboard Module Structure

### Entity Files
- **Dashboard Entity**: `zephix-backend/src/modules/dashboards/entities/dashboard.entity.ts`
  - Class name: `Dashboard` (not `DashboardEntity`)
  - Table: `dashboards`
  - Fields:
    - `id` (uuid, primary)
    - `organizationId` (uuid, indexed) - **Note: uses `organizationId`, not `orgId`**
    - `workspaceId` (uuid, nullable, indexed)
    - `name` (varchar 200)
    - `description` (text, nullable)
    - `ownerUserId` (uuid)
    - `visibility` (enum: PRIVATE, WORKSPACE, ORG) - **Note: different from Phase 6.1 scope model**
    - `isTemplateInstance` (boolean)
    - `templateKey` (varchar 100, nullable)
    - `shareToken` (uuid, nullable, indexed) - **Phase 6.1: disable via flag**
    - `shareEnabled` (boolean) - **Phase 6.1: disable via flag**
    - `shareExpiresAt` (timestamp, nullable)
    - `createdAt`, `updatedAt`, `deletedAt` (soft delete)

- **DashboardWidget Entity**: `zephix-backend/src/modules/dashboards/entities/dashboard-widget.entity.ts`
  - Class name: `DashboardWidget` (not `DashboardWidgetEntity`)
  - Table: `dashboard_widgets`
  - Fields:
    - `id` (uuid, primary)
    - `organizationId` (uuid, indexed)
    - `dashboardId` (uuid, indexed)
    - `widgetKey` (varchar 120)
    - `title` (varchar 200)
    - `config` (jsonb)
    - `layout` (jsonb with x, y, w, h)
    - `createdAt`, `updatedAt`

### Module File
- **Module**: `zephix-backend/src/modules/dashboards/dashboards.module.ts`
  - Class name: `DashboardsModule`
  - Exports: `DashboardsService`

### Service Files
- **Main Service**: `zephix-backend/src/modules/dashboards/services/dashboards.service.ts`
  - Class name: `DashboardsService`
  - Methods: `listDashboards`, `createDashboard`, `getDashboard`, `updateDashboard`, `deleteDashboard`, `addWidget`, `updateWidget`, `deleteWidget`, `enableShare`, `disableShare`, `getSharedDashboard`

### Controller Files
- **Main Controller**: `zephix-backend/src/modules/dashboards/controllers/dashboards.controller.ts`
  - Class name: `DashboardsController`
  - Route prefix: `/api/dashboards`
  - Uses: `JwtAuthGuard`, `OptionalJwtAuthGuard` (for share token access)
  - Uses: `ResponseService` for response formatting
  - Uses: `getAuthContext` helper for auth context

### Migration Pattern
- **Existing Migration**: `zephix-backend/src/migrations/1767550031000-Phase4DashboardStudio.ts`
  - Pattern: `{timestamp}-{Description}.ts`
  - Uses TypeORM `Table`, `TableColumn`, `TableIndex`, `TableForeignKey` builders
  - Creates enum types: `dashboard_visibility AS ENUM ('PRIVATE', 'WORKSPACE', 'ORG')`

### Current Access Model
- Uses `DashboardVisibility` enum (PRIVATE, WORKSPACE, ORG)
- Public share via `shareToken` (read-only, no auth required)
- Workspace scoping via `x-workspace-id` header
- Authorization checks in service layer

## Phase 6.1 Alignment Requirements

### 1. Entity Naming
- Use existing names: `Dashboard`, `DashboardWidget` (not `DashboardEntity`, `DashboardWidgetEntity`)
- New entities: `DashboardShare`, `DashboardExportJob` (follow existing naming pattern)

### 2. Field Naming
- Use `organizationId` (not `orgId`) to match existing pattern
- Keep `workspaceId` nullable
- Add `scope` field (enum: ORG, WORKSPACE) - **Note: different from `visibility` enum**
- Keep existing fields: `ownerUserId`, `name`, `description`, etc.

### 3. Migration Pattern
- Follow timestamp pattern: `1798000000000-DashboardScopeAndShares.ts` (or use actual timestamp)
- Use TypeORM builders like existing migration
- Add enum type: `dashboard_scope AS ENUM ('ORG', 'WORKSPACE')`
- Keep existing `dashboard_visibility` enum (don't remove)

### 4. Service Pattern
- Extend `DashboardsService` or create new services: `DashboardAccessService`, `OrgDashboardsService`, `WorkspaceDashboardsService`
- Use `ResponseService` for response formatting
- Use `getAuthContext` helper for auth context
- Use `WorkspaceAccessService` for workspace checks (already imported in module)

### 5. Controller Pattern
- Create new controllers: `OrgDashboardsController`, `WorkspaceDashboardsController`
- Or extend `DashboardsController` with new routes
- Use `JwtAuthGuard` (not `OptionalJwtAuthGuard` for Phase 6.1 - invite-only)
- Use `DashboardAccessGuard` for access checks
- Use `ResponseService.success()` for responses

### 6. Guard Pattern
- Create: `zephix-backend/src/modules/dashboards/guards/dashboard-access.guard.ts`
- Use `DashboardAccessService` to resolve access
- Set `req.dashboardAccess` for downstream use
- Helper functions: `requireDashboardEdit(req)`, `requireDashboardExport(req)`

### 7. Module Updates
- Add new entities to `TypeOrmModule.forFeature([...])`
- Add new services to `providers: [...]`
- Add new controllers to `controllers: [...]`
- Export `DashboardAccessService` if needed

### 8. Public Share Token Disable
- Add env var: `DASHBOARD_PUBLIC_SHARE_ENABLED=false`
- In `DashboardsController.getById()` share token path:
  ```ts
  if (shareToken) {
    if (process.env.DASHBOARD_PUBLIC_SHARE_ENABLED !== 'true') {
      throw new GoneException({ code: 'PUBLIC_SHARE_DISABLED', message: 'Public share is disabled' });
    }
    // existing share token logic
  }
  ```

## Phase 6.1 File Structure

### New Files to Create
1. `zephix-backend/src/modules/dashboards/domain/dashboard.enums.ts` - Enums (scope, access level, export format, export status)
2. `zephix-backend/src/modules/dashboards/entities/dashboard-share.entity.ts` - DashboardShare entity
3. `zephix-backend/src/modules/dashboards/entities/dashboard-export-job.entity.ts` - DashboardExportJob entity
4. `zephix-backend/src/modules/dashboards/services/dashboard-access.service.ts` - Access resolution service
5. `zephix-backend/src/modules/dashboards/guards/dashboard-access.guard.ts` - Access guard
6. `zephix-backend/src/modules/dashboards/controllers/org-dashboards.controller.ts` - Org dashboard routes
7. `zephix-backend/src/modules/dashboards/controllers/workspace-dashboards.controller.ts` - Workspace dashboard routes (or extend existing)
8. `zephix-backend/src/migrations/1798000000000-DashboardScopeAndShares.ts` - Migration
9. `zephix-backend/test/dashboard-access.e2e-spec.ts` - E2E tests

### Files to Modify
1. `zephix-backend/src/modules/dashboards/entities/dashboard.entity.ts` - Add `scope` field (keep `visibility` for backward compat)
2. `zephix-backend/src/modules/dashboards/dashboards.module.ts` - Register new entities, services, controllers
3. `zephix-backend/src/modules/dashboards/controllers/dashboards.controller.ts` - Add public share disable check

## Key Differences from Phase 6.1 Spec

1. **Entity Names**: Use `Dashboard`, `DashboardWidget` (not `DashboardEntity`, `DashboardWidgetEntity`)
2. **Field Names**: Use `organizationId` (not `orgId`)
3. **Scope vs Visibility**: Add `scope` enum (ORG, WORKSPACE) but keep `visibility` enum (PRIVATE, WORKSPACE, ORG) for backward compatibility
4. **Migration Pattern**: Use TypeORM builders like existing migration
5. **Response Format**: Use `ResponseService.success()` pattern
6. **Auth Context**: Use `getAuthContext(req)` helper

## Phase 6.1 Implementation Checklist

- [ ] Create enums file with scope, access level, export format, export status
- [ ] Update Dashboard entity to add `scope` field (migration)
- [ ] Create DashboardShare entity
- [ ] Create DashboardExportJob entity
- [ ] Create migration for new tables and scope column
- [ ] Create DashboardAccessService with resolveAccess method
- [ ] Create DashboardAccessGuard
- [ ] Create OrgDashboardsController
- [ ] Create/update WorkspaceDashboardsController
- [ ] Update DashboardsModule to register new entities/services/controllers
- [ ] Add public share disable check in DashboardsController
- [ ] Create E2E tests for access model
- [ ] Update frontend API wrappers
- [ ] Create share management UI
- [ ] Add routing for org/workspace dashboards
