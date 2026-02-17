#!/usr/bin/env bash
###############################################################################
# Shared smoke test helpers for the Zephix backlog sprint.
#
# Usage: source this file from any wave smoke script.
#
#   BASE_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
#   WAVE_NAME="wave5"
#   source "$(dirname "$0")/lib/smoke-common.sh"
#
# Provides:
#   - Dual auth: cookie mode (default) or Bearer mode via SMOKE_TOKEN
#   - CSRF + cookie jar handling
#   - apicurl() — curl wrapper that injects auth automatically
#   - PASS / FAIL / TOTAL counters
#   - pass() / fail() / warn() / skip() helpers
#   - save_proof()   — pretty-print JSON to proof dir
#   - json_field()   — extract a top-level field from JSON
#   - json_count()   — count items in a JSON array
#   - json_pp()      — pretty-print JSON (jq > python3 fallback)
#   - check_401_drift() — stop if cookie/CSRF drifted after login
#   - summary()      — print final score and exit
###############################################################################

set -euo pipefail

: "${BASE_URL:?BASE_URL must be set (positional arg or env)}"
: "${WAVE_NAME:?WAVE_NAME must be set before sourcing smoke-common.sh}"

###############################################################################
# Proof directory
###############################################################################
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
PROOF_DIR="$SCRIPT_DIR/../../docs/architecture/proofs/phase5a/${WAVE_NAME}/rc24"
mkdir -p "$PROOF_DIR"

###############################################################################
# Counters
###############################################################################
PASS=0; FAIL=0; WARN=0; SKIP=0; TOTAL=0

###############################################################################
# Output helpers
###############################################################################
log()    { printf '\033[1;34m[%s]\033[0m %s\n' "$WAVE_NAME" "$*" >&2; }
pass()   { TOTAL=$((TOTAL+1)); PASS=$((PASS+1));  printf '\033[1;32m  PASS  %s\033[0m\n' "$1"; }
fail()   { TOTAL=$((TOTAL+1)); FAIL=$((FAIL+1));  printf '\033[1;31m  FAIL  %s: %s\033[0m\n' "$1" "${2:-}"; }
warn()   { TOTAL=$((TOTAL+1)); WARN=$((WARN+1));  printf '\033[1;33m  WARN  %s: %s\033[0m\n' "$1" "${2:-}"; }
skip()   { TOTAL=$((TOTAL+1)); SKIP=$((SKIP+1));  printf '\033[1;36m  SKIP  %s: %s\033[0m\n' "$1" "${2:-}"; }

###############################################################################
# JSON helpers — prefer jq, fall back to python3
###############################################################################
HAS_JQ=false
command -v jq &>/dev/null && HAS_JQ=true

json_pp() {
  if $HAS_JQ; then
    jq . 2>/dev/null || cat
  else
    python3 -m json.tool 2>/dev/null || cat
  fi
}

json_field() {
  local field="$1"
  if $HAS_JQ; then
    jq -r ".${field} // empty" 2>/dev/null
  else
    python3 -c "import sys,json; d=json.load(sys.stdin); v=d; \
      [v:=v[k] for k in '${field}'.split('.')]; print(v if v is not None else '')" 2>/dev/null || echo ""
  fi
}

json_unwrap() {
  if $HAS_JQ; then
    jq '.data // .' 2>/dev/null
  else
    python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('data',d)) if isinstance(d,dict) else str(d))" 2>/dev/null || cat
  fi
}

json_count() {
  if $HAS_JQ; then
    jq 'if type == "array" then length else 0 end' 2>/dev/null
  else
    python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0"
  fi
}

json_array_field() {
  local field="$1"
  if $HAS_JQ; then
    jq -r ".[].${field}" 2>/dev/null
  else
    python3 -c "import sys,json; d=json.load(sys.stdin); [print(i.get('${field}','')) for i in d if isinstance(i,dict)]" 2>/dev/null || echo ""
  fi
}

###############################################################################
# Proof file writer
###############################################################################
save_proof() {
  local name="$1"
  local content="$2"
  local ext="${3:-.json}"
  local file="${PROOF_DIR}/${name}${ext}"
  echo "$content" | json_pp > "$file" 2>/dev/null || echo "$content" > "$file"
  log "  -> saved $file"
}

###############################################################################
# Cookie jar + CSRF
###############################################################################
COOKIE_JAR="$(mktemp)"
CSRF=""
AUTH_MODE=""
ACCESS_TOKEN=""

cleanup_jar() { rm -f "$COOKIE_JAR"; }
trap cleanup_jar EXIT

###############################################################################
# Auth: cookie mode or bearer mode
###############################################################################
smoke_auth() {
  if [ -n "${SMOKE_TOKEN:-}" ]; then
    AUTH_MODE="bearer"
    ACCESS_TOKEN="$SMOKE_TOKEN"
    log "Auth mode: Bearer token (SMOKE_TOKEN)"

    # Still need CSRF for mutating requests (global CsrfGuard fires regardless of auth mode)
    log "  Acquiring CSRF token for mutating requests..."
    curl -s -c "$COOKIE_JAR" --max-time 15 "${BASE_URL}/auth/csrf" > /dev/null 2>&1 || true
    CSRF=$(grep XSRF-TOKEN "$COOKIE_JAR" 2>/dev/null | awk '{print $NF}')
    if [ -n "$CSRF" ]; then
      log "  CSRF acquired: ${CSRF:0:12}..."
    else
      log "  WARN: CSRF not acquired — mutating requests may fail with 403"
    fi
    return 0
  fi

  AUTH_MODE="cookie"
  local email="${SMOKE_EMAIL:-demo@zephix.ai}"
  local password="${SMOKE_PASSWORD:-demo123456}"
  log "Auth mode: Cookie (${email})"

  # Step 1: CSRF
  log "  Acquiring CSRF token..."
  local csrf_resp csrf_http
  csrf_resp=$(curl -s -c "$COOKIE_JAR" -w '\n%{http_code}' --max-time 15 "${BASE_URL}/auth/csrf" 2>&1)
  csrf_http=$(echo "$csrf_resp" | tail -n1)
  CSRF=$(grep XSRF-TOKEN "$COOKIE_JAR" 2>/dev/null | awk '{print $NF}')

  if [ -z "$CSRF" ] || [ "$csrf_http" != "200" ]; then
    printf '\033[1;31mAUTH FAIL: CSRF acquisition failed\033[0m\n' >&2
    printf '  Endpoint: GET %s/auth/csrf\n' "$BASE_URL" >&2
    printf '  HTTP code: %s\n' "$csrf_http" >&2
    printf '  Response: %s\n' "$(echo "$csrf_resp" | sed '$d')" >&2
    exit 1
  fi
  log "  CSRF acquired: ${CSRF:0:12}..."

  # Step 2: Login
  log "  Logging in..."
  local login_resp login_http
  login_resp=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -w '\n%{http_code}' --max-time 15 \
    -H "Content-Type: application/json" \
    -H "x-csrf-token: $CSRF" \
    -X POST "${BASE_URL}/auth/login" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" 2>&1)
  login_http=$(echo "$login_resp" | tail -n1)
  local login_body
  login_body=$(echo "$login_resp" | sed '$d')

  if [ "$login_http" != "200" ] && [ "$login_http" != "201" ]; then
    printf '\033[1;31mAUTH FAIL: Login failed\033[0m\n' >&2
    printf '  Endpoint: POST %s/auth/login\n' "$BASE_URL" >&2
    printf '  HTTP code: %s\n' "$login_http" >&2
    printf '  Response: %s\n' "$login_body" >&2
    printf '  (credentials not echoed)\n' >&2
    exit 1
  fi

  # Extract access token for hybrid use
  ACCESS_TOKEN=$(echo "$login_body" | json_field "accessToken")
  local user_id
  user_id=$(echo "$login_body" | json_field "user.id")
  log "  Login OK: userId=${user_id:-unknown}"

  # Refresh CSRF after login (cookies may rotate)
  curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" --max-time 10 "${BASE_URL}/auth/csrf" > /dev/null 2>&1 || true
  CSRF=$(grep XSRF-TOKEN "$COOKIE_JAR" 2>/dev/null | awk '{print $NF}')
}

###############################################################################
# apicurl — unified curl wrapper with auth injection
###############################################################################
apicurl() {
  local method="$1"; shift
  local path="$1"; shift
  local url="${BASE_URL}${path}"

  if [ "$AUTH_MODE" = "bearer" ]; then
    curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      -w '\n%{http_code}' --max-time 30 \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "x-csrf-token: ${CSRF}" \
      -H "Content-Type: application/json" \
      -X "$method" "$url" "$@" 2>&1
  else
    curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      -w '\n%{http_code}' --max-time 30 \
      -H "x-csrf-token: $CSRF" \
      -H "Content-Type: application/json" \
      -X "$method" "$url" "$@" 2>&1
  fi
}

# Parse body + http code from apicurl output
# Note: head -n -1 is not portable (fails on macOS). Use sed instead.
parse_response() {
  local resp="$1"
  RESP_HTTP=$(echo "$resp" | tail -n1 | tr -d '[:space:]')
  RESP_BODY=$(echo "$resp" | sed '$d')
}

###############################################################################
# 401 drift check — call after any API call to detect cookie/CSRF expiry
###############################################################################
check_401_drift() {
  local label="$1"
  if [ "${RESP_HTTP:-}" = "401" ]; then
    printf '\033[1;31mSTOP: 401 after successful login. Cookie/CSRF drift detected.\033[0m\n' >&2
    printf '  Failed at: %s\n' "$label" >&2
    printf '  Response: %s\n' "${RESP_BODY:-}" >&2
    exit 1
  fi
}

###############################################################################
# Health gate — reusable pre-step
###############################################################################
smoke_health_check() {
  log "Health check"
  local resp
  resp=$(curl -sf --max-time 10 "${BASE_URL}/health/ready" 2>&1 || echo '{"status":"error"}')
  save_proof "staging-health" "$resp"
  local h_status
  h_status=$(echo "$resp" | json_field "status")
  [ "$h_status" = "ok" ] && pass "Health: $h_status" || { fail "Health" "$h_status"; exit 1; }
}

smoke_identity_check() {
  log "Identity check"
  local resp
  resp=$(curl -sf --max-time 10 "${BASE_URL}/system/identity" 2>&1 || echo '{}')
  local ident
  ident=$(echo "$resp" | json_unwrap)
  save_proof "staging-identity" "$ident"
  local i_env
  i_env=$(echo "$ident" | json_field "zephixEnv")
  [ "$i_env" = "staging" ] && pass "Identity: env=$i_env" || fail "Identity" "env=$i_env"
}

###############################################################################
# Get first workspace ID
###############################################################################
smoke_get_workspace() {
  log "Get workspace"
  local resp
  resp=$(apicurl GET /workspaces)
  parse_response "$resp"
  check_401_drift "GET /workspaces"
  save_proof "workspaces" "$RESP_BODY"

  WS_ID=""
  if $HAS_JQ; then
    WS_ID=$(echo "$RESP_BODY" | jq -r '.data[0].id // empty' 2>/dev/null)
  else
    WS_ID=$(echo "$RESP_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('data',d) if isinstance(d,dict) else d
if isinstance(items,list) and len(items)>0:
    print(items[0].get('id',''))
else:
    print('')
" 2>/dev/null || echo "")
  fi

  if [ -n "$WS_ID" ]; then
    pass "Workspace: $WS_ID"
  else
    fail "Workspace" "no workspace found"
    exit 1
  fi
}

###############################################################################
# Summary — call at end of every script
###############################################################################
summary() {
  log ""
  log "========================================="
  log "$WAVE_NAME smoke: $PASS PASS / $FAIL FAIL / $WARN WARN / $SKIP SKIP  ($TOTAL total)"
  log "========================================="
  [ "$FAIL" -eq 0 ] && exit 0 || exit 1
}
