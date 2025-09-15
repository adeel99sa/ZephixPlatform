#!/bin/bash

echo "🔍 Testing Zephix Authentication System"
echo "======================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test health
echo -e "\n1. Testing Backend Health..."
HEALTH=$(curl -s http://localhost:3000/api/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running${NC}"
    exit 1
fi

# Test login with production account
echo -e "\n2. Testing Production Account (adeel99sa@yahoo.com)..."
PROD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "adeel99sa@yahoo.com",
    "password": "ReAdY4wK7!"
  }')

PROD_TOKEN=$(echo $PROD_RESPONSE | jq -r '.accessToken // empty')
if [ ! -z "$PROD_TOKEN" ]; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "   Token: ${PROD_TOKEN:0:20}..."
    echo "   Org ID: $(echo $PROD_RESPONSE | jq -r '.user.organizationId // "Not found"')"
else
    echo -e "${RED}❌ Login failed${NC}"
    echo $PROD_RESPONSE | jq '.'
fi

# Test login with local account
echo -e "\n3. Testing Local Account (working@test.com)..."
LOCAL_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "working@test.com",
    "password": "Test123!@#"
  }')

LOCAL_TOKEN=$(echo $LOCAL_RESPONSE | jq -r '.accessToken // empty')
if [ ! -z "$LOCAL_TOKEN" ]; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "   Token: ${LOCAL_TOKEN:0:20}..."
    echo "   Org ID: $(echo $LOCAL_RESPONSE | jq -r '.user.organizationId // "Not found"')"
    
    # Test project creation
    echo -e "\n4. Testing Project Creation..."
    PROJECT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/projects \
      -H "Authorization: Bearer $LOCAL_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Test Project '"$(date +%s)"'",
        "description": "Testing project creation",
        "status": "PLANNING",
        "startDate": "2025-01-01",
        "endDate": "2025-12-31"
      }')
    
    PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.id // empty')
    if [ ! -z "$PROJECT_ID" ]; then
        echo -e "${GREEN}✅ Project created successfully${NC}"
        echo "   Project ID: $PROJECT_ID"
    else
        echo -e "${RED}❌ Project creation failed${NC}"
        echo $PROJECT_RESPONSE | jq '.'
    fi
    
    # Test get projects
    echo -e "\n5. Testing Get Projects..."
    PROJECTS=$(curl -s -X GET http://localhost:3000/api/projects \
      -H "Authorization: Bearer $LOCAL_TOKEN")
    
    PROJECT_COUNT=$(echo $PROJECTS | jq '. | length // 0')
    echo -e "${GREEN}✅ Retrieved $PROJECT_COUNT projects${NC}"
    
else
    echo -e "${RED}❌ Login failed${NC}"
    echo $LOCAL_RESPONSE | jq '.'
fi

echo -e "\n${GREEN}✨ Test Complete!${NC}"
