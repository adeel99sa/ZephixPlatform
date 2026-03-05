#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACT_FILE="${ROOT_DIR}/docs/api-contract/staging/platform-core-contract.json"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

if [[ ! -f "${CONTRACT_FILE}" ]]; then
  echo "Missing contract file: ${CONTRACT_FILE}"
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing staging env file: ${ENV_FILE}"
  exit 1
fi
if [[ -z "${STAGING_SMOKE_KEY:-}" ]]; then
  echo "Missing STAGING_SMOKE_KEY"
  exit 1
fi
SMOKE_CLEANUP="${SMOKE_CLEANUP:-false}"
SMOKE_CLEANUP_PROJECT="${SMOKE_CLEANUP_PROJECT:-false}"

read_env() {
  local key="$1"
  rg "^${key}=" "${ENV_FILE}" -N | head -n 1 | sed "s/^${key}=//"
}

BASE="$(read_env STAGING_BACKEND_BASE)"
if [[ -z "${BASE}" ]]; then
  echo "STAGING_BACKEND_BASE missing in ${ENV_FILE}"
  exit 1
fi
API_BASE="${BASE}/api"
COOKIE_JAR="${TMP_DIR}/cookiejar.txt"
EMAIL="${EMAIL:-staging+smoke@zephix.dev}"
RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
PROJECT_PREFIX="SMOKE PLATFORM CORE"
TASK_PREFIX="SMOKE TASK"
PROJECT_NAME="${PROJECT_PREFIX} ${RUN_ID}"
TASK_TITLE="${TASK_PREFIX} ${RUN_ID}"

status_code() {
  sed -n 's/^HTTP\/[0-9.]* \([0-9][0-9][0-9]\).*/\1/p' "$1" | head -n 1 | tr -d '\r'
}

body_from_http_file() {
  awk 'BEGIN{body=0} body{print} /^\r?$/{body=1}' "$1"
}

contract_field() {
  local step="$1"
  local field="$2"
  node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const s=(c.flow||[]).find(x=>x.step===process.argv[2]);if(!s){process.exit(2)}if(process.argv[3]==='status'){const arr=Array.isArray(s.status)?s.status:[s.status];process.stdout.write(arr.join(','));}else{process.stdout.write(String(s[process.argv[3]]||''));}" "${CONTRACT_FILE}" "${step}" "${field}" || {
    echo "Missing contract step/field: step=${step} field=${field}"
    exit 1
  }
}

contract_step_exists() {
  local step="$1"
  node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.exit((c.flow||[]).some(x=>x.step===process.argv[2])?0:1)" "${CONTRACT_FILE}" "${step}"
}

assert_contract_step() {
  local step="$1"
  local expected_method="$2"
  local expected_path="$3"
  local actual_method
  local actual_path
  actual_method="$(contract_field "${step}" method)"
  actual_path="$(contract_field "${step}" path)"
  if [[ "${actual_method}" != "${expected_method}" || "${actual_path}" != "${expected_path}" ]]; then
    echo "Step mismatch: ${step}"
    echo "Expected: ${expected_method} ${expected_path}"
    echo "Got: ${actual_method} ${actual_path}"
    exit 1
  fi
}

check_status_or_fail() {
  local step="$1"
  local response_file="$2"
  local allowed_csv="$3"
  local got
  got="$(status_code "${response_file}")"
  IFS=',' read -r -a allowed <<< "${allowed_csv}"
  for a in "${allowed[@]}"; do
    if [[ "${got}" == "${a}" ]]; then
      return 0
    fi
  done
  echo "Step failed: ${step}"
  echo "Expected status: ${allowed_csv}"
  echo "Got status: ${got}"
  echo "Response file: ${response_file}"
  exit 1
}

assert_contract_step "health_ready" "GET" "/health/ready"
assert_contract_step "version" "GET" "/version"
assert_contract_step "csrf" "GET" "/auth/csrf"
assert_contract_step "smoke_login" "POST" "/auth/smoke-login"
assert_contract_step "auth_me" "GET" "/auth/me"
assert_contract_step "workspaces_list" "GET" "/workspaces"
assert_contract_step "projects_list" "GET" "/projects"
assert_contract_step "project_create" "POST" "/projects"
assert_contract_step "task_create" "POST" "/work/tasks"
assert_contract_step "tasks_list" "GET" "/work/tasks"
if [[ "${SMOKE_CLEANUP}" == "true" ]] && contract_step_exists "task_delete"; then
  assert_contract_step "task_delete" "DELETE" "/work/tasks/{taskId}"
fi
if [[ "${SMOKE_CLEANUP_PROJECT}" == "true" ]] && contract_step_exists "project_delete"; then
  assert_contract_step "project_delete" "DELETE" "/projects/{projectId}"
fi

curl -i -s "${API_BASE}/health/ready" > "${TMP_DIR}/health_ready.txt"
check_status_or_fail "health_ready" "${TMP_DIR}/health_ready.txt" "$(contract_field health_ready status)"

curl -i -s "${API_BASE}/version" > "${TMP_DIR}/version.txt"
check_status_or_fail "version" "${TMP_DIR}/version.txt" "$(contract_field version status)"

curl -i -s -c "${COOKIE_JAR}" "${API_BASE}/auth/csrf" > "${TMP_DIR}/csrf.txt"
check_status_or_fail "csrf" "${TMP_DIR}/csrf.txt" "$(contract_field csrf status)"
CSRF_JSON="$(body_from_http_file "${TMP_DIR}/csrf.txt")"
CSRF="$(printf "%s" "${CSRF_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}catch(e){process.stdout.write('')}})")"
if [[ "${#CSRF}" -lt 10 ]]; then
  echo "Step failed: csrf"
  echo "Expected: csrf token in response"
  echo "Got: missing/short token"
  echo "Response file: ${TMP_DIR}/csrf.txt"
  exit 1
fi

curl -i -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "x-zephix-env: staging" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -X POST "${API_BASE}/auth/smoke-login" \
  -d "{\"email\":\"${EMAIL}\"}" \
  > "${TMP_DIR}/smoke_login.txt"
check_status_or_fail "smoke_login" "${TMP_DIR}/smoke_login.txt" "$(contract_field smoke_login status)"

curl -i -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
  -H "X-CSRF-Token: ${CSRF}" \
  "${API_BASE}/auth/me" \
  > "${TMP_DIR}/auth_me.txt"
check_status_or_fail "auth_me" "${TMP_DIR}/auth_me.txt" "$(contract_field auth_me status)"

curl -i -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
  -H "X-CSRF-Token: ${CSRF}" \
  "${API_BASE}/workspaces" \
  > "${TMP_DIR}/workspaces_list.txt"
check_status_or_fail "workspaces_list" "${TMP_DIR}/workspaces_list.txt" "$(contract_field workspaces_list status)"
WORKSPACES_JSON="$(body_from_http_file "${TMP_DIR}/workspaces_list.txt")"
WORKSPACE_ID="$(printf "%s" "${WORKSPACES_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const pool=(Array.isArray(j.data)?j.data:Array.isArray(j.data?.items)?j.data.items:Array.isArray(j.data?.workspaces)?j.data.workspaces:Array.isArray(j.items)?j.items:Array.isArray(j.workspaces)?j.workspaces:Array.isArray(j)?j:[]);const roleOf=(w)=>String(w.role||w.workspaceRole||w.membership?.role||w.userRole||'').toUpperCase();const idOf=(w)=>String(w.id||w.workspaceId||'');let pick=pool.find(w=>['OWNER','ADMIN'].includes(roleOf(w))&&idOf(w));if(!pick)pick=pool.find(w=>idOf(w));process.stdout.write(pick?idOf(pick):'')}catch(e){process.stdout.write('')}})")"
if [[ -z "${WORKSPACE_ID}" ]]; then
  echo "Step failed: workspaces_list"
  echo "Expected: at least one workspace id"
  echo "Got: none"
  echo "Response file: ${TMP_DIR}/workspaces_list.txt"
  exit 1
fi

curl -i -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  "${API_BASE}/projects?limit=25" \
  > "${TMP_DIR}/projects_list.txt"
check_status_or_fail "projects_list" "${TMP_DIR}/projects_list.txt" "$(contract_field projects_list status)"

curl -i -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -X POST "${API_BASE}/projects" \
  -d "{\"name\":\"${PROJECT_NAME}\",\"workspaceId\":\"${WORKSPACE_ID}\"}" \
  > "${TMP_DIR}/project_create.txt"
check_status_or_fail "project_create" "${TMP_DIR}/project_create.txt" "$(contract_field project_create status)"
PROJECT_JSON="$(body_from_http_file "${TMP_DIR}/project_create.txt")"
PROJECT_ID="$(printf "%s" "${PROJECT_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const id=j.data?.id||j.id||j.data?.project?.id||j.project?.id||'';process.stdout.write(String(id||''))}catch(e){process.stdout.write('')}})")"
PROJECT_WORKSPACE_ID="$(printf "%s" "${PROJECT_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const wid=j.data?.workspaceId||j.workspaceId||j.data?.project?.workspaceId||j.project?.workspaceId||'';process.stdout.write(String(wid||''))}catch(e){process.stdout.write('')}})")"
PROJECT_RETURNED_NAME="$(printf "%s" "${PROJECT_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const n=j.data?.name||j.name||j.data?.project?.name||j.project?.name||'';process.stdout.write(String(n||''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "Step failed: project_create"
  echo "Expected: project id in response"
  echo "Got: none"
  echo "Response file: ${TMP_DIR}/project_create.txt"
  exit 1
fi
if [[ "${PROJECT_WORKSPACE_ID}" != "${WORKSPACE_ID}" ]]; then
  echo "Step failed: project_create"
  echo "Expected: created project scoped to selected workspace ${WORKSPACE_ID}"
  echo "Got: workspace ${PROJECT_WORKSPACE_ID}"
  echo "Response file: ${TMP_DIR}/project_create.txt"
  exit 1
fi

curl -i -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  -X POST "${API_BASE}/work/tasks" \
  -d "{\"projectId\":\"${PROJECT_ID}\",\"title\":\"${TASK_TITLE}\"}" \
  > "${TMP_DIR}/task_create.txt"
check_status_or_fail "task_create" "${TMP_DIR}/task_create.txt" "$(contract_field task_create status)"
TASK_JSON="$(body_from_http_file "${TMP_DIR}/task_create.txt")"
TASK_ID="$(printf "%s" "${TASK_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const id=j.data?.id||j.id||j.data?.task?.id||j.task?.id||'';process.stdout.write(String(id||''))}catch(e){process.stdout.write('')}})")"
TASK_RETURNED_TITLE="$(printf "%s" "${TASK_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const t=j.data?.title||j.title||j.data?.task?.title||j.task?.title||'';process.stdout.write(String(t||''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${TASK_ID}" ]]; then
  echo "Step failed: task_create"
  echo "Expected: task id in response"
  echo "Got: none"
  echo "Response file: ${TMP_DIR}/task_create.txt"
  exit 1
fi

curl -i -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  "${API_BASE}/work/tasks?projectId=${PROJECT_ID}&limit=50" \
  > "${TMP_DIR}/tasks_list.txt"
check_status_or_fail "tasks_list" "${TMP_DIR}/tasks_list.txt" "$(contract_field tasks_list status)"
if ! rg -F "\"${TASK_ID}\"" "${TMP_DIR}/tasks_list.txt" >/dev/null; then
  echo "Step failed: tasks_list"
  echo "Expected: created task id ${TASK_ID} in response"
  echo "Got: task id missing"
  echo "Response file: ${TMP_DIR}/tasks_list.txt"
  exit 1
fi
TASK_IDS_FOR_PROJECT="$(body_from_http_file "${TMP_DIR}/tasks_list.txt" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const pool=(Array.isArray(j.data)?j.data:Array.isArray(j.data?.items)?j.data.items:Array.isArray(j.data?.tasks)?j.data.tasks:Array.isArray(j.items)?j.items:Array.isArray(j.tasks)?j.tasks:Array.isArray(j)?j:[]);const ids=pool.map(t=>String(t.id||t.taskId||'')).filter(Boolean);process.stdout.write(ids.join(','))}catch(e){process.stdout.write('')}})")"

if [[ "${SMOKE_CLEANUP}" == "true" ]]; then
  if [[ "${PROJECT_RETURNED_NAME}" != "${PROJECT_PREFIX}"* ]]; then
    echo "Step failed: task_delete"
    echo "Expected: smoke-owned project prefix ${PROJECT_PREFIX}"
    echo "Got: ${PROJECT_RETURNED_NAME}"
    echo "Response file: ${TMP_DIR}/project_create.txt"
    exit 1
  fi
  if [[ "${TASK_TITLE}" != "${TASK_PREFIX}"* ]]; then
    echo "Step failed: task_delete"
    echo "Expected: smoke-owned task prefix ${TASK_PREFIX}"
    echo "Got: ${TASK_TITLE}"
    echo "Response file: ${TMP_DIR}/task_create.txt"
    exit 1
  fi
  if [[ -n "${TASK_RETURNED_TITLE}" && "${TASK_RETURNED_TITLE}" != "${TASK_PREFIX}"* ]]; then
    echo "Step failed: task_delete"
    echo "Expected: created task title with prefix ${TASK_PREFIX}"
    echo "Got: ${TASK_RETURNED_TITLE}"
    echo "Response file: ${TMP_DIR}/task_create.txt"
    exit 1
  fi

  if contract_step_exists "task_delete"; then
    IFS=',' read -r -a TASK_IDS <<< "${TASK_IDS_FOR_PROJECT}"
    if [[ ${#TASK_IDS[@]} -eq 0 ]]; then
      echo "Step failed: task_delete"
      echo "Expected: at least one task id from tasks_list"
      echo "Got: none"
      echo "Response file: ${TMP_DIR}/tasks_list.txt"
      exit 1
    fi
    for tid in "${TASK_IDS[@]}"; do
      [[ -z "${tid}" ]] && continue
      TASK_DELETE_PATH="$(contract_field task_delete path)"
      TASK_DELETE_PATH="${TASK_DELETE_PATH/\{taskId\}/${tid}}"
      DELETE_OUT="${TMP_DIR}/task_delete_${tid}.txt"
      curl -i -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
        -H "X-CSRF-Token: ${CSRF}" \
        -H "X-Workspace-Id: ${WORKSPACE_ID}" \
        -X DELETE "${API_BASE}${TASK_DELETE_PATH}" \
        > "${DELETE_OUT}"
      check_status_or_fail "task_delete" "${DELETE_OUT}" "$(contract_field task_delete status)"
    done
  fi
  if [[ "${SMOKE_CLEANUP_PROJECT}" == "true" ]] && contract_step_exists "project_delete"; then
    PROJECT_DELETE_PATH="$(contract_field project_delete path)"
    PROJECT_DELETE_PATH="${PROJECT_DELETE_PATH/\{projectId\}/${PROJECT_ID}}"
    curl -i -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
      -H "X-CSRF-Token: ${CSRF}" \
      -H "X-Workspace-Id: ${WORKSPACE_ID}" \
      -X DELETE "${API_BASE}${PROJECT_DELETE_PATH}" \
      > "${TMP_DIR}/project_delete.txt"
    check_status_or_fail "project_delete" "${TMP_DIR}/project_delete.txt" "$(contract_field project_delete status)"
  fi
fi

echo "platform-core contract verification passed"
