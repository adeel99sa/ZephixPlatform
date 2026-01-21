#!/bin/bash
# MVP Readiness Verification Script
# Run this before MVP testers

set -e

echo "=== MVP Readiness Verification ==="
echo ""
echo "Running from: $(pwd)"
echo ""

ERRORS=0
WARNINGS=0

# 1. Check API client consistency
echo "1. Checking API client imports..."
API_IMPORTS=$(grep -r "import.*api.*from" zephix-frontend/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l | xargs)
echo "   Found $API_IMPORTS API import statements"

# Check for multiple API clients
if grep -r "from.*lib/api" zephix-frontend/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -q "client"; then
  echo "   ⚠️  WARNING: Multiple API clients detected (services/api.ts and lib/api/client.ts)"
  WARNINGS=$((WARNINGS + 1))
else
  echo "   ✓ Single API client pattern"
fi

# 2. Check workspace header in interceptor
echo ""
echo "2. Checking workspace header propagation..."
if grep -q "x-workspace-id" zephix-frontend/src/services/api.ts 2>/dev/null; then
  echo "   ✓ x-workspace-id header found in interceptor"
else
  echo "   ✗ x-workspace-id header missing"
  ERRORS=$((ERRORS + 1))
fi

# 3. Check backend role enforcement
echo ""
echo "3. Checking KPI endpoint role guards..."
if grep -q "RequireWorkspaceRole.*workspace_member" zephix-backend/src/modules/projects/projects.controller.ts 2>/dev/null; then
  echo "   ✓ Role guard found on KPI PATCH endpoint"
else
  echo "   ✗ Role guard missing"
  ERRORS=$((ERRORS + 1))
fi

# 4. Check migration file
echo ""
echo "4. Checking migration file..."
if [ -f "zephix-backend/src/migrations/1789000000000-AddActiveKpiIdsToProjects.ts" ]; then
  echo "   ✓ Migration file exists"
else
  echo "   ✗ Migration file missing"
  ERRORS=$((ERRORS + 1))
fi

# 5. Check entity field
echo ""
echo "5. Checking Project entity for activeKpiIds..."
if grep -q "activeKpiIds\|active_kpi_ids" zephix-backend/src/modules/projects/entities/project.entity.ts 2>/dev/null; then
  echo "   ✓ activeKpiIds field found"
else
  echo "   ✗ activeKpiIds field missing"
  ERRORS=$((ERRORS + 1))
fi

# 6. Check template instantiation sets activeKpiIds
echo ""
echo "6. Checking template instantiation sets activeKpiIds..."
if grep -q "activeKpiIds.*defaultEnabledKPIs" zephix-backend/src/modules/templates/services/templates-instantiate-v51.service.ts 2>/dev/null; then
  echo "   ✓ Template instantiation sets activeKpiIds from defaultEnabledKPIs"
else
  echo "   ✗ Template instantiation missing activeKpiIds assignment"
  ERRORS=$((ERRORS + 1))
fi

# 7. Check My Work uses WorkTask
echo ""
echo "7. Checking My Work service uses WorkTask..."
if grep -q "WorkTask\|workTaskRepository" zephix-backend/src/modules/work-items/services/my-work.service.ts 2>/dev/null; then
  echo "   ✓ My Work service uses WorkTask"
else
  echo "   ✗ My Work service still uses WorkItem"
  ERRORS=$((ERRORS + 1))
fi

# 8. Check all task endpoints use /work/tasks
echo ""
echo "8. Checking frontend task endpoints..."
LEGACY_ENDPOINTS=$(grep -r "/tasks\|/projects/.*/tasks" zephix-frontend/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v ".backup" | grep -v "taskService\|TaskList\|CreateTaskForm\|EditTaskModal\|TaskManagement\|ProjectDetailPage" | wc -l | xargs)
if [ "$LEGACY_ENDPOINTS" -gt 0 ]; then
  echo "   ⚠️  WARNING: Found $LEGACY_ENDPOINTS potential legacy endpoint usages"
  WARNINGS=$((WARNINGS + 1))
else
  echo "   ✓ No legacy /tasks endpoints found"
fi

# 9. Check workspace guard component exists
echo ""
echo "9. Checking WorkspaceGuard component..."
if [ -f "zephix-frontend/src/components/WorkspaceGuard.tsx" ]; then
  echo "   ✓ WorkspaceGuard component exists"
else
  echo "   ⚠️  WARNING: WorkspaceGuard component not found"
  WARNINGS=$((WARNINGS + 1))
fi

# 10. Check dashboard endpoints exist
echo ""
echo "10. Checking dashboard endpoints..."
if [ -f "zephix-backend/src/modules/dashboards/controllers/project-dashboard.controller.ts" ]; then
  echo "   ✓ Project dashboard controller exists"
else
  echo "   ✗ Project dashboard controller missing"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "=== Verification Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ All critical checks passed!"
  if [ $WARNINGS -gt 0 ]; then
    echo "⚠️  $WARNINGS warnings found - review recommended"
  fi
  exit 0
else
  echo "❌ $ERRORS critical errors found - fix before MVP testing"
  exit 1
fi
