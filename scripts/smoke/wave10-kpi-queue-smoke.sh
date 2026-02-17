#!/usr/bin/env bash
###############################################################################
# Wave 10 Staging Smoke Test — KPI Queue & BullMQ Compute Pipeline
#
# Tests: compute status endpoint, enqueue, response shape, auth guards.
#
# Usage:
#   bash scripts/smoke/wave10-kpi-queue-smoke.sh [BASE_URL]
#
# Env vars:
#   SMOKE_TOKEN / SMOKE_EMAIL / SMOKE_PASSWORD
###############################################################################
set -euo pipefail

BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
WAVE_NAME="wave10"
source "$(dirname "$0")/lib/smoke-common.sh"

###############################################################################
log "Wave 10 KPI Queue Smoke — $BASE_URL"
log "Proof dir: $PROOF_DIR"

# 1. Health + Identity
smoke_health_check
smoke_identity_check

# 2. Auth
smoke_auth

# 3. Get workspace
smoke_get_workspace

###############################################################################
# 4. Get a project ID
###############################################################################
log "Get project for compute test"
resp=$(apicurl GET /projects)
parse_response "$resp"
save_proof "projects-list" "$RESP_BODY"

PROJ_ID=$(echo "$RESP_BODY" | json_unwrap | python3 -c "
import sys,json
d=json.load(sys.stdin)
ps = d.get('projects', d if isinstance(d,list) else [])
print(ps[0]['id'] if ps else '')
" 2>/dev/null || echo "")

if [ -n "$PROJ_ID" ]; then
  pass "Project: $PROJ_ID"
else
  fail "No projects found" "Cannot test compute without a project"
  summary
  exit 1
fi

###############################################################################
# 5. Unauthenticated access check
###############################################################################
log "Unauthenticated GET compute/status"
UNAUTH_HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute/status" 2>/dev/null)
if [ "$UNAUTH_HTTP" = "401" ]; then
  pass "GET compute/status without token -> 401"
elif [ "$UNAUTH_HTTP" = "403" ]; then
  pass "GET compute/status without token -> 403 (CSRF guard)"
else
  fail "Unauth GET status" "expected 401/403, got $UNAUTH_HTTP"
fi

###############################################################################
# 6. MEMBER Auth: GET compute/status -> 200
###############################################################################
log "GET compute/status (authenticated)"
resp=$(apicurl GET "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute/status")
parse_response "$resp"
save_proof "compute-status" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ]; then
  pass "GET compute/status: http=200"
else
  fail "GET compute/status" "http=$RESP_HTTP"
fi

###############################################################################
# 7. Status response shape validation
###############################################################################
log "Validate status response shape"
STATUS_DATA=$(echo "$RESP_BODY" | json_unwrap)

HAS_PENDING=$(echo "$STATUS_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if 'pending' in d else 'false')" 2>/dev/null || echo "false")
HAS_JOBID=$(echo "$STATUS_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if 'jobId' in d else 'false')" 2>/dev/null || echo "false")
HAS_LAST_COMPUTED=$(echo "$STATUS_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if 'lastComputedAt' in d else 'false')" 2>/dev/null || echo "false")
HAS_LAST_FAILURE=$(echo "$STATUS_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if 'lastFailure' in d else 'false')" 2>/dev/null || echo "false")

[ "$HAS_PENDING" = "true" ] && pass "Status has 'pending' field" || fail "Missing 'pending'" "in status response"
[ "$HAS_JOBID" = "true" ] && pass "Status has 'jobId' field" || fail "Missing 'jobId'" "in status response"
[ "$HAS_LAST_COMPUTED" = "true" ] && pass "Status has 'lastComputedAt' field" || fail "Missing 'lastComputedAt'" "in status response"
[ "$HAS_LAST_FAILURE" = "true" ] && pass "Status has 'lastFailure' field" || fail "Missing 'lastFailure'" "in status response"

###############################################################################
# 8. POST compute enqueue (if KPI_ASYNC_RECOMPUTE_ENABLED)
###############################################################################
log "POST compute enqueue"
resp=$(apicurl POST "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute")
parse_response "$resp"
save_proof "compute-enqueue" "$RESP_BODY"

if [ "$RESP_HTTP" = "202" ]; then
  pass "POST compute: http=202 (async enqueued)"
elif [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; then
  pass "POST compute: http=$RESP_HTTP (sync compute or feature flag off)"
elif [ "$RESP_HTTP" = "404" ]; then
  warn "POST compute" "http=404 (compute POST route may not be on this controller)"
else
  fail "POST compute" "http=$RESP_HTTP body=$(echo "$RESP_BODY" | head -c 200)"
fi

###############################################################################
# 9. Check status after enqueue
###############################################################################
log "GET compute/status after enqueue (check pending state)"
sleep 2
resp=$(apicurl GET "/work/workspaces/$WS_ID/projects/$PROJ_ID/kpis/compute/status")
parse_response "$resp"
save_proof "compute-status-after" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ]; then
  PENDING=$(echo "$RESP_BODY" | json_unwrap | python3 -c "import sys,json; print(json.load(sys.stdin).get('pending','?'))" 2>/dev/null || echo "?")
  pass "Status after enqueue: pending=$PENDING"
else
  warn "Status after enqueue" "http=$RESP_HTTP"
fi

###############################################################################
# 10. Redis check note
###############################################################################
log "Redis / BullMQ check"
skip "Redis connectivity" "Requires server-side inspection (check deploy logs for BullMQ worker startup)"

###############################################################################
summary
