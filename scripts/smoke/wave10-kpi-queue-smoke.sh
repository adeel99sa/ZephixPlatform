#!/usr/bin/env bash
# Wave 10 — KPI Queue & BullMQ Topology Smoke Test
# Usage: bash scripts/smoke/wave10-kpi-queue-smoke.sh https://staging-api.example.com/api
#
# Required env vars:
#   SMOKE_TOKEN         - JWT for an authenticated workspace MEMBER user
#   SMOKE_TOKEN_VIEWER  - JWT for a VIEWER/guest user in the same workspace (optional but recommended)
#   WS_ID               - valid workspace UUID
#   PROJ_ID             - valid project UUID in that workspace
#   RESOURCE_ID         - valid resource UUID for allocation event test
#
# Server env flags that must be true:
#   KPI_ASYNC_RECOMPUTE_ENABLED=true
set -euo pipefail

BASE="${1:?Usage: $0 <api-base-url>}"
TOKEN="${SMOKE_TOKEN:?Set SMOKE_TOKEN (workspace MEMBER JWT)}"
TOKEN_VIEWER="${SMOKE_TOKEN_VIEWER:-}"
WS_ID="${WS_ID:?Set WS_ID (workspace UUID)}"
PROJ_ID="${PROJ_ID:?Set PROJ_ID (project UUID)}"
RESOURCE_ID="${RESOURCE_ID:?Set RESOURCE_ID (resource UUID for allocation test)}"
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"
CSRF_COOKIE="Cookie: XSRF-TOKEN=smoke-csrf"
CSRF_HEADER="X-CSRF-Token: smoke-csrf"
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }
warn() { echo "  ⚠️  $1"; }

echo "=== Wave 10 KPI Queue Smoke ==="
echo "Base: $BASE"
echo "Workspace: $WS_ID"
echo "Project: $PROJ_ID"
echo "Resource: $RESOURCE_ID"
echo ""

# ─── 1. Security: Unauth checks ──────────────────────────────────────────────
echo "--- Step 1: Security — Unauth Checks ---"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "$CSRF_COOKIE" -H "$CSRF_HEADER" \
  "$BASE/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute")
[ "$HTTP" = "401" ] && ok "POST compute without token → 401" || fail "POST compute unauth → $HTTP (expected 401)"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute/status")
[ "$HTTP" = "401" ] && ok "GET status without token → 401" || fail "GET status unauth → $HTTP (expected 401)"

# ─── 2. MEMBER auth: POST compute → 202 ──────────────────────────────────────
echo ""
echo "--- Step 2: MEMBER Auth — POST compute → 202 ---"

BODY=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "$AUTH" -H "$CSRF_COOKIE" -H "$CSRF_HEADER" \
  "$BASE/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute")
HTTP=$(echo "$BODY" | tail -1)
RESP=$(echo "$BODY" | head -n -1)
if [ "$HTTP" = "202" ]; then
  CORR=$(echo "$RESP" | jq -r '.data.correlationId // .correlationId // empty')
  JOB=$(echo "$RESP" | jq -r '.data.jobId // .jobId // empty')
  ok "POST compute (MEMBER) → 202 (correlationId=$CORR, jobId=$JOB)"
else
  fail "POST compute (MEMBER) → $HTTP (expected 202). Body: $(echo "$RESP" | head -c 200)"
fi

# ─── 3. MEMBER auth: GET status → 200 ────────────────────────────────────────
echo ""
echo "--- Step 3: MEMBER Auth — GET status → 200 ---"

BODY=$(curl -s -w "\n%{http_code}" \
  -H "$AUTH" \
  "$BASE/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute/status")
HTTP=$(echo "$BODY" | tail -1)
RESP=$(echo "$BODY" | head -n -1)
if [ "$HTTP" = "200" ]; then
  PENDING=$(echo "$RESP" | jq -r '.data.pending // .pending // empty')
  ok "GET status (MEMBER) → 200 (pending=$PENDING)"
else
  fail "GET status (MEMBER) → $HTTP (expected 200)"
fi

# ─── 4. VIEWER auth: POST compute → 403 ──────────────────────────────────────
echo ""
echo "--- Step 4: VIEWER Auth — POST compute → 403 ---"

if [ -n "$TOKEN_VIEWER" ]; then
  VIEWER_AUTH="Authorization: Bearer $TOKEN_VIEWER"

  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "$VIEWER_AUTH" -H "$CSRF_COOKIE" -H "$CSRF_HEADER" \
    "$BASE/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute")
  [ "$HTTP" = "403" ] && ok "POST compute (VIEWER) → 403" || fail "POST compute (VIEWER) → $HTTP (expected 403)"

  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "$VIEWER_AUTH" \
    "$BASE/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute/status")
  [ "$HTTP" = "200" ] && ok "GET status (VIEWER) → 200 (read access allowed)" || \
    [ "$HTTP" = "403" ] && ok "GET status (VIEWER) → 403 (viewer blocked from status)" || \
    fail "GET status (VIEWER) → $HTTP (expected 200 or 403)"
else
  warn "SMOKE_TOKEN_VIEWER not set — skipping VIEWER 403 assertions"
  warn "Set SMOKE_TOKEN_VIEWER to validate viewer/guest role blocking"
fi

# ─── 5. Allocation event: create → triggers recompute-all ─────────────────────
echo ""
echo "--- Step 5: Allocation Event (create with RESOURCE_ID) ---"

ALLOC_BODY=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "$AUTH" -H "$CT" -H "$CSRF_COOKIE" -H "$CSRF_HEADER" \
  -d "{
    \"resourceId\": \"$RESOURCE_ID\",
    \"projectId\": \"$PROJ_ID\",
    \"allocationPercentage\": 25,
    \"startDate\": \"2026-03-01\",
    \"endDate\": \"2026-06-30\"
  }" \
  "$BASE/work/resources/allocations")
ALLOC_HTTP=$(echo "$ALLOC_BODY" | tail -1)
ALLOC_RESP=$(echo "$ALLOC_BODY" | head -n -1)
if [ "$ALLOC_HTTP" = "201" ] || [ "$ALLOC_HTTP" = "200" ]; then
  ALLOC_ID=$(echo "$ALLOC_RESP" | jq -r '.data.id // .id // empty')
  ok "Allocation created → $ALLOC_HTTP (id=$ALLOC_ID)"
  echo "     Verify server logs: ALLOCATION_CREATED → enqueueProjectRecomputeAll"

  # Check status after allocation to see if pending changed
  sleep 2
  STATUS_AFTER=$(curl -s -H "$AUTH" \
    "$BASE/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute/status")
  PENDING_AFTER=$(echo "$STATUS_AFTER" | jq -r '.data.pending // .pending // empty')
  echo "     Status after allocation: pending=$PENDING_AFTER"
else
  fail "Allocation create → $ALLOC_HTTP (expected 200 or 201). Body: $(echo "$ALLOC_RESP" | head -c 200)"
  warn "Check RESOURCE_ID is valid and user has allocation create permission"
fi

# ─── 6. Status response shape ────────────────────────────────────────────────
echo ""
echo "--- Step 6: Status Response Shape ---"

STATUS=$(curl -s -H "$AUTH" \
  "$BASE/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute/status")

# Handle both wrapped (.data) and unwrapped response shapes
DATA=$(echo "$STATUS" | jq 'if has("data") then .data else . end')

HAS_PENDING=$(echo "$DATA" | jq 'has("pending")')
HAS_JOB_ID=$(echo "$DATA" | jq 'has("jobId")')
HAS_LAST_COMPUTED=$(echo "$DATA" | jq 'has("lastComputedAt")')
HAS_LAST_FAILURE=$(echo "$DATA" | jq 'has("lastFailure")')

[ "$HAS_PENDING" = "true" ] && ok "Status has 'pending' field" || fail "Missing 'pending' in status"
[ "$HAS_JOB_ID" = "true" ] && ok "Status has 'jobId' field" || fail "Missing 'jobId' in status"
[ "$HAS_LAST_COMPUTED" = "true" ] && ok "Status has 'lastComputedAt' field" || fail "Missing 'lastComputedAt' in status"
[ "$HAS_LAST_FAILURE" = "true" ] && ok "Status has 'lastFailure' field" || fail "Missing 'lastFailure' in status"

# ─── 7. Feature flag disabled note ───────────────────────────────────────────
echo ""
echo "--- Step 7: Feature Flag Disabled Behavior ---"
warn "Manual staging check: set KPI_ASYNC_RECOMPUTE_ENABLED=false"
warn "  POST compute → should return 200 (sync compute) not 202"
warn "  GET status → pending=false, no jobs enqueued"

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
