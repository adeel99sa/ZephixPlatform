#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
CONTRACT_FILE="${ROOT_DIR}/docs/api-contract/staging/programs-portfolios-contract.json"
OUT_DIR="${ROOT_DIR}/docs/architecture/proofs/staging/programs-portfolios-latest"

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
if [[ -z "${STAGING_BACKEND_BASE}" ]]; then
  echo "STAGING_BACKEND_BASE missing in ${ENV_FILE}"
  exit 1
fi
if [[ -z "${STAGING_SMOKE_KEY:-}" ]]; then
  echo "STAGING_SMOKE_KEY missing. Export it in your shell before running."
  exit 1
fi

API_BASE="${STAGING_BACKEND_BASE}/api"
RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
EMAIL="${EMAIL:-staging+smoke@zephix.dev}"
PROGRAM_PREFIX="SMOKE PROGRAMS"
PORTFOLIO_PREFIX="SMOKE PORTFOLIOS"
PROJECT_PREFIX="SMOKE PROJECT"
PROGRAM_NAME="${PROGRAM_PREFIX} ${RUN_ID}"
PORTFOLIO_NAME="${PORTFOLIO_PREFIX} ${RUN_ID}"
PROJECT_NAME="${PROJECT_PREFIX} ${RUN_ID}"
SMOKE_CLEANUP="${SMOKE_CLEANUP:-false}"
SMOKE_CLEANUP_PROJECT="${SMOKE_CLEANUP_PROJECT:-false}"

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

require_status_csv() {
  local file="$1"
  local allowed_csv="$2"
  local code
  code="$(status_code "${file}")"
  IFS=',' read -r -a allowed <<< "${allowed_csv}"
  for allowed_code in "${allowed[@]}"; do
    if [[ "${code}" == "${allowed_code}" ]]; then
      return 0
    fi
  done
  echo "Unexpected status ${code} for ${file}. Allowed: ${allowed_csv}"
  sed -n '1,80p' "${file}"
  exit 1
}

assert_contract_step "health_ready" "GET" "/health/ready"
assert_contract_step "version" "GET" "/version"
assert_contract_step "csrf" "GET" "/auth/csrf"
assert_contract_step "smoke_login" "POST" "/auth/smoke-login"
assert_contract_step "auth_me" "GET" "/auth/me"
assert_contract_step "workspaces_list" "GET" "/workspaces"
assert_contract_step "program_create" "POST" "/workspaces/{workspaceId}/portfolios/{portfolioId}/programs"
assert_contract_step "programs_list" "GET" "/workspaces/{workspaceId}/programs"
assert_contract_step "portfolio_create" "POST" "/workspaces/{workspaceId}/portfolios"
assert_contract_step "portfolios_list" "GET" "/workspaces/{workspaceId}/portfolios"
assert_contract_step "project_create" "POST" "/projects"
assert_contract_step "projects_list" "GET" "/projects"

curl -i "${API_BASE}/health/ready" > "${OUT_DIR}/01-health-ready.txt"
require_status_csv "${OUT_DIR}/01-health-ready.txt" "$(contract_field health_ready status)"

curl -i "${API_BASE}/version" > "${OUT_DIR}/02-version.txt"
require_status_csv "${OUT_DIR}/02-version.txt" "$(contract_field version status)"
VERSION_JSON="$(body_from_http_file "${OUT_DIR}/02-version.txt")"
RAILWAY_DEPLOYMENT_ID="$(printf "%s" "${VERSION_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.railwayDeploymentId || (j.data&&j.data.railwayDeploymentId) || ''))}catch(e){process.stdout.write('')}})")"
DEPLOYED_COMMIT_SHA="$(printf "%s" "${VERSION_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.commitSha || (j.data&&j.data.commitSha) || ''))}catch(e){process.stdout.write('')}})")"

CSRF_JSON="$(curl -s -c "${OUT_DIR}/cookiejar.txt" "${API_BASE}/auth/csrf")"
CSRF="$(printf "%s" "${CSRF_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}catch(e){process.stdout.write('')}})")"
printf "%s\n" "${CSRF}" > "${OUT_DIR}/03-auth-csrf.txt"
if [[ "${#CSRF}" -lt 10 ]]; then
  echo "CSRF token missing or too short"
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
  echo "Failed to select workspace id"
  exit 1
fi

# Bootstrap portfolio required by API for program creation.
curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  -X POST "${API_BASE}/workspaces/${WORKSPACE_ID}/portfolios" \
  -d "{\"name\":\"${PORTFOLIO_PREFIX} BOOTSTRAP ${RUN_ID}\",\"description\":\"bootstrap for program create\"}" \
  > "${OUT_DIR}/06a-bootstrap-portfolio-create.txt"
require_status_csv "${OUT_DIR}/06a-bootstrap-portfolio-create.txt" "$(contract_field portfolio_create status)"
BOOTSTRAP_PORTFOLIO_ID="$(body_from_http_file "${OUT_DIR}/06a-bootstrap-portfolio-create.txt" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.data?.id||j.id||''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${BOOTSTRAP_PORTFOLIO_ID}" ]]; then
  echo "Failed to parse bootstrap portfolio id"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  -X POST "${API_BASE}/workspaces/${WORKSPACE_ID}/portfolios/${BOOTSTRAP_PORTFOLIO_ID}/programs" \
  -d "{\"portfolioId\":\"${BOOTSTRAP_PORTFOLIO_ID}\",\"name\":\"${PROGRAM_NAME}\",\"description\":\"program smoke\"}" \
  > "${OUT_DIR}/07-program-create.txt"
require_status_csv "${OUT_DIR}/07-program-create.txt" "$(contract_field program_create status)"
PROGRAM_ID="$(body_from_http_file "${OUT_DIR}/07-program-create.txt" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.data?.id||j.id||''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${PROGRAM_ID}" ]]; then
  echo "Failed to parse program id"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  "${API_BASE}/workspaces/${WORKSPACE_ID}/programs" \
  > "${OUT_DIR}/08-programs-list.txt"
require_status_csv "${OUT_DIR}/08-programs-list.txt" "$(contract_field programs_list status)"

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  -X POST "${API_BASE}/workspaces/${WORKSPACE_ID}/portfolios" \
  -d "{\"name\":\"${PORTFOLIO_NAME}\",\"description\":\"portfolio smoke\"}" \
  > "${OUT_DIR}/09-portfolio-create.txt"
require_status_csv "${OUT_DIR}/09-portfolio-create.txt" "$(contract_field portfolio_create status)"
PORTFOLIO_ID="$(body_from_http_file "${OUT_DIR}/09-portfolio-create.txt" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.data?.id||j.id||''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${PORTFOLIO_ID}" ]]; then
  echo "Failed to parse portfolio id"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  "${API_BASE}/workspaces/${WORKSPACE_ID}/portfolios" \
  > "${OUT_DIR}/10-portfolios-list.txt"
require_status_csv "${OUT_DIR}/10-portfolios-list.txt" "$(contract_field portfolios_list status)"

SUPPORTS_PROGRAM_LINK="$(rg -n "programId" "${ROOT_DIR}/zephix-backend/src/modules/projects/dto/create-project.dto.ts" >/dev/null && echo true || echo false)"
SUPPORTS_PORTFOLIO_LINK="$(rg -n "portfolioId" "${ROOT_DIR}/zephix-backend/src/modules/projects/dto/create-project.dto.ts" >/dev/null && echo true || echo false)"
LINKAGE_NOTE="supported"
LINKAGE_PROBE_BODY=""
PROJECT_PAYLOAD="{\"name\":\"${PROJECT_NAME}\",\"workspaceId\":\"${WORKSPACE_ID}\"}"

if [[ "${SUPPORTS_PROGRAM_LINK}" == "true" ]]; then
  PROJECT_PAYLOAD="{\"name\":\"${PROJECT_NAME}\",\"workspaceId\":\"${WORKSPACE_ID}\",\"programId\":\"${PROGRAM_ID}\"}"
elif [[ "${SUPPORTS_PORTFOLIO_LINK}" == "true" ]]; then
  PROJECT_PAYLOAD="{\"name\":\"${PROJECT_NAME}\",\"workspaceId\":\"${WORKSPACE_ID}\",\"portfolioId\":\"${PORTFOLIO_ID}\"}"
else
  LINKAGE_NOTE="not supported by CreateProjectDto (no programId/portfolioId fields)"
  curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: ${CSRF}" \
    -X POST "${API_BASE}/projects" \
    -d "{\"name\":\"${PROJECT_NAME} LINKAGE PROBE\",\"workspaceId\":\"${WORKSPACE_ID}\",\"programId\":\"${PROGRAM_ID}\",\"portfolioId\":\"${PORTFOLIO_ID}\"}" \
    > "${OUT_DIR}/11a-project-linkage-unsupported.txt"
  LINKAGE_PROBE_BODY="$(body_from_http_file "${OUT_DIR}/11a-project-linkage-unsupported.txt")"
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -X POST "${API_BASE}/projects" \
  -d "${PROJECT_PAYLOAD}" \
  > "${OUT_DIR}/11-project-create.txt"
require_status_csv "${OUT_DIR}/11-project-create.txt" "$(contract_field project_create status)"
PROJECT_ID="$(body_from_http_file "${OUT_DIR}/11-project-create.txt" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.data?.id||j.id||''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "Failed to parse project id"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "X-Workspace-Id: ${WORKSPACE_ID}" \
  "${API_BASE}/projects?limit=25" \
  > "${OUT_DIR}/12-projects-list.txt"
require_status_csv "${OUT_DIR}/12-projects-list.txt" "$(contract_field projects_list status)"

PROJECT_DELETE_STATUS=""
PROGRAM_ARCHIVE_STATUS=""
PORTFOLIO_ARCHIVE_STATUS=""
CLEANUP_PROGRAM_NOTE="skipped (safe cleanup not requested)"
CLEANUP_PORTFOLIO_NOTE="skipped (safe cleanup not requested)"

if [[ "${SMOKE_CLEANUP_PROJECT}" == "true" ]] && contract_step_exists "project_delete"; then
  PROJECT_DELETE_PATH="$(contract_field project_delete path)"
  PROJECT_DELETE_PATH="${PROJECT_DELETE_PATH/\{projectId\}/${PROJECT_ID}}"
  curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
    -H "X-CSRF-Token: ${CSRF}" \
    -H "X-Workspace-Id: ${WORKSPACE_ID}" \
    -X DELETE "${API_BASE}${PROJECT_DELETE_PATH}" \
    > "${OUT_DIR}/13-project-delete.txt"
  require_status_csv "${OUT_DIR}/13-project-delete.txt" "$(contract_field project_delete status)"
  PROJECT_DELETE_STATUS="$(status_code "${OUT_DIR}/13-project-delete.txt")"
fi

if [[ "${SMOKE_CLEANUP}" == "true" ]]; then
  if contract_step_exists "program_archive" && [[ "${PROGRAM_NAME}" == "${PROGRAM_PREFIX}"* ]]; then
    PROGRAM_ARCHIVE_PATH="$(contract_field program_archive path)"
    PROGRAM_ARCHIVE_PATH="${PROGRAM_ARCHIVE_PATH/\{workspaceId\}/${WORKSPACE_ID}}"
    PROGRAM_ARCHIVE_PATH="${PROGRAM_ARCHIVE_PATH/\{programId\}/${PROGRAM_ID}}"
    curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
      -H "X-CSRF-Token: ${CSRF}" \
      -H "X-Workspace-Id: ${WORKSPACE_ID}" \
      -X POST "${API_BASE}${PROGRAM_ARCHIVE_PATH}" \
      > "${OUT_DIR}/14-program-archive.txt"
    require_status_csv "${OUT_DIR}/14-program-archive.txt" "$(contract_field program_archive status)"
    PROGRAM_ARCHIVE_STATUS="$(status_code "${OUT_DIR}/14-program-archive.txt")"
    CLEANUP_PROGRAM_NOTE="attempted"
  else
    CLEANUP_PROGRAM_NOTE="skipped (program archive endpoint not configured safe)"
  fi

  if contract_step_exists "portfolio_archive" && [[ "${PORTFOLIO_NAME}" == "${PORTFOLIO_PREFIX}"* ]]; then
    PORTFOLIO_ARCHIVE_PATH="$(contract_field portfolio_archive path)"
    PORTFOLIO_ARCHIVE_PATH="${PORTFOLIO_ARCHIVE_PATH/\{workspaceId\}/${WORKSPACE_ID}}"
    PORTFOLIO_ARCHIVE_PATH="${PORTFOLIO_ARCHIVE_PATH/\{portfolioId\}/${PORTFOLIO_ID}}"
    curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
      -H "X-CSRF-Token: ${CSRF}" \
      -H "X-Workspace-Id: ${WORKSPACE_ID}" \
      -X POST "${API_BASE}${PORTFOLIO_ARCHIVE_PATH}" \
      > "${OUT_DIR}/15-portfolio-archive.txt"
    require_status_csv "${OUT_DIR}/15-portfolio-archive.txt" "$(contract_field portfolio_archive status)"
    PORTFOLIO_ARCHIVE_STATUS="$(status_code "${OUT_DIR}/15-portfolio-archive.txt")"
    CLEANUP_PORTFOLIO_NOTE="attempted"
  else
    CLEANUP_PORTFOLIO_NOTE="skipped (portfolio archive endpoint not configured safe)"
  fi
fi

cat > "${OUT_DIR}/README.md" <<EOF
# Staging Programs Portfolios Proof

- date_utc: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- run_id: ${RUN_ID}
- domain: ${STAGING_BACKEND_BASE}
- api_base: ${API_BASE}
- railwayDeploymentId: ${RAILWAY_DEPLOYMENT_ID}
- commitSha: ${DEPLOYED_COMMIT_SHA}
- workspace_id: ${WORKSPACE_ID}
- bootstrap_portfolio_id: ${BOOTSTRAP_PORTFOLIO_ID}
- program_id: ${PROGRAM_ID}
- portfolio_id: ${PORTFOLIO_ID}
- project_id: ${PROJECT_ID}
- linkage_note: ${LINKAGE_NOTE}
- linkage_probe_response: ${LINKAGE_PROBE_BODY}
- project_delete_status: ${PROJECT_DELETE_STATUS}
- program_archive_status: ${PROGRAM_ARCHIVE_STATUS}
- portfolio_archive_status: ${PORTFOLIO_ARCHIVE_STATUS}
- cleanup_program_note: ${CLEANUP_PROGRAM_NOTE}
- cleanup_portfolio_note: ${CLEANUP_PORTFOLIO_NOTE}
- result: PASS
EOF

echo "railwayDeploymentId=${RAILWAY_DEPLOYMENT_ID}"
echo "program_create status=$(status_code "${OUT_DIR}/07-program-create.txt") program_id=${PROGRAM_ID}"
echo "programs_list status=$(status_code "${OUT_DIR}/08-programs-list.txt")"
echo "portfolio_create status=$(status_code "${OUT_DIR}/09-portfolio-create.txt") portfolio_id=${PORTFOLIO_ID}"
echo "portfolios_list status=$(status_code "${OUT_DIR}/10-portfolios-list.txt")"
echo "project_create status=$(status_code "${OUT_DIR}/11-project-create.txt") project_id=${PROJECT_ID}"
echo "projects_list status=$(status_code "${OUT_DIR}/12-projects-list.txt")"
echo "linkage_note=${LINKAGE_NOTE}"
echo "proof_dir=${OUT_DIR}"
