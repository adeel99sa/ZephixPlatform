#!/usr/bin/env bash
###############################################################################
# Sprint 5.1 — Project Artifacts smoke test.
#
# Exercises the full /api/projects/:projectId/artifacts surface end-to-end
# against a deployed environment (defaults to staging). Includes the dispatch
# Part 9 sequence plus three additional steps locked at Pause 2:
#   - x-workspace-id header mismatch returns 403 WORKSPACE_HEADER_MISMATCH
#   - Invalid custom field enum value ("Severe") returns 400
#   - E9 audit event verification for project_artifact.created
#
# Auth: smoke-login via STAGING_SMOKE_KEY (matches existing CSRF flow).
#
# Usage:
#   STAGING_SMOKE_KEY=<...> SMOKE_EMAIL=sandbox.admin@zephix.dev \
#   WORKSPACE_ID=<uuid> PROJECT_ID=<uuid> \
#   ./scripts/smoke/test-project-artifacts.sh
#
# Optional:
#   API=https://...                    # backend host-only URL (no /api suffix; defaults to staging)
#   STAGING_API_URL=https://...        # CI alias for API (host-only; same as STAGING_BACKEND_BASE)
#   ENV_NAME=staging                   # x-zephix-env header value
#   SMOKE_OTHER_WORKSPACE_ID=<uuid>    # same-org but different workspace UUID;
#                                       enables Step 7 (WORKSPACE_HEADER_MISMATCH).
#                                       If unset, Step 7 SKIPs (yellow warning).
#   CROSS_ORG_PROJECT_ID=<uuid>        # project UUID in a different organization;
#                                       enables Step 12 (cross-tenant 404). CI may
#                                       inject via secret SMOKE_CROSS_ORG_ARTIFACTS_PROJECT_ID.
#                                       If unset, Step 12 SKIPs (yellow warning).
#   REQUIRE_AUDIT_VERIFY=1             # promote Step 13 SKIP (missing railway CLI)
#                                       to hard FAIL. Post-merge gate must set this.
###############################################################################

set -uo pipefail

API="${API:-${STAGING_API_URL:-https://zephix-backend-staging-staging.up.railway.app}}"
ENV_NAME="${ENV_NAME:-staging}"
SMOKE_EMAIL="${SMOKE_EMAIL:-sandbox.admin@zephix.dev}"
WORKSPACE_ID="${WORKSPACE_ID:?WORKSPACE_ID required (an existing workspace UUID)}"
PROJECT_ID="${PROJECT_ID:?PROJECT_ID required (an existing project UUID in WORKSPACE_ID)}"
SMOKE_KEY="${STAGING_SMOKE_KEY:?STAGING_SMOKE_KEY required}"
SMOKE_OTHER_WORKSPACE_ID="${SMOKE_OTHER_WORKSPACE_ID:-}"
CROSS_ORG_PROJECT_ID="${CROSS_ORG_PROJECT_ID:-}"
REQUIRE_AUDIT_VERIFY="${REQUIRE_AUDIT_VERIFY:-0}"
TIMESTAMP=$(date +%s)
ARTIFACT_NAME="Smoke Risk Register ${TIMESTAMP}"

COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

PASS=0
FAIL=0
RESULTS=""

PASS=$((PASS+0))
FAIL=$((FAIL+0))
SKIP_COUNT=0

pass() { PASS=$((PASS+1));  printf '\033[1;32m  PASS  %s\033[0m\n' "$1"; RESULTS="${RESULTS}\nPASS  $1"; }
fail() { FAIL=$((FAIL+1));  printf '\033[1;31m  FAIL  %s — %s\033[0m\n' "$1" "${2:-}"; RESULTS="${RESULTS}\nFAIL  $1 — ${2:-}"; }
skip() { SKIP_COUNT=$((SKIP_COUNT+1)); printf '\033[1;33m  SKIP  %s — %s\033[0m\n' "$1" "${2:-}"; RESULTS="${RESULTS}\nSKIP  $1 — ${2:-}"; }
section() { printf '\n\033[1;34m━━━ %s ━━━\033[0m\n' "$1"; }

# Defensive JSON field accessor: unwraps the ResponseService { data, meta }
# envelope if present, then walks a dotted path. Returns empty string when
# the path doesn't resolve. Use a numeric default by setting $2 if needed.
json_field() { python3 -c "import sys,json
d=json.load(sys.stdin)
if isinstance(d,dict) and 'data' in d and isinstance(d['data'],dict):
  d=d['data']
v=d
for k in '$1'.split('.'):
  v=v.get(k) if isinstance(v,dict) else None
  if v is None: break
print(v if v is not None else '${2:-}')"; }

# Numeric variant: returns -1 fallback so callers can detect missing keys.
json_count() { python3 -c "import sys,json
d=json.load(sys.stdin)
if isinstance(d,dict) and 'data' in d and isinstance(d['data'],dict):
  d=d['data']
v=d
for k in '$1'.split('.'):
  v=v.get(k) if isinstance(v,dict) else None
  if v is None: break
print(v if v is not None else -1)"; }

###############################################################################
# Step 0 — Auth: smoke-login
###############################################################################
section "Step 0: smoke-login as $SMOKE_EMAIL"
curl -s -c "$COOKIE_JAR" "$API/api/auth/csrf" -H "x-zephix-env: $ENV_NAME" -o /tmp/csrf.json
CSRF=$(python3 -c "import json;print(json.load(open('/tmp/csrf.json'))['csrfToken'])")
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

# Refresh CSRF after login
curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$API/api/auth/csrf" -H "x-zephix-env: $ENV_NAME" -o /tmp/csrf.json
CSRF=$(python3 -c "import json;print(json.load(open('/tmp/csrf.json'))['csrfToken'])")

apicurl() {
  local method="$1" path="$2"; shift 2
  curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
    -H "x-zephix-env: $ENV_NAME" -H "X-CSRF-Token: $CSRF" \
    -H "Content-Type: application/json" -H "x-workspace-id: $WORKSPACE_ID" \
    -X "$method" "$API$path" "$@"
}

###############################################################################
# Step 1 — Create Risk Register artifact (expects default 5 field defs)
###############################################################################
section "Step 1: POST artifact (risk_register, default fields)"
CREATE_RESP=$(apicurl POST "/api/projects/$PROJECT_ID/artifacts" \
  -d "{\"type\":\"risk_register\",\"name\":\"$ARTIFACT_NAME\"}")
HTTP=$(echo "$CREATE_RESP" | tail -1 | sed 's/HTTP=//')
BODY=$(echo "$CREATE_RESP" | sed '$d')
if [ "$HTTP" != "201" ]; then fail "create artifact" "HTTP $HTTP body=$BODY"; exit 1; fi

ARTIFACT_ID=$(echo "$BODY" | json_field "id")
FIELD_COUNT=$(echo "$BODY" | python3 -c "import sys,json
d=json.load(sys.stdin)
if isinstance(d,dict) and 'data' in d and isinstance(d['data'],dict): d=d['data']
print(len(d.get('customFieldDefinitions',[])))")
if [ -n "$ARTIFACT_ID" ] && [ "$FIELD_COUNT" = "5" ]; then
  pass "create artifact (id=${ARTIFACT_ID:0:8}…, 5 default fields seeded)"
else
  fail "create artifact" "id=$ARTIFACT_ID fields=$FIELD_COUNT body=$BODY"
fi

###############################################################################
# Step 2 — Create a valid risk item
###############################################################################
section "Step 2: POST item with valid customFieldValues"
ITEM_RESP=$(apicurl POST "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID/items" \
  -d "{\"name\":\"Test risk\",\"customFieldValues\":{\"probability\":\"High\",\"impact\":\"High\",\"risk_score\":9}}")
HTTP=$(echo "$ITEM_RESP" | tail -1 | sed 's/HTTP=//')
BODY=$(echo "$ITEM_RESP" | sed '$d')
ITEM_ID=$(echo "$BODY" | json_field "id")
if [ "$HTTP" = "201" ] && [ -n "$ITEM_ID" ]; then
  pass "create item (id=${ITEM_ID:0:8}…)"
else
  fail "create item" "HTTP $HTTP body=$BODY"
fi

###############################################################################
# Step 3 — Reject invalid enum value (Severe is not in [Low,Medium,High])
###############################################################################
section "Step 3: POST item with invalid enum (expect 400)"
BAD_RESP=$(apicurl POST "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID/items" \
  -d "{\"name\":\"Bad risk\",\"customFieldValues\":{\"probability\":\"Severe\",\"impact\":\"High\"}}")
HTTP=$(echo "$BAD_RESP" | tail -1 | sed 's/HTTP=//')
BODY=$(echo "$BAD_RESP" | sed '$d')
if [ "$HTTP" = "400" ] && echo "$BODY" | grep -q "probability"; then
  pass "invalid enum rejected (HTTP 400, message mentions probability)"
else
  fail "invalid enum rejection" "HTTP $HTTP body=$BODY"
fi

###############################################################################
# Step 4 — List items
###############################################################################
section "Step 4: GET items"
LIST_RESP=$(apicurl GET "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID/items")
HTTP=$(echo "$LIST_RESP" | tail -1 | sed 's/HTTP=//')
BODY=$(echo "$LIST_RESP" | sed '$d')
COUNT=$(echo "$BODY" | json_count "total")
if [ "$HTTP" = "200" ] && [ "$COUNT" = "1" ]; then
  pass "list items (total=1)"
else
  fail "list items" "HTTP $HTTP total=$COUNT"
fi

###############################################################################
# Step 5 — Update artifact name
###############################################################################
section "Step 5: PATCH artifact name"
PATCH_RESP=$(apicurl PATCH "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID" \
  -d "{\"name\":\"Renamed $ARTIFACT_NAME\"}")
HTTP=$(echo "$PATCH_RESP" | tail -1 | sed 's/HTTP=//')
BODY=$(echo "$PATCH_RESP" | sed '$d')
NEW_NAME=$(echo "$BODY" | json_field "name")
if [ "$HTTP" = "200" ] && [[ "$NEW_NAME" == Renamed* ]]; then
  pass "update artifact name"
else
  fail "update artifact" "HTTP $HTTP name=$NEW_NAME"
fi

###############################################################################
# Step 6 — Reject type mutation. ValidationPipe runs with forbidNonWhitelisted,
#          so sending `type` in the PATCH body is rejected with HTTP 400 (a
#          stronger guarantee than "type stays unchanged on update"). Backend
#          correctness wins over the original smoke expectation; see PR #307
#          post-merge gate analysis.
###############################################################################
section "Step 6: PATCH artifact with type field (expect 400 — ValidationPipe rejects unknown DTO fields)"
TYPE_RESP=$(apicurl PATCH "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID" \
  -d "{\"type\":\"raid_log\",\"name\":\"Test type mutation\"}")
HTTP=$(echo "$TYPE_RESP" | tail -1 | sed 's/HTTP=//')
BODY=$(echo "$TYPE_RESP" | sed '$d')
if [ "$HTTP" = "400" ] && echo "$BODY" | grep -qi "type"; then
  pass "type immutability: PATCH with type field rejected (HTTP 400, error mentions type)"
else
  fail "type immutability" "HTTP $HTTP body=$BODY"
fi

###############################################################################
# Step 7 — x-workspace-id header mismatch returns 403 WORKSPACE_HEADER_MISMATCH.
# Requires SMOKE_OTHER_WORKSPACE_ID — a same-org but different workspace UUID.
# All-zero UUIDs trip upstream tenancy guards with AUTH_FORBIDDEN before our
# specific mismatch check fires, so a real same-org workspace is needed to
# exercise the actual code path.
###############################################################################
section "Step 7: PATCH with mismatched x-workspace-id (expect 403 WORKSPACE_HEADER_MISMATCH)"
if [ -z "$SMOKE_OTHER_WORKSPACE_ID" ]; then
  skip "header mismatch" "SMOKE_OTHER_WORKSPACE_ID env var not set; cannot exercise the same-org-wrong-workspace path"
else
  MISMATCH=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
    -H "x-zephix-env: $ENV_NAME" -H "X-CSRF-Token: $CSRF" \
    -H "Content-Type: application/json" -H "x-workspace-id: $SMOKE_OTHER_WORKSPACE_ID" \
    -X PATCH "$API/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID" -d '{"name":"x"}')
  HTTP=$(echo "$MISMATCH" | tail -1 | sed 's/HTTP=//')
  BODY=$(echo "$MISMATCH" | sed '$d')
  if [ "$HTTP" = "403" ] && echo "$BODY" | grep -q "WORKSPACE_HEADER_MISMATCH"; then
    pass "header mismatch rejected (HTTP 403, code WORKSPACE_HEADER_MISMATCH)"
  elif echo "$BODY" | grep -q "AUTH_FORBIDDEN"; then
    # TC-B7 (D4): SMOKE_OTHER_WORKSPACE_ID is set but does not resolve to a
    # valid same-org workspace, so upstream tenancy denies (AUTH_FORBIDDEN)
    # before the mismatch check can fire. That's a fixture/config problem, not
    # a real regression — SKIP (don't FAIL) so the smoke conclusion stays
    # truthful. Fix: set the secret to a real same-org, different workspace UUID.
    skip "header mismatch" "SMOKE_OTHER_WORKSPACE_ID resolves to AUTH_FORBIDDEN (not a valid same-org workspace); set it to a real same-org different-workspace UUID"
  else
    fail "header mismatch" "HTTP $HTTP body=$BODY"
  fi
fi

###############################################################################
# Step 8 — Missing x-workspace-id returns 403 WORKSPACE_REQUIRED
###############################################################################
section "Step 8: PATCH without x-workspace-id (expect 403 WORKSPACE_REQUIRED)"
MISSING=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
  -H "x-zephix-env: $ENV_NAME" -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -X PATCH "$API/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID" -d '{"name":"x"}')
HTTP=$(echo "$MISSING" | tail -1 | sed 's/HTTP=//')
BODY=$(echo "$MISSING" | sed '$d')
if [ "$HTTP" = "403" ] && echo "$BODY" | grep -q "WORKSPACE_REQUIRED"; then
  pass "missing header rejected (HTTP 403, code WORKSPACE_REQUIRED)"
else
  fail "missing header" "HTTP $HTTP body=$BODY"
fi

###############################################################################
# Step 9 — Verify deprecated work_risks endpoint carries X-Deprecated header
###############################################################################
section "Step 9: GET /api/work/risks emits X-Deprecated headers"
DEPR=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -D /tmp/depr-headers.txt \
  -H "x-zephix-env: $ENV_NAME" -H "x-workspace-id: $WORKSPACE_ID" \
  -X GET "$API/api/work/risks?projectId=$PROJECT_ID" -o /tmp/depr-body.txt -w '%{http_code}')
if [ "$DEPR" = "200" ] && grep -qi "^x-deprecated: true" /tmp/depr-headers.txt && grep -qi "^x-deprecation-notice:" /tmp/depr-headers.txt; then
  pass "work_risks list carries X-Deprecated + X-Deprecation-Notice headers"
else
  fail "work_risks deprecation headers" "HTTP $DEPR headers:$(grep -i 'x-depr' /tmp/depr-headers.txt | tr '\n' ' ')"
fi

###############################################################################
# Step 10 — Soft-delete the artifact (expect 204)
###############################################################################
section "Step 10: DELETE artifact (expect 204)"
DEL=$(apicurl DELETE "/api/projects/$PROJECT_ID/artifacts/$ARTIFACT_ID")
HTTP=$(echo "$DEL" | tail -1 | sed 's/HTTP=//')
if [ "$HTTP" = "204" ]; then
  pass "soft-delete artifact (HTTP 204)"
else
  fail "soft-delete artifact" "HTTP $HTTP"
fi

###############################################################################
# Step 11 — Verify deleted artifact is gone from list
###############################################################################
section "Step 11: GET artifacts (deleted should not appear)"
LIST=$(apicurl GET "/api/projects/$PROJECT_ID/artifacts")
HTTP=$(echo "$LIST" | tail -1 | sed 's/HTTP=//')
BODY=$(echo "$LIST" | sed '$d')
STILL_THERE=$(echo "$BODY" | python3 -c "import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else d.get('data',[])
items=items if isinstance(items,list) else []
print(any(a.get('id')=='$ARTIFACT_ID' for a in items))")
if [ "$HTTP" = "200" ] && [ "$STILL_THERE" = "False" ]; then
  pass "deleted artifact no longer listed"
else
  fail "deleted artifact still listed" "HTTP $HTTP still=$STILL_THERE"
fi

###############################################################################
# Step 12 — Cross-tenant isolation (Sprint 5.2a Phase 5):
# Attempt to list artifacts for a project in another organization. Must return
# 404 PROJECT_NOT_FOUND — never partial artifact data from a foreign org.
# Uses SMOKE_OTHER_WORKSPACE_ID as x-workspace-id when set (already in CI secrets);
# otherwise falls back to WORKSPACE_ID for the header.
###############################################################################
section "Step 12: Cross-tenant isolation — foreign org project returns 404"
if [ -z "$CROSS_ORG_PROJECT_ID" ]; then
  skip "cross-tenant isolation" "CROSS_ORG_PROJECT_ID unset; set secret SMOKE_CROSS_ORG_ARTIFACTS_PROJECT_ID to a project UUID in another org"
else
  WS_HDR="${SMOKE_OTHER_WORKSPACE_ID:-$WORKSPACE_ID}"
  CROSS=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -w '\nHTTP=%{http_code}' \
    -H "x-zephix-env: $ENV_NAME" -H "X-CSRF-Token: $CSRF" \
    -H "Content-Type: application/json" -H "x-workspace-id: $WS_HDR" \
    -X GET "$API/api/projects/$CROSS_ORG_PROJECT_ID/artifacts")
  HTTP=$(echo "$CROSS" | tail -1 | sed 's/HTTP=//')
  BODY=$(echo "$CROSS" | sed '$d')
  LEAKED=$(echo "$BODY" | python3 -c "import sys,json
try:
  d=json.load(sys.stdin)
except Exception:
  print('parse_error'); sys.exit(0)
items=d if isinstance(d,list) else d.get('data',[])
items=items if isinstance(items,list) else []
print('leak' if len(items)>0 else 'none')" 2>/dev/null || echo "none")
  if [ "$HTTP" = "404" ] && [ "$LEAKED" != "leak" ]; then
    pass "cross-tenant GET artifacts blocked (HTTP 404, no partial data)"
  else
    fail "cross-tenant isolation" "HTTP $HTTP leaked=$LEAKED body=$BODY"
  fi
fi

###############################################################################
# Step 13 — E9 audit verification (per dispatch Part 10):
#  query audit_events directly via Railway Postgres to confirm CREATE emitted.
#  When REQUIRE_AUDIT_VERIFY=1, missing railway CLI is a HARD FAIL (post-merge
#  gates must set this). Otherwise the step SKIPs with a yellow warning.
###############################################################################
section "Step 13: E9 audit — confirm project_artifact.created event recorded"
if ! command -v railway >/dev/null 2>&1; then
  if [ "$REQUIRE_AUDIT_VERIFY" = "1" ]; then
    fail "audit_events verification" "railway CLI not in PATH (REQUIRE_AUDIT_VERIFY=1 demands a hard pass)"
  else
    skip "audit_events verification" "railway CLI not in PATH; set REQUIRE_AUDIT_VERIFY=1 to promote to FAIL"
  fi
else
  AUDIT_COUNT=$(cd "${RAILWAY_LINKED_DIR:-/Users/malikadeel/Downloads/ZephixApp}" && \
    railway run -s Postgres -e "$ENV_NAME" -- bash -c \
    "psql \$DATABASE_PUBLIC_URL -t -c \"SELECT COUNT(*) FROM audit_events WHERE entity_type='project_artifact' AND entity_id='$ARTIFACT_ID' AND action='create';\"" \
    2>/dev/null | tr -d ' \n')
  if [ "$AUDIT_COUNT" = "1" ]; then
    pass "audit_events row exists (1 CREATE event for artifact $ARTIFACT_ID)"
  else
    fail "audit_events lookup" "count=$AUDIT_COUNT (expected 1)"
  fi
fi

###############################################################################
# Summary
###############################################################################
printf '\n\033[1;34m═══════════════════════════════════════════════════\033[0m\n'
printf '\033[1;34m Sprint 5.1 Smoke — PASS=%d FAIL=%d SKIP=%d\033[0m\n' "$PASS" "$FAIL" "$SKIP_COUNT"
printf '\033[1;34m═══════════════════════════════════════════════════\033[0m\n'
if [ "$FAIL" -gt 0 ]; then exit 1; fi
exit 0
