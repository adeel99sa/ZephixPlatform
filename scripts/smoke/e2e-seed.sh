#!/usr/bin/env bash
###############################################################################
# Zephix E2E Seed Script
# Creates a deterministic baseline dataset through API calls.
# Outputs all IDs to scripts/smoke/e2e-ids.json.
#
# Usage:
#   ./scripts/smoke/e2e-seed.sh [BASE_URL]
#
# Environment:
#   BASE_URL  – API root (default: http://localhost:3000/api)
#   SEED_EMAIL – Admin email (default: e2e-admin@zephix-test.com)
#   SEED_PASSWORD – Admin password (default: E2eTest!2026)
###############################################################################
set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000/api}}"
SEED_EMAIL="${SEED_EMAIL:-admin@zephix.ai}"
SEED_PASSWORD="${SEED_PASSWORD:-admin123456}"
IDS_FILE="$(cd "$(dirname "$0")" && pwd)/e2e-ids.json"
COOKIE_JAR="$(mktemp)"
TIMESTAMP="$(date +%s)"

trap 'rm -f "$COOKIE_JAR"' EXIT

# ─── Helpers ────────────────────────────────────────────────────────────────

log()  { printf '\033[1;34m[SEED]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[SEED FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

# curl wrapper: auto-adds cookies, content-type, fail on HTTP errors
apicurl() {
  local method="$1"; shift
  local url="$1"; shift
  curl -s -f -X "$method" \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    "$@" \
    "${BASE_URL}${url}" 2>/dev/null || {
      echo "CURL_FAILED"
      return 1
    }
}

# Extract field from JSON (portable, no jq required but prefer jq)
json_field() {
  local json="$1" field="$2"
  if command -v jq &>/dev/null; then
    echo "$json" | jq -r ".$field // empty"
  else
    echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$field',''))" 2>/dev/null || echo ""
  fi
}

# Extract from nested .data envelope
json_data_field() {
  local json="$1" field="$2"
  if command -v jq &>/dev/null; then
    echo "$json" | jq -r "(.data // .).$field // empty"
  else
    echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); o=d.get('data',d); print(o.get('$field',''))" 2>/dev/null || echo ""
  fi
}

###############################################################################
# STEP 0: Check health
###############################################################################
log "Checking backend health at ${BASE_URL}/health ..."
HEALTH=$(curl -s -f "${BASE_URL}/health" 2>/dev/null) || fail "Backend health check failed at ${BASE_URL}/health"
log "Backend is healthy."

###############################################################################
# STEP 0.5: Acquire CSRF token (must happen before any mutation)
###############################################################################
log "Fetching CSRF token ..."
CSRF_RESP=$(apicurl GET "/auth/csrf") || true
CSRF_TOKEN=""
if command -v jq &>/dev/null && [ -n "$CSRF_RESP" ] && [ "$CSRF_RESP" != "CURL_FAILED" ]; then
  CSRF_TOKEN=$(echo "$CSRF_RESP" | jq -r '.csrfToken // .token // empty' 2>/dev/null || echo "")
fi
# Also try cookie
if [ -z "$CSRF_TOKEN" ]; then
  CSRF_TOKEN=$(grep -i 'XSRF-TOKEN' "$COOKIE_JAR" 2>/dev/null | awk '{print $NF}' || echo "")
fi

CSRF_HEADER=""
if [ -n "$CSRF_TOKEN" ]; then
  CSRF_HEADER="-H x-csrf-token:${CSRF_TOKEN}"
  log "CSRF token acquired."
else
  log "Warning: No CSRF token acquired. Mutations may fail."
fi

###############################################################################
# STEP 1: Login (use existing demo admin or SEED_EMAIL)
###############################################################################
log "Logging in as ${SEED_EMAIL} ..."
LOGIN_RESP=$(apicurl POST "/auth/login" \
  -d "{\"email\":\"${SEED_EMAIL}\",\"password\":\"${SEED_PASSWORD}\"}") \
  || fail "Login failed for ${SEED_EMAIL}. Ensure the user exists and password is correct."

# Refresh CSRF after login (cookies may have changed)
CSRF_RESP2=$(apicurl GET "/auth/csrf") || true
if command -v jq &>/dev/null && [ -n "$CSRF_RESP2" ] && [ "$CSRF_RESP2" != "CURL_FAILED" ]; then
  CSRF_NEW=$(echo "$CSRF_RESP2" | jq -r '.csrfToken // .token // empty' 2>/dev/null || echo "")
  [ -n "$CSRF_NEW" ] && CSRF_TOKEN="$CSRF_NEW"
fi

# curl wrapper for mutations (includes CSRF)
apimut() {
  local method="$1"; shift
  local url="$1"; shift
  if [ -n "$CSRF_HEADER" ]; then
    apicurl "$method" "$url" -H "x-csrf-token:${CSRF_TOKEN}" "$@"
  else
    apicurl "$method" "$url" "$@"
  fi
}

###############################################################################
# STEP 2: Get user profile + org ID
###############################################################################
log "Getting user profile ..."
ME_RESP=$(apicurl GET "/auth/me") || fail "GET /auth/me failed"
USER_ID=$(json_data_field "$ME_RESP" "id")
ORG_ID=$(json_data_field "$ME_RESP" "organizationId")

if [ -z "$USER_ID" ]; then
  fail "Could not extract user ID from /auth/me"
fi
if [ -z "$ORG_ID" ]; then
  # Try /organizations
  ORGS_RESP=$(apicurl GET "/organizations") || true
  if command -v jq &>/dev/null; then
    ORG_ID=$(echo "$ORGS_RESP" | jq -r '(if type == "array" then .[0].id elif .data then (.data | if type == "array" then .[0].id else .id end) else .id end) // empty' 2>/dev/null || echo "")
  fi
fi
[ -z "$ORG_ID" ] && fail "Could not extract organization ID"

log "User ID: ${USER_ID}"
log "Org ID:  ${ORG_ID}"

###############################################################################
# STEP 3: Create workspace (fall back to existing if creation fails)
###############################################################################
WS_NAME="E2E Workspace ${TIMESTAMP}"
WS_SLUG="e2e-ws-${TIMESTAMP}"
WS_ID=""

log "Creating workspace '${WS_NAME}' ..."
WS_RESP=$(apimut POST "/workspaces" \
  -d "{
    \"name\": \"${WS_NAME}\",
    \"slug\": \"${WS_SLUG}\",
    \"description\": \"E2E smoke test workspace\"
  }") || true

if [ -n "$WS_RESP" ] && [ "$WS_RESP" != "CURL_FAILED" ]; then
  WS_ID=$(json_data_field "$WS_RESP" "id")
fi

# If workspace creation failed, use the first existing workspace
if [ -z "$WS_ID" ] || [ "$WS_ID" = "null" ]; then
  log "Workspace creation failed. Listing existing workspaces ..."
  WS_LIST=$(apicurl GET "/workspaces") || fail "GET /workspaces failed"
  if command -v jq &>/dev/null; then
    WS_ID=$(echo "$WS_LIST" | jq -r '(if .data then (if (.data | type == "array") then .data[0].id else .data.id end) elif type == "array" then .[0].id else .id end) // empty' 2>/dev/null || echo "")
    WS_NAME=$(echo "$WS_LIST" | jq -r '(if .data then (if (.data | type == "array") then .data[0].name else .data.name end) elif type == "array" then .[0].name else .name end) // empty' 2>/dev/null || echo "Existing Workspace")
    WS_SLUG=$(echo "$WS_LIST" | jq -r '(if .data then (if (.data | type == "array") then .data[0].slug else .data.slug end) elif type == "array" then .[0].slug else .slug end) // empty' 2>/dev/null || echo "existing")
  fi
fi

[ -z "$WS_ID" ] || [ "$WS_ID" = "null" ] && fail "Could not obtain workspace ID"
log "Workspace ID: ${WS_ID} (${WS_NAME})"

# All subsequent calls need workspace header
ws_header() { echo "-H x-workspace-id:${WS_ID}"; }

# Workspace-scoped mutation helper
wsmut() {
  local method="$1"; shift
  local url="$1"; shift
  if [ -n "$CSRF_TOKEN" ]; then
    apicurl "$method" "$url" -H "x-workspace-id:${WS_ID}" -H "x-csrf-token:${CSRF_TOKEN}" "$@"
  else
    apicurl "$method" "$url" -H "x-workspace-id:${WS_ID}" "$@"
  fi
}
wsget() {
  local url="$1"; shift
  apicurl GET "$url" -H "x-workspace-id:${WS_ID}" "$@"
}

###############################################################################
# STEP 4: Find templates for project creation
###############################################################################
log "Fetching template recommendations ..."
TMPL_RESP=$(wsget "/templates/recommendations?containerType=PROJECT") || true

TEMPLATE_A_ID=""
TEMPLATE_B_ID=""

if command -v jq &>/dev/null && [ -n "$TMPL_RESP" ] && [ "$TMPL_RESP" != "CURL_FAILED" ]; then
  TEMPLATE_A_ID=$(echo "$TMPL_RESP" | jq -r '(.data // .).recommended[0].templateId // (.data // .).others[0].templateId // empty' 2>/dev/null || echo "")
  TEMPLATE_B_ID=$(echo "$TMPL_RESP" | jq -r '(.data // .).recommended[1].templateId // (.data // .).others[1].templateId // empty' 2>/dev/null || echo "")
fi

# Fallback: list all templates
if [ -z "$TEMPLATE_A_ID" ]; then
  log "No recommendations. Listing all templates ..."
  ALL_TMPL=$(wsget "/templates") || true
  if command -v jq &>/dev/null && [ -n "$ALL_TMPL" ] && [ "$ALL_TMPL" != "CURL_FAILED" ]; then
    TEMPLATE_A_ID=$(echo "$ALL_TMPL" | jq -r '(if type == "array" then .[0].id elif .data and (.data | type == "array") then .data[0].id else empty end) // empty' 2>/dev/null || echo "")
    TEMPLATE_B_ID=$(echo "$ALL_TMPL" | jq -r '(if type == "array" then .[1].id elif .data and (.data | type == "array") then .data[1].id else empty end) // empty' 2>/dev/null || echo "")
  fi
fi

log "Template A: ${TEMPLATE_A_ID:-NONE}"
log "Template B: ${TEMPLATE_B_ID:-NONE}"

###############################################################################
# STEP 5: Create projects (from templates if possible, else plain)
###############################################################################
create_project() {
  local name="$1" template_id="$2"
  local body

  if [ -n "$template_id" ]; then
    # Try template instantiation first
    log "Instantiating project '${name}' from template ${template_id} ..."
    local inst_resp
    inst_resp=$(wsmut POST "/templates/${template_id}/instantiate-v5_1" \
      -d "{\"projectName\":\"${name}\"}") || true
    local pid
    pid=$(json_data_field "$inst_resp" "projectId")
    if [ -n "$pid" ] && [ "$pid" != "null" ]; then
      echo "$pid"
      return 0
    fi
    log "Template instantiation failed; creating plain project."
  fi

  body="{\"name\":\"${name}\",\"workspaceId\":\"${WS_ID}\"}"
  local resp
  resp=$(wsmut POST "/projects" -d "$body") || fail "POST /projects failed for '${name}'"
  json_data_field "$resp" "id"
}

PROJECT_A_ID=$(create_project "E2E Project Alpha (Small)" "$TEMPLATE_A_ID")
[ -z "$PROJECT_A_ID" ] && fail "Could not create Project A"
log "Project A ID: ${PROJECT_A_ID}"

PROJECT_B_ID=$(create_project "E2E Project Beta (Medium)" "$TEMPLATE_B_ID")
[ -z "$PROJECT_B_ID" ] && fail "Could not create Project B"
log "Project B ID: ${PROJECT_B_ID}"

###############################################################################
# STEP 6: Create phases (3 per project)
###############################################################################
create_phases() {
  local project_id="$1" prefix="$2"
  local phase_ids=""
  for i in 1 2 3; do
    local resp
    resp=$(wsmut POST "/work/phases" \
      -d "{\"projectId\":\"${project_id}\",\"name\":\"${prefix} Phase ${i}\"}") || {
      log "Warning: Phase creation failed for ${prefix} Phase ${i}"
      continue
    }
    local pid
    pid=$(json_data_field "$resp" "id")
    [ -n "$pid" ] && phase_ids="${phase_ids}${pid},"
  done
  echo "${phase_ids%,}"
}

log "Creating phases for Project A ..."
PHASES_A=$(create_phases "$PROJECT_A_ID" "Alpha")
log "Project A phases: ${PHASES_A}"

log "Creating phases for Project B ..."
PHASES_B=$(create_phases "$PROJECT_B_ID" "Beta")
log "Project B phases: ${PHASES_B}"

# Parse first phase ID for each project
PHASE_A1=$(echo "$PHASES_A" | cut -d, -f1)
PHASE_B1=$(echo "$PHASES_B" | cut -d, -f1)

###############################################################################
# STEP 7: Create tasks (10 per project)
###############################################################################
create_tasks() {
  local project_id="$1" phase_id="$2" prefix="$3"
  local task_ids=""
  local statuses=("TODO" "TODO" "IN_PROGRESS" "IN_PROGRESS" "IN_PROGRESS" "DONE" "DONE" "DONE" "BACKLOG" "BLOCKED")
  local priorities=("LOW" "MEDIUM" "HIGH" "CRITICAL" "MEDIUM" "LOW" "HIGH" "MEDIUM" "LOW" "HIGH")

  for i in $(seq 1 10); do
    local idx=$((i - 1))
    local status="${statuses[$idx]}"
    local priority="${priorities[$idx]}"
    local assignee=""
    # Assign first 3 tasks to the admin user for testing
    if [ $i -le 3 ]; then
      assignee="\"assigneeUserId\":\"${USER_ID}\","
    fi

    local body="{
      \"projectId\":\"${project_id}\",
      \"title\":\"${prefix} Task ${i} - E2E\",
      \"description\":\"E2E smoke test task ${i}\",
      ${assignee}
      \"priority\":\"${priority}\"
    }"

    local resp
    resp=$(wsmut POST "/work/tasks" -d "$body") || {
      log "Warning: Task creation failed for ${prefix} Task ${i}"
      continue
    }
    local tid
    tid=$(json_data_field "$resp" "id")
    [ -n "$tid" ] && task_ids="${task_ids}${tid},"

    # Update status if not default
    if [ "$status" != "TODO" ] && [ -n "$tid" ]; then
      # Need transition path: TODO -> target
      case "$status" in
        IN_PROGRESS)
          wsmut PATCH "/work/tasks/${tid}" -d "{\"status\":\"IN_PROGRESS\"}" >/dev/null 2>&1 || true
          ;;
        DONE)
          wsmut PATCH "/work/tasks/${tid}" -d "{\"status\":\"IN_PROGRESS\"}" >/dev/null 2>&1 || true
          wsmut PATCH "/work/tasks/${tid}" -d "{\"status\":\"DONE\"}" >/dev/null 2>&1 || true
          ;;
        BACKLOG)
          # BACKLOG might be initial; try setting directly
          wsmut PATCH "/work/tasks/${tid}" -d "{\"status\":\"BACKLOG\"}" >/dev/null 2>&1 || true
          ;;
        BLOCKED)
          wsmut PATCH "/work/tasks/${tid}" -d "{\"status\":\"IN_PROGRESS\"}" >/dev/null 2>&1 || true
          wsmut PATCH "/work/tasks/${tid}" -d "{\"status\":\"BLOCKED\"}" >/dev/null 2>&1 || true
          ;;
      esac
    fi
  done
  echo "${task_ids%,}"
}

log "Creating 10 tasks for Project A ..."
TASKS_A=$(create_tasks "$PROJECT_A_ID" "$PHASE_A1" "Alpha")
log "Project A tasks created."

log "Creating 10 tasks for Project B ..."
TASKS_B=$(create_tasks "$PROJECT_B_ID" "$PHASE_B1" "Beta")
log "Project B tasks created."

# Parse first few task IDs
TASK_A1=$(echo "$TASKS_A" | cut -d, -f1)
TASK_A2=$(echo "$TASKS_A" | cut -d, -f2)
TASK_A3=$(echo "$TASKS_A" | cut -d, -f3)
TASK_B1=$(echo "$TASKS_B" | cut -d, -f1)
TASK_B2=$(echo "$TASKS_B" | cut -d, -f2)

###############################################################################
# STEP 8: Create risks (2 per project)
###############################################################################
create_risks() {
  local project_id="$1" prefix="$2"
  local risk_ids=""

  local body1="{
    \"projectId\":\"${project_id}\",
    \"title\":\"${prefix} Risk: Schedule Overrun\",
    \"description\":\"Risk of schedule overrun due to dependency delays\",
    \"severity\":\"HIGH\",
    \"status\":\"OPEN\",
    \"ownerUserId\":\"${USER_ID}\"
  }"
  local resp1
  resp1=$(wsmut POST "/work/risks" -d "$body1") || {
    log "Warning: Risk 1 creation failed for ${prefix}"
  }
  local rid1
  rid1=$(json_data_field "$resp1" "id")
  [ -n "$rid1" ] && risk_ids="${risk_ids}${rid1},"

  local body2="{
    \"projectId\":\"${project_id}\",
    \"title\":\"${prefix} Risk: Resource Shortage\",
    \"description\":\"Risk of insufficient resources for critical path\",
    \"severity\":\"MEDIUM\",
    \"status\":\"OPEN\",
    \"ownerUserId\":\"${USER_ID}\"
  }"
  local resp2
  resp2=$(wsmut POST "/work/risks" -d "$body2") || {
    log "Warning: Risk 2 creation failed for ${prefix}"
  }
  local rid2
  rid2=$(json_data_field "$resp2" "id")
  [ -n "$rid2" ] && risk_ids="${risk_ids}${rid2},"

  echo "${risk_ids%,}"
}

log "Creating risks for Project A ..."
RISKS_A=$(create_risks "$PROJECT_A_ID" "Alpha")
log "Project A risks: ${RISKS_A}"

log "Creating risks for Project B ..."
RISKS_B=$(create_risks "$PROJECT_B_ID" "Beta")
log "Project B risks: ${RISKS_B}"

###############################################################################
# STEP 9: Create resource allocations (6 total across projects)
###############################################################################
create_allocation() {
  local project_id="$1" prefix="$2" pct="${3:-50}"
  local alloc_ids=""

  # One allocation per user per project (backend enforces uniqueness)
  local body="{
    \"projectId\":\"${project_id}\",
    \"userId\":\"${USER_ID}\",
    \"allocationPercent\":${pct},
    \"startDate\":\"2026-02-01\",
    \"endDate\":\"2026-06-30\"
  }"
  local resp
  resp=$(wsmut POST "/work/resources/allocations" -d "$body") || {
    # May already exist from previous run — try to find existing
    log "Allocation creation failed for ${prefix}. Checking for existing ..."
    local existing
    existing=$(wsget "/work/resources/allocations?projectId=${project_id}")
    if command -v jq &>/dev/null && [ -n "$existing" ]; then
      local eid
      eid=$(echo "$existing" | jq -r '((.data // .).items // .)[0].id // empty' 2>/dev/null || echo "")
      if [ -n "$eid" ] && [ "$eid" != "null" ]; then
        log "Using existing allocation ${eid} for ${prefix}"
        echo "$eid"
        return 0
      fi
    fi
    log "Warning: No allocation for ${prefix}"
    return 0
  }
  local aid
  aid=$(json_data_field "$resp" "id")
  [ -n "$aid" ] && echo "$aid"
}

log "Creating allocation for Project A ..."
ALLOC_A1=$(create_allocation "$PROJECT_A_ID" "Alpha" 60)
log "Project A allocation: ${ALLOC_A1}"

log "Creating allocation for Project B ..."
ALLOC_B1=$(create_allocation "$PROJECT_B_ID" "Beta" 40)
log "Project B allocation: ${ALLOC_B1}"

###############################################################################
# STEP 10: Create a comment on seeded task (Wave 1)
###############################################################################
log "Adding comment on Task A1 ..."
COMMENT_RESP=$(wsmut POST "/work/tasks/${TASK_A1}/comments" \
  -d "{\"body\":\"E2E seed comment on task A1 – verifying comments work end to end.\"}" 2>/dev/null) || true
COMMENT_ID=$(echo "$COMMENT_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$COMMENT_ID" ] || [ "$COMMENT_ID" = "null" ] && { COMMENT_ID=""; log "Warning: Comment creation failed"; }
log "Comment ID: ${COMMENT_ID:-none}"

###############################################################################
# STEP 10b: Create a dependency between seeded tasks (Wave 1)
###############################################################################
log "Adding dependency: Task A1 blocks Task A2 ..."
DEP_RESP=$(wsmut POST "/work/tasks/${TASK_A2}/dependencies" \
  -d "{\"predecessorTaskId\":\"${TASK_A1}\",\"type\":\"FINISH_TO_START\"}" 2>/dev/null) || true
DEP_ID=$(echo "$DEP_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$DEP_ID" ] || [ "$DEP_ID" = "null" ] && { DEP_ID=""; log "Warning: Dependency creation failed"; }
log "Dependency ID: ${DEP_ID:-none}"

###############################################################################
# STEP 11: Set story points on tasks
###############################################################################
log "Setting story points on tasks ..."
wsmut PATCH "/work/tasks/${TASK_A1}" -d '{"storyPoints":5}' >/dev/null 2>&1 || log "Warning: SP update A1 failed"
wsmut PATCH "/work/tasks/${TASK_A2}" -d '{"storyPoints":3}' >/dev/null 2>&1 || log "Warning: SP update A2 failed"
TASK_A3=$(echo "$TASKS_A" | cut -d, -f3)
[ -n "$TASK_A3" ] && wsmut PATCH "/work/tasks/${TASK_A3}" -d '{"storyPoints":8}' >/dev/null 2>&1 || true

###############################################################################
# STEP 12: Create a sprint and assign tasks
###############################################################################
log "Creating sprint for Project A ..."
SPRINT_START=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d)
SPRINT_END=$(date -v+15d +%Y-%m-%d 2>/dev/null || date -d "+15 days" +%Y-%m-%d)
SPRINT_RESP=$(wsmut POST "/work/sprints" \
  -d "{\"projectId\":\"${PROJECT_A_ID}\",\"name\":\"Sprint 1\",\"goal\":\"E2E smoke sprint\",\"startDate\":\"${SPRINT_START}\",\"endDate\":\"${SPRINT_END}\"}" 2>/dev/null) || true
SPRINT_ID=$(echo "$SPRINT_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$SPRINT_ID" ] || [ "$SPRINT_ID" = "null" ] && { SPRINT_ID=""; log "Warning: Sprint creation failed"; }
log "Sprint ID: ${SPRINT_ID:-none}"

if [ -n "$SPRINT_ID" ]; then
  log "Assigning tasks A1 and A2 to sprint ..."
  wsmut POST "/work/sprints/${SPRINT_ID}/tasks" \
    -d "{\"taskIds\":[\"${TASK_A1}\",\"${TASK_A2}\"]}" >/dev/null 2>&1 || log "Warning: Task assignment failed"
fi

# Create a completed sprint for velocity testing
log "Creating completed sprint for velocity ..."
VSPRINT_START=$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d "-30 days" +%Y-%m-%d)
VSPRINT_END=$(date -v-16d +%Y-%m-%d 2>/dev/null || date -d "-16 days" +%Y-%m-%d)
VSPRINT_RESP=$(wsmut POST "/work/sprints" \
  -d "{\"projectId\":\"${PROJECT_A_ID}\",\"name\":\"Sprint 0 (done)\",\"goal\":\"Velocity seed\",\"startDate\":\"${VSPRINT_START}\",\"endDate\":\"${VSPRINT_END}\"}" 2>/dev/null) || true
VSPRINT_ID=$(echo "$VSPRINT_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$VSPRINT_ID" ] && [ "$VSPRINT_ID" != "null" ]; then
  # Start then complete the sprint
  wsmut PATCH "/work/sprints/${VSPRINT_ID}" -d '{"status":"ACTIVE"}' >/dev/null 2>&1 || true
  wsmut PATCH "/work/sprints/${VSPRINT_ID}" -d '{"status":"COMPLETED"}' >/dev/null 2>&1 || true
  log "Completed sprint ID: ${VSPRINT_ID}"
else
  VSPRINT_ID=""
  log "Warning: Velocity sprint creation failed"
fi

###############################################################################
# STEP 13: Update project budget fields (budget on Project entity)
###############################################################################
log "Setting budget on Project A ..."
wsmut PATCH "/projects/${PROJECT_A_ID}" \
  -d '{"budget":50000,"actualCost":15000}' >/dev/null 2>&1 || log "Warning: Budget update A failed"

log "Setting budget on Project B ..."
wsmut PATCH "/projects/${PROJECT_B_ID}" \
  -d '{"budget":120000,"actualCost":45000}' >/dev/null 2>&1 || log "Warning: Budget update B failed"

###############################################################################
# STEP 14: Complete onboarding (if required)
###############################################################################
log "Completing onboarding ..."
wsmut POST "/organizations/onboarding/complete" -d '{}' >/dev/null 2>&1 || true

###############################################################################
# STEP 13: Write IDs file
###############################################################################
log "Writing IDs to ${IDS_FILE} ..."

cat > "$IDS_FILE" <<JSONEOF
{
  "timestamp": "${TIMESTAMP}",
  "baseUrl": "${BASE_URL}",
  "auth": {
    "email": "${SEED_EMAIL}",
    "password": "${SEED_PASSWORD}"
  },
  "userId": "${USER_ID}",
  "organizationId": "${ORG_ID}",
  "workspaceId": "${WS_ID}",
  "workspaceName": "${WS_NAME}",
  "workspaceSlug": "${WS_SLUG}",
  "templateAId": "${TEMPLATE_A_ID}",
  "templateBId": "${TEMPLATE_B_ID}",
  "projectA": {
    "id": "${PROJECT_A_ID}",
    "name": "E2E Project Alpha (Small)",
    "phases": "${PHASES_A}",
    "tasks": "${TASKS_A}",
    "risks": "${RISKS_A}",
    "allocations": "${ALLOC_A1}",
    "budget": 50000,
    "actualCost": 15000
  },
  "projectB": {
    "id": "${PROJECT_B_ID}",
    "name": "E2E Project Beta (Medium)",
    "phases": "${PHASES_B}",
    "tasks": "${TASKS_B}",
    "risks": "${RISKS_B}",
    "allocations": "${ALLOC_B1}",
    "budget": 120000,
    "actualCost": 45000
  },
  "firstTaskA": "${TASK_A1}",
  "firstTaskB": "${TASK_B1}",
  "firstPhaseA": "${PHASE_A1}",
  "firstPhaseB": "${PHASE_B1}",
  "firstAllocA": "${ALLOC_A1}",
  "firstCommentId": "${COMMENT_ID}",
  "firstDependencyId": "${DEP_ID}",
  "firstSprintId": "${SPRINT_ID}",
  "firstVelocitySprintId": "${VSPRINT_ID}"
}
JSONEOF

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "SEED COMPLETE"
log "IDs written to: ${IDS_FILE}"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
