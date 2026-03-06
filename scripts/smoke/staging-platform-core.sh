#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
CONTRACT_FILE="${ROOT_DIR}/docs/api-contract/staging/platform-core-contract.json"
OUT_DIR="${ROOT_DIR}/docs/architecture/proofs/staging/platform-core-latest"
DEPLOYMENT_HISTORY_FILE="${ROOT_DIR}/docs/architecture/proofs/staging/deployment-history.log"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}"
  exit 1
fi
if [[ ! -f "${CONTRACT_FILE}" ]]; then
  echo "Missing contract file: ${CONTRACT_FILE}"
  exit 1
fi

read_env() {
  local key="$1"
  rg "^${key}=" "${ENV_FILE}" -N | head -n 1 | sed "s/^${key}=//"
}

STAGING_BACKEND_BASE="$(read_env STAGING_BACKEND_BASE)"
STAGING_SMOKE_KEY="${STAGING_SMOKE_KEY:-}"
SMOKE_CLEANUP="${SMOKE_CLEANUP:-false}"
SMOKE_CLEANUP_PROJECT="${SMOKE_CLEANUP_PROJECT:-false}"
if [[ -z "${STAGING_BACKEND_BASE}" ]]; then
  echo "STAGING_BACKEND_BASE missing in ${ENV_FILE}"
  exit 1
fi
if [[ -z "${STAGING_SMOKE_KEY}" ]]; then
  echo "STAGING_SMOKE_KEY missing. Export it in your shell before running."
  exit 1
fi

API_BASE="${STAGING_BACKEND_BASE}/api"
EMAIL="${EMAIL:-staging+smoke@zephix.dev}"
RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
PROJECT_PREFIX="SMOKE PLATFORM CORE"
TASK_PREFIX="SMOKE TASK"
PROJECT_NAME="${PROJECT_NAME:-${PROJECT_PREFIX} ${RUN_ID}}"
TASK_TITLE="${TASK_TITLE:-${TASK_PREFIX} ${RUN_ID}}"

mkdir -p "${OUT_DIR}"
rm -f "${OUT_DIR}/cookiejar.txt"

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
    echo "Contract drift for ${step}: expected ${expected_method} ${expected_path}, got ${actual_method} ${actual_path}"
    exit 1
  fi
}

require_status() {
  local file="$1"
  shift
  local code
  code="$(status_code "${file}")"
  for allowed in "$@"; do
    if [[ "${code}" == "${allowed}" ]]; then
      return 0
    fi
  done
  echo "Unexpected status ${code} for ${file}. Allowed: $*"
  sed -n '1,80p' "${file}"
  exit 1
}

require_status_csv() {
  local file="$1"
  local allowed_csv="$2"
  IFS=',' read -r -a allowed <<< "${allowed_csv}"
  require_status "${file}" "${allowed[@]}"
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
if contract_step_exists "task_delete"; then
  assert_contract_step "task_delete" "DELETE" "/work/tasks/{taskId}"
fi
if contract_step_exists "project_delete"; then
  assert_contract_step "project_delete" "DELETE" "/projects/{projectId}"
fi

curl -i "${API_BASE}/health/ready" > "${OUT_DIR}/01-health-ready.txt"
require_status_csv "${OUT_DIR}/01-health-ready.txt" "$(contract_field health_ready status)"

curl -i "${API_BASE}/version" > "${OUT_DIR}/02-version.txt"
require_status_csv "${OUT_DIR}/02-version.txt" "$(contract_field version status)"
VERSION_JSON="$(body_from_http_file "${OUT_DIR}/02-version.txt")"
RAILWAY_DEPLOYMENT_ID="$(printf "%s" "${VERSION_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.railwayDeploymentId || (j.data&&j.data.railwayDeploymentId) || ''))}catch(e){process.stdout.write('')}})")"
DEPLOYED_COMMIT_SHA="$(printf "%s" "${VERSION_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.commitSha || j.gitSha || (j.data&&j.data.commitSha) || ''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${RAILWAY_DEPLOYMENT_ID}" || -z "${DEPLOYED_COMMIT_SHA}" ]]; then
  echo "Failed to parse version metadata"
  sed -n '1,80p' "${OUT_DIR}/02-version.txt"
  exit 1
fi
mkdir -p "$(dirname "${DEPLOYMENT_HISTORY_FILE}")"
printf "%s | commit=%s | deployment=%s\n" \
  "$(date -u +"%Y-%m-%dT%H:%MZ")" \
  "${DEPLOYED_COMMIT_SHA}" \
  "${RAILWAY_DEPLOYMENT_ID}" >> "${DEPLOYMENT_HISTORY_FILE}"

CSRF_JSON="$(curl -s -c "${OUT_DIR}/cookiejar.txt" "${API_BASE}/auth/csrf")"
CSRF="$(printf "%s" "${CSRF_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}catch(e){process.stdout.write('')}})")"
printf "%s\n" "${CSRF}" > "${OUT_DIR}/03-auth-csrf.txt"
if [[ "${#CSRF}" -lt 10 ]]; then
  echo "CSRF token missing or too short"
  sed -n '1,40p' "${OUT_DIR}/03-auth-csrf.txt"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "x-zephix-env: staging" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -X POST "${API_BASE}/auth/smoke-login" \
  -d "{\"email\":\"${EMAIL}\"}" \
  > "${OUT_DIR}/04-auth-smoke-login.txt"
require_status_csv "${OUT_DIR}/04-auth-smoke-login.txt" "$(contract_field smoke_login status)"
if ! rg -i "^set-cookie:" "${OUT_DIR}/04-auth-smoke-login.txt" >/dev/null; then
  echo "Missing Set-Cookie header in smoke-login response"
  sed -n '1,80p' "${OUT_DIR}/04-auth-smoke-login.txt"
  exit 1
fi
if ! rg -i "set-cookie:.*(session|sid|connect\\.sid)" "${OUT_DIR}/04-auth-smoke-login.txt" >/dev/null; then
  echo "Missing session cookie token in smoke-login response"
  sed -n '1,80p' "${OUT_DIR}/04-auth-smoke-login.txt"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "X-CSRF-Token: ${CSRF}" \
  "${API_BASE}/auth/me" \
  > "${OUT_DIR}/05-auth-me.txt"
require_status_csv "${OUT_DIR}/05-auth-me.txt" "$(contract_field auth_me status)"

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "X-CSRF-Token: ${CSRF}" \
  "${API_BASE}/workspaces" \
  > "${OUT_DIR}/06-workspaces-list.txt"
require_status_csv "${OUT_DIR}/06-workspaces-list.txt" "$(contract_field workspaces_list status)"
WORKSPACES_JSON="$(body_from_http_file "${OUT_DIR}/06-workspaces-list.txt")"
WORKSPACE_ID="$(printf "%s" "${WORKSPACES_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const pool=(Array.isArray(j.data)?j.data:Array.isArray(j.data?.items)?j.data.items:Array.isArray(j.data?.workspaces)?j.data.workspaces:Array.isArray(j.items)?j.items:Array.isArray(j.workspaces)?j.workspaces:Array.isArray(j)?j:[]);const roleOf=(w)=>String(w.role||w.workspaceRole||w.membership?.role||w.userRole||'').toUpperCase();const idOf=(w)=>String(w.id||w.workspaceId||'');let pick=pool.find(w=>['OWNER','ADMIN'].includes(roleOf(w))&&idOf(w));if(!pick)pick=pool.find(w=>idOf(w));process.stdout.write(pick?idOf(pick):'')}catch(e){process.stdout.write('')}})")"
if [[ -z "${WORKSPACE_ID}" ]]; then
  echo "Failed to select workspaceId from /workspaces response"
  sed -n '1,120p' "${OUT_DIR}/06-workspaces-list.txt"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  "${API_BASE}/projects?limit=25" \
  > "${OUT_DIR}/07-projects-list.txt"
require_status_csv "${OUT_DIR}/07-projects-list.txt" "$(contract_field projects_list status)"

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -X POST "${API_BASE}/projects" \
  -d "{\"name\":\"${PROJECT_NAME}\",\"workspaceId\":\"${WORKSPACE_ID}\"}" \
  > "${OUT_DIR}/08-project-create.txt"
require_status_csv "${OUT_DIR}/08-project-create.txt" "$(contract_field project_create status)"
PROJECT_JSON="$(body_from_http_file "${OUT_DIR}/08-project-create.txt")"
PROJECT_ID="$(printf "%s" "${PROJECT_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const id=j.data?.id||j.id||j.data?.project?.id||j.project?.id||'';process.stdout.write(String(id||''))}catch(e){process.stdout.write('')}})")"
PROJECT_WORKSPACE_ID="$(printf "%s" "${PROJECT_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const wid=j.data?.workspaceId||j.workspaceId||j.data?.project?.workspaceId||j.project?.workspaceId||'';process.stdout.write(String(wid||''))}catch(e){process.stdout.write('')}})")"
PROJECT_RETURNED_NAME="$(printf "%s" "${PROJECT_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const n=j.data?.name||j.name||j.data?.project?.name||j.project?.name||'';process.stdout.write(String(n||''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "Failed to parse project id from create response"
  sed -n '1,120p' "${OUT_DIR}/08-project-create.txt"
  exit 1
fi
if [[ "${PROJECT_WORKSPACE_ID}" != "${WORKSPACE_ID}" ]]; then
  echo "Project workspace mismatch: expected ${WORKSPACE_ID}, got ${PROJECT_WORKSPACE_ID}"
  sed -n '1,120p' "${OUT_DIR}/08-project-create.txt"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  -X POST "${API_BASE}/work/tasks" \
  -d "{\"projectId\":\"${PROJECT_ID}\",\"title\":\"${TASK_TITLE}\"}" \
  > "${OUT_DIR}/09-task-create.txt"
require_status_csv "${OUT_DIR}/09-task-create.txt" "$(contract_field task_create status)"
TASK_JSON="$(body_from_http_file "${OUT_DIR}/09-task-create.txt")"
TASK_ID="$(printf "%s" "${TASK_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const id=j.data?.id||j.id||j.data?.task?.id||j.task?.id||'';process.stdout.write(String(id||''))}catch(e){process.stdout.write('')}})")"
TASK_RETURNED_TITLE="$(printf "%s" "${TASK_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const t=j.data?.title||j.title||j.data?.task?.title||j.task?.title||'';process.stdout.write(String(t||''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${TASK_ID}" ]]; then
  echo "Failed to parse task id from create response"
  sed -n '1,120p' "${OUT_DIR}/09-task-create.txt"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  "${API_BASE}/work/tasks?projectId=${PROJECT_ID}&limit=50" \
  > "${OUT_DIR}/10-tasks-list.txt"
require_status_csv "${OUT_DIR}/10-tasks-list.txt" "$(contract_field tasks_list status)"
if ! rg -F "\"${TASK_ID}\"" "${OUT_DIR}/10-tasks-list.txt" >/dev/null; then
  echo "Created task id not present in task list response"
  echo "taskId=${TASK_ID}"
  sed -n '1,160p' "${OUT_DIR}/10-tasks-list.txt"
  exit 1
fi
TASK_IDS_FOR_PROJECT="$(body_from_http_file "${OUT_DIR}/10-tasks-list.txt" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const pool=(Array.isArray(j.data)?j.data:Array.isArray(j.data?.items)?j.data.items:Array.isArray(j.data?.tasks)?j.data.tasks:Array.isArray(j.items)?j.items:Array.isArray(j.tasks)?j.tasks:Array.isArray(j)?j:[]);const ids=pool.map(t=>String(t.id||t.taskId||'')).filter(Boolean);process.stdout.write(ids.join(','))}catch(e){process.stdout.write('')}})")"

# Optional cleanup (safe-by-default: off)
TASK_DELETE_STATUS=""
PROJECT_DELETE_STATUS=""
if [[ "${SMOKE_CLEANUP}" == "true" ]]; then
  CLEANUP_OK="true"

  # Must prove entity provenance and workspace match before any delete.
  if [[ -z "${PROJECT_RETURNED_NAME}" ]]; then
    PROJECT_VERIFY_FILE="$(mktemp)"
    curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
      -H "X-CSRF-Token: ${CSRF}" \
      -H "X-Workspace-Id: ${WORKSPACE_ID}" \
      "${API_BASE}/projects/${PROJECT_ID}" \
      > "${PROJECT_VERIFY_FILE}"
    if [[ "$(status_code "${PROJECT_VERIFY_FILE}")" != "200" ]]; then
      CLEANUP_OK="false"
    else
      PROJECT_RETURNED_NAME="$(body_from_http_file "${PROJECT_VERIFY_FILE}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);const n=j.data?.name||j.name||'';process.stdout.write(String(n||''))}catch(e){process.stdout.write('')}})")"
    fi
    rm -f "${PROJECT_VERIFY_FILE}"
  fi

  if [[ "${PROJECT_RETURNED_NAME}" != "${PROJECT_PREFIX}"* ]]; then
    CLEANUP_OK="false"
  fi
  if [[ "${TASK_TITLE}" != "${TASK_PREFIX}"* ]]; then
    CLEANUP_OK="false"
  fi
  if [[ -n "${TASK_RETURNED_TITLE}" && "${TASK_RETURNED_TITLE}" != "${TASK_PREFIX}"* ]]; then
    CLEANUP_OK="false"
  fi
  if ! rg -F "\"${TASK_ID}\"" "${OUT_DIR}/10-tasks-list.txt" >/dev/null; then
    CLEANUP_OK="false"
  fi

  if [[ "${CLEANUP_OK}" == "true" ]]; then
    if contract_step_exists "task_delete"; then
      IFS=',' read -r -a TASK_IDS <<< "${TASK_IDS_FOR_PROJECT}"
      if [[ ${#TASK_IDS[@]} -eq 0 ]]; then
        CLEANUP_OK="false"
      else
        for tid in "${TASK_IDS[@]}"; do
          [[ -z "${tid}" ]] && continue
          DELETE_PATH="$(contract_field task_delete path)"
          DELETE_PATH="${DELETE_PATH/\{taskId\}/${tid}}"
          DELETE_OUT="$(mktemp)"
          curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
            -H "X-CSRF-Token: ${CSRF}" \
            -H "X-Workspace-Id: ${WORKSPACE_ID}" \
            -X DELETE "${API_BASE}${DELETE_PATH}" \
            > "${DELETE_OUT}"
          require_status_csv "${DELETE_OUT}" "$(contract_field task_delete status)"
          if [[ "${tid}" == "${TASK_ID}" ]]; then
            cp "${DELETE_OUT}" "${OUT_DIR}/11-task-delete.txt"
            TASK_DELETE_STATUS="$(status_code "${OUT_DIR}/11-task-delete.txt")"
          fi
          rm -f "${DELETE_OUT}"
        done
        if [[ -z "${TASK_DELETE_STATUS}" ]]; then
          DELETE_PATH="$(contract_field task_delete path)"
          DELETE_PATH="${DELETE_PATH/\{taskId\}/${TASK_ID}}"
          curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
            -H "X-CSRF-Token: ${CSRF}" \
            -H "X-Workspace-Id: ${WORKSPACE_ID}" \
            -X DELETE "${API_BASE}${DELETE_PATH}" \
            > "${OUT_DIR}/11-task-delete.txt"
          require_status_csv "${OUT_DIR}/11-task-delete.txt" "$(contract_field task_delete status)"
          TASK_DELETE_STATUS="$(status_code "${OUT_DIR}/11-task-delete.txt")"
        fi
      fi
    fi

    if [[ "${CLEANUP_OK}" == "true" && "${SMOKE_CLEANUP_PROJECT}" == "true" ]] && contract_step_exists "project_delete"; then
      PROJECT_DELETE_PATH="$(contract_field project_delete path)"
      PROJECT_DELETE_PATH="${PROJECT_DELETE_PATH/\{projectId\}/${PROJECT_ID}}"
      curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
        -H "X-CSRF-Token: ${CSRF}" \
        -H "X-Workspace-Id: ${WORKSPACE_ID}" \
        -X DELETE "${API_BASE}${PROJECT_DELETE_PATH}" \
        > "${OUT_DIR}/12-project-delete.txt"
      PROJECT_DELETE_STATUS="$(status_code "${OUT_DIR}/12-project-delete.txt")"
      require_status_csv "${OUT_DIR}/12-project-delete.txt" "$(contract_field project_delete status)"
    fi
  else
    echo "cleanup skipped: unable to prove smoke-owned entities safely"
  fi
fi

RUN_DATE_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
SMOKE_LOGIN_STATUS="$(status_code "${OUT_DIR}/04-auth-smoke-login.txt")"
AUTH_ME_STATUS="$(status_code "${OUT_DIR}/05-auth-me.txt")"
WORKSPACES_STATUS="$(status_code "${OUT_DIR}/06-workspaces-list.txt")"
PROJECTS_LIST_STATUS="$(status_code "${OUT_DIR}/07-projects-list.txt")"
PROJECT_CREATE_STATUS="$(status_code "${OUT_DIR}/08-project-create.txt")"
TASK_CREATE_STATUS="$(status_code "${OUT_DIR}/09-task-create.txt")"
TASKS_LIST_STATUS="$(status_code "${OUT_DIR}/10-tasks-list.txt")"
cat > "${OUT_DIR}/README.md" <<EOF
# Staging Platform Core Proof

- date_utc: ${RUN_DATE_UTC}
- domain: ${STAGING_BACKEND_BASE}
- api_base: ${API_BASE}
- railwayDeploymentId: ${RAILWAY_DEPLOYMENT_ID}
- commitSha: ${DEPLOYED_COMMIT_SHA}
- run_id: ${RUN_ID}
- workspace_id: ${WORKSPACE_ID}
- project_id: ${PROJECT_ID}
- task_id: ${TASK_ID}
- smoke_login_status: ${SMOKE_LOGIN_STATUS}
- auth_me_status: ${AUTH_ME_STATUS}
- workspaces_list_status: ${WORKSPACES_STATUS}
- projects_list_status: ${PROJECTS_LIST_STATUS}
- project_create_status: ${PROJECT_CREATE_STATUS}
- task_create_status: ${TASK_CREATE_STATUS}
- tasks_list_status: ${TASKS_LIST_STATUS}
- cleanup_enabled: ${SMOKE_CLEANUP}
- cleanup_task: ${SMOKE_CLEANUP}
- cleanup_project: ${SMOKE_CLEANUP_PROJECT}
- task_delete_status: ${TASK_DELETE_STATUS}
- project_delete_status: ${PROJECT_DELETE_STATUS}
- result: PASS
EOF

echo "railwayDeploymentId=${RAILWAY_DEPLOYMENT_ID}"
echo "smoke-login status=${SMOKE_LOGIN_STATUS}"
echo "/auth/me status=${AUTH_ME_STATUS}"
echo "workspaces_list status=${WORKSPACES_STATUS}"
echo "project_create status=${PROJECT_CREATE_STATUS} project_id=${PROJECT_ID}"
echo "task_create status=${TASK_CREATE_STATUS} task_id=${TASK_ID}"
echo "tasks_list status=${TASKS_LIST_STATUS}"
echo "cleanup_enabled=${SMOKE_CLEANUP}"
echo "cleanup_task=${SMOKE_CLEANUP}"
echo "cleanup_project=${SMOKE_CLEANUP_PROJECT}"
if [[ "${SMOKE_CLEANUP}" == "true" ]]; then
  echo "task_delete status=${TASK_DELETE_STATUS}"
  if [[ "${SMOKE_CLEANUP_PROJECT}" == "true" ]]; then
    echo "project_delete status=${PROJECT_DELETE_STATUS}"
  fi
fi
echo "proof_dir=${OUT_DIR}"
