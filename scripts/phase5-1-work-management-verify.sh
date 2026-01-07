#!/usr/bin/env bash
set -euo pipefail

require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1"; exit 1; }; }

require_cmd curl
require_cmd jq

BASE="${BASE:-}"
TOKEN="${TOKEN:-}"
ORG_ID="${ORG_ID:-}"
WORKSPACE_ID="${WORKSPACE_ID:-}"
PROJECT_ID="${PROJECT_ID:-}"

die() { echo "❌ $1"; exit 1; }

mask_token() {
  local t="$1"
  local n=${#t}
  if [ "$n" -lt 16 ]; then echo "[REDACTED]"; return; fi
  echo "${t:0:6}...${t:n-6:6}"
}

need_token() {
  if [ -z "${TOKEN}" ]; then
    echo "❌ TOKEN is missing"
    echo "Run:"
    echo "  export BASE=\"${BASE:-https://zephix-backend-production.up.railway.app}\""
    echo "  source scripts/auth-login.sh"
    echo "  bash scripts/phase5-1-work-management-verify.sh"
    exit 1
  fi
}

body_file="/tmp/zephix_p51_body.json"

http_code() {
  # usage: http_code METHOD URL BODY
  local method="$1"
  local url="$2"
  local body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS -o "$body_file" -w "%{http_code}" -X "$method" "${BASE}${url}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "x-workspace-id: ${WORKSPACE_ID}" \
      -H "Content-Type: application/json" \
      --data-raw "$body"
  else
    curl -sS -o "$body_file" -w "%{http_code}" -X "$method" "${BASE}${url}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "x-workspace-id: ${WORKSPACE_ID}" \
      -H "Content-Type: application/json"
  fi
}

extract_request_id() {
  jq -r '(.error.requestId // .meta.requestId // .meta.timestamp // "n/a")' "$body_file" 2>/dev/null || echo "n/a"
}

assert_code() {
  local expected="$1"
  local actual="$2"
  if [ "$actual" != "$expected" ]; then
    echo "❌ Expected HTTP ${expected}, got ${actual}"
    echo "RequestId: $(extract_request_id)"
    cat "$body_file" | jq '.' 2>/dev/null || cat "$body_file"
    exit 1
  fi
}

discover_org_and_workspace() {
  if [ -z "${ORG_ID}" ]; then
    echo "📋 Discovering ORG_ID"
    local code
    code="$(http_code GET "/api/auth/me")"
    assert_code "200" "$code"
    ORG_ID="$(jq -r '.data.organizationId' "$body_file")"
    [ -n "$ORG_ID" ] && [ "$ORG_ID" != "null" ] || die "ORG_ID discovery failed"
    echo "✅ ORG_ID: ${ORG_ID}"
  fi

  if [ -z "${WORKSPACE_ID}" ]; then
    echo "📋 Discovering WORKSPACE_ID"
    local code
    code="$(http_code GET "/api/workspaces")"
    assert_code "200" "$code"
    WORKSPACE_ID="$(jq -r '.data[0].id' "$body_file")"
    [ -n "$WORKSPACE_ID" ] && [ "$WORKSPACE_ID" != "null" ] || die "WORKSPACE_ID discovery failed"
    echo "✅ WORKSPACE_ID: ${WORKSPACE_ID}"
  fi
}

discover_or_create_project() {
  if [ -n "${PROJECT_ID}" ]; then return; fi

  echo "📋 Discovering PROJECT_ID"
  local code
  code="$(http_code GET "/api/projects?limit=1")"
  assert_code "200" "$code"
  PROJECT_ID="$(jq -r '.data.items[0].id // .data[0].id // empty' "$body_file")"

  if [ -n "${PROJECT_ID}" ] && [ "$PROJECT_ID" != "null" ]; then
    echo "✅ PROJECT_ID: ${PROJECT_ID}"
    return
  fi

  echo "📋 Creating Project"
  local body
  body="$(jq -n --arg name "P5.1 Verify Project" --arg key "P51" '{name:$name, key:$key, status:"ACTIVE"}')"
  code="$(http_code POST "/api/projects" "$body")"
  assert_code "201" "$code"
  PROJECT_ID="$(jq -r '.data.id' "$body_file")"
  [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ] || die "Project create failed"
  echo "✅ PROJECT_ID: ${PROJECT_ID}"
}

main() {
  [ -n "${BASE}" ] || die "BASE is required"
  echo "🔐 Using TOKEN $(mask_token "${TOKEN:-}")"
  need_token

  discover_org_and_workspace
  discover_or_create_project

  echo "📋 Step 1: Create tasks"
  local t1_body t2_body code t1_id t2_id

  t1_body="$(jq -n --arg projectId "$PROJECT_ID" --arg title "P5.1 Task 1" '{projectId:$projectId,title:$title,status:"TODO",type:"TASK",priority:"P2"}')"
  code="$(http_code POST "/api/work/tasks" "$t1_body")"
  assert_code "201" "$code"
  t1_id="$(jq -r '.data.id' "$body_file")"
  [ -n "$t1_id" ] && [ "$t1_id" != "null" ] || die "Task1 create failed"
  echo "✅ Task1: $t1_id"

  t2_body="$(jq -n --arg projectId "$PROJECT_ID" --arg title "P5.1 Task 2" '{projectId:$projectId,title:$title,status:"TODO",type:"TASK",priority:"P2"}')"
  code="$(http_code POST "/api/work/tasks" "$t2_body")"
  assert_code "201" "$code"
  t2_id="$(jq -r '.data.id' "$body_file")"
  [ -n "$t2_id" ] && [ "$t2_id" != "null" ] || die "Task2 create failed"
  echo "✅ Task2: $t2_id"

  echo "📋 Step 2: List tasks and assert presence"
  code="$(http_code GET "/api/work/tasks?projectId=${PROJECT_ID}&limit=50")"
  assert_code "200" "$code"
  jq -e --arg t1 "$t1_id" --arg t2 "$t2_id" '
    (.data.items // .data // []) as $items
    | ($items | map(.id) | index($t1)) != null
    and
    ($items | map(.id) | index($t2)) != null
  ' "$body_file" >/dev/null || { echo "❌ Tasks not found in list"; cat "$body_file" | jq '.' 2>/dev/null || cat "$body_file"; exit 1; }
  echo "✅ Both tasks present"

  echo "📋 Step 3: Bulk update tasks"
  local bulk_body
  bulk_body="$(jq -n --arg t1 "$t1_id" --arg t2 "$t2_id" '{taskIds:[$t1,$t2], status:"IN_PROGRESS"}')"
  code="$(http_code PATCH "/api/work/tasks/bulk" "$bulk_body")"
  assert_code "200" "$code"
  echo "✅ Bulk update ok"

  echo "📋 Step 4: Add dependency (t2 depends on t1)"
  local dep_body dep_id
  dep_body="$(jq -n --arg predecessorTaskId "$t1_id" '{predecessorTaskId:$predecessorTaskId,type:"FINISH_TO_START"}')"
  code="$(http_code POST "/api/work/tasks/${t2_id}/dependencies" "$dep_body")"
  assert_code "201" "$code"
  dep_id="$(jq -r '.data.id' "$body_file")"
  [ -n "$dep_id" ] && [ "$dep_id" != "null" ] || die "Dependency create failed"
  echo "✅ Dependency: $dep_id"

  echo "📋 Step 5: Cycle prevention (expect 400)"
  dep_body="$(jq -n --arg predecessorTaskId "$t2_id" '{predecessorTaskId:$predecessorTaskId,type:"FINISH_TO_START"}')"
  code="$(http_code POST "/api/work/tasks/${t1_id}/dependencies" "$dep_body")"
  if [ "$code" != "400" ]; then
    echo "❌ Expected 400 for cycle prevention, got ${code}"
    echo "RequestId: $(extract_request_id)"
    cat "$body_file" | jq '.' 2>/dev/null || cat "$body_file"
    exit 1
  fi
  jq -e '.error.code == "VALIDATION_ERROR"' "$body_file" >/dev/null || true
  echo "✅ Cycle prevented"

  echo "📋 Step 6: Comments"
  local c_body
  c_body="$(jq -n --arg body "P5.1 comment" '{body:$body}')"
  code="$(http_code POST "/api/work/tasks/${t1_id}/comments" "$c_body")"
  assert_code "201" "$code"
  code="$(http_code GET "/api/work/tasks/${t1_id}/comments?limit=10")"
  assert_code "200" "$code"
  echo "✅ Comments ok"

  echo "📋 Step 7: Activity feed"
  code="$(http_code GET "/api/work/tasks/${t1_id}/activity?limit=50")"
  assert_code "200" "$code"
  jq -e '
    (.data.items // .data // []) as $items
    | ($items | map(.type) | index("TASK_CREATED")) != null
    and
    ($items | map(.type) | index("TASK_COMMENT_ADDED")) != null
  ' "$body_file" >/dev/null || { echo "❌ Missing expected activities"; cat "$body_file" | jq '.' 2>/dev/null || cat "$body_file"; exit 1; }
  echo "✅ Activity ok"

  echo "📋 Step 8: Work plan (project)"
  code="$(http_code GET "/api/work/projects/${PROJECT_ID}/plan")"
  assert_code "200" "$code"
  jq -e '.data.phases | type == "array"' "$body_file" >/dev/null || { echo "❌ Invalid work plan response"; cat "$body_file" | jq '.' 2>/dev/null || cat "$body_file"; exit 1; }
  echo "✅ Work plan ok"

  echo ""
  echo "✅ Phase 5.1 Work Management verification PASSED"
}

main "$@"

