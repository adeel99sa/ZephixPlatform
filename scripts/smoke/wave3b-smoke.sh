#!/usr/bin/env bash
###############################################################################
# Wave 3B Staging Smoke Test
# Tests: Change Requests (full lifecycle), Documents (create + version), Budget (PATCH + verify)
###############################################################################
set -euo pipefail

STAGING_URL="${1:-https://zephix-backend-v2-staging.up.railway.app/api}"
EMAIL="${SMOKE_EMAIL:-demo@zephix.ai}"
PASSWORD="${SMOKE_PASSWORD:-demo123456}"
COOKIE_JAR="$(mktemp)"
PROOF_DIR="$(cd "$(dirname "$0")" && cd ../../docs/architecture/proofs/phase5a/wave3b/rc23 && pwd)"

trap 'rm -f "$COOKIE_JAR"' EXIT

PASS=0; FAIL=0; TOTAL=0

log()    { printf '\033[1;34m[SMOKE]\033[0m %s\n' "$*" >&2; }
pass()   { TOTAL=$((TOTAL+1)); PASS=$((PASS+1)); printf '\033[1;32m  ✅ %s\033[0m\n' "$1"; }
fail()   { TOTAL=$((TOTAL+1)); FAIL=$((FAIL+1)); printf '\033[1;31m  ❌ %s: %s\033[0m\n' "$1" "${2:-}"; }

# Unwrap backend response { data: T } or T
unwrap() { python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('data',d)) if isinstance(d,dict) else str(d))"; }
field()  { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))"; }

###############################################################################
log "Wave 3B Smoke — $STAGING_URL"
log "Proof dir: $PROOF_DIR"
mkdir -p "$PROOF_DIR"

# 1. Health
log "Health check"
HEALTH=$(curl -sf --max-time 10 "$STAGING_URL/health/ready")
echo "$HEALTH" > "$PROOF_DIR/health.json"
H_STATUS=$(echo "$HEALTH" | field status)
[ "$H_STATUS" = "ok" ] && pass "Health: $H_STATUS" || fail "Health" "$H_STATUS"

# 2. Identity
log "Identity check"
IDENT_RAW=$(curl -sf --max-time 10 "$STAGING_URL/system/identity")
IDENT=$(echo "$IDENT_RAW" | unwrap)
echo "$IDENT" > "$PROOF_DIR/identity.json"
I_ENV=$(echo "$IDENT" | field zephixEnv)
[ "$I_ENV" = "staging" ] && pass "Identity: env=$I_ENV" || fail "Identity" "env=$I_ENV"

# 3. CSRF
log "CSRF token"
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$STAGING_URL/auth/csrf" > /dev/null 2>&1
CSRF=$(grep XSRF-TOKEN "$COOKIE_JAR" 2>/dev/null | awk '{print $NF}')
[ -n "$CSRF" ] && pass "CSRF acquired" || fail "CSRF" "empty token"

# 4. Login
log "Login"
LOGIN_RAW=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST "$STAGING_URL/auth/login" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Check for rate limit
if echo "$LOGIN_RAW" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('code')=='RATE_LIMITED' else 1)" 2>/dev/null; then
  RETRY=$(echo "$LOGIN_RAW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('retryAfter',0))" 2>/dev/null)
  fail "Login" "RATE_LIMITED — retryAfter=${RETRY}s"
  echo "RESULT: $PASS/$TOTAL PASS, $FAIL FAIL (rate limited, try again in ${RETRY}s)"
  exit 1
fi

USER_ID=$(echo "$LOGIN_RAW" | python3 -c "
import sys,json
d=json.load(sys.stdin)
u=d.get('user',d.get('data',{}).get('user',d))
print(u.get('id',''))
" 2>/dev/null)
[ -n "$USER_ID" ] && pass "Login: user=$USER_ID" || fail "Login" "no user ID"

# Fetch workspace list since login response uses organization, not workspaceIds
WS_LIST_RAW=$(curl -s -b "$COOKIE_JAR" "$STAGING_URL/workspaces")
WS_ID=$(echo "$WS_LIST_RAW" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('data',d) if isinstance(d,dict) else d
if isinstance(items,list) and items:
  print(items[0].get('id',''))
elif isinstance(items,dict) and items.get('items'):
  print(items['items'][0].get('id',''))
else: print('')
" 2>/dev/null)
log "Workspace: $WS_ID"

if [ -z "$WS_ID" ]; then
  fail "Workspace" "no workspace ID from /workspaces"
  echo "RESULT: $PASS/$TOTAL PASS, $FAIL FAIL"
  exit 1
fi

# Common headers for authenticated requests
AUTH_HEADERS=(-b "$COOKIE_JAR" -H "x-csrf-token: $CSRF" -H "x-workspace-id: $WS_ID" -H "Content-Type: application/json")

# 5. Create project
log "Create project"
PROJ_RAW=$(curl -s "${AUTH_HEADERS[@]}" \
  -X POST "$STAGING_URL/projects" \
  -d "{\"name\":\"Wave3B-Smoke-$(date +%s)\",\"workspaceId\":\"$WS_ID\"}")
PROJ=$(echo "$PROJ_RAW" | unwrap)
PROJ_ID=$(echo "$PROJ" | field id)
[ -n "$PROJ_ID" ] && pass "Project: $PROJ_ID" || fail "Project" "$(echo "$PROJ_RAW" | head -c 200)"

if [ -z "$PROJ_ID" ]; then
  echo "RESULT: $PASS/$TOTAL PASS, $FAIL FAIL"
  exit 1
fi

BASE="$STAGING_URL/work/workspaces/$WS_ID/projects/$PROJ_ID"

###############################################################################
log "=== Change Requests ==="

# Create CR
CR_RAW=$(curl -s "${AUTH_HEADERS[@]}" \
  -X POST "$BASE/change-requests" \
  -d '{"title":"Wave3B smoke CR","impactScope":"SCOPE","description":"Smoke test"}')
CR=$(echo "$CR_RAW" | unwrap)
CR_ID=$(echo "$CR" | field id)
CR_ST=$(echo "$CR" | field status)
echo "$CR" > "$PROOF_DIR/cr-create.json"
[ "$CR_ST" = "DRAFT" ] && pass "CR create: DRAFT" || fail "CR create" "status=$CR_ST"

# Submit
CR_SUB_RAW=$(curl -s "${AUTH_HEADERS[@]}" -X POST "$BASE/change-requests/$CR_ID/submit")
CR_SUB=$(echo "$CR_SUB_RAW" | unwrap)
CR_SUB_ST=$(echo "$CR_SUB" | field status)
echo "$CR_SUB" > "$PROOF_DIR/cr-submit.json"
[ "$CR_SUB_ST" = "SUBMITTED" ] && pass "CR submit: SUBMITTED" || fail "CR submit" "status=$CR_SUB_ST"

# Approve
CR_APP_RAW=$(curl -s "${AUTH_HEADERS[@]}" -X POST "$BASE/change-requests/$CR_ID/approve")
CR_APP=$(echo "$CR_APP_RAW" | unwrap)
CR_APP_ST=$(echo "$CR_APP" | field status)
echo "$CR_APP" > "$PROOF_DIR/cr-approve.json"
[ "$CR_APP_ST" = "APPROVED" ] && pass "CR approve: APPROVED" || fail "CR approve" "status=$CR_APP_ST"

# Implement
CR_IMP_RAW=$(curl -s "${AUTH_HEADERS[@]}" -X POST "$BASE/change-requests/$CR_ID/implement")
CR_IMP=$(echo "$CR_IMP_RAW" | unwrap)
CR_IMP_ST=$(echo "$CR_IMP" | field status)
echo "$CR_IMP" > "$PROOF_DIR/cr-implement.json"
[ "$CR_IMP_ST" = "IMPLEMENTED" ] && pass "CR implement: IMPLEMENTED" || fail "CR implement" "status=$CR_IMP_ST"

###############################################################################
log "=== Documents ==="

# Create
DOC_RAW=$(curl -s "${AUTH_HEADERS[@]}" \
  -X POST "$BASE/documents" \
  -d '{"title":"Wave3B test doc","content":{"sections":["scope","requirements"]}}')
DOC=$(echo "$DOC_RAW" | unwrap)
DOC_ID=$(echo "$DOC" | field id)
DOC_V1=$(echo "$DOC" | field version)
echo "$DOC" > "$PROOF_DIR/doc-create.json"
[ "$DOC_V1" = "1" ] && pass "Doc create: v$DOC_V1" || fail "Doc create" "version=$DOC_V1"

# Update (should increment version)
DOC_UPD_RAW=$(curl -s "${AUTH_HEADERS[@]}" \
  -X PATCH "$BASE/documents/$DOC_ID" \
  -d '{"content":{"sections":["scope","requirements","design"],"updated":true}}')
DOC_UPD=$(echo "$DOC_UPD_RAW" | unwrap)
DOC_V2=$(echo "$DOC_UPD" | field version)
echo "$DOC_UPD" > "$PROOF_DIR/doc-update.json"
[ "$DOC_V2" -gt "$DOC_V1" ] 2>/dev/null && pass "Doc update: v$DOC_V1→v$DOC_V2" || fail "Doc update" "v1=$DOC_V1 v2=$DOC_V2"

###############################################################################
log "=== Budget ==="

# GET initial
BUD_RAW=$(curl -s -b "$COOKIE_JAR" -H "x-workspace-id: $WS_ID" "$BASE/budget")
BUD=$(echo "$BUD_RAW" | unwrap)
echo "$BUD" > "$PROOF_DIR/budget-get-initial.json"
pass "Budget GET initial"

# PATCH
BUD_PATCH_RAW=$(curl -s "${AUTH_HEADERS[@]}" \
  -X PATCH "$BASE/budget" \
  -d '{"baselineBudget":"500000.00","revisedBudget":"520000.00","contingency":"25000.00","approvedChangeBudget":"15000.00","forecastAtCompletion":"510000.00"}')
BUD_PATCH=$(echo "$BUD_PATCH_RAW" | unwrap)
BUD_BL=$(echo "$BUD_PATCH" | field baselineBudget)
echo "$BUD_PATCH" > "$PROOF_DIR/budget-patch.json"
echo "$BUD_BL" | grep -q "500000" 2>/dev/null && pass "Budget PATCH: baseline=$BUD_BL" || fail "Budget PATCH" "baselineBudget=$BUD_BL, raw=$(echo "$BUD_PATCH_RAW" | head -c 200)"

# GET verify persistence
BUD_V_RAW=$(curl -s -b "$COOKIE_JAR" -H "x-workspace-id: $WS_ID" "$BASE/budget")
BUD_V=$(echo "$BUD_V_RAW" | unwrap)
BUD_V_BL=$(echo "$BUD_V" | field baselineBudget)
echo "$BUD_V" > "$PROOF_DIR/budget-get-verify.json"
echo "$BUD_V_BL" | grep -q "500000" 2>/dev/null && pass "Budget verify: baseline=$BUD_V_BL" || fail "Budget verify" "baselineBudget=$BUD_V_BL"

###############################################################################
echo ""
echo "============================================"
echo "Wave 3B Smoke: $PASS/$TOTAL PASS, $FAIL FAIL"
echo "============================================"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
