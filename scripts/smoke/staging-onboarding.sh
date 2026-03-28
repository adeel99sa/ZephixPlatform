#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
CONTRACT_FILE="${ROOT_DIR}/docs/api-contract/staging/onboarding-contract.json"
OUT_DIR="${ROOT_DIR}/docs/architecture/proofs/staging/onboarding-latest"
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
STAGING_BACKEND_API="$(read_env STAGING_BACKEND_API)"

if [[ -z "${STAGING_BACKEND_BASE}" ]]; then
  echo "STAGING_BACKEND_BASE missing in ${ENV_FILE}"
  exit 1
fi

if [[ -z "${STAGING_BACKEND_API}" ]]; then
  echo "STAGING_BACKEND_API missing in ${ENV_FILE}"
  exit 1
fi

EMAIL="${EMAIL:-staging+smoke@zephix.dev}"
STAGING_SMOKE_KEY="${STAGING_SMOKE_KEY:-}"
WS_NAME="${WS_NAME:-Smoke Workspace}"
WS_SLUG="${WS_SLUG:-smoke-workspace-$(date +%s)}"

if [[ -z "${STAGING_SMOKE_KEY}" ]]; then
  echo "STAGING_SMOKE_KEY missing. Export it in your shell before running."
  exit 1
fi

mkdir -p "${OUT_DIR}"
rm -f "${OUT_DIR}/cookiejar.txt"

status_code() {
  sed -n 's/^HTTP\/[0-9.]* \([0-9][0-9][0-9]\).*/\1/p' "$1" | head -n 1 | tr -d '\r'
}

contract_field() {
  local step="$1"
  local field="$2"
  node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const s=(c.flow||[]).find(x=>x.step===process.argv[2]);if(!s){process.exit(2)}if(process.argv[3]==='status'){const arr=Array.isArray(s.status)?s.status:[s.status];process.stdout.write(arr.join(','));}else{process.stdout.write(String(s[process.argv[3]]||''));}" "${CONTRACT_FILE}" "${step}" "${field}" || {
    echo "Missing contract step/field: step=${step} field=${field}"
    exit 1
  }
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
  sed -n '1,60p' "${file}"
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
assert_contract_step "smoke_probe" "POST" "/auth/smoke-login"
assert_contract_step "smoke_login" "POST" "/auth/smoke-login"
assert_contract_step "auth_me" "GET" "/auth/me"
assert_contract_step "workspace_create" "POST" "/workspaces"

curl -i "${STAGING_BACKEND_API}/health/ready" > "${OUT_DIR}/01-health-ready.txt"
require_status_csv "${OUT_DIR}/01-health-ready.txt" "$(contract_field health_ready status)"

curl -i "${STAGING_BACKEND_API}/version" > "${OUT_DIR}/02-version.txt"
require_status_csv "${OUT_DIR}/02-version.txt" "$(contract_field version status)"

VERSION_JSON="$(awk 'BEGIN{body=0} body{print} /^\r?$/{body=1}' "${OUT_DIR}/02-version.txt")"
RAILWAY_DEPLOYMENT_ID="$(printf "%s" "${VERSION_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.railwayDeploymentId || (j.data&&j.data.railwayDeploymentId) || ''))}catch(e){process.stdout.write('')}})")"
DEPLOYED_COMMIT_SHA="$(printf "%s" "${VERSION_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.commitSha || j.gitSha || (j.data&&j.data.commitSha) || ''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${RAILWAY_DEPLOYMENT_ID}" ]]; then
  echo "Failed to extract railwayDeploymentId from version response"
  sed -n '1,60p' "${OUT_DIR}/02-version.txt"
  exit 1
fi
if [[ -z "${DEPLOYED_COMMIT_SHA}" ]]; then
  echo "Failed to extract commitSha from version response"
  sed -n '1,60p' "${OUT_DIR}/02-version.txt"
  exit 1
fi
mkdir -p "$(dirname "${DEPLOYMENT_HISTORY_FILE}")"
printf "%s | commit=%s | deployment=%s\n" \
  "$(date -u +"%Y-%m-%dT%H:%MZ")" \
  "${DEPLOYED_COMMIT_SHA}" \
  "${RAILWAY_DEPLOYMENT_ID}" >> "${DEPLOYMENT_HISTORY_FILE}"

CSRF_JSON="$(curl -s -c "${OUT_DIR}/cookiejar.txt" "${STAGING_BACKEND_API}/auth/csrf")"
CSRF="$(printf "%s" "${CSRF_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}catch(e){process.stdout.write('')}})")"
printf "%s\n" "${CSRF}" > "${OUT_DIR}/03-auth-csrf.txt"
if [[ "${#CSRF}" -lt 10 ]]; then
  echo "CSRF token missing or too short"
  sed -n '1,60p' "${OUT_DIR}/03-auth-csrf.txt"
  exit 1
fi

curl -i -s \
  -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "x-zephix-env: staging" \
  -H "X-Smoke-Key: probe_invalid" \
  -X POST "${STAGING_BACKEND_API}/auth/smoke-login" \
  -d "{\"email\":\"${EMAIL}\"}" \
  > "${OUT_DIR}/04-auth-smoke-login-probe.txt"
PROBE_STATUS="$(status_code "${OUT_DIR}/04-auth-smoke-login-probe.txt")"
if [[ "${PROBE_STATUS}" == "404" ]]; then
  echo "smoke-login route missing. Redeploy backend staging."
  exit 1
fi
require_status_csv "${OUT_DIR}/04-auth-smoke-login-probe.txt" "$(contract_field smoke_probe status)"
echo "smoke-login route present. probe_status=${PROBE_STATUS}"

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -H "x-zephix-env: staging" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -X POST "${STAGING_BACKEND_API}/auth/smoke-login" \
  -d "{\"email\":\"${EMAIL}\"}" \
  > "${OUT_DIR}/05-auth-smoke-login.txt"
require_status_csv "${OUT_DIR}/05-auth-smoke-login.txt" "$(contract_field smoke_login status)"
if ! rg -i "^set-cookie:" "${OUT_DIR}/05-auth-smoke-login.txt" >/dev/null; then
  echo "Missing Set-Cookie header in smoke-login response"
  sed -n '1,80p' "${OUT_DIR}/05-auth-smoke-login.txt"
  exit 1
fi
if ! rg -i "set-cookie:.*(session|sid|connect\\.sid)" "${OUT_DIR}/05-auth-smoke-login.txt" >/dev/null; then
  echo "Missing session cookie token in smoke-login response"
  sed -n '1,80p' "${OUT_DIR}/05-auth-smoke-login.txt"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "X-CSRF-Token: ${CSRF}" \
  "${STAGING_BACKEND_API}/auth/me" \
  > "${OUT_DIR}/06-auth-me.txt"
require_status_csv "${OUT_DIR}/06-auth-me.txt" "$(contract_field auth_me status)"

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -X POST "${STAGING_BACKEND_API}/workspaces" \
  -d "{\"name\":\"${WS_NAME}\",\"slug\":\"${WS_SLUG}\"}" \
  > "${OUT_DIR}/07-workspaces-create.txt"
require_status_csv "${OUT_DIR}/07-workspaces-create.txt" "$(contract_field workspace_create status)"

RUN_DATE_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
SMOKE_LOGIN_STATUS="$(status_code "${OUT_DIR}/05-auth-smoke-login.txt")"
AUTH_ME_STATUS="$(status_code "${OUT_DIR}/06-auth-me.txt")"
WORKSPACES_STATUS="$(status_code "${OUT_DIR}/07-workspaces-create.txt")"
cat > "${OUT_DIR}/README.md" <<EOF
# Staging Onboarding Proof

- date_utc: ${RUN_DATE_UTC}
- domain: ${STAGING_BACKEND_BASE}
- api_base: ${STAGING_BACKEND_API}
- railwayDeploymentId: ${RAILWAY_DEPLOYMENT_ID}
- commitSha: ${DEPLOYED_COMMIT_SHA}
- probe_status: ${PROBE_STATUS}
- smoke_login_status: ${SMOKE_LOGIN_STATUS}
- auth_me_status: ${AUTH_ME_STATUS}
- workspaces_create_status: ${WORKSPACES_STATUS}
- result: PASS
EOF

echo "railwayDeploymentId=${RAILWAY_DEPLOYMENT_ID}"
echo "probe_status=${PROBE_STATUS}"
echo "smoke-login status=${SMOKE_LOGIN_STATUS}"
echo "/auth/me status=${AUTH_ME_STATUS}"
echo "proof_dir=${OUT_DIR}"
