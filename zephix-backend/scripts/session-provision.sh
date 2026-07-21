#!/usr/bin/env bash
#
# session-provision.sh — SESSION-PROVISION-1
# Provision N clean tester orgs for moderated usability sessions on STAGING.
#
# WHAT IT PRODUCES, per tester (default 5):
#   1. A user + org via the smoke path            (org: <PREFIX>-01 … <PREFIX>-0N)
#   2. A workspace in that org, complexity_mode = GOVERNED
#   3. The facilitator added to that org (ADMIN) + workspace (owner) so they can
#      act as the SECOND APPROVER (GOVERNED blocks the tester's self-approval)
#   4. A project instantiated from the Waterfall template — all 5 gates armed
#   5. ONE task "Draft project charter" in the gated Initiation phase, owned by
#      the tester. Nothing else — the tester's first move is trying to complete
#      it and hitting the block.
#
# WHY THIS SHAPE (from SESSION-READY-1, proven live):
#   - Testers CANNOT self-register (SendGrid dormant); @zephix.dev is on the
#     staging email-verification bypass allowlist, so tester emails MUST be
#     @zephix.dev to log into the UI and to use smoke-login.
#   - A solo STANDARD tester never sees separation of duties → seed GOVERNED
#     with the facilitator as a real second approver.
#   - The hands-on window is ~15 min → the project is pre-instantiated.
#
# SECOND-APPROVER MECHANIC (verified — mechanism (a), NO chain modification):
#   Gate steps require role ADMIN; isUserEligibleForStep has an ADMIN wildcard
#   (gate-approval-engine.service.ts:787). platformRole is resolved from the
#   user's UserOrganization row for their PRIMARY org at login (auth.service.ts
#   :823-866). So on SESSION DAY the facilitator must, per session:
#       set-primary-org(facilitator → tester org)  →  re-login (smoke-login)
#   …then their JWT carries platformRole=ADMIN for that org and they can approve.
#   This script only makes the facilitator a MEMBER; the session-day switch is
#   in the runbook (docs/runbooks/moderated-session-provisioning.md).
#
# IDEMPOTENT / RE-RUNNABLE: orgs are named <PREFIX>-0N. An already-provisioned
#   org (smoke create returns alreadyExists, or the org already resolves) is
#   SKIPPED, not duplicated. Safe to run twice.
#
# ⚠️ DRY-RUN DEFAULTS TO TRUE. It prints every call it WOULD make (URLs, headers
#   with the key REDACTED, bodies) and makes ZERO mutations. Execute only with
#   --no-dry-run. The smoke key is never printed and never hardcoded.
#
# Rate limits: the smoke path bypasses RateLimiterGuard; invite/accept are
#   60/min per IP; SEC-3 is login-only. 5 sequential provisions do not trip a
#   limiter. A small --delay-ms is applied anyway for courtesy.
#
set -uo pipefail

# ── defaults ────────────────────────────────────────────────────────────────
BASE_URL="https://zephix-backend-staging-staging.up.railway.app/api"
PREFIX="SESSION"
COUNT=5
DELAY_MS=500
DRY_RUN=true
TESTER_DOMAIN="zephix.dev"          # MUST be a bypass-allowlisted domain
TESTER_PASSWORD="TesterPass123!"     # testers log into the UI with this
FACILITATOR_EMAIL=""                 # required — existing @zephix.dev user
FACILITATOR_ID=""                    # required — see runbook for how to get it
SMOKE_KEY="${SMOKE_KEY:-}"           # prefer env; never hardcode
WATERFALL_TEMPLATE_ID="e1add877-400a-4452-b388-80926bc15919"  # verified ACTIVE
OUT_FILE=""

usage() {
  cat <<USAGE
session-provision.sh — provision moderated-session tester orgs (STAGING)

Required:
  --facilitator-email <email>   existing @zephix.dev user who will approve gates
  --facilitator-id <uuid>       that user's id (SELECT id FROM users WHERE email=…)
  --smoke-key <key>             or set SMOKE_KEY env (never echoed)

Optional:
  --count <n>            default 5
  --prefix <str>         default SESSION  (orgs: <PREFIX>-01 … <PREFIX>-0N)
  --base-url <url>       default staging backend
  --delay-ms <ms>        default 500
  --tester-password <p>  default TesterPass123!
  --out-file <path>      default session-provision-<PREFIX>-<date>.txt
  --no-dry-run           EXECUTE (default is dry-run — prints calls, no mutations)
  -h|--help

Example (dry-run first, always):
  SMOKE_KEY=… ./session-provision.sh --facilitator-email you@zephix.dev \\
      --facilitator-id <uuid>
  # then, once the dry-run reads correctly:
  SMOKE_KEY=… ./session-provision.sh --facilitator-email you@zephix.dev \\
      --facilitator-id <uuid> --no-dry-run
USAGE
}

# ── arg parse ───────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --facilitator-email) FACILITATOR_EMAIL="$2"; shift 2;;
    --facilitator-id) FACILITATOR_ID="$2"; shift 2;;
    --smoke-key) SMOKE_KEY="$2"; shift 2;;
    --count) COUNT="$2"; shift 2;;
    --prefix) PREFIX="$2"; shift 2;;
    --base-url) BASE_URL="$2"; shift 2;;
    --delay-ms) DELAY_MS="$2"; shift 2;;
    --tester-password) TESTER_PASSWORD="$2"; shift 2;;
    --out-file) OUT_FILE="$2"; shift 2;;
    --no-dry-run) DRY_RUN=false; shift;;
    -h|--help) usage; exit 0;;
    *) echo "unknown arg: $1" >&2; usage; exit 2;;
  esac
done

# ── preconditions ───────────────────────────────────────────────────────────
[ -n "$FACILITATOR_EMAIL" ] || { echo "ERROR: --facilitator-email required" >&2; exit 2; }
[ -n "$FACILITATOR_ID" ]    || { echo "ERROR: --facilitator-id required" >&2; exit 2; }
[ -n "$SMOKE_KEY" ]         || { echo "ERROR: smoke key required (--smoke-key or SMOKE_KEY env)" >&2; exit 2; }
command -v python3 >/dev/null || { echo "ERROR: python3 required for JSON parsing" >&2; exit 2; }
[ -n "$OUT_FILE" ] || OUT_FILE="session-provision-${PREFIX}-$(date +%Y%m%d-%H%M%S).txt"

# ── helpers ─────────────────────────────────────────────────────────────────
log()  { printf '%s\n' "$*" >&2; }
die()  { printf 'FATAL: %s\n' "$*" >&2; exit 1; }
redact() { sed "s/${SMOKE_KEY}/<SMOKE_KEY-REDACTED>/g"; }
jval() { python3 -c "import sys,json;d=json.load(sys.stdin);print(($1) or '')" 2>/dev/null; }

# csrf token for a given cookie jar (double-submit; token echoed as X-CSRF-Token)
csrf() { curl -s -c "$1" "$BASE_URL/auth/csrf" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('token') or d.get('data',{}).get('csrfToken') or d.get('csrfToken') or '')"; }

# smoke-login <email> <jar>  → establishes an authenticated session cookie.
# smoke-login is @zephix.dev domain-allowlisted and NOT rate-limited.
smoke_login() {
  local email="$1" jar="$2" c code
  if $DRY_RUN; then
    log "  [dry-run] POST $BASE_URL/auth/smoke-login  (x-zephix-env: staging, X-Smoke-Key: <REDACTED>, X-CSRF-Token)  body {\"email\":\"$email\"}"
    return 0
  fi
  c="$(csrf "$jar")"
  code="$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" -c "$jar" \
    -H 'Content-Type: application/json' -H "X-CSRF-Token: $c" \
    -H 'x-zephix-env: staging' -H "X-Smoke-Key: $SMOKE_KEY" \
    -X POST "$BASE_URL/auth/smoke-login" -d "{\"email\":\"$email\"}")"
  [ "$code" = "204" ] || [ "$code" = "200" ] || die "smoke-login $email → HTTP $code"
  # cache the post-login csrf for this jar
  printf '%s' "$(csrf "$jar")"
}

# call <METHOD> <PATH> <jar> <csrf> <ws-header-or-empty> <json-body-or-empty> <expected-code>
# Dry-run prints the intended call (key redacted) and returns nothing.
# Real mode executes, asserts the status, and echoes the response body.
call() {
  local method="$1" path="$2" jar="$3" c="$4" ws="$5" body="$6" want="$7"
  local url="$BASE_URL$path" hdrs=() resp code
  hdrs=(-H 'Content-Type: application/json' -H "X-CSRF-Token: $c")
  [ -n "$ws" ] && hdrs+=(-H "x-workspace-id: $ws")
  if $DRY_RUN; then
    log "  [dry-run] $method $url  $( [ -n "$ws" ] && echo "(x-workspace-id: $ws)")  body: ${body:-<none>}"
    return 0
  fi
  if [ -n "$body" ]; then
    resp="$(curl -s -w $'\n<<%{http_code}>>' -b "$jar" -c "$jar" "${hdrs[@]}" -X "$method" "$url" -d "$body")"
  else
    resp="$(curl -s -w $'\n<<%{http_code}>>' -b "$jar" -c "$jar" "${hdrs[@]}" -X "$method" "$url")"
  fi
  code="$(printf '%s' "$resp" | sed -n 's/.*<<\([0-9]*\)>>.*/\1/p' | tail -1)"
  body="$(printf '%s' "$resp" | sed 's/\n*<<[0-9]*>>$//')"
  if [ "$code" != "$want" ]; then
    die "$method $path → HTTP $code (wanted $want). Body: $(printf '%s' "$resp" | head -c 400 | redact)"
  fi
  printf '%s' "$body"
}

sleep_ms() { $DRY_RUN || perl -e "select(undef,undef,undef,$DELAY_MS/1000)" 2>/dev/null || sleep 1; }

# ── run header (metadata to stderr; OUT_FILE stays pure TSV so it tabulates) ──
{
  echo "SESSION-PROVISION-1  —  $( $DRY_RUN && echo 'DRY-RUN (no mutations)' || echo 'EXECUTE' )"
  echo "base=$BASE_URL prefix=$PREFIX count=$COUNT domain=$TESTER_DOMAIN"
  echo "facilitator=$FACILITATOR_EMAIL ($FACILITATOR_ID)  template=$WATERFALL_TEMPLATE_ID"
  echo "generated=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "---------------------------------------------------------------------------"
} >&2

# Facilitator session (needed to ACCEPT invites into each tester org).
FAC_JAR="$(mktemp)"
FAC_CSRF="$(smoke_login "$FACILITATOR_EMAIL" "$FAC_JAR")"

# OUT_FILE is the record the operator uses on the day — pure TSV, header first.
printf 'org\tlogin_email\tpassword\tworkspace_id\tproject_id\ttask_id\n' > "$OUT_FILE"

for n in $(seq 1 "$COUNT"); do
  i="$(printf '%02d' "$n")"          # zero-padded: 01..0N (matches SESSION-01…)
  ORG_NAME="${PREFIX}-${i}"
  EMAIL="$(printf '%s' "${PREFIX}-${i}" | tr '[:upper:]' '[:lower:]')@${TESTER_DOMAIN}"
  log ""
  log "=== $ORG_NAME  ($EMAIL) ==="

  T_JAR="$(mktemp)"

  # 1. create user + org (idempotent — alreadyExists is fine)
  if $DRY_RUN; then
    log "  [dry-run] POST $BASE_URL/smoke/users/create  (X-Smoke-Key: <REDACTED>)  body {\"email\":\"$EMAIL\",\"password\":\"<pw>\",\"fullName\":\"$ORG_NAME Tester\",\"orgName\":\"$ORG_NAME\"}"
  else
    curl -s -o /dev/null -w '' -H 'Content-Type: application/json' -H "X-Smoke-Key: $SMOKE_KEY" \
      -X POST "$BASE_URL/smoke/users/create" \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$TESTER_PASSWORD\",\"fullName\":\"$ORG_NAME Tester\",\"orgName\":\"$ORG_NAME\"}" \
      || die "smoke create failed for $EMAIL"
  fi
  sleep_ms

  # 2. tester session
  T_CSRF="$(smoke_login "$EMAIL" "$T_JAR")"

  # 3. tester identity (userId + organizationId)
  if $DRY_RUN; then
    log "  [dry-run] GET  $BASE_URL/auth/me   → tester userId + organizationId"
    TESTER_ID="<TESTER_ID_${i}>"; ORG_ID="<ORG_ID_${i}>"
  else
    ME="$(call GET /auth/me "$T_JAR" "$T_CSRF" "" "" 200)"
    TESTER_ID="$(printf '%s' "$ME" | jval "d.get('data',{}).get('id') or d.get('id')")"
    ORG_ID="$(printf '%s' "$ME" | jval "d.get('data',{}).get('organizationId') or d.get('organizationId')")"
    [ -n "$TESTER_ID" ] && [ -n "$ORG_ID" ] || die "could not resolve tester id/org for $EMAIL"
    # IDEMPOTENCY: if this org already has a workspace named 'Delivery', skip.
    EXIST="$(call GET /workspaces "$T_JAR" "$T_CSRF" "" "" 200 || true)"
    if printf '%s' "$EXIST" | grep -q "\"name\":\"Delivery\""; then
      log "  already provisioned (workspace 'Delivery' exists) — SKIPPING $ORG_NAME"
      continue
    fi
  fi

  # 4. workspace
  if $DRY_RUN; then
    log "  [dry-run] POST $BASE_URL/workspaces  body {\"name\":\"Delivery\"}"
    WS_ID="<WS_ID_${i}>"
  else
    WS="$(call POST /workspaces "$T_JAR" "$T_CSRF" "" '{"name":"Delivery"}' 201)"
    WS_ID="$(printf '%s' "$WS" | jval "d.get('data',{}).get('id') or d.get('id')")"
    [ -n "$WS_ID" ] || die "workspace create returned no id for $ORG_NAME"
  fi
  sleep_ms

  # 5. GOVERNED  (default is STANDARD; set explicitly — needs B2_TENANCY_V2_ENABLED=true, verified ON)
  call PATCH "/workspaces/$WS_ID/complexity-mode" "$T_JAR" "$T_CSRF" "" '{"mode":"governed"}' 200 >/dev/null
  sleep_ms

  # 6. invite the facilitator into this org as ADMIN
  call POST "/invites/$ORG_ID/invites" "$T_JAR" "$T_CSRF" "" \
    "{\"email\":\"$FACILITATOR_EMAIL\",\"role\":\"ADMIN\"}" 201 >/dev/null
  sleep_ms

  # 7. retrieve the raw invite token (smoke) and 8. facilitator accepts it
  if $DRY_RUN; then
    log "  [dry-run] GET  $BASE_URL/smoke/invites/latest-token?email=$FACILITATOR_EMAIL  (X-Smoke-Key: <REDACTED>)"
    log "  [dry-run] POST $BASE_URL/invites/accept  (as facilitator)  body {\"token\":\"<token>\"}"
  else
    TOKJSON="$(curl -s -H "X-Smoke-Key: $SMOKE_KEY" "$BASE_URL/smoke/invites/latest-token?email=$FACILITATOR_EMAIL")"
    TOKEN="$(printf '%s' "$TOKJSON" | jval "d.get('token') or d.get('data',{}).get('token')")"
    [ -n "$TOKEN" ] || die "no invite token for $FACILITATOR_EMAIL into $ORG_NAME"
    call POST /invites/accept "$FAC_JAR" "$FAC_CSRF" "" "{\"token\":\"$TOKEN\"}" 200 >/dev/null
  fi
  sleep_ms

  # 9. add facilitator to the workspace as owner (tester has manage_workspace_members)
  call POST "/workspaces/$WS_ID/members" "$T_JAR" "$T_CSRF" "" \
    "{\"userId\":\"$FACILITATOR_ID\",\"role\":\"workspace_owner\"}" 201 >/dev/null
  sleep_ms

  # 10. instantiate Waterfall  (workspaceId is NOT a body field — it is the
  #     x-workspace-id header; the DTO whitelist REJECTS a body workspaceId)
  if $DRY_RUN; then
    log "  [dry-run] POST $BASE_URL/templates/$WATERFALL_TEMPLATE_ID/instantiate-v5_1  (x-workspace-id: $WS_ID)  body {\"projectName\":\"Q3 Rollout\"}"
    PROJ_ID="<PROJECT_ID_${i}>"; PHASE_ID="<INIT_PHASE_${i}>"
  else
    INST="$(call POST "/templates/$WATERFALL_TEMPLATE_ID/instantiate-v5_1" "$T_JAR" "$T_CSRF" "$WS_ID" '{"projectName":"Q3 Rollout"}' 201)"
    PROJ_ID="$(printf '%s' "$INST" | jval "d.get('data',{}).get('projectId') or d.get('projectId')")"
    [ -n "$PROJ_ID" ] || die "instantiate returned no projectId for $ORG_NAME"
    # 11. resolve the gated Initiation phase id from the plan
    PLAN="$(call GET "/work/projects/$PROJ_ID/plan" "$T_JAR" "$T_CSRF" "$WS_ID" "" 200)"
    PHASE_ID="$(printf '%s' "$PLAN" | python3 -c "
import sys,json
d=json.load(sys.stdin); x=d.get('data',d)
phases=x.get('phases') or []
init=[p for p in phases if str(p.get('name','')).lower().startswith('initiation')]
pick=init[0] if init else (sorted(phases,key=lambda p:p.get('sortOrder',p.get('sort_order',0)))[0] if phases else None)
print(pick.get('id') if pick else '')" 2>/dev/null)"
    [ -n "$PHASE_ID" ] || die "could not resolve Initiation phase for $ORG_NAME"
  fi
  sleep_ms

  # 12. ONE task in the gated Initiation phase, owned by the tester
  if $DRY_RUN; then
    log "  [dry-run] POST $BASE_URL/work/tasks  (x-workspace-id: $WS_ID)  body {\"projectId\":\"$PROJ_ID\",\"phaseId\":\"$PHASE_ID\",\"title\":\"Draft project charter\",\"assigneeUserId\":\"$TESTER_ID\"}"
    TASK_ID="<TASK_ID_${i}>"
  else
    TASK="$(call POST /work/tasks "$T_JAR" "$T_CSRF" "$WS_ID" \
      "{\"projectId\":\"$PROJ_ID\",\"phaseId\":\"$PHASE_ID\",\"title\":\"Draft project charter\",\"assigneeUserId\":\"$TESTER_ID\"}" 201)"
    TASK_ID="$(printf '%s' "$TASK" | jval "d.get('data',{}).get('id') or d.get('id')")"
    [ -n "$TASK_ID" ] || die "task create returned no id for $ORG_NAME"
  fi

  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$ORG_NAME" "$EMAIL" "$TESTER_PASSWORD" "$WS_ID" "$PROJ_ID" "$TASK_ID" >> "$OUT_FILE"
  log "  ✓ $ORG_NAME provisioned"
  rm -f "$T_JAR"
done

rm -f "$FAC_JAR"

# ── summary ─────────────────────────────────────────────────────────────────
echo ""
echo "=============================================================================="
echo "SUMMARY ($( $DRY_RUN && echo 'DRY-RUN — nothing created' || echo 'provisioned' ))  →  also written to $OUT_FILE"
echo "=============================================================================="
column -t -s $'\t' "$OUT_FILE" 2>/dev/null || cat "$OUT_FILE"
echo ""
echo "Tester instructions (paste into each calendar invite):"
echo "  Sign in at https://zephix-frontend-staging.up.railway.app with the email"
echo "  and password from your row above. Open the 'Delivery' workspace →"
echo "  'Q3 Rollout' project → try to mark 'Draft project charter' as Done."
echo ""
$DRY_RUN && echo "This was a DRY-RUN. Re-run with --no-dry-run to execute." || true
