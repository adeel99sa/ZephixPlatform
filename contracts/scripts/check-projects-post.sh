#!/usr/bin/env bash
set -euo pipefail
BASE="http://localhost:3000"
USER="demo@zephix.ai"
PASS="demo123456"

TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$USER\",\"password\":\"$PASS\"}" | jq -r '.accessToken')
[ "$TOKEN" != "null" ]

STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/projects" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"X"}')
if [ "$STATUS" != "400" ]; then echo "Expected 400 missing workspaceId"; exit 1; fi
echo "Contracts ok"
