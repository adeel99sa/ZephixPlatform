#!/bin/bash

echo "🔒 APPLYING WORKSPACE VALIDATION TO ALL CONTROLLERS"
echo "=================================================="

# List of critical controllers to protect first
CRITICAL_CONTROLLERS=(
    "zephix-backend/src/modules/workspaces/workspaces.controller.ts"
    "zephix-backend/src/modules/users/controllers/users.controller.ts"
    "zephix-backend/src/modules/teams/teams.controller.ts"
    "zephix-backend/src/modules/files/files.controller.ts"
    "zephix-backend/src/modules/kpi/kpi.controller.ts"
    "zephix-backend/src/modules/analytics/analytics.controller.ts"
    "zephix-backend/src/modules/templates/controllers/template.controller.ts"
    "zephix-backend/src/modules/work-items/work-item.controller.ts"
    "zephix-backend/src/modules/admin/admin.controller.ts"
    "zephix-backend/src/modules/commands/controllers/command.controller.ts"
)

PROTECTED_COUNT=0
TOTAL_ENDPOINTS=0

for controller in "${CRITICAL_CONTROLLERS[@]}"; do
    if [ -f "$controller" ]; then
        echo "Processing: $controller"
        
        # Check if already has WorkspaceValidationGuard
        if grep -q "WorkspaceValidationGuard" "$controller"; then
            echo "  ✅ Already protected"
            continue
        fi
        
        # Add import if not present
        if ! grep -q "WorkspaceValidationGuard" "$controller"; then
            # Find the line with JwtAuthGuard import
            if grep -q "JwtAuthGuard" "$controller"; then
                sed -i.bak '/import.*JwtAuthGuard/a\
import { WorkspaceValidationGuard } from "../../guards/workspace-validation.guard";
' "$controller"
            else
                # Add at the top after other imports
                sed -i.bak '1i\
import { WorkspaceValidationGuard } from "../../guards/workspace-validation.guard";
' "$controller"
            fi
        fi
        
        # Add to @UseGuards decorator
        if grep -q "@UseGuards.*JwtAuthGuard" "$controller"; then
            sed -i.bak 's/@UseGuards(JwtAuthGuard)/@UseGuards(JwtAuthGuard, WorkspaceValidationGuard)/g' "$controller"
        elif grep -q "@Controller" "$controller"; then
            # Add @UseGuards decorator after @Controller
            sed -i.bak '/@Controller/a\
@UseGuards(JwtAuthGuard, WorkspaceValidationGuard)
' "$controller"
        fi
        
        # Count endpoints in this controller
        endpoint_count=$(grep -c "@Get\|@Post\|@Put\|@Delete\|@Patch" "$controller" 2>/dev/null || echo "0")
        TOTAL_ENDPOINTS=$((TOTAL_ENDPOINTS + endpoint_count))
        PROTECTED_COUNT=$((PROTECTED_COUNT + 1))
        
        echo "  ✅ Protected $endpoint_count endpoints"
    else
        echo "  ❌ File not found: $controller"
    fi
done

echo ""
echo "📊 PROGRESS REPORT"
echo "=================="
echo "Controllers protected: $PROTECTED_COUNT"
echo "Endpoints protected: $TOTAL_ENDPOINTS"
echo ""

# Check remaining unprotected controllers
REMAINING=$(find zephix-backend/src -name "*.controller.ts" -exec grep -L "WorkspaceValidationGuard" {} \; | wc -l)
echo "Remaining unprotected controllers: $REMAINING"

if [ $REMAINING -gt 0 ]; then
    echo ""
    echo "⚠️  WARNING: $REMAINING controllers still unprotected"
    echo "Critical controllers that need protection:"
    find zephix-backend/src -name "*.controller.ts" -exec grep -L "WorkspaceValidationGuard" {} \; | head -10
fi
