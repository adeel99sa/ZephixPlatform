#!/usr/bin/env bash
###############################################################################
# Wave 8 Staging Smoke Test - Portfolio & Program Rollups
#
# Tests: Portfolio CRUD, Program CRUD, guard read mode,
#        rollup endpoint (feature-flag gated).
#
# Usage:
#   bash scripts/smoke/wave8-portfolio-rollup-smoke.sh [BASE_URL]
#
# Env vars:
#   SMOKE_TOKEN / SMOKE_EMAIL / SMOKE_PASSWORD
###############################################################################
set -euo pipefail

BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
WAVE_NAME="wave8"
source "$(dirname "$0")/lib/smoke-common.sh"

###############################################################################
log "Wave 8 Portfolio & Program Rollup Smoke - $BASE_URL"
log "Proof dir: $PROOF_DIR"

# 1. Health + Identity
smoke_health_check
smoke_identity_check

# 2. Auth
smoke_auth

# 3. Get workspace
smoke_get_workspace

###############################################################################
# 4. GET /portfolios - read mode (was 403 before guard fix)
###############################################################################
log "GET /portfolios (read mode)"
resp=$(apicurl GET "/workspaces/$WS_ID/portfolios")
parse_response "$resp"
check_401_drift "GET /portfolios"
save_proof "portfolios-list" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ]; then
  pass "GET /portfolios: http=200 (read mode works)"
elif [ "$RESP_HTTP" = "403" ]; then
  fail "GET /portfolios" "http=403 - guard read mode still broken"
  summary
else
  fail "GET /portfolios" "http=$RESP_HTTP"
fi

###############################################################################
# 5. POST /portfolios - create portfolio
###############################################################################
log "Create portfolio"
resp=$(apicurl POST "/workspaces/$WS_ID/portfolios" \
  -d "{\"name\":\"Smoke Portfolio $(date +%s)\",\"description\":\"Wave 8 test\"}")
parse_response "$resp"
check_401_drift "POST /portfolios"
save_proof "portfolio-create" "$RESP_BODY"

PORTFOLIO_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
if [ -n "$PORTFOLIO_ID" ] && { [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; }; then
  pass "Portfolio created: $PORTFOLIO_ID"
else
  fail "Portfolio create" "http=$RESP_HTTP id=$PORTFOLIO_ID"
fi

###############################################################################
# 6. GET /portfolios/:id - single portfolio read
###############################################################################
if [ -n "$PORTFOLIO_ID" ]; then
  log "GET /portfolios/:id"
  resp=$(apicurl GET "/workspaces/$WS_ID/portfolios/$PORTFOLIO_ID")
  parse_response "$resp"
  check_401_drift "GET /portfolios/:id"
  save_proof "portfolio-detail" "$RESP_BODY"

  if [ "$RESP_HTTP" = "200" ]; then
    pass "GET /portfolios/:id: http=200"
  else
    fail "GET /portfolios/:id" "http=$RESP_HTTP"
  fi
fi

###############################################################################
# 7. GET /programs - read mode
###############################################################################
log "GET /programs (read mode)"
resp=$(apicurl GET "/workspaces/$WS_ID/programs")
parse_response "$resp"
check_401_drift "GET /programs"
save_proof "programs-list" "$RESP_BODY"

if [ "$RESP_HTTP" = "200" ]; then
  pass "GET /programs: http=200 (read mode works)"
elif [ "$RESP_HTTP" = "403" ]; then
  fail "GET /programs" "http=403 - guard read mode still broken"
else
  fail "GET /programs" "http=$RESP_HTTP"
fi

###############################################################################
# 8. POST /portfolios/:id/programs - create program (scoped under portfolio)
###############################################################################
if [ -n "$PORTFOLIO_ID" ]; then
  log "Create program under portfolio $PORTFOLIO_ID"
  resp=$(apicurl POST "/workspaces/$WS_ID/portfolios/$PORTFOLIO_ID/programs" \
    -d "{\"portfolioId\":\"$PORTFOLIO_ID\",\"name\":\"Smoke Program $(date +%s)\",\"description\":\"Wave 8 test\"}")
  parse_response "$resp"
  check_401_drift "POST /programs"
  save_proof "program-create" "$RESP_BODY"

  PROGRAM_ID=$(echo "$RESP_BODY" | json_unwrap | json_field "id")
  if [ -n "$PROGRAM_ID" ] && { [ "$RESP_HTTP" = "200" ] || [ "$RESP_HTTP" = "201" ]; }; then
    pass "Program created: $PROGRAM_ID"
  else
    warn "Program create" "http=$RESP_HTTP (route: POST /portfolios/:id/programs)"
  fi
else
  skip "Program create" "no portfolio to nest program under"
fi

###############################################################################
# 9. Portfolio KPI rollup - feature-flag gated
###############################################################################
if [ -n "$PORTFOLIO_ID" ]; then
  log "GET /portfolios/:id/kpis/rollup (feature-flag gated)"
  TODAY=$(date +%Y-%m-%d)
  resp=$(apicurl GET "/workspaces/$WS_ID/portfolios/$PORTFOLIO_ID/kpis/rollup?asOf=$TODAY")
  parse_response "$resp"
  save_proof "portfolio-kpi-rollup" "$RESP_BODY"

  if [ "$RESP_HTTP" = "200" ]; then
    pass "Portfolio rollup: http=200 (flag enabled)"
  elif [ "$RESP_HTTP" = "404" ]; then
    skip "Portfolio rollup" "http=404 - blocked by flag PORTFOLIO_KPI_ROLLUP_ENABLED (expected)"
    save_proof "portfolio-rollup-flag-disabled" "$RESP_BODY" ".txt"
  else
    fail "Portfolio rollup" "http=$RESP_HTTP"
  fi
else
  skip "Portfolio rollup" "no portfolio created"
fi

###############################################################################
summary
