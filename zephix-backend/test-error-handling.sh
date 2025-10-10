#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Database Error Handling"
echo "=================================="

# Get auth token
echo -e "\n${YELLOW}Step 1: Getting auth token...${NC}"
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"adeel99sa@yahoo.com","password":"ReAdY4wK73967#!@"}' | \
  jq -r '.data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get auth token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Got auth token${NC}"

# Test 1: Unique Constraint Violation (409)
echo -e "\n${YELLOW}Step 2: Testing unique constraint violation (should return 409)...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:3000/api/test/unique-violation \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Body:"
echo "$BODY" | jq '.'

if [ "$HTTP_CODE" = "409" ]; then
  echo -e "${GREEN}✅ Test 1 PASSED: Got 409 Conflict${NC}"
  MESSAGE=$(echo "$BODY" | jq -r '.message')
  if [[ "$MESSAGE" == *"already exists"* ]]; then
    echo -e "${GREEN}✅ Friendly message confirmed${NC}"
  fi
else
  echo -e "${RED}❌ Test 1 FAILED: Expected 409, got $HTTP_CODE${NC}"
fi

# Test 2: Check Constraint Violation (422)
echo -e "\n${YELLOW}Step 3: Testing check constraint violation (should return 422)...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:3000/api/test/check-violation \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Body:"
echo "$BODY" | jq '.'

if [ "$HTTP_CODE" = "422" ]; then
  echo -e "${GREEN}✅ Test 2 PASSED: Got 422 Unprocessable Entity${NC}"
  MESSAGE=$(echo "$BODY" | jq -r '.message')
  if [[ "$MESSAGE" == *"between 0 and 150"* ]]; then
    echo -e "${GREEN}✅ Friendly message confirmed${NC}"
  fi
else
  echo -e "${RED}❌ Test 2 FAILED: Expected 422, got $HTTP_CODE${NC}"
fi

# Test 3: Foreign Key Violation (400)
echo -e "\n${YELLOW}Step 4: Testing foreign key violation (should return 400)...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:3000/api/test/fk-violation \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Body:"
echo "$BODY" | jq '.'

if [ "$HTTP_CODE" = "400" ]; then
  echo -e "${GREEN}✅ Test 3 PASSED: Got 400 Bad Request${NC}"
  MESSAGE=$(echo "$BODY" | jq -r '.message')
  if [[ "$MESSAGE" == *"does not exist"* ]]; then
    echo -e "${GREEN}✅ Friendly message confirmed${NC}"
  fi
else
  echo -e "${RED}❌ Test 3 FAILED: Expected 400, got $HTTP_CODE${NC}"
fi

echo -e "\n${GREEN}=================================="
echo "🎉 Error Handling Tests Complete!"
echo -e "==================================${NC}"