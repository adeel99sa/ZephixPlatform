#!/usr/bin/env bash
set -euo pipefail

B="${B:-https://zephix-backend-production.up.railway.app}"
EMAIL="${EMAIL:-adeel99sa@yahoo.com}"
PASSWORD="${PASSWORD:-ReAdY4wK73967#!@}"

echo "Base: $B"

LOGIN_JSON=$(curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_JSON" | jq -r '.data.accessToken // .accessToken')
echo "TOKEN len: ${#TOKEN}"

echo "DB ping:"
curl -s -H "Authorization: Bearer $TOKEN" "$B/api/obs/db/ping" | jq .

echo "Entities:"
curl -s -H "Authorization: Bearer $TOKEN" "$B/api/obs/db/entities" | jq '.[0]?, .data?[0]? // .'

echo "KPI portfolio:"
curl -s -H "Authorization: Bearer $TOKEN" "$B/api/kpi/portfolio" | jq .

echo "Projects:"
curl -s -H "Authorization: Bearer $TOKEN" "$B/api/projects" | jq .
