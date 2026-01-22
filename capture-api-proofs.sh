#!/bin/bash
# API Proof Capture Script for Template Implementation
# Run this after: migration applied, server running, test users created

set -e

# Configuration - UPDATE THESE VALUES
BASE_URL="http://localhost:3000"
ADMIN_TOKEN="YOUR_ADMIN_TOKEN_HERE"
WORKSPACE_OWNER_TOKEN="YOUR_WORKSPACE_OWNER_TOKEN_HERE"
MEMBER_TOKEN="YOUR_MEMBER_TOKEN_HERE"
WORKSPACE_ID="YOUR_WORKSPACE_UUID_HERE"
DIFFERENT_WORKSPACE_ID="YOUR_DIFFERENT_WORKSPACE_UUID_HERE"

echo "=== API Proof Capture for Template Implementation ==="
echo ""

# Proof 1: Admin creates ORG template, no x-workspace-id
echo "Proof 1: Admin creates ORG template (no x-workspace-id)"
echo "Request:"
echo "POST $BASE_URL/api/templates"
echo "Headers: Authorization: Bearer \$ADMIN_TOKEN"
echo "Body: {\"name\": \"Test ORG Template\", \"templateScope\": \"ORG\"}"
echo ""
curl -X POST "$BASE_URL/api/templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test ORG Template", "templateScope": "ORG"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Response (raw):"
echo ""
echo "---"
echo ""

# Proof 2: Workspace Owner creates WORKSPACE template
echo "Proof 2: Workspace Owner creates WORKSPACE template"
echo "Request:"
echo "POST $BASE_URL/api/templates"
echo "Headers: Authorization: Bearer \$WORKSPACE_OWNER_TOKEN, x-workspace-id: \$WORKSPACE_ID"
echo "Body: {\"name\": \"Test WORKSPACE Template\", \"templateScope\": \"WORKSPACE\"}"
echo ""
curl -X POST "$BASE_URL/api/templates" \
  -H "Authorization: Bearer $WORKSPACE_OWNER_TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test WORKSPACE Template\", \"templateScope\": \"WORKSPACE\"}" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Response (raw):"
echo ""
echo "---"
echo ""

# Proof 3: Member tries to create template
echo "Proof 3: Member tries to create template (should fail)"
echo "Request:"
echo "POST $BASE_URL/api/templates"
echo "Headers: Authorization: Bearer \$MEMBER_TOKEN"
echo "Body: {\"name\": \"Test Template\", \"templateScope\": \"ORG\"}"
echo ""
curl -X POST "$BASE_URL/api/templates" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Template", "templateScope": "ORG"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Response (raw):"
echo ""
echo "---"
echo ""

# Proof 4: List templates without x-workspace-id
echo "Proof 4: List templates without x-workspace-id"
echo "Request:"
echo "GET $BASE_URL/api/templates"
echo "Headers: Authorization: Bearer \$ADMIN_TOKEN"
echo ""
curl -X GET "$BASE_URL/api/templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Response (raw):"
echo ""
echo "---"
echo ""

# Proof 5: List templates with x-workspace-id
echo "Proof 5: List templates with x-workspace-id"
echo "Request:"
echo "GET $BASE_URL/api/templates"
echo "Headers: Authorization: Bearer \$ADMIN_TOKEN, x-workspace-id: \$WORKSPACE_ID"
echo ""
curl -X GET "$BASE_URL/api/templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-workspace-id: $WORKSPACE_ID" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Response (raw):"
echo ""
echo "---"
echo ""

# Proof 6: Publish template twice
echo "Proof 6: Publish template twice (version should increment)"
TEMPLATE_ID="YOUR_TEMPLATE_ID_HERE"
echo "Request 1:"
echo "POST $BASE_URL/api/templates/$TEMPLATE_ID/publish"
echo "Headers: Authorization: Bearer \$ADMIN_TOKEN"
echo ""
echo "First publish:"
curl -X POST "$BASE_URL/api/templates/$TEMPLATE_ID/publish" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.data.version' || echo "Response (raw):"
echo ""
echo "Second publish:"
curl -X POST "$BASE_URL/api/templates/$TEMPLATE_ID/publish" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.data.version' || echo "Response (raw):"
echo ""
echo "---"
echo ""

# Proof 7: Instantiate WORKSPACE template from wrong workspace
echo "Proof 7: Instantiate WORKSPACE template from wrong workspace"
WORKSPACE_TEMPLATE_ID="YOUR_WORKSPACE_TEMPLATE_ID_HERE"
echo "Request:"
echo "POST $BASE_URL/api/templates/$WORKSPACE_TEMPLATE_ID/instantiate-v5_1"
echo "Headers: Authorization: Bearer \$ADMIN_TOKEN, x-workspace-id: \$DIFFERENT_WORKSPACE_ID"
echo "Body: {\"projectName\": \"Test Project\"}"
echo ""
curl -X POST "$BASE_URL/api/templates/$WORKSPACE_TEMPLATE_ID/instantiate-v5_1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-workspace-id: $DIFFERENT_WORKSPACE_ID" \
  -H "Content-Type: application/json" \
  -d '{"projectName": "Test Project"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Response (raw):"
echo ""
echo "---"
echo ""

# Proof 8: Legacy instantiate route
echo "Proof 8: Legacy instantiate route (should return 410)"
echo "Request:"
echo "POST $BASE_URL/api/templates/$TEMPLATE_ID/instantiate"
echo "Headers: Authorization: Bearer \$ADMIN_TOKEN"
echo "Body: {\"workspaceId\": \"...\", \"projectName\": \"Test\"}"
echo ""
curl -X POST "$BASE_URL/api/templates/$TEMPLATE_ID/instantiate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "test", "projectName": "Test"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Response (raw):"
echo ""
echo "=== Proof Capture Complete ==="
