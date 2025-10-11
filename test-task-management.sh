#!/bin/bash

# Task Management System Test Script
# This script tests the implemented task management features

echo "🧪 Testing Task Management System Implementation"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"

echo -e "\n${YELLOW}1. Checking if backend server is running...${NC}"
if curl -s "$BACKEND_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ Backend server is running${NC}"
else
    echo -e "${RED}❌ Backend server is not running. Please start it with: cd zephix-backend && npm run start:dev${NC}"
    exit 1
fi

echo -e "\n${YELLOW}2. Checking if frontend server is running...${NC}"
if curl -s "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Frontend server is running${NC}"
else
    echo -e "${RED}❌ Frontend server is not running. Please start it with: cd zephix-frontend && npm run dev${NC}"
    exit 1
fi

echo -e "\n${YELLOW}3. Testing API endpoints (requires authentication)...${NC}"
echo "Note: These tests require a valid JWT token. Update the TOKEN variable below."

# Uncomment and add your JWT token here for testing
# TOKEN="your-jwt-token-here"
# 
# if [ -n "$TOKEN" ]; then
#     echo "Testing KPI endpoints..."
#     curl -s -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/kpi/portfolio" | jq . || echo "KPI portfolio endpoint test"
#     curl -s -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/tasks/my-tasks" | jq . || echo "My tasks endpoint test"
#     curl -s -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/resources/my-capacity" | jq . || echo "My capacity endpoint test"
# else
#     echo -e "${YELLOW}⚠️  Skipping API tests - no token provided${NC}"
# fi

echo -e "\n${YELLOW}4. Checking file structure...${NC}"

# Check if all required files exist
REQUIRED_FILES=(
    "zephix-frontend/src/components/tasks/EditTaskModal.tsx"
    "zephix-frontend/src/components/dashboard/ProjectKPIWidget.tsx"
    "zephix-frontend/src/components/dashboard/PortfolioDashboard.tsx"
    "zephix-frontend/src/components/dashboard/MyTasksDashboard.tsx"
    "zephix-backend/src/modules/kpi/kpi.service.ts"
    "zephix-backend/src/modules/kpi/kpi.controller.ts"
    "zephix-backend/src/modules/kpi/kpi.module.ts"
    "zephix-backend/src/modules/resources/services/resource-calculation.service.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
    fi
done

echo -e "\n${YELLOW}5. Manual Testing Checklist${NC}"
echo "Please verify the following in your browser:"
echo "1. Navigate to $FRONTEND_URL"
echo "2. Login with your credentials"
echo "3. Go to a project with tasks"
echo "4. Click the 'Edit' button on any task"
echo "5. Verify the edit modal opens with task data"
echo "6. Update some fields and save"
echo "7. Verify changes are reflected in the task list"
echo "8. Check the dashboard shows role-appropriate view"
echo "9. Verify no console errors in browser dev tools"

echo -e "\n${YELLOW}6. Database Migration Check${NC}"
echo "Make sure to run the database migration:"
echo "1. Connect to Railway: railway connect postgres"
echo "2. Run the SQL from: zephix-backend/src/migrations/add-task-resource-fields.sql"

echo -e "\n${GREEN}🎉 Test script completed!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Run the database migration"
echo "2. Test the manual checklist above"
echo "3. Check browser console for any errors"
echo "4. Verify all features work as expected"

echo -e "\n${YELLOW}For detailed implementation info, see: TASK_MANAGEMENT_IMPLEMENTATION_SUMMARY.md${NC}"



