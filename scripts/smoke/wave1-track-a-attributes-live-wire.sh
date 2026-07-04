#!/usr/bin/env bash
# WAVE 1 Track A — live-wire verification against staging attributes API.
# Usage:
#   STAGING_SMOKE_KEY=... WORKSPACE_ID=... TASK_ID=... \
#   LOCKED_ORG_DEF_ID=790c8b2c-.... \
#   ./scripts/smoke/wave1-track-a-attributes-live-wire.sh
set -euo pipefail

API="${API:-https://zephix-backend-staging-staging.up.railway.app/api}"
SMOKE_EMAIL="${SMOKE_EMAIL:-sandbox.admin@zephix.dev}"
SMOKE_KEY="${STAGING_SMOKE_KEY:?STAGING_SMOKE_KEY required}"
WORKSPACE_ID="${WORKSPACE_ID:?WORKSPACE_ID required}"
TASK_ID="${TASK_ID:?TASK_ID required}"
LOCKED_ORG_DEF_ID="${LOCKED_ORG_DEF_ID:?LOCKED_ORG_DEF_ID required (prefix 790c8b2c)}"
ENV_NAME="${ENV_NAME:-staging}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"

COOKIE_JAR="$(mktemp)"
CREATED_DEF_IDS=()

pass() { printf 'PASS %s\n' "$1"; }
fail() { printf 'FAIL %s — %s\n' "$1" "$2"; exit 1; }

read_csrf_from_jar() {
  awk '$6=="XSRF-TOKEN"{print $7}' "$COOKIE_JAR" | tail -1
}

refresh_csrf() {
  curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$API/auth/csrf" \
    -H "x-zephix-env: $ENV_NAME" -o /tmp/w1-csrf.json
  CSRF="$(read_csrf_from_jar)"
  if [[ -z "$CSRF" ]]; then
    CSRF="$(node -e "const j=require('/tmp/w1-csrf.json');process.stdout.write(j.csrfToken||j.token||j.data?.csrfToken||j.data?.token||'');")"
  fi
  [[ -n "$CSRF" ]] || fail "csrf" "no token after refresh"
}

teardown_created_definitions() {
  [[ ${#CREATED_DEF_IDS[@]} -gt 0 ]] || return 0
  refresh_csrf || true
  HDR=(-b "$COOKIE_JAR" -c "$COOKIE_JAR" -H "x-workspace-id: $WORKSPACE_ID" -H "x-zephix-env: $ENV_NAME" -H "X-CSRF-Token: $CSRF")
  for def_id in "${CREATED_DEF_IDS[@]}"; do
    [[ -n "$def_id" ]] || continue
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${HDR[@]}" \
      -X DELETE "$API/workspaces/$WORKSPACE_ID/attributes/definitions/$def_id" || echo "000")
    printf 'TEARDOWN DELETE %s HTTP %s\n' "$def_id" "$HTTP"
  done
}

trap 'teardown_created_definitions; rm -f "$COOKIE_JAR"' EXIT

echo "=== WAVE 1 Track A live-wire smoke ($RUN_ID) ==="
echo "API=$API WORKSPACE_ID=$WORKSPACE_ID TASK_ID=$TASK_ID"

# Auth (match test-project-artifacts CSRF + smoke-login flow)
refresh_csrf
LOGIN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$API/auth/smoke-login" \
  -H "Content-Type: application/json" -H "x-smoke-key: $SMOKE_KEY" -H "x-zephix-env: $ENV_NAME" \
  -H "X-CSRF-Token: $CSRF" -d "{\"email\":\"$SMOKE_EMAIL\"}")
[[ "$LOGIN_HTTP" == "200" || "$LOGIN_HTTP" == "204" ]] || fail "smoke-login" "HTTP $LOGIN_HTTP"

refresh_csrf

HDR=(-b "$COOKIE_JAR" -c "$COOKIE_JAR" -H "x-workspace-id: $WORKSPACE_ID" -H "x-zephix-env: $ENV_NAME" -H "X-CSRF-Token: $CSRF")

# (1) available definitions
AVAIL_HTTP=$(curl -s -o /tmp/w1-avail.json -w "%{http_code}" "${HDR[@]}" "$API/workspaces/$WORKSPACE_ID/attributes/available")
[[ "$AVAIL_HTTP" == "200" ]] || fail "GET available" "HTTP $AVAIL_HTTP"
AVAIL_COUNT=$(node -e "const j=require('/tmp/w1-avail.json');const d=j.data??j;process.stdout.write(String(Array.isArray(d)?d.length:0));")
SCOPES=$(node -e "const j=require('/tmp/w1-avail.json');const d=j.data??j;const s=new Set((d||[]).map(x=>x.scope));process.stdout.write([...s].sort().join(','));")
[[ "$AVAIL_COUNT" -gt 0 ]] || fail "GET available" "empty list"
pass "(1) GET .../attributes/available HTTP 200 count=$AVAIL_COUNT scopes=$SCOPES"

# (2) locked ORG definition present
node -e "
const j=require('/tmp/w1-avail.json');
const d=j.data??j;
const hit=(d||[]).find(x=>String(x.id).startsWith('790c8b2c')||x.id==='$LOCKED_ORG_DEF_ID');
if(!hit||hit.scope!=='ORG'||!hit.locked){process.exit(1);}
process.stdout.write('locked ORG id='+hit.id+' label='+hit.label);
" && pass "(2) locked ORG definition 790c8b2c present with locked=true" \
  || fail "(2) locked ORG" "definition $LOCKED_ORG_DEF_ID not found or not locked ORG"

# (3) create WORKSPACE field
CREATE_KEY="live_wire_${RUN_ID}"
CREATE_HTTP=$(curl -s -o /tmp/w1-create.json -w "%{http_code}" "${HDR[@]}" \
  -X POST "$API/workspaces/$WORKSPACE_ID/attributes/definitions" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$CREATE_KEY\",\"label\":\"Live Wire $RUN_ID\",\"dataType\":\"text\",\"required\":false}")
[[ "$CREATE_HTTP" == "201" || "$CREATE_HTTP" == "200" ]] || fail "(3) create" "HTTP $CREATE_HTTP body=$(cat /tmp/w1-create.json)"
NEW_DEF_ID=$(node -e "const j=require('/tmp/w1-create.json');const d=j.data??j;process.stdout.write(d.id||'');")
[[ -n "$NEW_DEF_ID" ]] || fail "(3) create" "missing id"
CREATED_DEF_IDS+=("$NEW_DEF_ID")
pass "(3) POST .../attributes/definitions HTTP $CREATE_HTTP id=$NEW_DEF_ID"

# (4) upsert + batch read persistence
TEXT_VAL="live-wire-$RUN_ID"
PUT_HTTP=$(curl -s -o /tmp/w1-put.json -w "%{http_code}" "${HDR[@]}" \
  -X PUT "$API/workspaces/$WORKSPACE_ID/tasks/$TASK_ID/attributes/$NEW_DEF_ID" \
  -H "Content-Type: application/json" \
  -d "{\"value\":\"$TEXT_VAL\"}")
[[ "$PUT_HTTP" == "200" ]] || fail "(4) PUT value" "HTTP $PUT_HTTP"
BATCH_HTTP=$(curl -s -o /tmp/w1-batch.json -w "%{http_code}" "${HDR[@]}" \
  "$API/workspaces/$WORKSPACE_ID/attributes/values?taskIds=$TASK_ID")
[[ "$BATCH_HTTP" == "200" ]] || fail "(4) batch GET" "HTTP $BATCH_HTTP"
W1_EXPECT_TEXT="$TEXT_VAL" W1_NEW_DEF_ID="$NEW_DEF_ID" node -e "
const j=require('/tmp/w1-batch.json');const rows=j.data??j;
const hit=(rows||[]).find(r=>(r.attributeDefinitionId||r.attribute_definition_id)===process.env.W1_NEW_DEF_ID);
const v=hit&&(hit.valueText??hit.value_text??hit.value);
if(v!==process.env.W1_EXPECT_TEXT){console.error('expected',process.env.W1_EXPECT_TEXT,'got',v);process.exit(1);}
" && pass "(4) PUT 200 + batch GET returns persisted value" \
  || fail "(4) persistence" "batch read mismatch"

# (5) wrong primitive → ATTRIBUTE_TYPE_MISMATCH
# Use a number field if available, else create one
NUM_DEF=$(node -e "
const j=require('/tmp/w1-avail.json');const d=j.data??j;
const n=(d||[]).find(x=>x.dataType==='number'||x.data_type==='number');
process.stdout.write(n?n.id:'');
")
NUM_DEF_CREATED=0
if [[ -z "$NUM_DEF" ]]; then
  curl -s "${HDR[@]}" -X POST "$API/workspaces/$WORKSPACE_ID/attributes/definitions" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"num_${RUN_ID}\",\"label\":\"Num $RUN_ID\",\"dataType\":\"number\",\"required\":false}" \
    -o /tmp/w1-numdef.json >/dev/null
  NUM_DEF=$(node -e "const j=require('/tmp/w1-numdef.json');process.stdout.write((j.data??j).id||'');")
  NUM_DEF_CREATED=1
fi
if [[ "$NUM_DEF_CREATED" == "1" && -n "$NUM_DEF" ]]; then
  CREATED_DEF_IDS+=("$NUM_DEF")
fi
MISMATCH_HTTP=$(curl -s -o /tmp/w1-mismatch.json -w "%{http_code}" "${HDR[@]}" \
  -X PUT "$API/workspaces/$WORKSPACE_ID/tasks/$TASK_ID/attributes/$NUM_DEF" \
  -H "Content-Type: application/json" \
  -d '{"value":"not-a-number"}')
[[ "$MISMATCH_HTTP" == "400" ]] || fail "(5) type mismatch" "HTTP $MISMATCH_HTTP"
node -e "const j=require('/tmp/w1-mismatch.json');const c=j.code||j.data?.code||j.response?.code;process.exit(c==='ATTRIBUTE_TYPE_MISMATCH'?0:1);" \
  && pass "(5) wrong primitive → 400 ATTRIBUTE_TYPE_MISMATCH" \
  || fail "(5) type mismatch" "code not ATTRIBUTE_TYPE_MISMATCH: $(cat /tmp/w1-mismatch.json)"

echo "=== ALL LIVE-WIRE CHECKS PASS ==="
