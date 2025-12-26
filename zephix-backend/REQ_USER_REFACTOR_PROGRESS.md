# Request User Refactor Progress

## ✅ Completed (2 files)

1. **resources.controller.ts** - Fixed all 20+ violations
2. **resource-allocation.controller.ts** - Fixed all 7 violations

## 🔄 Remaining (118 violations across ~30 files)

### High Priority (Controllers with most violations)
- `billing/controllers/billing.controller.ts` (~15 violations)
- `organizations/controllers/organizations.controller.ts` (~12 violations)
- `brd/controllers/brd.controller.ts` (~20 violations)
- `pm/controllers/ai-pm-assistant.controller.ts` (~11 violations)
- `workflows/controllers/workflow-templates.controller.ts` (~6 violations)

### Medium Priority
- `modules/templates/controllers/template.controller.ts`
- `modules/tasks/tasks.controller.ts`
- `modules/auth/auth.controller.ts`
- `modules/analytics/controllers/analytics.controller.ts`
- `modules/kpi/kpi.controller.ts`
- `pm/risk-management/risk-management.controller.ts`
- `pm/project-initiation/project-initiation.controller.ts`
- `pm/controllers/status-reporting.controller.ts`
- `ai/*.controller.ts` (multiple files)
- `modules/signals/controllers/signals.controller.ts`
- `modules/workspaces/workspaces.controller.ts`

### Low Priority (Non-controllers)
- `architecture/architecture.controller.ts` (may need special handling)
- `modules/tenancy/tenant-context.interceptor.ts` (interceptor - may need exception)
- `middleware/tenant.middleware.ts` (middleware - may need exception)
- `observability/logger.config.ts` (config - may need exception)
- `app.module.ts` (module - comment only)

## Pattern to Apply

For each controller method:
1. Change `@Req() req: any` → `@Req() req: AuthRequest`
2. Replace `req.user?.id` → `const { userId } = getAuthContext(req)`
3. Replace `req.user?.organizationId` → `const { organizationId } = getAuthContext(req)`
4. Replace `req.user?.email` → `const { email } = getAuthContext(req)`
5. Replace `req.user?.role` → `const { platformRole } = getAuthContext(req)`

## ESLint Rule Status

✅ Rule active and catching violations
✅ Helper file excluded from rule
✅ Rule set to `error` (not warning)

## Next Steps

1. Fix billing controller (high usage)
2. Fix organizations controller (high usage)
3. Fix templates/tasks controllers (medium usage)
4. Fix remaining PM/AI controllers
5. Add integration test for missing user context
6. Make ESLint rule blocking in CI

