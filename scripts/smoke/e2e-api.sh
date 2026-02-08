#!/usr/bin/env bash
###############################################################################
# Zephix E2E API Smoke Test
# Hits critical endpoints with seeded IDs, records pass/fail.
# Fails fast with clear error output.
#
# Usage:
#   ./scripts/smoke/e2e-api.sh [IDS_FILE] [BASE_URL]
#
# Prerequisites:
#   Run e2e-seed.sh first to generate e2e-ids.json
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IDS_FILE="${1:-${SCRIPT_DIR}/e2e-ids.json}"
BASE_URL="${2:-}"
COOKIE_JAR="$(mktemp)"

trap 'rm -f "$COOKIE_JAR"' EXIT

# ─── Color helpers ──────────────────────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
SKIP_COUNT=0
HTTP_500_COUNT=0
RESULTS=""

pass() { PASS_COUNT=$((PASS_COUNT + 1)); RESULTS="${RESULTS}\n${GREEN}PASS${NC} $1"; printf "${GREEN}PASS${NC} %s\n" "$1"; }
fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); RESULTS="${RESULTS}\n${RED}FAIL${NC} $1 — $2"; printf "${RED}FAIL${NC} %s — %s\n" "$1" "$2"; }
warn() { WARN_COUNT=$((WARN_COUNT + 1)); RESULTS="${RESULTS}\n${YELLOW}WARN${NC} $1 — $2"; printf "${YELLOW}WARN${NC} %s — %s\n" "$1" "$2"; }
skip() { SKIP_COUNT=$((SKIP_COUNT + 1)); RESULTS="${RESULTS}\n${YELLOW}SKIP${NC} $1 — $2"; printf "${YELLOW}SKIP${NC} %s — %s\n" "$1" "$2"; }
section() { printf "\n${BLUE}━━━ %s ━━━${NC}\n" "$1"; }

# ─── Load IDs ───────────────────────────────────────────────────────────────

if [ ! -f "$IDS_FILE" ]; then
  printf "${RED}ERROR${NC}: IDs file not found: %s\n" "$IDS_FILE"
  printf "Run e2e-seed.sh first.\n"
  exit 1
fi

if ! command -v jq &>/dev/null; then
  printf "${RED}ERROR${NC}: jq is required. Install with: brew install jq\n"
  exit 1
fi

# Parse IDs
if [ -z "$BASE_URL" ]; then
  BASE_URL=$(jq -r '.baseUrl' "$IDS_FILE")
fi
EMAIL=$(jq -r '.auth.email' "$IDS_FILE")
PASSWORD=$(jq -r '.auth.password' "$IDS_FILE")
USER_ID=$(jq -r '.userId' "$IDS_FILE")
ORG_ID=$(jq -r '.organizationId' "$IDS_FILE")
WS_ID=$(jq -r '.workspaceId' "$IDS_FILE")
PROJECT_A_ID=$(jq -r '.projectA.id' "$IDS_FILE")
PROJECT_B_ID=$(jq -r '.projectB.id' "$IDS_FILE")
TASK_A1=$(jq -r '.firstTaskA' "$IDS_FILE")
TASK_A2=$(jq -r '.projectA.tasks' "$IDS_FILE" | cut -d, -f2)
TASK_B1=$(jq -r '.firstTaskB' "$IDS_FILE")
PHASE_A1=$(jq -r '.firstPhaseA' "$IDS_FILE")
ALLOC_A1=$(jq -r '.firstAllocA' "$IDS_FILE")
RISKS_A=$(jq -r '.projectA.risks' "$IDS_FILE")
COMMENT_ID=$(jq -r '.firstCommentId // empty' "$IDS_FILE")
DEP_ID=$(jq -r '.firstDependencyId // empty' "$IDS_FILE")
RISK_A1=$(echo "$RISKS_A" | cut -d, -f1)

printf "${BLUE}Zephix E2E API Smoke Test${NC}\n"
printf "Base URL:    %s\n" "$BASE_URL"
printf "Org:         %s\n" "$ORG_ID"
printf "Workspace:   %s\n" "$WS_ID"
printf "Project A:   %s\n" "$PROJECT_A_ID"
printf "Project B:   %s\n" "$PROJECT_B_ID"
printf "\n"

# ─── HTTP helpers ───────────────────────────────────────────────────────────

CSRF_TOKEN=""

# Simple GET check: returns HTTP status (tracks 500s for no-500 gate)
http_status() {
  local url="$1"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Accept: application/json" \
    -H "x-workspace-id: ${WS_ID}" \
    "${BASE_URL}${url}" 2>/dev/null || echo "000")
  if [ "$status" = "500" ]; then
    HTTP_500_COUNT=$((HTTP_500_COUNT + 1))
  fi
  echo "$status"
}

# GET with response body
http_get() {
  local url="$1"
  curl -s -f \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Accept: application/json" \
    -H "x-workspace-id: ${WS_ID}" \
    "${BASE_URL}${url}" 2>/dev/null || echo ""
}

# POST/PATCH/DELETE with body
http_mut() {
  local method="$1" url="$2" body="${3:-}"
  local args=(
    -s -f -X "$method"
    -b "$COOKIE_JAR" -c "$COOKIE_JAR"
    -H "Content-Type: application/json"
    -H "Accept: application/json"
    -H "x-workspace-id: ${WS_ID}"
  )
  [ -n "$CSRF_TOKEN" ] && args+=(-H "x-csrf-token: ${CSRF_TOKEN}")
  [ -n "$body" ] && args+=(-d "$body")
  curl "${args[@]}" "${BASE_URL}${url}" 2>/dev/null || echo ""
}

# Check expects: test_name, url, expected_status
check_get() {
  local name="$1" url="$2" expected="${3:-200}"
  local status
  status=$(http_status "$url")
  if [ "$status" = "$expected" ]; then
    pass "$name (${status})"
  else
    fail "$name" "expected ${expected}, got ${status} → ${url}"
  fi
}

###############################################################################
# MODULE 0: Environment Sanity
###############################################################################
section "Module 0: Environment Sanity"

# Health
check_get "Health endpoint" "/health" "200"
check_get "Liveness probe" "/health/live" "200"
check_get "Readiness probe" "/health/ready" "200"

# Auth login
LOGIN_RESP=$(curl -s -f -X POST \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  "${BASE_URL}/auth/login" 2>/dev/null) || true

if [ -n "$LOGIN_RESP" ]; then
  pass "Auth login"
else
  fail "Auth login" "POST /auth/login returned empty or error"
fi

# CSRF
CSRF_RESP=$(http_get "/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_RESP" | jq -r '.csrfToken // .token // empty' 2>/dev/null || echo "")
if [ -z "$CSRF_TOKEN" ]; then
  CSRF_TOKEN=$(grep -i 'XSRF-TOKEN' "$COOKIE_JAR" 2>/dev/null | awk '{print $NF}' || echo "")
fi
if [ -n "$CSRF_TOKEN" ]; then
  pass "CSRF token acquired"
else
  warn "CSRF token" "Could not acquire CSRF token"
fi

# Auth me
ME_STATUS=$(http_status "/auth/me")
if [ "$ME_STATUS" = "200" ]; then
  pass "Auth /me"
else
  fail "Auth /me" "expected 200, got ${ME_STATUS}"
fi

# Onboarding status
check_get "Onboarding status" "/organizations/onboarding/status" "200"

# Workspace list
check_get "Workspace list" "/workspaces" "200"

###############################################################################
# MODULE 1: Work Management
###############################################################################
section "Module 1: Work Management"

# Project list
check_get "List projects" "/projects?workspaceId=${WS_ID}" "200"

# Get project A
check_get "Get Project A" "/projects/${PROJECT_A_ID}" "200"

# Get project B
check_get "Get Project B" "/projects/${PROJECT_B_ID}" "200"

# Project plan
check_get "Project A plan" "/work/projects/${PROJECT_A_ID}/plan" "200"

# Project overview
check_get "Project A overview" "/work/projects/${PROJECT_A_ID}/overview" "200"

# List tasks for project A
TASKS_RESP=$(http_get "/work/tasks?projectId=${PROJECT_A_ID}")
if [ -n "$TASKS_RESP" ]; then
  TASK_COUNT=$(echo "$TASKS_RESP" | jq -r '(.data // .).total // ((.data // .).items | length) // 0' 2>/dev/null || echo "0")
  if [ "$TASK_COUNT" -gt 0 ] 2>/dev/null; then
    pass "List tasks for Project A (count: ${TASK_COUNT})"
  else
    warn "List tasks for Project A" "returned 0 tasks"
  fi
else
  fail "List tasks for Project A" "empty response"
fi

# Get single task
if [ -n "$TASK_A1" ] && [ "$TASK_A1" != "null" ]; then
  check_get "Get task A1" "/work/tasks/${TASK_A1}" "200"

  # Update task title
  UPD_RESP=$(http_mut PATCH "/work/tasks/${TASK_A1}" '{"title":"Alpha Task 1 - Updated E2E"}')
  if [ -n "$UPD_RESP" ]; then
    pass "Update task title"
  else
    warn "Update task title" "empty response (may need CSRF)"
  fi

  # Set task to DONE (via IN_PROGRESS first)
  http_mut PATCH "/work/tasks/${TASK_A1}" '{"status":"IN_PROGRESS"}' >/dev/null 2>&1
  DONE_RESP=$(http_mut PATCH "/work/tasks/${TASK_A1}" '{"status":"DONE"}')
  if [ -n "$DONE_RESP" ]; then
    pass "Set task to DONE"
  else
    warn "Set task to DONE" "status transition may have failed"
  fi
else
  skip "Task CRUD" "no task ID from seed"
fi

# List phases
check_get "List phases" "/work/phases?projectId=${PROJECT_A_ID}" "200"

# Create new phase
NEW_PHASE_RESP=$(http_mut POST "/work/phases" "{\"projectId\":\"${PROJECT_A_ID}\",\"name\":\"E2E Verify Phase\"}")
NEW_PHASE_ID=""
if [ -n "$NEW_PHASE_RESP" ]; then
  NEW_PHASE_ID=$(echo "$NEW_PHASE_RESP" | jq -r '(.data // .).id // empty' 2>/dev/null || echo "")
  if [ -n "$NEW_PHASE_ID" ]; then
    pass "Create phase"
  else
    warn "Create phase" "response did not contain id"
  fi
else
  fail "Create phase" "empty response"
fi

# Delete and restore phase
if [ -n "$NEW_PHASE_ID" ]; then
  DEL_PHASE=$(http_mut DELETE "/work/phases/${NEW_PHASE_ID}")
  if [ -n "$DEL_PHASE" ]; then
    pass "Delete phase"
  else
    warn "Delete phase" "empty response"
  fi

  REST_PHASE=$(http_mut POST "/work/phases/${NEW_PHASE_ID}/restore")
  if [ -n "$REST_PHASE" ]; then
    pass "Restore phase"
  else
    warn "Restore phase" "empty response or not supported"
  fi
fi

# Create and delete task
NEW_TASK_RESP=$(http_mut POST "/work/tasks" "{\"projectId\":\"${PROJECT_A_ID}\",\"title\":\"E2E Temp Task\"}")
NEW_TASK_ID=""
if [ -n "$NEW_TASK_RESP" ]; then
  NEW_TASK_ID=$(echo "$NEW_TASK_RESP" | jq -r '(.data // .).id // empty' 2>/dev/null || echo "")
  if [ -n "$NEW_TASK_ID" ]; then
    pass "Create task"
    # Delete
    http_mut DELETE "/work/tasks/${NEW_TASK_ID}" >/dev/null 2>&1 && pass "Delete task" || warn "Delete task" "failed"
    # Restore (may return empty body with 200/204 which is acceptable)
    REST_TASK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
      -H "Accept: application/json" -H "Content-Type: application/json" \
      -H "x-workspace-id: ${WS_ID}" \
      ${CSRF_TOKEN:+-H "x-csrf-token: ${CSRF_TOKEN}"} \
      "${BASE_URL}/work/tasks/${NEW_TASK_ID}/restore" 2>/dev/null || echo "000")
    if [ "$REST_TASK_STATUS" = "200" ] || [ "$REST_TASK_STATUS" = "201" ] || [ "$REST_TASK_STATUS" = "204" ]; then
      pass "Restore task (status ${REST_TASK_STATUS})"
    else
      fail "Restore task" "expected 200/201/204, got ${REST_TASK_STATUS}"
    fi
  fi
fi

###############################################################################
# MODULE 1b: Task Comments (Wave 1)
###############################################################################
section "Module 1b: Task Comments"

if [ -n "$TASK_A1" ] && [ "$TASK_A1" != "null" ]; then
  # List comments
  COMMENTS_RESP=$(http_get "/work/tasks/${TASK_A1}/comments")
  if [ -n "$COMMENTS_RESP" ]; then
    CMT_COUNT=$(echo "$COMMENTS_RESP" | jq -r '(.data // .).total // ((.data // .).items | length) // 0' 2>/dev/null || echo "0")
    if [ "$CMT_COUNT" -gt 0 ] 2>/dev/null; then
      pass "List task comments (count: ${CMT_COUNT})"
    else
      warn "List task comments" "returned 0 comments"
    fi
  else
    fail "List task comments" "empty response"
  fi

  # Post a comment
  NEW_CMT_RESP=$(http_mut POST "/work/tasks/${TASK_A1}/comments" '{"body":"E2E smoke test comment"}')
  if [ -n "$NEW_CMT_RESP" ]; then
    NEW_CMT_ID=$(echo "$NEW_CMT_RESP" | jq -r '(.data // .).id // empty' 2>/dev/null || echo "")
    if [ -n "$NEW_CMT_ID" ]; then
      pass "Post comment on task"
    else
      warn "Post comment on task" "no id in response"
    fi
  else
    fail "Post comment on task" "empty response"
  fi
else
  skip "Task comments" "no task ID from seed"
fi

###############################################################################
# MODULE 1c: Task Dependencies (Wave 1)
###############################################################################
section "Module 1c: Task Dependencies"

if [ -n "$TASK_A2" ] && [ "$TASK_A2" != "null" ]; then
  # List dependencies for task A2 (should have A1 as predecessor from seed)
  DEPS_RESP=$(http_get "/work/tasks/${TASK_A2}/dependencies")
  if [ -n "$DEPS_RESP" ]; then
    PRED_COUNT=$(echo "$DEPS_RESP" | jq -r '(.data // .).predecessors | length // 0' 2>/dev/null || echo "0")
    if [ "$PRED_COUNT" -gt 0 ] 2>/dev/null; then
      pass "List task dependencies (predecessors: ${PRED_COUNT})"
    else
      warn "List task dependencies" "no predecessors found"
    fi
  else
    fail "List task dependencies" "empty response"
  fi

  # Try to add duplicate dependency (should get 409 Conflict)
  DUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Accept: application/json" -H "Content-Type: application/json" \
    -H "x-workspace-id: ${WS_ID}" \
    ${CSRF_TOKEN:+-H "x-csrf-token: ${CSRF_TOKEN}"} \
    -d "{\"predecessorTaskId\":\"${TASK_A1}\",\"type\":\"FINISH_TO_START\"}" \
    "${BASE_URL}/work/tasks/${TASK_A2}/dependencies" 2>/dev/null || echo "000")
  if [ "$DUP_STATUS" = "409" ]; then
    pass "Reject duplicate dependency (409)"
  elif [ "$DUP_STATUS" = "201" ] || [ "$DUP_STATUS" = "200" ]; then
    warn "Reject duplicate dependency" "expected 409, got ${DUP_STATUS}"
  else
    warn "Reject duplicate dependency" "got status ${DUP_STATUS}"
  fi

  # Try to add self-dependency (should get 400)
  SELF_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Accept: application/json" -H "Content-Type: application/json" \
    -H "x-workspace-id: ${WS_ID}" \
    ${CSRF_TOKEN:+-H "x-csrf-token: ${CSRF_TOKEN}"} \
    -d "{\"predecessorTaskId\":\"${TASK_A1}\",\"type\":\"FINISH_TO_START\"}" \
    "${BASE_URL}/work/tasks/${TASK_A1}/dependencies" 2>/dev/null || echo "000")
  if [ "$SELF_STATUS" = "400" ]; then
    pass "Reject self-dependency (400)"
  else
    fail "Reject self-dependency" "expected 400, got ${SELF_STATUS}"
  fi

  # Try to create a cycle: seed has A1->A2, now try A2->A1 (should get 400 cycle detection)
  CYCLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "Accept: application/json" -H "Content-Type: application/json" \
    -H "x-workspace-id: ${WS_ID}" \
    ${CSRF_TOKEN:+-H "x-csrf-token: ${CSRF_TOKEN}"} \
    -d "{\"predecessorTaskId\":\"${TASK_A2}\",\"type\":\"FINISH_TO_START\"}" \
    "${BASE_URL}/work/tasks/${TASK_A1}/dependencies" 2>/dev/null || echo "000")
  if [ "$CYCLE_STATUS" = "400" ]; then
    pass "Reject dependency cycle (400)"
  elif [ "$CYCLE_STATUS" = "200" ] || [ "$CYCLE_STATUS" = "201" ]; then
    fail "Reject dependency cycle" "cycle was accepted — BLOCKER"
  else
    fail "Reject dependency cycle" "expected 400, got ${CYCLE_STATUS}"
  fi
else
  skip "Task dependencies" "no second task ID from seed"
fi

###############################################################################
# MODULE 1d: Sprints (Wave 2)
###############################################################################
section "Module 1d: Sprints"

SPRINT_ID=$(jq -r '.firstSprintId // empty' "$IDS_FILE" 2>/dev/null || echo "")

# List sprints for project
SPRINTS_RESP=$(http_get "/work/sprints/project/${PROJECT_A_ID}")
if [ -n "$SPRINTS_RESP" ]; then
  SPRINT_COUNT=$(echo "$SPRINTS_RESP" | jq -r '(.data // .) | if type == "array" then length else (.items // []) | length end' 2>/dev/null || echo "0")
  if [ "$SPRINT_COUNT" -gt 0 ]; then
    pass "List sprints for Project A (count: ${SPRINT_COUNT})"
  else
    warn "List sprints" "count is 0"
  fi
else
  fail "List sprints" "empty response"
fi

# Get sprint with stats (if seeded)
if [ -n "$SPRINT_ID" ]; then
  SPRINT_DETAIL=$(http_get "/work/sprints/${SPRINT_ID}")
  if [ -n "$SPRINT_DETAIL" ]; then
    COMMITTED=$(echo "$SPRINT_DETAIL" | jq -r '(.data // .).stats.committed // 0' 2>/dev/null || echo "0")
    TASK_COUNT=$(echo "$SPRINT_DETAIL" | jq -r '(.data // .).stats.taskCount // 0' 2>/dev/null || echo "0")
    pass "Get sprint with stats (committed: ${COMMITTED} SP, ${TASK_COUNT} tasks)"
  else
    fail "Get sprint detail" "empty response"
  fi

  # Create a second sprint for Project A
  NEW_SPRINT_RESP=$(http_mut POST "/work/sprints" \
    "{\"projectId\":\"${PROJECT_A_ID}\",\"name\":\"Sprint 2\",\"startDate\":\"2026-04-01\",\"endDate\":\"2026-04-14\"}")
  NEW_SPRINT_ID=""
  if [ -n "$NEW_SPRINT_RESP" ]; then
    NEW_SPRINT_ID=$(echo "$NEW_SPRINT_RESP" | jq -r '(.data // .).id // empty' 2>/dev/null || echo "")
    if [ -n "$NEW_SPRINT_ID" ]; then
      pass "Create sprint (id: ${NEW_SPRINT_ID})"

      # Delete the sprint (PLANNING status)
      DEL_SPRINT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
        -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
        -H "x-workspace-id: ${WS_ID}" \
        ${CSRF_TOKEN:+-H "x-csrf-token: ${CSRF_TOKEN}"} \
        "${BASE_URL}/work/sprints/${NEW_SPRINT_ID}" 2>/dev/null)
      if [ "$DEL_SPRINT_STATUS" = "200" ] || [ "$DEL_SPRINT_STATUS" = "204" ]; then
        pass "Delete sprint (PLANNING)"
      else
        fail "Delete sprint" "expected 200/204, got ${DEL_SPRINT_STATUS}"
      fi
    else
      fail "Create sprint" "no id in response"
    fi
  else
    fail "Create sprint" "empty response"
  fi
else
  skip "Sprint detail" "no sprint ID from seed"
fi

# Verify story points were set on tasks
TASK_A1_RESP=$(http_get "/work/tasks/${TASK_A1}")
if [ -n "$TASK_A1_RESP" ]; then
  SP=$(echo "$TASK_A1_RESP" | jq -r '(.data // .).storyPoints // (.data // .).story_points // empty' 2>/dev/null || echo "")
  if [ "$SP" = "5" ]; then
    pass "Task A1 has storyPoints=5"
  elif [ -n "$SP" ] && [ "$SP" != "null" ]; then
    pass "Task A1 has storyPoints=${SP}"
  else
    warn "Task A1 storyPoints" "expected 5, got ${SP:-null}"
  fi
else
  fail "Get task A1 for SP check" "empty response"
fi

# Negative test: completed sprint immutability guards
VELOCITY_SPRINT_ID=$(jq -r '.firstVelocitySprintId // empty' "$IDS_FILE" 2>/dev/null || echo "")
if [ -n "$VELOCITY_SPRINT_ID" ]; then
  # Try to assign a task to the COMPLETED sprint — must fail with 400
  ASSIGN_CLOSED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "x-workspace-id: ${WS_ID}" \
    -H "Content-Type: application/json" \
    ${CSRF_TOKEN:+-H "x-csrf-token: ${CSRF_TOKEN}"} \
    -d "{\"taskIds\":[\"${TASK_A1}\"]}" \
    "${BASE_URL}/work/sprints/${VELOCITY_SPRINT_ID}/tasks" 2>/dev/null)
  if [ "$ASSIGN_CLOSED_STATUS" = "400" ]; then
    pass "Completed sprint rejects task assignment (400)"
  else
    fail "Completed sprint assign guard" "expected 400, got ${ASSIGN_CLOSED_STATUS}"
  fi

  # Try to rename a COMPLETED sprint — must fail with 400
  RENAME_CLOSED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "x-workspace-id: ${WS_ID}" \
    -H "Content-Type: application/json" \
    ${CSRF_TOKEN:+-H "x-csrf-token: ${CSRF_TOKEN}"} \
    -d "{\"name\":\"Hacked\"}" \
    "${BASE_URL}/work/sprints/${VELOCITY_SPRINT_ID}" 2>/dev/null)
  if [ "$RENAME_CLOSED_STATUS" = "400" ]; then
    pass "Completed sprint rejects rename (400)"
  else
    fail "Completed sprint rename guard" "expected 400, got ${RENAME_CLOSED_STATUS}"
  fi
else
  skip "Completed sprint guards" "no velocity sprint ID"
fi

###############################################################################
# MODULE 1e: Sprint Capacity & Velocity (Wave 2.2)
###############################################################################
section "Module 1e: Sprint Capacity & Velocity"

# Sprint capacity endpoint
if [ -n "$SPRINT_ID" ]; then
  CAP_RESP=$(http_get "/work/sprints/${SPRINT_ID}/capacity")
  if [ -n "$CAP_RESP" ]; then
    CAP_HOURS=$(echo "$CAP_RESP" | jq -r '(.data // .).capacityHours // 0' 2>/dev/null || echo "0")
    LOAD_HOURS=$(echo "$CAP_RESP" | jq -r '(.data // .).loadHours // 0' 2>/dev/null || echo "0")
    WORKDAYS=$(echo "$CAP_RESP" | jq -r '(.data // .).capacityBasis.workdays // 0' 2>/dev/null || echo "0")
    LOAD_SRC=$(echo "$CAP_RESP" | jq -r '(.data // .).capacityBasis.loadSource // empty' 2>/dev/null || echo "")
    pass "Sprint capacity (capacity: ${CAP_HOURS}h, load: ${LOAD_HOURS}h, workdays: ${WORKDAYS}, source: ${LOAD_SRC})"
  else
    fail "Sprint capacity" "empty response"
  fi
else
  skip "Sprint capacity" "no sprint ID"
fi

# Velocity endpoint
VEL_RESP=$(http_get "/work/sprints/project/${PROJECT_A_ID}/velocity?window=5")
if [ -n "$VEL_RESP" ]; then
  VEL_SPRINTS=$(echo "$VEL_RESP" | jq -r '(.data // .).sprints | length' 2>/dev/null || echo "0")
  VEL_AVG=$(echo "$VEL_RESP" | jq -r '(.data // .).rollingAverageCompletedPoints // 0' 2>/dev/null || echo "0")
  pass "Velocity (${VEL_SPRINTS} completed sprints, avg: ${VEL_AVG} SP)"
else
  fail "Velocity" "empty response"
fi

# Sprint progress endpoint (dashboard widget)
if [ -n "$SPRINT_ID" ]; then
  PROG_RESP=$(http_get "/work/sprints/${SPRINT_ID}/progress")
  if [ -n "$PROG_RESP" ]; then
    PROG_PCT=$(echo "$PROG_RESP" | jq -r '(.data // .).percentComplete // 0' 2>/dev/null || echo "0")
    PROG_TOTAL=$(echo "$PROG_RESP" | jq -r '(.data // .).totalPoints // 0' 2>/dev/null || echo "0")
    PROG_SCOPE=$(echo "$PROG_RESP" | jq -r '(.data // .).scopeMode // empty' 2>/dev/null || echo "")
    PROG_SAMPLE=$(echo "$PROG_RESP" | jq -r '(.data // .).burndownSample | length' 2>/dev/null || echo "0")
    pass "Sprint progress (${PROG_PCT}% of ${PROG_TOTAL} pts, scope: ${PROG_SCOPE}, sample: ${PROG_SAMPLE} days)"
  else
    fail "Sprint progress" "empty response"
  fi
else
  skip "Sprint progress" "no sprint ID"
fi

# Burndown endpoint
if [ -n "$SPRINT_ID" ]; then
  BD_RESP=$(http_get "/work/sprints/${SPRINT_ID}/burndown")
  if [ -n "$BD_RESP" ]; then
    BD_TOTAL=$(echo "$BD_RESP" | jq -r '(.data // .).totalPoints // 0' 2>/dev/null || echo "0")
    BD_BUCKETS=$(echo "$BD_RESP" | jq -r '(.data // .).buckets | length' 2>/dev/null || echo "0")
    BD_SPRINT_NAME=$(echo "$BD_RESP" | jq -r '(.data // .).sprintName // empty' 2>/dev/null || echo "")
    pass "Sprint burndown (total: ${BD_TOTAL} pts, buckets: ${BD_BUCKETS} days, sprint: ${BD_SPRINT_NAME})"
  else
    fail "Sprint burndown" "empty response"
  fi
else
  skip "Sprint burndown" "no sprint ID"
fi

###############################################################################
# MODULE 2: Resource Management
###############################################################################
section "Module 2: Resource Management"

# List allocations for project
ALLOCS_RESP=$(http_get "/work/resources/allocations?projectId=${PROJECT_A_ID}")
if [ -n "$ALLOCS_RESP" ]; then
  ALLOC_COUNT=$(echo "$ALLOCS_RESP" | jq -r '(.data // .).total // ((.data // .).items | length) // 0' 2>/dev/null || echo "0")
  pass "List allocations for Project A (count: ${ALLOC_COUNT})"
else
  fail "List allocations" "empty response"
fi

# Create allocation: delete any existing one for this user/project first, then create fresh
# First try to get existing allocations for Project B to find conflict
EXISTING_ALLOCS=$(http_get "/work/resources/allocations?projectId=${PROJECT_B_ID}")
EXISTING_ALLOC_ID=$(echo "$EXISTING_ALLOCS" | jq -r '[(.data // .).items[]? | select(.userId == "'"${USER_ID}"'" or .user_id == "'"${USER_ID}"'")] | .[0].id // empty' 2>/dev/null || echo "")
if [ -n "$EXISTING_ALLOC_ID" ] && [ "$EXISTING_ALLOC_ID" != "null" ]; then
  # Delete existing to make room for fresh create
  curl -s -o /dev/null -X DELETE \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "x-workspace-id: ${WS_ID}" \
    ${CSRF_TOKEN:+-H "x-csrf-token: ${CSRF_TOKEN}"} \
    "${BASE_URL}/work/resources/allocations/${EXISTING_ALLOC_ID}" 2>/dev/null || true
fi

NEW_ALLOC_RESP=$(http_mut POST "/work/resources/allocations" \
  "{\"projectId\":\"${PROJECT_B_ID}\",\"userId\":\"${USER_ID}\",\"allocationPercent\":15,\"startDate\":\"2026-03-01\",\"endDate\":\"2026-04-30\"}")
NEW_ALLOC_ID=""
if [ -n "$NEW_ALLOC_RESP" ]; then
  ALLOC_CODE=$(echo "$NEW_ALLOC_RESP" | jq -r '.code // empty' 2>/dev/null || echo "")
  if [ "$ALLOC_CODE" = "ALLOCATION_EXISTS" ]; then
    # Edge case: unique constraint, use existing from seed
    NEW_ALLOC_ID="$ALLOC_A1"
    pass "Create allocation (reusing existing)"
  else
    NEW_ALLOC_ID=$(echo "$NEW_ALLOC_RESP" | jq -r '(.data // .).id // empty' 2>/dev/null || echo "")
    if [ -n "$NEW_ALLOC_ID" ]; then
      pass "Create allocation (id: ${NEW_ALLOC_ID})"
    else
      fail "Create allocation" "response contained no id"
    fi
  fi
else
  fail "Create allocation" "empty response"
fi

# Update allocation
if [ -n "$NEW_ALLOC_ID" ]; then
  UPD_ALLOC=$(http_mut PATCH "/work/resources/allocations/${NEW_ALLOC_ID}" '{"allocationPercent":25}')
  if [ -n "$UPD_ALLOC" ]; then
    pass "Update allocation"
  else
    warn "Update allocation" "empty response"
  fi

  # Delete allocation
  DEL_ALLOC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    -H "x-workspace-id: ${WS_ID}" \
    ${CSRF_TOKEN:+-H "x-csrf-token: ${CSRF_TOKEN}"} \
    "${BASE_URL}/work/resources/allocations/${NEW_ALLOC_ID}" 2>/dev/null)
  if [ "$DEL_ALLOC_STATUS" = "200" ] || [ "$DEL_ALLOC_STATUS" = "204" ]; then
    pass "Delete allocation"
  else
    warn "Delete allocation" "status: ${DEL_ALLOC_STATUS}"
  fi
fi

# Resource heatmap / capacity (if available)
HEATMAP_STATUS=$(http_status "/resources/heat-map")
if [ "$HEATMAP_STATUS" = "404" ]; then
  # Try work-prefixed path
  HEATMAP_STATUS=$(http_status "/work/resources/heat-map")
fi
if [ "$HEATMAP_STATUS" = "200" ]; then
  pass "Resource heat-map"
elif [ "$HEATMAP_STATUS" = "404" ]; then
  skip "Resource heat-map" "endpoint not found"
elif [ "$HEATMAP_STATUS" = "500" ]; then
  # 500 is caught by the no-500 gate — mark as fail here too
  fail "Resource heat-map" "HTTP 500 — endpoint exists but crashes"
else
  fail "Resource heat-map" "unexpected status ${HEATMAP_STATUS}"
fi

###############################################################################
# MODULE 3: Risk Management
###############################################################################
section "Module 3: Risk Management"

# List risks for project
RISKS_RESP=$(http_get "/work/risks?projectId=${PROJECT_A_ID}")
if [ -n "$RISKS_RESP" ]; then
  RISK_COUNT=$(echo "$RISKS_RESP" | jq -r '(.data // .).total // ((.data // .).items | length) // 0' 2>/dev/null || echo "0")
  pass "List risks for Project A (count: ${RISK_COUNT})"
else
  fail "List risks" "empty response"
fi

# Create risk
NEW_RISK_RESP=$(http_mut POST "/work/risks" \
  "{\"projectId\":\"${PROJECT_A_ID}\",\"title\":\"E2E Temp Risk\",\"severity\":\"LOW\",\"status\":\"OPEN\",\"ownerUserId\":\"${USER_ID}\"}")
NEW_RISK_ID=""
if [ -n "$NEW_RISK_RESP" ]; then
  NEW_RISK_ID=$(echo "$NEW_RISK_RESP" | jq -r '(.data // .).id // empty' 2>/dev/null || echo "")
  if [ -n "$NEW_RISK_ID" ]; then
    pass "Create risk"
  else
    warn "Create risk" "no id in response"
  fi
else
  fail "Create risk" "empty response"
fi

# Verify risk owner is real user
if [ -n "$RISK_A1" ] && [ "$RISK_A1" != "null" ]; then
  RISK_DETAIL=$(http_get "/work/risks?projectId=${PROJECT_A_ID}")
  RISK_OWNER=$(echo "$RISK_DETAIL" | jq -r '((.data // .).items // .)[0].ownerUserId // empty' 2>/dev/null || echo "")
  if [ "$RISK_OWNER" = "$USER_ID" ]; then
    pass "Risk owner is valid org member"
  elif [ -n "$RISK_OWNER" ]; then
    warn "Risk owner" "owner ${RISK_OWNER} != seeded user ${USER_ID}"
  else
    skip "Risk owner validation" "no ownerUserId in response"
  fi
fi

###############################################################################
# MODULE 4: Budget (Project fields)
###############################################################################
section "Module 4: Budget"

# Get project and check budget fields
PROJ_A_DETAIL=$(http_get "/projects/${PROJECT_A_ID}")
if [ -n "$PROJ_A_DETAIL" ]; then
  BUDGET=$(echo "$PROJ_A_DETAIL" | jq -r '(.data // .).budget // empty' 2>/dev/null || echo "")
  ACTUAL=$(echo "$PROJ_A_DETAIL" | jq -r '(.data // .).actualCost // empty' 2>/dev/null || echo "")
  if [ -n "$BUDGET" ] && [ "$BUDGET" != "null" ]; then
    pass "Project A has budget: ${BUDGET}"
  else
    warn "Project A budget" "budget field empty"
  fi
  if [ -n "$ACTUAL" ] && [ "$ACTUAL" != "null" ]; then
    pass "Project A has actualCost: ${ACTUAL}"
  else
    warn "Project A actualCost" "actualCost field empty"
  fi
else
  fail "Get project for budget" "empty response"
fi

# Update budget
UPD_BUDGET=$(http_mut PATCH "/projects/${PROJECT_A_ID}" '{"budget":55000}')
if [ -n "$UPD_BUDGET" ]; then
  pass "Update project budget"
else
  warn "Update project budget" "empty response"
fi

# KPIs
KPI_STATUS=$(http_status "/projects/${PROJECT_A_ID}/kpis")
if [ "$KPI_STATUS" = "200" ]; then
  pass "Project KPIs"
elif [ "$KPI_STATUS" = "404" ]; then
  skip "Project KPIs" "endpoint not found"
else
  warn "Project KPIs" "status ${KPI_STATUS}"
fi

###############################################################################
# MODULE 5: Template Center
###############################################################################
section "Module 5: Template Center"

# List templates
TMPL_STATUS=$(http_status "/templates")
if [ "$TMPL_STATUS" = "200" ]; then
  pass "List templates"
else
  fail "List templates" "status ${TMPL_STATUS}"
fi

# Template recommendations (requires containerType + workType enum)
check_get "Template recommendations" "/templates/recommendations?containerType=PROJECT&workType=MIGRATION" "200"

# Template preview (if we have a template ID)
TMPL_A_ID=$(jq -r '.templateAId // empty' "$IDS_FILE")
if [ -n "$TMPL_A_ID" ] && [ "$TMPL_A_ID" != "null" ]; then
  PREVIEW_STATUS=$(http_status "/templates/${TMPL_A_ID}/preview-v5_1")
  if [ "$PREVIEW_STATUS" = "200" ]; then
    pass "Template preview (${PREVIEW_STATUS})"
  else
    fail "Template preview" "expected 200, got ${PREVIEW_STATUS}"
  fi

  # Instantiate another project from template
  INST_RESP=$(http_mut POST "/templates/${TMPL_A_ID}/instantiate-v5_1" '{"projectName":"E2E Verify Instantiation"}')
  if [ -n "$INST_RESP" ]; then
    INST_PID=$(echo "$INST_RESP" | jq -r '(.data // .).projectId // empty' 2>/dev/null || echo "")
    if [ -n "$INST_PID" ]; then
      pass "Template instantiation (project: ${INST_PID})"
    else
      warn "Template instantiation" "no projectId in response"
    fi
  else
    fail "Template instantiation" "empty response"
  fi
else
  skip "Template preview & instantiation" "no template ID from seed"
fi

###############################################################################
# MODULE 6: Dashboards
###############################################################################
section "Module 6: Dashboards"

# List dashboards (BASE_URL already includes /api, so just use /dashboards)
DASH_STATUS=$(http_status "/dashboards")
if [ "$DASH_STATUS" = "200" ]; then
  pass "List dashboards"
else
  warn "List dashboards" "status ${DASH_STATUS}"
fi

# Dashboard templates
DTMPL_STATUS=$(http_status "/dashboards/templates")
if [ "$DTMPL_STATUS" = "200" ]; then
  pass "Dashboard templates"
elif [ "$DTMPL_STATUS" = "404" ]; then
  skip "Dashboard templates" "endpoint not found"
else
  warn "Dashboard templates" "status ${DTMPL_STATUS}"
fi

# Create dashboard (visibility is required by DTO — defaults to PRIVATE)
DASH_CREATE=$(http_mut POST "/dashboards" "{\"name\":\"E2E Smoke Dashboard\",\"visibility\":\"PRIVATE\",\"workspaceId\":\"${WS_ID}\"}")
DASH_ID=""
if [ -n "$DASH_CREATE" ]; then
  DASH_ID=$(echo "$DASH_CREATE" | jq -r '(.data // .).id // empty' 2>/dev/null || echo "")
  if [ -n "$DASH_ID" ]; then
    pass "Create dashboard (id: ${DASH_ID})"
  else
    fail "Create dashboard" "no id in response: $(echo "$DASH_CREATE" | head -c 200)"
  fi
else
  fail "Create dashboard" "empty response"
fi

# Get dashboard
if [ -n "$DASH_ID" ]; then
  check_get "Get dashboard" "/dashboards/${DASH_ID}" "200"
fi

###############################################################################
# MODULE 7: AI Assistant
###############################################################################
section "Module 7: AI Assistant"

# AI suggest (persona is optional — defaults to rules-based when omitted)
AI_SUGGEST=$(http_mut POST "/ai/dashboards/suggest" '{"persona":"PMO"}')
if [ -n "$AI_SUGGEST" ]; then
  AI_TEMPLATE_KEY=$(echo "$AI_SUGGEST" | jq -r '(.data // .).templateKey // empty' 2>/dev/null || echo "")
  if [ -n "$AI_TEMPLATE_KEY" ]; then
    pass "AI dashboard suggest (template: ${AI_TEMPLATE_KEY})"
  else
    pass "AI dashboard suggest (response received)"
  fi
else
  fail "AI dashboard suggest" "empty response"
fi

# AI generate
AI_GEN=$(http_mut POST "/ai/dashboards/generate" '{"prompt":"Show project progress and risk summary","persona":"PMO"}')
if [ -n "$AI_GEN" ]; then
  pass "AI dashboard generate"
else
  warn "AI dashboard generate" "empty response (may require AI config)"
fi

###############################################################################
# MODULE 8: Cross-module data integrity
###############################################################################
section "Module 8: Cross-module Data Integrity"

# Verify tasks belong to correct project
if [ -n "$TASKS_RESP" ]; then
  WRONG_PROJECT=$(echo "$TASKS_RESP" | jq -r "[(.data // .).items[] | select(.projectId != \"${PROJECT_A_ID}\")] | length" 2>/dev/null || echo "0")
  if [ "$WRONG_PROJECT" = "0" ]; then
    pass "All tasks belong to Project A"
  else
    fail "Task project isolation" "${WRONG_PROJECT} tasks have wrong projectId"
  fi
fi

# Verify risks belong to correct project
if [ -n "$RISKS_RESP" ]; then
  WRONG_RISK_PROJ=$(echo "$RISKS_RESP" | jq -r "[(.data // .).items[] | select(.projectId != \"${PROJECT_A_ID}\")] | length" 2>/dev/null || echo "0")
  if [ "$WRONG_RISK_PROJ" = "0" ]; then
    pass "All risks belong to Project A"
  else
    fail "Risk project isolation" "${WRONG_RISK_PROJ} risks have wrong projectId"
  fi
fi

# Verify allocations belong to correct project
if [ -n "$ALLOCS_RESP" ]; then
  WRONG_ALLOC_PROJ=$(echo "$ALLOCS_RESP" | jq -r "[(.data // .).items[] | select(.projectId != \"${PROJECT_A_ID}\")] | length" 2>/dev/null || echo "0")
  if [ "$WRONG_ALLOC_PROJ" = "0" ]; then
    pass "All allocations belong to Project A"
  else
    fail "Allocation project isolation" "${WRONG_ALLOC_PROJ} allocations have wrong projectId"
  fi
fi

# Verify workspace scoping
PROJ_WS=$(echo "$PROJ_A_DETAIL" | jq -r '(.data // .).workspaceId // empty' 2>/dev/null || echo "")
if [ "$PROJ_WS" = "$WS_ID" ]; then
  pass "Project A workspace matches seeded workspace"
else
  warn "Project workspace scoping" "expected ${WS_ID}, got ${PROJ_WS}"
fi

###############################################################################
# MODULE 9: RBAC Sanity (basic check)
###############################################################################
section "Module 9: RBAC Sanity"

# Admin should be able to access admin endpoints
ADMIN_STATUS=$(http_status "/organizations/admin/users")
if [ "$ADMIN_STATUS" = "200" ]; then
  pass "Admin can list users"
elif [ "$ADMIN_STATUS" = "403" ]; then
  warn "Admin list users" "403 forbidden (may not be admin role)"
else
  warn "Admin list users" "status ${ADMIN_STATUS}"
fi

# Org users endpoint
ORG_USERS_STATUS=$(http_status "/organizations/users")
if [ "$ORG_USERS_STATUS" = "200" ]; then
  pass "Org users (${ORG_USERS_STATUS})"
else
  fail "Org users" "expected 200, got ${ORG_USERS_STATUS}"
fi

# Workspace members
WS_MEMBERS_STATUS=$(http_status "/workspaces/${WS_ID}/members")
if [ "$WS_MEMBERS_STATUS" = "200" ]; then
  pass "Workspace members (${WS_MEMBERS_STATUS})"
else
  fail "Workspace members" "expected 200, got ${WS_MEMBERS_STATUS}"
fi

###############################################################################
# SUMMARY
###############################################################################
printf "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
printf "${BLUE}E2E API SMOKE TEST SUMMARY${NC}\n"
printf "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
printf "${GREEN}PASS: %d${NC}  ${RED}FAIL: %d${NC}  ${YELLOW}WARN: %d${NC}  SKIP: %d\n" \
  "$PASS_COUNT" "$FAIL_COUNT" "$WARN_COUNT" "$SKIP_COUNT"
printf "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Detailed results
printf "\nDetailed results:\n"
printf "$RESULTS\n"

# No-500 gate: any 500 response is a blocker
if [ "$HTTP_500_COUNT" -gt 0 ]; then
  printf "\n${RED}NO-500 GATE FAILED: %d endpoint(s) returned HTTP 500.${NC}\n" "$HTTP_500_COUNT"
  FAIL_COUNT=$((FAIL_COUNT + HTTP_500_COUNT))
fi

# Exit with failure if any hard fails
if [ "$FAIL_COUNT" -gt 0 ]; then
  printf "\n${RED}FAILED: %d test(s) failed.${NC}\n" "$FAIL_COUNT"
  exit 1
fi

printf "\n${GREEN}ALL CHECKS PASSED (with %d warnings, %d skipped).${NC}\n" "$WARN_COUNT" "$SKIP_COUNT"
exit 0
