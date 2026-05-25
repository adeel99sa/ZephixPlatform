#!/usr/bin/env bash
###############################################################################
# Sprint 5.2a Phase 5 — frontend-flow API proxy smoke.
#
# Exercises the UI's artifact API call sequence end-to-end (no browser).
# Mirrors sidebar expand → create artifact → load items → auto-save → cleanup.
#
# Usage:
#   STAGING_SMOKE_KEY=<...> SMOKE_EMAIL=pr62verify@zephix.dev \
#   WORKSPACE_ID=<uuid> PROJECT_ID=<uuid> \
#   ./scripts/smoke/test-sprint-5-2-frontend.sh
#
# Optional:
#   API / STAGING_API_URL — host-only backend URL (no /api suffix)
#   CROSS_ORG_PROJECT_ID=<uuid> — project in a different org; Step 9 asserts 404
#   CROSS_ORG_WORKSPACE_ID=<uuid> — workspace header for cross-org probe
###############################################################################
set -uo pipefail

API="${API:-${STAGING_API_URL:-https://zephix-backend-staging-staging.up.railway.app}}"
ENV_NAME="${ENV_NAME:-staging}"
SMOKE_EMAIL="${SMOKE_EMAIL:-pr62verify@zephix.dev}"
WORKSPACE_ID="${WORKSPACE_ID:?WORKSPACE_ID required}"
PROJECT_ID="${PROJECT_ID:?PROJECT_ID required}"
SMOKE_KEY="${STAGING_SMOKE_KEY:?STAGING_SMOKE_KEY required}"
CROSS_ORG_PROJECT_ID="${CROSS_ORG_PROJECT_ID:-}"
CROSS_ORG_WORKSPACE_ID="${CROSS_ORG_WORKSPACE_ID:-}"
TIMESTAMP=$(date +%s)
ARTIFACT_NAME="S52 Frontend Smoke ${TIMESTAMP}"

COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

PASS=0
FAIL=0
SKIP_COUNT=0

pass() { PASS=$((PASS+1)); printf '\033[1;32m  PASS  %s\033[0m\n' "$1"; }
fail() { FAIL=$((FAIL+1)); printf '\033[1;31m  FAIL  %s — %s\033[0m\n' "$1" "${2:-}"; }
skip() { SKIP_COUNT=$((SKIP_COUNT+1)); printf '\033[1;33m  SKIP  %s — %s\033[0m\n' "$1" "${2:-}"; }
section() { printf '\n\033[1;34m━━━ %s ━━━\033[0m\n' "$1"; }

json_field() { python3 -c "import sys,json
d=json.load(sys.stdin)
if isinstance(d,dict) and 'data' in d and isinstance(d['data'],dict): d=d['data']
v=d
for k in '$1'.split('.'):
  v=v.get(k) if isinstance(v,dict) else None
  if v is None: break
print(v if v is not None else '${2:-}')"; }

section "Step 0: smoke-login as $SMOKE_EMAIL"
curl -s -c "$COOKIE_JAR" "$API/api/auth/csrf" -H "x-zephix-env: $ENV_NAME" -o /tmp/csrf-s52.json
CSRF=$(python3 -c "import json;print(json.load(open('/tmp/csrf-s52.json'))['csrfToken'])")
if [ -z "$CSRF" ]; then fail "csrf" "no token"; exit 1; fi

LOGIN_HTTP=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$API/api/auth/smoke-login" \
  -H "Content-Type: application/json" -H "x-zephix-env: $ENV_NAME" \
  -H "x-smoke-key: $SMOKE_KEY" -H "X-CSRF-Token: $CSRF" \
  -d "{\"email\":\"$SMOKE_EMAIL\"}" -o /dev/null -w "%{http_code}")
if [ "$LOGIN_HTTP" = "204" ] || [ "$LOGIN_HTTP" = "200" ]; then
  pass "smoke-login (HTTP $LOGIN_HTTP)"
else
  fail "smoke-login" "HTTP $LOGIN_HTTP"; exit 1
fi

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$API/api/auth/csrf" -H "x-zephix-env: $ENV_NAME" -o /tmp/csrf-s52.json
CSRF=$(python3 -c "import json;print(json.load(open('/tmp/csrf-s52.json'))['csrfToken'])")

apicurl() {
  local method="$1" path="$2"; shift 2
  curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
    -H "x-zephix-env: $ENV_NAME" -H "X-CSRF-Token: $CSRF" \
    -H "Content-Type: application/json" -H "x-workspace-id: $WORKSPACE_ID" \
    -X "$method" "$API$path" "$@"
}

section "Step 1: GET artifacts list (sidebar expand proxy)"
LIST_RESP=$(apicurl GET "/api/projects/$PROJECT_ID/artifacts")
HTTP=$(echo "$LIST_RESP" | tail -1 | sed 's/HTTP=//')
if [ "$HTTP" = "200" ]; then pass "GET artifacts (HTTP 200)"; else fail "GET artifacts" "HTTP $HTTP"; fi

section "Step 2: POST artifact from built-in type (Add artifact flow)"
CREATE_RESP=$(apicurl POST "/api/projects/$PROJECT_ID/artifacts" \
  -d "{\"type\":\"risk_register\",\"name\":\"$ARTIFACT_NAME\"}")
HTTP=$(echo "$CREATE_RESP" | tail -1 | sed 's/HTTP=//')
BODY=$(echo "$CREATE_RESP" | sed '$d')
if [ "$HTTP" != "201" ]; then fail "POST artifact" "HTTP $HTTP body=$BODY"; exit 1; fi
ARTIFACT_ID=$(echo "$BODY" | json_field "id")
if [ -n "$ARTIFACT_ID" ]; then pass "POST artifact (id=${ARTIFACT_ID:0:8}…)"; else fail "POST artifact" "missing id"; fi

section "Step 3: GET items (ArtifactPage load proxy)"
ITEMS_RESP=$(apicurl GET "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID/items")
HTTP=$(echo "$ITEMS_RESP" | tail -1 | sed 's/HTTP=//')
if [ "$HTTP" = "200" ]; then pass "GET items (HTTP 200)"; else fail "GET items" "HTTP $HTTP"; fi

section "Step 4: POST item with customFieldValues"
ITEM_RESP=$(apicurl POST "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID/items" \
  -d '{"name":"Smoke item","customFieldValues":{"probability":"Medium","impact":"High","risk_score":6}}')
HTTP=$(echo "$ITEM_RESP" | tail -1 | sed 's/HTTP=//')
BODY=$(echo "$ITEM_RESP" | sed '$d')
ITEM_ID=$(echo "$BODY" | json_field "id")
if [ "$HTTP" = "201" ] && [ -n "$ITEM_ID" ]; then pass "POST item (id=${ITEM_ID:0:8}…)"; else fail "POST item" "HTTP $HTTP"; fi

section "Step 5: PATCH item (auto-save proxy)"
PATCH_RESP=$(apicurl PATCH "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID/items/$ITEM_ID" \
  -d '{"name":"Smoke item updated","customFieldValues":{"probability":"High","impact":"High","risk_score":9}}')
HTTP=$(echo "$PATCH_RESP" | tail -1 | sed 's/HTTP=//')
if [ "$HTTP" = "200" ]; then pass "PATCH item (HTTP 200)"; else fail "PATCH item" "HTTP $HTTP"; fi

section "Step 6: DELETE item (cleanup)"
DEL_ITEM=$(apicurl DELETE "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID/items/$ITEM_ID")
HTTP=$(echo "$DEL_ITEM" | tail -1 | sed 's/HTTP=//')
if [ "$HTTP" = "204" ]; then pass "DELETE item (HTTP 204)"; else fail "DELETE item" "HTTP $HTTP"; fi

section "Step 7: DELETE artifact (cleanup)"
DEL_ART=$(apicurl DELETE "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID")
HTTP=$(echo "$DEL_ART" | tail -1 | sed 's/HTTP=//')
if [ "$HTTP" = "204" ]; then pass "DELETE artifact (HTTP 204)"; else fail "DELETE artifact" "HTTP $HTTP"; fi

section "Step 8: Cross-tenant isolation — foreign project returns 404"
if [ -z "$CROSS_ORG_PROJECT_ID" ]; then
  skip "cross-tenant isolation" "CROSS_ORG_PROJECT_ID not set"
else
  WS_HDR="${CROSS_ORG_WORKSPACE_ID:-$WORKSPACE_ID}"
  CROSS=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
    -H "x-zephix-env: $ENV_NAME" -H "X-CSRF-Token: $CSRF" \
    -H "Content-Type: application/json" -H "x-workspace-id: $WS_HDR" \
    -X GET "$API/api/projects/$CROSS_ORG_PROJECT_ID/artifacts")
  HTTP=$(echo "$CROSS" | tail -1 | sed 's/HTTP=//')
  BODY=$(echo "$CROSS" | sed '$d')
  if [ "$HTTP" = "404" ]; then
    pass "cross-tenant GET artifacts returns 404 (no partial data)"
  else
    fail "cross-tenant isolation" "HTTP $HTTP body=$BODY (expected 404)"
  fi
fi

printf '\n\033[1;34m═══════════════════════════════════════════════════\033[0m\n'
printf '\033[1;34m Sprint 5.2 Frontend Smoke — PASS=%d FAIL=%d SKIP=%d\033[0m\n' "$PASS" "$FAIL" "$SKIP_COUNT"
printf '\033[1;34m═══════════════════════════════════════════════════\033[0m\n'
if [ "$FAIL" -gt 0 ]; then exit 1; fi
exit 0
