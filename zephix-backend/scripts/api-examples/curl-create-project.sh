#!/bin/bash

# Zephix Project Creation API Example
# This script demonstrates how to create a project using the Zephix API

set -e

# Configuration
BASE_URL="http://localhost:3000"
EMAIL="test@example.com"
PASSWORD="testpassword"
PROJECT_NAME="My Test Project"
PROJECT_DESCRIPTION="A test project created via API"
START_DATE="2025-01-15"
END_DATE="2025-06-30"

echo "🚀 Zephix Project Creation API Example"
echo "======================================"

# Step 1: Login and get access token
echo "📝 Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .accessToken // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful! Token: ${ACCESS_TOKEN:0:20}..."

# Step 2: Create project template
echo "📝 Step 2: Creating project template..."
cat > /tmp/project_request.json << EOF
{
  "name": "$PROJECT_NAME",
  "description": "$PROJECT_DESCRIPTION",
  "startDate": "$START_DATE",
  "estimatedEndDate": "$END_DATE",
  "priority": "medium",
  "status": "planning",
  "methodology": "agile"
}
EOF

# Step 3: Create project
echo "📝 Step 3: Creating project..."
PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  --data-binary @/tmp/project_request.json)

echo "📊 Project Creation Response:"
echo "$PROJECT_RESPONSE" | jq '.'

# Step 4: List projects
echo "📝 Step 4: Listing projects..."
PROJECTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/projects" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "📊 Projects List Response:"
echo "$PROJECTS_RESPONSE" | jq '.'

# Cleanup
rm -f /tmp/project_request.json

echo "✅ API example completed successfully!"
