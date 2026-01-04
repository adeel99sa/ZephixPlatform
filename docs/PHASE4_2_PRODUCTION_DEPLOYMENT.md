# Phase 4.2 Dashboard Studio - Production Deployment Guide

## Deployment Status

✅ **Code Deployed**: Commit SHA `215ba84b7b5cf477ca5014f1da41765030d5c78f`  
✅ **commitShaTrusted**: `true` (verified via `/api/version`)  
⏳ **Migration**: Pending manual execution  
⏳ **Verification**: Pending migration completion

## Step 1: Run Migration

**Command**:
```bash
railway run --service zephix-backend -- sh -lc "cd zephix-backend && npm run migration:run"
```

**Expected Output**:
- Migration `Phase4DashboardStudio1767550031000` should appear in executed migrations
- 5 dashboard templates should be seeded (one per organization)

**Verification Query**:
```sql
-- Check templates were seeded
SELECT key, name, persona FROM dashboard_templates WHERE organization_id = '<your-org-id>';

-- Should return 5 rows:
-- exec_overview, pmo_delivery_health, program_rollup, pm_agile_sprint, resource_utilization_conflicts
```

## Step 2: Run Verification Script

**Prerequisites**:
- Migration completed successfully
- Valid credentials for authentication

**Command**:
```bash
export BASE="https://zephix-backend-production.up.railway.app"
export EMAIL="your-email@example.com"  # Optional: set via env var
export PASSWORD="your-password"        # Optional: set via env var
source scripts/auth-login.sh
bash scripts/phase4-dashboard-studio-verify.sh > docs/PHASE4_2_VERIFICATION_OUTPUT.txt 2>&1
```

**Expected Results**:
- ✅ Preflight: commitShaTrusted = true
- ✅ Templates: Listed and activated successfully
- ✅ Dashboard: Created with widgets
- ✅ Analytics Widgets: 3 endpoints return 200
- ✅ AI Copilot: Suggest and generate working

## Step 3: Manual Smoke Tests

Test these endpoints in Swagger UI with `x-workspace-id` header:

1. **GET /api/dashboards/templates** - Should return array of templates
2. **POST /api/dashboards/activate-template** - Body: `{"templateKey": "resource_utilization_conflicts"}` - Should create dashboard
3. **GET /api/dashboards** - Should return list of dashboards
4. **GET /api/dashboards/{id}** - Should return dashboard with widgets
5. **GET /api/analytics/widgets/project-health** - Should return project health data
6. **GET /api/analytics/widgets/resource-utilization?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD** - Should return utilization data
7. **GET /api/analytics/widgets/conflict-trends?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD** - Should return conflict trends
8. **POST /api/ai/dashboards/suggest** - Body: `{"persona": "RESOURCE_MANAGER"}` - Should return templateKey and widgetSuggestions
9. **POST /api/ai/dashboards/generate** - Body: `{"prompt": "Show me resource utilization", "persona": "RESOURCE_MANAGER"}` - Should return dashboard patch

## Step 4: Update Release Log

After verification completes, update `docs/RELEASE_LOG_PHASE4.md`:

1. Mark migration as completed
2. Paste verification script output under "Phase 4.2 Verification Results"
3. Mark manual smoke tests as completed
4. Update final signoff checklist

## Notes

- All analytics widget endpoints require `x-workspace-id` header
- Dashboard templates are seeded per organization (5 templates per org)
- Route order is enforced via CI checks and E2E tests
- Customer-facing UI will be built in Phase 4.3 (browser auth, drag-and-drop, etc.)

