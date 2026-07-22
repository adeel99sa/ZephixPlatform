#!/usr/bin/env bash
#
# session-provision.sh — SESSION-PROVISION-1
# Provision N clean tester orgs for moderated usability sessions on STAGING.
#
# WHAT IT PRODUCES, per tester (default 5):
#   1. A TESTER user + org via the smoke path        (org: <PREFIX>-01 … <PREFIX>-0N)
#   2. A workspace in that org, complexity_mode = GOVERNED
#   3. A distinct APPROVER account, pinned to that org as an ADMIN member, so it
#      can approve the tester's gate with ZERO session-day org-switching
#   4. A project instantiated from the Waterfall template — all 5 gates armed
#   5. ONE task "Draft project charter" in the gated Initiation phase, owned by
#      the tester. Nothing else — the tester's first move is trying to complete
#      it and hitting the block.
#
# WHY A DISTINCT PRE-PINNED APPROVER (not one shared facilitator):
#   The demo is separation of duties. In GOVERNED the SUBMITTER cannot approve
#   (gate-approval-engine.service.ts:558-561), so the org owner/tester cannot
#   clear their own gate — a DIFFERENT admin must. Eligibility is easy (ADMIN
#   wildcard, :787). The hard part is TENANCY: to even see/approve the gate the
#   approver's JWT organizationId must equal the tester's org, and platformRole
#   /org come from the user's PRIMARY org at login (auth.service.ts:823-866). A
#   single shared facilitator has ONE primary org at a time → they would have to
#   set-primary + re-login for every session, mid-call, in a terminal, while a
#   PMO lead watches. Instead we create ONE approver PER org and pin its primary
#   org to that tester org here, at provision time (set-primary-org). On session
#   day the facilitator simply LOGS IN as approver-0N in the UI and clicks
#   Approve — no curl, no switching. The provision cost is paid the day before.
#
# IDEMPOTENT / RE-RUNNABLE: orgs are <PREFIX>-0N. An org that already has the
#   'Delivery' workspace is SKIPPED, not duplicated. Safe to run twice.
#
# ⚠️ DRY-RUN DEFAULTS TO TRUE. It prints every call it WOULD make (URLs, headers
#   with the key REDACTED, bodies) and makes ZERO mutations. Execute only with
#   --no-dry-run. The smoke key is never printed and never hardcoded.
#
# Rate limits: the smoke path bypasses RateLimiterGuard; invite/accept are
#   60/min per IP; SEC-3 is login-only. This volume does not trip a limiter; a
#   small --delay-ms is applied for courtesy.
#
set -uo pipefail

# ── defaults ────────────────────────────────────────────────────────────────
BASE_URL="https://zephix-backend-staging-staging.up.railway.app/api"
PREFIX="SESSION"
APPROVER_PREFIX="approver"
COUNT=5
DELAY_MS=500
DRY_RUN=true
DOMAIN="zephix.dev"                  # MUST be a bypass-allowlisted domain
PASSWORD="TesterPass123!"            # tester + approver UI login password
SMOKE_KEY="${SMOKE_KEY:-}"           # prefer env; never hardcode
WATERFALL_TEMPLATE_ID="e1add877-400a-4452-b388-80926bc15919"  # verified ACTIVE
OUT_FILE=""

usage() {
  cat <<USAGE
session-provision.sh — provision moderated-session tester + approver orgs (STAGING)

Required:
  --smoke-key <key>      or set SMOKE_KEY env (never echoed)

Optional:
  --count <n>            default 5
  --prefix <str>         default SESSION  (orgs: <PREFIX>-01 … <PREFIX>-0N)
  --approver-prefix <s>  default approver (accounts: approver-0N@<domain>)
  --domain <str>         default zephix.dev (must be bypass-allowlisted)
  --password <p>         default TesterPass123!  (tester + approver login)
  --base-url <url>       default staging backend
  --delay-ms <ms>        default 500
  --out-file <path>      default session-provision-<PREFIX>-<date>.txt
  --no-dry-run           EXECUTE (default is dry-run — prints calls, no mutations)
  -h|--help

Example (dry-run first, always):
  SMOKE_KEY=… ./session-provision.sh
  # then, once the dry-run reads correctly:
  SMOKE_KEY=… ./session-provision.sh --no-dry-run
USAGE
}

# ── arg parse ───────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --smoke-key) SMOKE_KEY="$2"; shift 2;;
    --count) COUNT="$2"; shift 2;;
    --prefix) PREFIX="$2"; shift 2;;
    --approver-prefix) APPROVER_PREFIX="$2"; shift 2;;
    --domain) DOMAIN="$2"; shift 2;;
    --password) PASSWORD="$2"; shift 2;;
    --base-url) BASE_URL="$2"; shift 2;;
    --delay-ms) DELAY_MS="$2"; shift 2;;
    --out-file) OUT_FILE="$2"; shift 2;;
    --no-dry-run) DRY_RUN=false; shift;;
    -h|--help) usage; exit 0;;
    *) echo "unknown arg: $1" >&2; usage; exit 2;;
  esac
done

# ── preconditions ───────────────────────────────────────────────────────────
[ -n "$SMOKE_KEY" ] || { echo "ERROR: smoke key required (--smoke-key or SMOKE_KEY env)" >&2; exit 2; }
command -v python3 >/dev/null || { echo "ERROR: python3 required for JSON parsing" >&2; exit 2; }
[ -n "$OUT_FILE" ] || OUT_FILE="session-provision-${PREFIX}-$(date +%Y%m%d-%H%M%S).txt"

# ── helpers ─────────────────────────────────────────────────────────────────
log()  { printf '%s\n' "$*" >&2; }
die()  { printf 'FATAL: %s\n' "$*" >&2; exit 1; }
redact() { sed "s/${SMOKE_KEY}/<SMOKE_KEY-REDACTED>/g"; }
jval() { python3 -c "import sys,json;d=json.load(sys.stdin);print(($1) or '')" 2>/dev/null; }
csrf() { curl -s -c "$1" "$BASE_URL/auth/csrf" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('token') or d.get('data',{}).get('csrfToken') or d.get('csrfToken') or '')"; }
sleep_ms() { $DRY_RUN || perl -e "select(undef,undef,undef,$DELAY_MS/1000)" 2>/dev/null || sleep 1; }

# smoke_create <email> <orgName> <fullName>  (idempotent; alreadyExists is fine)
smoke_create() {
  local email="$1" org="$2" name="$3"
  if $DRY_RUN; then
    log "  [dry-run] POST $BASE_URL/smoke/users/create  (X-Smoke-Key: <REDACTED>)  body {\"email\":\"$email\",\"password\":\"<pw>\",\"fullName\":\"$name\",\"orgName\":\"$org\"}"
    return 0
  fi
  curl -s -o /dev/null -H 'Content-Type: application/json' -H "X-Smoke-Key: $SMOKE_KEY" \
    -X POST "$BASE_URL/smoke/users/create" \
    -d "{\"email\":\"$email\",\"password\":\"$PASSWORD\",\"fullName\":\"$name\",\"orgName\":\"$org\"}" \
    || die "smoke create failed for $email"
}

# smoke_login <email> <jar> → prints the post-login csrf for that jar (empty in dry-run)
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
  printf '%s' "$(csrf "$jar")"
}

# call <METHOD> <PATH> <jar> <csrf> <ws-or-empty> <body-or-empty> <expected> → echoes body
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
  [ "$code" = "$want" ] || die "$method $path → HTTP $code (wanted $want). Body: $(printf '%s' "$resp" | head -c 400 | redact)"
  printf '%s' "$body"
}

# ── run header (metadata to stderr; OUT_FILE stays pure TSV) ──────────────────
{
  echo "SESSION-PROVISION-1  —  $( $DRY_RUN && echo 'DRY-RUN (no mutations)' || echo 'EXECUTE' )"
  echo "base=$BASE_URL prefix=$PREFIX count=$COUNT domain=$DOMAIN"
  echo "distinct pre-pinned approver per org (no session-day org-switching)"
  echo "template=$WATERFALL_TEMPLATE_ID  generated=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "---------------------------------------------------------------------------"
} >&2

printf 'org\ttester_email\ttester_pw\tapprover_email\tapprover_pw\tworkspace_id\tproject_id\ttask_id\n' > "$OUT_FILE"

for n in $(seq 1 "$COUNT"); do
  i="$(printf '%02d' "$n")"                 # zero-padded: 01..0N
  ORG_NAME="${PREFIX}-${i}"
  T_EMAIL="$(printf '%s' "${PREFIX}-${i}" | tr '[:upper:]' '[:lower:]')@${DOMAIN}"
  A_EMAIL="${APPROVER_PREFIX}-${i}@${DOMAIN}"
  log ""
  log "=== $ORG_NAME  (tester $T_EMAIL · approver $A_EMAIL) ==="

  T_JAR="$(mktemp)"; A_JAR="$(mktemp)"

  # 1. tester user + org
  smoke_create "$T_EMAIL" "$ORG_NAME" "$ORG_NAME Tester"
  sleep_ms
  T_CSRF="$(smoke_login "$T_EMAIL" "$T_JAR")"

  # 2. tester identity + idempotency guard
  if $DRY_RUN; then
    log "  [dry-run] GET  $BASE_URL/auth/me   → tester userId + organizationId"
    TESTER_ID="<TESTER_ID_${i}>"; ORG_ID="<ORG_ID_${i}>"
  else
    ME="$(call GET /auth/me "$T_JAR" "$T_CSRF" "" "" 200)"
    TESTER_ID="$(printf '%s' "$ME" | jval "d.get('data',{}).get('id') or d.get('id')")"
    ORG_ID="$(printf '%s' "$ME" | jval "d.get('data',{}).get('organizationId') or d.get('organizationId')")"
    [ -n "$TESTER_ID" ] && [ -n "$ORG_ID" ] || die "could not resolve tester id/org for $T_EMAIL"
    if printf '%s' "$(call GET /workspaces "$T_JAR" "$T_CSRF" "" "" 200 || true)" | grep -q "\"name\":\"Delivery\""; then
      log "  already provisioned (workspace 'Delivery' exists) — SKIPPING $ORG_NAME"; rm -f "$T_JAR" "$A_JAR"; continue
    fi
  fi

  # 3. workspace + GOVERNED  (needs B2_TENANCY_V2_ENABLED=true, verified ON)
  if $DRY_RUN; then
    log "  [dry-run] POST $BASE_URL/workspaces  body {\"name\":\"Delivery\"}"; WS_ID="<WS_ID_${i}>"
  else
    WS_ID="$(call POST /workspaces "$T_JAR" "$T_CSRF" "" '{"name":"Delivery"}' 201 | jval "d.get('data',{}).get('id') or d.get('id')")"
    [ -n "$WS_ID" ] || die "workspace create returned no id for $ORG_NAME"
  fi
  sleep_ms
  call PATCH "/workspaces/$WS_ID/complexity-mode" "$T_JAR" "$T_CSRF" "" '{"mode":"governed"}' 200 >/dev/null
  sleep_ms

  # 4. approver account (gets its own throwaway home org; we re-pin it below)
  smoke_create "$A_EMAIL" "${ORG_NAME}-approver-home" "$ORG_NAME Approver"
  sleep_ms

  # 5. tester invites the approver INTO this org as ADMIN
  call POST "/invites/$ORG_ID/invites" "$T_JAR" "$T_CSRF" "" \
    "{\"email\":\"$A_EMAIL\",\"role\":\"ADMIN\"}" 201 >/dev/null
  sleep_ms

  # 6. approver session, 7. retrieve token, 8. approver accepts the invite
  A_CSRF="$(smoke_login "$A_EMAIL" "$A_JAR")"
  if $DRY_RUN; then
    log "  [dry-run] GET  $BASE_URL/smoke/invites/latest-token?email=$A_EMAIL  (X-Smoke-Key: <REDACTED>)"
    log "  [dry-run] POST $BASE_URL/invites/accept  (as approver)  body {\"token\":\"<token>\"}"
    log "  [dry-run] GET  $BASE_URL/auth/me   (as approver) → approver userId"
    APPROVER_ID="<APPROVER_ID_${i}>"
  else
    TOKEN="$(curl -s -H "X-Smoke-Key: $SMOKE_KEY" "$BASE_URL/smoke/invites/latest-token?email=$A_EMAIL" | jval "d.get('token') or d.get('data',{}).get('token')")"
    [ -n "$TOKEN" ] || die "no invite token for approver $A_EMAIL into $ORG_NAME"
    call POST /invites/accept "$A_JAR" "$A_CSRF" "" "{\"token\":\"$TOKEN\"}" 200 >/dev/null
    APPROVER_ID="$(call GET /auth/me "$A_JAR" "$A_CSRF" "" "" 200 | jval "d.get('data',{}).get('id') or d.get('id')")"
    [ -n "$APPROVER_ID" ] || die "could not resolve approver id for $A_EMAIL"
  fi
  sleep_ms

  # 9. PIN the approver's primary org to THIS tester org — the whole point.
  #    After this, an approver-0N UI login yields platformRole=ADMIN for this org
  #    with NO session-day set-primary/re-login.
  if $DRY_RUN; then
    log "  [dry-run] POST $BASE_URL/smoke/users/set-primary-org  (X-Smoke-Key: <REDACTED>)  body {\"email\":\"$A_EMAIL\",\"orgId\":\"$ORG_ID\"}"
  else
    curl -s -o /dev/null -H 'Content-Type: application/json' -H "X-Smoke-Key: $SMOKE_KEY" \
      -X POST "$BASE_URL/smoke/users/set-primary-org" -d "{\"email\":\"$A_EMAIL\",\"orgId\":\"$ORG_ID\"}" \
      || die "set-primary-org failed for approver $A_EMAIL"
  fi
  sleep_ms

  # 10. add approver to the workspace as owner (tester has manage_workspace_members)
  call POST "/workspaces/$WS_ID/members" "$T_JAR" "$T_CSRF" "" \
    "{\"userId\":\"$APPROVER_ID\",\"role\":\"workspace_owner\"}" 201 >/dev/null
  sleep_ms

  # 11. instantiate Waterfall  (workspaceId is the x-workspace-id HEADER, NOT a
  #     body field — the DTO whitelist rejects a body workspaceId)
  if $DRY_RUN; then
    log "  [dry-run] POST $BASE_URL/templates/$WATERFALL_TEMPLATE_ID/instantiate-v5_1  (x-workspace-id: $WS_ID)  body {\"projectName\":\"Q3 Rollout\"}"
    PROJ_ID="<PROJECT_ID_${i}>"; PHASE_ID="<INIT_PHASE_${i}>"
  else
    PROJ_ID="$(call POST "/templates/$WATERFALL_TEMPLATE_ID/instantiate-v5_1" "$T_JAR" "$T_CSRF" "$WS_ID" '{"projectName":"Q3 Rollout"}' 201 | jval "d.get('data',{}).get('projectId') or d.get('projectId')")"
    [ -n "$PROJ_ID" ] || die "instantiate returned no projectId for $ORG_NAME"
    # 12. resolve the gated Initiation phase id from the plan
    PHASE_ID="$(call GET "/work/projects/$PROJ_ID/plan" "$T_JAR" "$T_CSRF" "$WS_ID" "" 200 | python3 -c "
import sys,json
d=json.load(sys.stdin); x=d.get('data',d); ph=x.get('phases') or []
init=[p for p in ph if str(p.get('name','')).lower().startswith('initiation')]
pick=init[0] if init else (sorted(ph,key=lambda p:p.get('sortOrder',p.get('sort_order',0)))[0] if ph else None)
print(pick.get('id') if pick else '')" 2>/dev/null)"
    [ -n "$PHASE_ID" ] || die "could not resolve Initiation phase for $ORG_NAME"
  fi
  sleep_ms

  # 13. ONE task in the gated Initiation phase, owned by the tester
  if $DRY_RUN; then
    log "  [dry-run] POST $BASE_URL/work/tasks  (x-workspace-id: $WS_ID)  body {\"projectId\":\"$PROJ_ID\",\"phaseId\":\"$PHASE_ID\",\"title\":\"Draft project charter\",\"assigneeUserId\":\"$TESTER_ID\"}"
    TASK_ID="<TASK_ID_${i}>"
  else
    TASK_ID="$(call POST /work/tasks "$T_JAR" "$T_CSRF" "$WS_ID" \
      "{\"projectId\":\"$PROJ_ID\",\"phaseId\":\"$PHASE_ID\",\"title\":\"Draft project charter\",\"assigneeUserId\":\"$TESTER_ID\"}" 201 | jval "d.get('data',{}).get('id') or d.get('id')")"
    [ -n "$TASK_ID" ] || die "task create returned no id for $ORG_NAME"
  fi

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$ORG_NAME" "$T_EMAIL" "$PASSWORD" "$A_EMAIL" "$PASSWORD" "$WS_ID" "$PROJ_ID" "$TASK_ID" >> "$OUT_FILE"
  log "  ✓ $ORG_NAME provisioned"
  rm -f "$T_JAR" "$A_JAR"
done

# ── summary ─────────────────────────────────────────────────────────────────
echo ""
echo "=============================================================================="
echo "SUMMARY ($( $DRY_RUN && echo 'DRY-RUN — nothing created' || echo 'provisioned' ))  →  also written to $OUT_FILE"
echo "=============================================================================="
column -t -s $'\t' "$OUT_FILE" 2>/dev/null || cat "$OUT_FILE"
echo ""
echo "Session day:"
echo "  TESTER  signs in at https://zephix-frontend-staging.up.railway.app with"
echo "          tester_email/tester_pw → Delivery → Q3 Rollout → mark 'Draft"
echo "          project charter' Done (hits the block) → tries to approve (denied)."
echo "  YOU     sign in as approver_email/approver_pw (a DIFFERENT browser/profile)"
echo "          and approve the gate. No org-switching — approver is pre-pinned."
echo ""
$DRY_RUN && echo "This was a DRY-RUN. Re-run with --no-dry-run to execute." || true
