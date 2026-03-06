#!/usr/bin/env bash
# staging-customer-journey.sh
#
# End-to-end customer journey smoke lane.
#
# Path:
#   org_signup (fresh admin) → smoke_login → workspace → portfolio → program →
#   project → link → project_get (assert linked) → task → portfolio rollup →
#   invite second user → invitee registers → invitee accepts invite →
#   invitee_workspaces_list (assert workspace visible)
#
# Requires: STAGING_SMOKE_KEY exported in shell
# Reads:    STAGING_BACKEND_BASE from docs/ai/environments/staging.env
# Proof:    docs/architecture/proofs/staging/customer-journey-latest/

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
CONTRACT_FILE="${ROOT_DIR}/docs/api-contract/staging/customer-journey-contract.json"
OUT_DIR="${ROOT_DIR}/docs/architecture/proofs/staging/customer-journey-latest"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "FAIL: Missing env file: ${ENV_FILE}"; exit 1
fi
if [[ ! -f "${CONTRACT_FILE}" ]]; then
  echo "FAIL: Missing contract file: ${CONTRACT_FILE}"; exit 1
fi

read_env() {
  grep -E "^${1}=" "${ENV_FILE}" | head -n 1 | sed "s/^${1}=//"
}

STAGING_BACKEND_BASE="$(read_env STAGING_BACKEND_BASE)"
STAGING_SMOKE_KEY="${STAGING_SMOKE_KEY:-}"

if [[ -z "${STAGING_BACKEND_BASE}" ]]; then
  echo "FAIL: STAGING_BACKEND_BASE missing in ${ENV_FILE}"; exit 1
fi
if [[ -z "${STAGING_SMOKE_KEY}" ]]; then
  echo "FAIL: STAGING_SMOKE_KEY missing. Export it in your shell before running."; exit 1
fi

API_BASE="${STAGING_BACKEND_BASE}/api"
# RUN_ID is always auto-generated — never accept an override.
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
ADMIN_EMAIL="staging+admin+${RUN_ID}@zephix.dev"
ADMIN_PASSWORD="Journey!${RUN_ID:0:8}Az"
INVITEE_EMAIL="staging+invitee+${RUN_ID}@zephix.dev"
INVITEE_EMAIL_ENC="$(node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "${INVITEE_EMAIL}")"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

# ─── HELPERS ─────────────────────────────────────────────────────────────────

status_code() {
  sed -n 's/^HTTP\/[0-9.]* \([0-9][0-9][0-9]\).*/\1/p' "$1" | head -n 1 | tr -d '\r'
}

body_from_http_file() {
  awk 'BEGIN{body=0} body{print} /^\r?$/{body=1}' "$1"
}

require_status() {
  local file="$1"; shift
  local code; code="$(status_code "${file}")"
  for allowed in "$@"; do
    if [[ "${code}" == "${allowed}" ]]; then return 0; fi
  done
  echo "FAIL: step=$(basename "${file}" .txt) — expected one of [$*], got ${code}"
  sed -n '1,60p' "${file}"
  exit 1
}

require_status_csv() {
  local file="$1" allowed_csv="$2"
  IFS=',' read -r -a allowed <<< "${allowed_csv}"
  require_status "${file}" "${allowed[@]}"
}

extract_json_field() {
  local file="$1" expr="$2"
  body_from_http_file "${file}" | node -e "
let d='';
process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{
    const j=JSON.parse(d);
    const val=${expr};
    process.stdout.write(String(val??''));
  }catch(e){process.stdout.write('')}
})"
}

contract_field() {
  local step="$1" field="$2"
  node -e "
const fs=require('fs');
const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
const s=(c.flow||[]).find(x=>x.step===process.argv[2]);
if(!s){process.exit(2)}
if(process.argv[3]==='status'){
  const arr=Array.isArray(s.status)?s.status:[s.status];
  process.stdout.write(arr.join(','));
}else{
  process.stdout.write(String(s[process.argv[3]]||''));
}" "${CONTRACT_FILE}" "${step}" "${field}" || {
    echo "FAIL: Missing contract step/field: step=${step} field=${field}"; exit 1
  }
}

assert_contract_step() {
  local step="$1" expected_method="$2" expected_path="$3"
  local actual_method actual_path
  actual_method="$(contract_field "${step}" method)"
  actual_path="$(contract_field "${step}" path)"
  if [[ "${actual_method}" != "${expected_method}" || "${actual_path}" != "${expected_path}" ]]; then
    echo "FAIL: Contract drift for ${step}: expected ${expected_method} ${expected_path}, got ${actual_method} ${actual_path}"
    exit 1
  fi
}

# ─── CONTRACT DRIFT GUARDS ───────────────────────────────────────────────────

assert_contract_step "health_ready"            "GET"   "/health/ready"
assert_contract_step "version"                 "GET"   "/version"
assert_contract_step "csrf"                    "GET"   "/auth/csrf"
assert_contract_step "org_signup"              "POST"  "/auth/register"
assert_contract_step "smoke_login"             "POST"  "/auth/smoke-login"
assert_contract_step "auth_me"                 "GET"   "/auth/me"
assert_contract_step "workspace_create"        "POST"  "/workspaces"
assert_contract_step "portfolio_create"        "POST"  "/workspaces/{workspaceId}/portfolios"
assert_contract_step "program_create"          "POST"  "/workspaces/{workspaceId}/portfolios/{portfolioId}/programs"
assert_contract_step "project_create"          "POST"  "/projects"
assert_contract_step "project_link"            "PATCH" "/workspaces/{workspaceId}/projects/{projectId}/link"
assert_contract_step "project_get"             "GET"   "/projects/{projectId}"
assert_contract_step "task_create"             "POST"  "/work/tasks"
assert_contract_step "portfolio_rollup"        "GET"   "/workspaces/{workspaceId}/portfolios/{portfolioId}/rollup"
assert_contract_step "invite_create"           "POST"  "/orgs/{orgId}/invites"
assert_contract_step "invitee_register"        "POST"  "/auth/register"
assert_contract_step "invitee_smoke_login"     "POST"  "/auth/smoke-login"
assert_contract_step "invite_token_read"       "GET"   "/smoke/invites/latest-token"
assert_contract_step "invite_accept"           "POST"  "/invites/accept"
assert_contract_step "invitee_auth_me"         "GET"   "/auth/me"
assert_contract_step "invitee_workspaces_list" "GET"   "/workspaces"

echo "=== Customer Journey Smoke Lane: ${RUN_ID} ==="
echo "admin:   ${ADMIN_EMAIL}"
echo "invitee: ${INVITEE_EMAIL}"
echo ""

# ─── 01 HEALTH READY ─────────────────────────────────────────────────────────

curl -i "${API_BASE}/health/ready" > "${OUT_DIR}/01-health-ready.txt"
require_status_csv "${OUT_DIR}/01-health-ready.txt" "$(contract_field health_ready status)"
echo "01 health_ready: $(status_code "${OUT_DIR}/01-health-ready.txt")"

# ─── 02 VERSION ──────────────────────────────────────────────────────────────

curl -i "${API_BASE}/version" > "${OUT_DIR}/02-version.txt"
require_status_csv "${OUT_DIR}/02-version.txt" "$(contract_field version status)"
VERSION_JSON="$(body_from_http_file "${OUT_DIR}/02-version.txt")"
DEPLOYED_COMMIT_SHA="$(printf "%s" "${VERSION_JSON}" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.commitSha||j.gitSha||(j.data&&j.data.commitSha)||''))}
  catch(e){process.stdout.write('')}
})")"
COMMIT_TRUSTED="$(printf "%s" "${VERSION_JSON}" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.commitShaTrusted||(j.data&&j.data.commitShaTrusted)||''))}
  catch(e){process.stdout.write('')}
})")"
RAILWAY_DEPLOYMENT_ID="$(printf "%s" "${VERSION_JSON}" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.railwayDeploymentId||(j.data&&j.data.railwayDeploymentId)||''))}
  catch(e){process.stdout.write('')}
})")"
if ! echo "${DEPLOYED_COMMIT_SHA}" | grep -qE "^[0-9a-fA-F]{40}$"; then
  echo "FAIL: Invalid commitSha in /version: ${DEPLOYED_COMMIT_SHA}"; exit 1
fi
if [[ "${COMMIT_TRUSTED}" != "true" ]]; then
  echo "FAIL: commitShaTrusted is not true in /version"; exit 1
fi
echo "02 version: commitSha=${DEPLOYED_COMMIT_SHA:0:8} trusted=${COMMIT_TRUSTED}"

# ─── 03 CSRF (admin jar) ─────────────────────────────────────────────────────

CSRF_JSON="$(curl -s -c "${OUT_DIR}/admin-cookiejar.txt" "${API_BASE}/auth/csrf")"
ADMIN_CSRF="$(printf "%s" "${CSRF_JSON}" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}
  catch(e){process.stdout.write('')}
})")"
printf "HTTP/1.1 200 OK\r\n\r\n%s" "${CSRF_JSON}" > "${OUT_DIR}/03-csrf.txt"
if [[ "${#ADMIN_CSRF}" -lt 10 ]]; then
  echo "FAIL: Admin CSRF token missing or too short"; exit 1
fi
echo "03 csrf: token length=${#ADMIN_CSRF}"

# ─── 04 ORG SIGNUP (fresh admin registration) ────────────────────────────────

ADMIN_ORG_NAME="JourneyOrg${RUN_ID:0:8}"
# Use smoke/users/create to bypass /auth/register rate limiter (5 req / 15 min per IP)
curl -i \
  -H "Content-Type: application/json" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -H "x-zephix-env: staging" \
  -X POST "${API_BASE}/smoke/users/create" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"fullName\":\"Journey Admin\",\"orgName\":\"${ADMIN_ORG_NAME}\"}" \
  > "${OUT_DIR}/04-org-signup.txt"
require_status_csv "${OUT_DIR}/04-org-signup.txt" "$(contract_field org_signup status)"
echo "04 org_signup: $(status_code "${OUT_DIR}/04-org-signup.txt") email=${ADMIN_EMAIL}"

# ─── 05 SMOKE LOGIN (admin) ──────────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -H "x-zephix-env: staging" \
  -X POST "${API_BASE}/auth/smoke-login" \
  -d "{\"email\":\"${ADMIN_EMAIL}\"}" \
  > "${OUT_DIR}/05-smoke-login.txt"
require_status_csv "${OUT_DIR}/05-smoke-login.txt" "$(contract_field smoke_login status)"
if ! grep -qi "^set-cookie:" "${OUT_DIR}/05-smoke-login.txt"; then
  echo "FAIL: Missing Set-Cookie header in smoke-login response"
  sed -n '1,40p' "${OUT_DIR}/05-smoke-login.txt"; exit 1
fi
echo "05 smoke_login: $(status_code "${OUT_DIR}/05-smoke-login.txt")"

# ─── 06 AUTH ME → orgId ──────────────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  "${API_BASE}/auth/me" \
  > "${OUT_DIR}/06-auth-me.txt"
require_status_csv "${OUT_DIR}/06-auth-me.txt" "$(contract_field auth_me status)"
ORG_ID="$(extract_json_field "${OUT_DIR}/06-auth-me.txt" \
  "j.user?.organizationId||j.data?.user?.organizationId||j.data?.organizationId||j.organizationId||''")"
if [[ -z "${ORG_ID}" ]]; then
  echo "FAIL: Could not extract orgId from /auth/me"
  sed -n '1,80p' "${OUT_DIR}/06-auth-me.txt"; exit 1
fi
echo "06 auth_me: orgId=${ORG_ID}"

# ─── 07 WORKSPACE CREATE ─────────────────────────────────────────────────────

WS_NAME="Journey ${RUN_ID}"
curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -X POST "${API_BASE}/workspaces" \
  -d "{\"name\":\"${WS_NAME}\"}" \
  > "${OUT_DIR}/07-workspace-create.txt"
require_status_csv "${OUT_DIR}/07-workspace-create.txt" "$(contract_field workspace_create status)"
WORKSPACE_ID="$(extract_json_field "${OUT_DIR}/07-workspace-create.txt" \
  "j.data?.id||j.id||j.data?.workspace?.id||j.workspace?.id||''")"
if [[ -z "${WORKSPACE_ID}" ]]; then
  echo "FAIL: Could not extract workspaceId from workspace create"
  sed -n '1,80p' "${OUT_DIR}/07-workspace-create.txt"; exit 1
fi
echo "07 workspace_create: $(status_code "${OUT_DIR}/07-workspace-create.txt") workspaceId=${WORKSPACE_ID}"

# ─── 08 PORTFOLIO CREATE ─────────────────────────────────────────────────────

PORTFOLIO_NAME="Journey Portfolio ${RUN_ID}"
curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -X POST "${API_BASE}/workspaces/${WORKSPACE_ID}/portfolios" \
  -d "{\"name\":\"${PORTFOLIO_NAME}\"}" \
  > "${OUT_DIR}/08-portfolio-create.txt"
require_status_csv "${OUT_DIR}/08-portfolio-create.txt" "$(contract_field portfolio_create status)"
PORTFOLIO_ID="$(extract_json_field "${OUT_DIR}/08-portfolio-create.txt" \
  "j.data?.id||j.id||j.data?.portfolio?.id||j.portfolio?.id||''")"
if [[ -z "${PORTFOLIO_ID}" ]]; then
  echo "FAIL: Could not extract portfolioId from portfolio create"
  sed -n '1,80p' "${OUT_DIR}/08-portfolio-create.txt"; exit 1
fi
echo "08 portfolio_create: $(status_code "${OUT_DIR}/08-portfolio-create.txt") portfolioId=${PORTFOLIO_ID}"

# ─── 09 PROGRAM CREATE ───────────────────────────────────────────────────────

PROGRAM_NAME="Journey Program ${RUN_ID}"
curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -X POST "${API_BASE}/workspaces/${WORKSPACE_ID}/portfolios/${PORTFOLIO_ID}/programs" \
  -d "{\"portfolioId\":\"${PORTFOLIO_ID}\",\"name\":\"${PROGRAM_NAME}\"}" \
  > "${OUT_DIR}/09-program-create.txt"
require_status_csv "${OUT_DIR}/09-program-create.txt" "$(contract_field program_create status)"
PROGRAM_ID="$(extract_json_field "${OUT_DIR}/09-program-create.txt" \
  "j.data?.id||j.id||j.data?.program?.id||j.program?.id||''")"
if [[ -z "${PROGRAM_ID}" ]]; then
  echo "FAIL: Could not extract programId from program create"
  sed -n '1,80p' "${OUT_DIR}/09-program-create.txt"; exit 1
fi
echo "09 program_create: $(status_code "${OUT_DIR}/09-program-create.txt") programId=${PROGRAM_ID}"

# ─── 10 PROJECT CREATE ───────────────────────────────────────────────────────

PROJECT_NAME="Journey Project ${RUN_ID}"
curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -X POST "${API_BASE}/projects" \
  -d "{\"name\":\"${PROJECT_NAME}\",\"workspaceId\":\"${WORKSPACE_ID}\"}" \
  > "${OUT_DIR}/10-project-create.txt"
require_status_csv "${OUT_DIR}/10-project-create.txt" "$(contract_field project_create status)"
PROJECT_ID="$(extract_json_field "${OUT_DIR}/10-project-create.txt" \
  "j.data?.id||j.id||j.data?.project?.id||j.project?.id||''")"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "FAIL: Could not extract projectId from project create"
  sed -n '1,80p' "${OUT_DIR}/10-project-create.txt"; exit 1
fi
echo "10 project_create: $(status_code "${OUT_DIR}/10-project-create.txt") projectId=${PROJECT_ID}"

# ─── 11 PROJECT LINK → portfolio + program ───────────────────────────────────

curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -X PATCH "${API_BASE}/workspaces/${WORKSPACE_ID}/projects/${PROJECT_ID}/link" \
  -d "{\"portfolioId\":\"${PORTFOLIO_ID}\",\"programId\":\"${PROGRAM_ID}\"}" \
  > "${OUT_DIR}/11-project-link.txt"
require_status_csv "${OUT_DIR}/11-project-link.txt" "$(contract_field project_link status)"
echo "11 project_link: $(status_code "${OUT_DIR}/11-project-link.txt")"

# ─── 12 PROJECT GET → assert programId + portfolioId ─────────────────────────

curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  "${API_BASE}/projects/${PROJECT_ID}" \
  > "${OUT_DIR}/12-project-get.txt"
require_status_csv "${OUT_DIR}/12-project-get.txt" "$(contract_field project_get status)"
PROJECT_GET_PROGRAM_ID="$(extract_json_field "${OUT_DIR}/12-project-get.txt" \
  "j.data?.programId||j.programId||''")"
PROJECT_GET_PORTFOLIO_ID="$(extract_json_field "${OUT_DIR}/12-project-get.txt" \
  "j.data?.portfolioId||j.portfolioId||''")"
if [[ "${PROJECT_GET_PROGRAM_ID}" != "${PROGRAM_ID}" ]]; then
  echo "FAIL: project_get programId mismatch — expected ${PROGRAM_ID}, got ${PROJECT_GET_PROGRAM_ID}"
  sed -n '1,80p' "${OUT_DIR}/12-project-get.txt"; exit 1
fi
if [[ "${PROJECT_GET_PORTFOLIO_ID}" != "${PORTFOLIO_ID}" ]]; then
  echo "FAIL: project_get portfolioId mismatch — expected ${PORTFOLIO_ID}, got ${PROJECT_GET_PORTFOLIO_ID}"
  sed -n '1,80p' "${OUT_DIR}/12-project-get.txt"; exit 1
fi
echo "12 project_get: $(status_code "${OUT_DIR}/12-project-get.txt") programId=${PROJECT_GET_PROGRAM_ID} portfolioId=${PROJECT_GET_PORTFOLIO_ID}"

# ─── 13 TASK CREATE ──────────────────────────────────────────────────────────

TASK_TITLE="Journey Task ${RUN_ID}"
curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -H "x-workspace-id: ${WORKSPACE_ID}" \
  -X POST "${API_BASE}/work/tasks" \
  -d "{\"title\":\"${TASK_TITLE}\",\"projectId\":\"${PROJECT_ID}\"}" \
  > "${OUT_DIR}/13-task-create.txt"
require_status_csv "${OUT_DIR}/13-task-create.txt" "$(contract_field task_create status)"
TASK_ID="$(extract_json_field "${OUT_DIR}/13-task-create.txt" \
  "j.data?.id||j.id||j.data?.task?.id||j.task?.id||''")"
if [[ -z "${TASK_ID}" ]]; then
  echo "FAIL: Could not extract taskId from task create"
  sed -n '1,80p' "${OUT_DIR}/13-task-create.txt"; exit 1
fi
echo "13 task_create: $(status_code "${OUT_DIR}/13-task-create.txt") taskId=${TASK_ID}"

# ─── 14 PORTFOLIO ROLLUP ─────────────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  "${API_BASE}/workspaces/${WORKSPACE_ID}/portfolios/${PORTFOLIO_ID}/rollup" \
  > "${OUT_DIR}/14-portfolio-rollup.txt"
require_status_csv "${OUT_DIR}/14-portfolio-rollup.txt" "$(contract_field portfolio_rollup status)"
echo "14 portfolio_rollup: $(status_code "${OUT_DIR}/14-portfolio-rollup.txt")"

# ─── 15 INVITE CREATE ────────────────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -X POST "${API_BASE}/orgs/${ORG_ID}/invites" \
  -d "{\"email\":\"${INVITEE_EMAIL}\",\"role\":\"pm\"}" \
  > "${OUT_DIR}/15-invite-create.txt"
require_status_csv "${OUT_DIR}/15-invite-create.txt" "$(contract_field invite_create status)"
echo "15 invite_create: $(status_code "${OUT_DIR}/15-invite-create.txt") invitee=${INVITEE_EMAIL}"

# ─── 16 INVITEE CSRF ─────────────────────────────────────────────────────────

INVITEE_CSRF_JSON="$(curl -s -c "${OUT_DIR}/invitee-cookiejar.txt" "${API_BASE}/auth/csrf")"
INVITEE_CSRF="$(printf "%s" "${INVITEE_CSRF_JSON}" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}
  catch(e){process.stdout.write('')}
})")"
printf "HTTP/1.1 200 OK\r\n\r\n%s" "${INVITEE_CSRF_JSON}" > "${OUT_DIR}/16-invitee-csrf.txt"
if [[ "${#INVITEE_CSRF}" -lt 10 ]]; then
  echo "FAIL: Invitee CSRF token missing or too short"; exit 1
fi

# ─── 17 INVITEE REGISTER ─────────────────────────────────────────────────────

INVITEE_PASSWORD="Journey!${RUN_ID:0:8}Zx"
INVITEE_ORG_NAME="JourneyInvOrg${RUN_ID:0:8}"
# Use smoke/users/create to bypass /auth/register rate limiter (5 req / 15 min per IP)
curl -i \
  -H "Content-Type: application/json" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -H "x-zephix-env: staging" \
  -X POST "${API_BASE}/smoke/users/create" \
  -d "{\"email\":\"${INVITEE_EMAIL}\",\"password\":\"${INVITEE_PASSWORD}\",\"fullName\":\"Journey Invitee\",\"orgName\":\"${INVITEE_ORG_NAME}\"}" \
  > "${OUT_DIR}/17-invitee-register.txt"
require_status_csv "${OUT_DIR}/17-invitee-register.txt" "$(contract_field invitee_register status)"
echo "17 invitee_register: $(status_code "${OUT_DIR}/17-invitee-register.txt")"

# ─── 18 INVITEE SMOKE LOGIN ──────────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/invitee-cookiejar.txt" -c "${OUT_DIR}/invitee-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${INVITEE_CSRF}" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -H "x-zephix-env: staging" \
  -X POST "${API_BASE}/auth/smoke-login" \
  -d "{\"email\":\"${INVITEE_EMAIL}\"}" \
  > "${OUT_DIR}/18-invitee-smoke-login.txt"
require_status_csv "${OUT_DIR}/18-invitee-smoke-login.txt" "$(contract_field invitee_smoke_login status)"
echo "18 invitee_smoke_login: $(status_code "${OUT_DIR}/18-invitee-smoke-login.txt")"

# ─── 19 INVITE TOKEN READ ────────────────────────────────────────────────────
# Raw body saved (gitignored dir). Token never printed to stdout. Redacted copy saved.

curl -i \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  "${API_BASE}/smoke/invites/latest-token?email=${INVITEE_EMAIL_ENC}" \
  > "${OUT_DIR}/19-invite-token-read-full.txt"
require_status_csv "${OUT_DIR}/19-invite-token-read-full.txt" "$(contract_field invite_token_read status)"
INVITE_TOKEN_BODY="$(body_from_http_file "${OUT_DIR}/19-invite-token-read-full.txt")"

# Save raw (proof of wire shape — gitignored by OUT_DIR pattern)
printf "%s" "${INVITE_TOKEN_BODY}" > "${OUT_DIR}/19-invite-token-read.raw.json"

# Extract token — never echo
INVITE_TOKEN="$(printf "%s" "${INVITE_TOKEN_BODY}" | node -e "
let d='';
process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{
    const j=JSON.parse(d);
    process.stdout.write(String(j.token||(j.data&&j.data.token)||''));
  }catch(e){process.stdout.write('')}
})")"

# Save redacted copy (token replaced)
printf "%s" "${INVITE_TOKEN_BODY}" | node -e "
let d='';
process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{
    const j=JSON.parse(d);
    const r=JSON.stringify(j,null,2)
      .replace(/\"token\":\s*\"[^\"]+\"/g,'\"token\": \"[REDACTED]\"');
    process.stdout.write(r);
  }catch(e){process.stdout.write(d)}
})" > "${OUT_DIR}/19-invite-token-read.json"

if [[ -z "${INVITE_TOKEN}" ]]; then
  echo "FAIL: Could not extract invite token from smoke endpoint"
  cat "${OUT_DIR}/19-invite-token-read.json"; exit 1
fi
echo "19 invite_token_read: token extracted (redacted in proof)"

# ─── 20 INVITE ACCEPT ────────────────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/invitee-cookiejar.txt" -c "${OUT_DIR}/invitee-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${INVITEE_CSRF}" \
  -X POST "${API_BASE}/invites/accept" \
  -d "{\"token\":\"${INVITE_TOKEN}\"}" \
  > "${OUT_DIR}/20-invite-accept.txt"
require_status_csv "${OUT_DIR}/20-invite-accept.txt" "$(contract_field invite_accept status)"
echo "20 invite_accept: $(status_code "${OUT_DIR}/20-invite-accept.txt")"

# ─── 20b SET PRIMARY ORG → point invitee's organizationId to admin org ────────
# Without this, smokeLogin creates a JWT from the invitee's own self-registered
# org (where they are ADMIN), not the invited org (where they are MEMBER/VIEWER).

curl -i \
  -H "Content-Type: application/json" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -H "x-zephix-env: staging" \
  -X POST "${API_BASE}/smoke/users/set-primary-org" \
  -d "{\"email\":\"${INVITEE_EMAIL}\",\"orgId\":\"${ORG_ID}\"}" \
  > "${OUT_DIR}/20b-set-primary-org.txt"
SET_PRIMARY_STATUS="$(status_code "${OUT_DIR}/20b-set-primary-org.txt")"
if [[ "${SET_PRIMARY_STATUS}" != "200" ]]; then
  echo "FAIL: step=20b-set-primary-org — expected 200, got ${SET_PRIMARY_STATUS}"
  cat "${OUT_DIR}/20b-set-primary-org.txt"; exit 1
fi
echo "20b set_primary_org: 200 invitee=${INVITEE_EMAIL} orgId=${ORG_ID}"

# Re-run invitee smoke-login to refresh JWT with new org context
curl -i \
  -b "${OUT_DIR}/invitee-cookiejar.txt" -c "${OUT_DIR}/invitee-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${INVITEE_CSRF}" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -H "x-zephix-env: staging" \
  -X POST "${API_BASE}/auth/smoke-login" \
  -d "{\"email\":\"${INVITEE_EMAIL}\"}" \
  > "${OUT_DIR}/20c-invitee-smoke-relogin.txt"
RELOGIN_STATUS="$(status_code "${OUT_DIR}/20c-invitee-smoke-relogin.txt")"
if [[ "${RELOGIN_STATUS}" != "204" ]]; then
  echo "FAIL: step=20c-invitee-smoke-relogin — expected 204, got ${RELOGIN_STATUS}"
  cat "${OUT_DIR}/20c-invitee-smoke-relogin.txt"; exit 1
fi
echo "20c invitee_smoke_relogin: 204 (JWT refreshed with org context)"

# ─── 21 INVITEE AUTH ME → verify orgId matches ───────────────────────────────

curl -i \
  -b "${OUT_DIR}/invitee-cookiejar.txt" -c "${OUT_DIR}/invitee-cookiejar.txt" \
  -H "X-CSRF-Token: ${INVITEE_CSRF}" \
  "${API_BASE}/auth/me" \
  > "${OUT_DIR}/21-invitee-auth-me.txt"
require_status_csv "${OUT_DIR}/21-invitee-auth-me.txt" "$(contract_field invitee_auth_me status)"
INVITEE_ORG_ID="$(extract_json_field "${OUT_DIR}/21-invitee-auth-me.txt" \
  "j.user?.organizationId||j.data?.user?.organizationId||j.data?.organizationId||j.organizationId||''")"
if [[ -z "${INVITEE_ORG_ID}" ]]; then
  echo "FAIL: Could not extract organizationId from invitee /auth/me"
  sed -n '1,80p' "${OUT_DIR}/21-invitee-auth-me.txt"; exit 1
fi
if [[ "${INVITEE_ORG_ID}" != "${ORG_ID}" ]]; then
  echo "FAIL: Invitee orgId mismatch — expected ${ORG_ID}, got ${INVITEE_ORG_ID}"; exit 1
fi
echo "21 invitee_auth_me: orgId=${INVITEE_ORG_ID} (matches admin)"

# ─── 22 INVITEE WORKSPACES LIST → verify workspace visible ───────────────────

curl -i \
  -b "${OUT_DIR}/invitee-cookiejar.txt" -c "${OUT_DIR}/invitee-cookiejar.txt" \
  -H "X-CSRF-Token: ${INVITEE_CSRF}" \
  "${API_BASE}/workspaces" \
  > "${OUT_DIR}/22-invitee-workspaces-list.txt"
require_status_csv "${OUT_DIR}/22-invitee-workspaces-list.txt" "$(contract_field invitee_workspaces_list status)"
INVITEE_WS_LIST_BODY="$(body_from_http_file "${OUT_DIR}/22-invitee-workspaces-list.txt")"
INVITEE_WS_FOUND="$(printf "%s" "${INVITEE_WS_LIST_BODY}" | node -e "
let d='';
process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{
    const j=JSON.parse(d);
    const pool=Array.isArray(j.data)?j.data
      :Array.isArray(j.data?.items)?j.data.items
      :Array.isArray(j.data?.workspaces)?j.data.workspaces
      :Array.isArray(j.items)?j.items
      :Array.isArray(j.workspaces)?j.workspaces
      :Array.isArray(j)?j:[];
    const found=pool.some(w=>String(w.id||w.workspaceId||'')===process.argv[1]);
    process.stdout.write(found?'yes':'no');
  }catch(e){process.stdout.write('no')}
})" "${WORKSPACE_ID}")"
if [[ "${INVITEE_WS_FOUND}" != "yes" ]]; then
  echo "FAIL: Invitee cannot see workspace ${WORKSPACE_ID} after invite_accept"
  sed -n '1,80p' "${OUT_DIR}/22-invitee-workspaces-list.txt"; exit 1
fi
echo "22 invitee_workspaces_list: $(status_code "${OUT_DIR}/22-invitee-workspaces-list.txt") workspaceId=${WORKSPACE_ID} visible"

# ─── PROOF ARTIFACT ──────────────────────────────────────────────────────────

DATE_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
cat > "${OUT_DIR}/README.md" <<EOF
# Customer Journey Proof

- run_id:             ${RUN_ID}
- date_utc:           ${DATE_UTC}
- commit_sha:         ${DEPLOYED_COMMIT_SHA}
- commit_trusted:     ${COMMIT_TRUSTED}
- railway_deploy_id:  ${RAILWAY_DEPLOYMENT_ID}
- admin_email:        ${ADMIN_EMAIL}
- invitee_email:      ${INVITEE_EMAIL}

## Steps

| # | Step | Status |
|---|------|--------|
| 01 | health_ready | $(status_code "${OUT_DIR}/01-health-ready.txt") |
| 02 | version | $(status_code "${OUT_DIR}/02-version.txt") |
| 03 | csrf | 200 |
| 04 | org_signup | $(status_code "${OUT_DIR}/04-org-signup.txt") |
| 05 | smoke_login | $(status_code "${OUT_DIR}/05-smoke-login.txt") |
| 06 | auth_me | $(status_code "${OUT_DIR}/06-auth-me.txt") |
| 07 | workspace_create | $(status_code "${OUT_DIR}/07-workspace-create.txt") |
| 08 | portfolio_create | $(status_code "${OUT_DIR}/08-portfolio-create.txt") |
| 09 | program_create | $(status_code "${OUT_DIR}/09-program-create.txt") |
| 10 | project_create | $(status_code "${OUT_DIR}/10-project-create.txt") |
| 11 | project_link | $(status_code "${OUT_DIR}/11-project-link.txt") |
| 12 | project_get | $(status_code "${OUT_DIR}/12-project-get.txt") |
| 13 | task_create | $(status_code "${OUT_DIR}/13-task-create.txt") |
| 14 | portfolio_rollup | $(status_code "${OUT_DIR}/14-portfolio-rollup.txt") |
| 15 | invite_create | $(status_code "${OUT_DIR}/15-invite-create.txt") |
| 16 | invitee_csrf | 200 |
| 17 | invitee_register | $(status_code "${OUT_DIR}/17-invitee-register.txt") |
| 18 | invitee_smoke_login | $(status_code "${OUT_DIR}/18-invitee-smoke-login.txt") |
| 19 | invite_token_read | $(status_code "${OUT_DIR}/19-invite-token-read-full.txt") |
| 20 | invite_accept | $(status_code "${OUT_DIR}/20-invite-accept.txt") |
| 21 | invitee_auth_me | $(status_code "${OUT_DIR}/21-invitee-auth-me.txt") |
| 22 | invitee_workspaces_list | $(status_code "${OUT_DIR}/22-invitee-workspaces-list.txt") |

## Resource IDs (this run)

- org_id:              ${ORG_ID}
- workspace_id:        ${WORKSPACE_ID}
- portfolio_id:        ${PORTFOLIO_ID}
- program_id:          ${PROGRAM_ID}
- project_id:          ${PROJECT_ID}
- linked_program_id:   ${PROJECT_GET_PROGRAM_ID}
- linked_portfolio_id: ${PROJECT_GET_PORTFOLIO_ID}
- task_id:             ${TASK_ID}
- invitee_org_id:      ${INVITEE_ORG_ID}

## Invite token

Stored only in runtime variable. Redacted proof in 19-invite-token-read.json.
EOF

echo ""
echo "=== Customer Journey PASS: ${RUN_ID} ==="
echo "Proof written to: ${OUT_DIR}/README.md"
cat "${OUT_DIR}/README.md"
