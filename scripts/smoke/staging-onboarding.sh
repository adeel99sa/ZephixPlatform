#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
OUT_DIR="${ROOT_DIR}/docs/architecture/proofs/staging/onboarding-latest"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}"
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

: "${STAGING_BACKEND_BASE:?STAGING_BACKEND_BASE missing in ${ENV_FILE}}"
: "${STAGING_BACKEND_API:?STAGING_BACKEND_API missing in ${ENV_FILE}}"

EMAIL="${EMAIL:-staging+smoke@zephix.dev}"
PASS="${PASS:-Password123!}"
FULL_NAME="${FULL_NAME:-Staging Smoke}"
ORG_NAME="${ORG_NAME:-Staging Smoke Org}"
WS_NAME="${WS_NAME:-Smoke Workspace}"
WS_SLUG="${WS_SLUG:-smoke-workspace-$(date +%s)}"

mkdir -p "${OUT_DIR}"
rm -f "${OUT_DIR}/cookiejar.txt"

status_code() {
  sed -n 's/^HTTP\/[0-9.]* \([0-9][0-9][0-9]\).*/\1/p' "$1" | head -n 1 | tr -d '\r'
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

curl -i "${STAGING_BACKEND_API}/health/ready" > "${OUT_DIR}/01-health-ready.txt"
require_status "${OUT_DIR}/01-health-ready.txt" 200 201

curl -i "${STAGING_BACKEND_API}/version" > "${OUT_DIR}/02-version.txt"
require_status "${OUT_DIR}/02-version.txt" 200 201

VERSION_JSON="$(awk 'BEGIN{body=0} body{print} /^\r?$/{body=1}' "${OUT_DIR}/02-version.txt")"
RAILWAY_DEPLOYMENT_ID="$(printf "%s" "${VERSION_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.railwayDeploymentId || (j.data&&j.data.railwayDeploymentId) || ''))}catch(e){process.stdout.write('')}})")"
if [[ -z "${RAILWAY_DEPLOYMENT_ID}" ]]; then
  echo "Failed to extract railwayDeploymentId from version response"
  sed -n '1,60p' "${OUT_DIR}/02-version.txt"
  exit 1
fi

CSRF_JSON="$(curl -s -c "${OUT_DIR}/cookiejar.txt" "${STAGING_BACKEND_API}/auth/csrf")"
CSRF="$(printf "%s" "${CSRF_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}catch(e){process.stdout.write('')}})")"
printf "%s\n" "${CSRF}" > "${OUT_DIR}/03-auth-csrf.txt"
if [[ "${#CSRF}" -lt 10 ]]; then
  echo "CSRF token missing or too short"
  sed -n '1,60p' "${OUT_DIR}/03-auth-csrf.txt"
  exit 1
fi

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -X POST "${STAGING_BACKEND_API}/auth/register" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\",\"fullName\":\"${FULL_NAME}\",\"orgName\":\"${ORG_NAME}\"}" \
  > "${OUT_DIR}/04-auth-register.txt"
require_status "${OUT_DIR}/04-auth-register.txt" 200 201 409

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -X POST "${STAGING_BACKEND_API}/auth/login" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}" \
  > "${OUT_DIR}/05-auth-login.txt"
require_status "${OUT_DIR}/05-auth-login.txt" 200 201

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "X-CSRF-Token: ${CSRF}" \
  "${STAGING_BACKEND_API}/auth/me" \
  > "${OUT_DIR}/06-auth-me.txt"
require_status "${OUT_DIR}/06-auth-me.txt" 200 201

curl -i -b "${OUT_DIR}/cookiejar.txt" -c "${OUT_DIR}/cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF}" \
  -X POST "${STAGING_BACKEND_API}/workspaces" \
  -d "{\"name\":\"${WS_NAME}\",\"slug\":\"${WS_SLUG}\"}" \
  > "${OUT_DIR}/07-workspaces-create.txt"
require_status "${OUT_DIR}/07-workspaces-create.txt" 200 201

echo "railwayDeploymentId=${RAILWAY_DEPLOYMENT_ID}"
echo "proof_dir=${OUT_DIR}"
