#!/bin/bash
set -e

export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzMyMGVkMy01OGJhLTRkNDItODg2Ny03ZmZjNTJiMzk5MjUiLCJlbWFpbCI6ImFkbWluQHRlbXBsYXRlLXByb29mcy50ZXN0Iiwib3JnYW5pemF0aW9uSWQiOiI2ZjIyNTRhMC03N2U4LTRkZGMtODNiMi0yYjJhMDc1MTFiNjQiLCJyb2xlIjoiYWRtaW4iLCJwbGF0Zm9ybVJvbGUiOiJBRE1JTiIsImlhdCI6MTc2ODU0ODgwMSwiZXhwIjoxNzY4NTUyNDAxfQ.cDgd2M__6UW-fisQvCTQke3InaVhmUgnmbISus9f7aE"
export OWNER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkMWRiMTUxNi1mNjQ0LTRhMTQtODBiNi1mMDA1NjAyMGNmOTciLCJlbWFpbCI6Im93bmVyQHRlbXBsYXRlLXByb29mcy50ZXN0Iiwib3JnYW5pemF0aW9uSWQiOiI2ZjIyNTRhMC03N2U4LTRkZGMtODNiMi0yYjJhMDc1MTFiNjQiLCJyb2xlIjoicG0iLCJwbGF0Zm9ybVJvbGUiOiJNRU1CRVIiLCJpYXQiOjE3Njg1NDg4MDEsImV4cCI6MTc2ODU1MjQwMX0.XYl9EcleEHmpHqtFHOjTZjbqDv2cv_U0tbdFSBO7BWM"
export MEMBER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZWRlYjA5Yi05ZjEwLTRkMzktYTY3YS0zY2Q5M2QxOTZlMmEiLCJlbWFpbCI6Im1lbWJlckB0ZW1wbGF0ZS1wcm9vZnMudGVzdCIsIm9yZ2FuaXphdGlvbklkIjoiNmYyMjU0YTAtNzdlOC00ZGRjLTgzYjItMmIyYTA3NTExYjY0Iiwicm9sZSI6InBtIiwicGxhdGZvcm1Sb2xlIjoiTUVNQkVSIiwiaWF0IjoxNzY4NTQ4ODAxLCJleHAiOjE3Njg1NTI0MDF9.Inw9vNucStXgWLZNUmkxng-yh5M5LMEP-Ze_-e3iZR8"
export WORKSPACE_ID="ad81dadf-af55-42ed-9b00-903aab7ce0ec"
export API_BASE="http://localhost:3000/api"

echo "=== Step 2A: Admin list templates (no workspace) ==="
curl -v -X GET "$API_BASE/templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  2>&1 | tee /tmp/step-2a-response.txt | grep -E "(< HTTP|templateScope|SYSTEM|ORG|x-workspace-id)" || true

echo ""
echo "=== Step 2B: Owner list templates (with workspace) ==="
curl -v -X GET "$API_BASE/templates" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  2>&1 | tee /tmp/step-2b-response.txt | grep -E "(< HTTP|templateScope|WORKSPACE|x-workspace-id)" || true

echo ""
echo "=== Step 3: Create ORG template (Admin, no workspace header) ==="
curl -v -X POST "$API_BASE/templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test ORG Template '$(date +%s)'",
    "kind": "project",
    "templateScope": "ORG",
    "structure": {
      "phases": [{
        "name": "Phase 1",
        "reportingKey": "PLAN",
        "sortOrder": 1,
        "tasks": [{"title": "Task 1", "status": "TODO", "sortOrder": 1}]
      }]
    },
    "defaultEnabledKPIs": ["schedule_variance"]
  }' \
  2>&1 | tee /tmp/step-3-response.txt | grep -E "(< HTTP|templateScope|workspaceId|x-workspace-id)" || true

echo ""
echo "=== Step 4: Create WORKSPACE template (Owner, with workspace header) ==="
curl -v -X POST "$API_BASE/templates" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test WORKSPACE Template '$(date +%s)'",
    "kind": "project",
    "templateScope": "WORKSPACE",
    "structure": {
      "phases": [{
        "name": "Phase 1",
        "reportingKey": "PLAN",
        "sortOrder": 1,
        "tasks": [{"title": "Task 1", "status": "TODO", "sortOrder": 1}]
      }]
    },
    "defaultEnabledKPIs": ["schedule_variance"]
  }' \
  2>&1 | tee /tmp/step-4-response.txt | grep -E "(< HTTP|templateScope|workspaceId|x-workspace-id)" || true

echo ""
echo "=== Step 5: Member try create ORG (should 403) ==="
curl -v -X POST "$API_BASE/templates" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Member ORG Template",
    "kind": "project",
    "templateScope": "ORG"
  }' \
  2>&1 | tee /tmp/step-5a-response.txt | grep -E "(< HTTP|403|Forbidden)" || true

echo ""
echo "=== Step 5: Member try create WORKSPACE (should 403) ==="
curl -v -X POST "$API_BASE/templates" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Member WORKSPACE Template",
    "kind": "project",
    "templateScope": "WORKSPACE"
  }' \
  2>&1 | tee /tmp/step-5b-response.txt | grep -E "(< HTTP|403|Forbidden)" || true

echo ""
echo "✅ API test script complete. Check /tmp/step-*-response.txt files for full output."

echo ""
echo "=== Step 6: Get template for structure editing ==="
TEMPLATE_ID=$(curl -s -X GET "$API_BASE/templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" | jq -r '.data[0].id')
echo "Using template ID: $TEMPLATE_ID"

echo ""
echo "=== Step 7: Update structure (add phase, add task) ==="
curl -v -X PATCH "$API_BASE/templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "structure": {
      "phases": [
        {
          "name": "Phase 1",
          "reportingKey": "PLAN",
          "sortOrder": 1,
          "tasks": [
            {"title": "Task 1", "status": "TODO", "sortOrder": 1},
            {"title": "Task 2", "status": "IN_PROGRESS", "sortOrder": 2}
          ]
        },
        {
          "name": "Phase 2",
          "reportingKey": "EXECUTE",
          "sortOrder": 2,
          "tasks": [
            {"title": "Task 3", "status": "TODO", "sortOrder": 1}
          ]
        }
      ]
    }
  }' \
  2>&1 | tee /tmp/step-7-response.txt | grep -E "(< HTTP|phases|tasks)" || true

echo ""
echo "=== Step 8: Update defaultEnabledKPIs ==="
curl -v -X PATCH "$API_BASE/templates/$TEMPLATE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "defaultEnabledKPIs": ["schedule_variance", "budget_variance", "resource_utilization"]
  }' \
  2>&1 | tee /tmp/step-8-response.txt | grep -E "(< HTTP|defaultEnabledKPIs)" || true

echo ""
echo "=== Step 9A: Publish ORG template (Admin) ==="
curl -v -X POST "$API_BASE/templates/$TEMPLATE_ID/publish" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  2>&1 | tee /tmp/step-9a-response.txt | grep -E "(< HTTP|version|publishedAt)" || true

echo ""
echo "=== Step 9B: Publish again (version should increment) ==="
curl -v -X POST "$API_BASE/templates/$TEMPLATE_ID/publish" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  2>&1 | tee /tmp/step-9b-response.txt | grep -E "(< HTTP|version|publishedAt)" || true

echo ""
echo "=== Step 9C: Member try publish (should 403) ==="
curl -v -X POST "$API_BASE/templates/$TEMPLATE_ID/publish" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  2>&1 | tee /tmp/step-9c-response.txt | grep -E "(< HTTP|403|Forbidden)" || true

echo ""
echo "=== Step 10: Instantiate template ==="
WORKSPACE_TEMPLATE_ID=$(curl -s -X GET "$API_BASE/templates" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" | jq -r '.data[] | select(.templateScope == "WORKSPACE") | .id' | head -1)
echo "Using WORKSPACE template ID: $WORKSPACE_TEMPLATE_ID"

curl -v -X POST "$API_BASE/templates/$WORKSPACE_TEMPLATE_ID/instantiate-v5_1" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{"projectName": "UI Test Project From Template"}' \
  2>&1 | tee /tmp/step-10-response.txt | grep -E "(< HTTP|projectId|phaseCount|taskCount)" || true

echo ""
echo "✅ All API tests complete!"
