#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACT_FILE="${ROOT_DIR}/docs/api-contract/staging/onboarding-contract.json"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"

if [[ ! -f "${CONTRACT_FILE}" ]]; then
  echo "Missing contract file: ${CONTRACT_FILE}"
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing staging env file: ${ENV_FILE}"
  exit 1
fi

read_env() {
  local key="$1"
  rg "^${key}=" "${ENV_FILE}" -N | head -n 1 | sed "s/^${key}=//"
}

BASE="$(read_env STAGING_BACKEND_BASE)"
if [[ -z "${BASE}" ]]; then
  echo "STAGING_BACKEND_BASE missing in ${ENV_FILE}"
  exit 1
fi

BASE_PATH="$(node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(c.basePath||'')" "${CONTRACT_FILE}")"
if [[ -z "${BASE_PATH}" ]]; then
  echo "basePath missing in ${CONTRACT_FILE}"
  exit 1
fi

EMAIL="${EMAIL:-staging+smoke@zephix.dev}"
PASS="${PASS:-Password123!}"
FULL_NAME="${FULL_NAME:-Staging Smoke}"
ORG_NAME="${ORG_NAME:-Staging Smoke Org}"
WS_NAME="${WS_NAME:-Smoke Workspace}"
WS_SLUG="${WS_SLUG:-smoke-workspace-$(date +%s)}"

COOKIE_JAR="$(mktemp)"
trap 'rm -f "${COOKIE_JAR}"' EXIT
CSRF=""

check_allowed() {
  local actual="$1"
  local allowed_csv="$2"
  local IFS=','
  read -r -a allowed_arr <<< "${allowed_csv}"
  for expected in "${allowed_arr[@]}"; do
    if [[ "${actual}" == "${expected}" ]]; then
      return 0
    fi
  done
  return 1
}

route_call() {
  local method="$1"
  local path="$2"
  local out=""

  case "${method}:${path}" in
    "GET:/auth/csrf")
      out="$(curl -s -c "${COOKIE_JAR}" -w $'\n%{http_code}' "${BASE}${BASE_PATH}${path}")"
      CSRF="$(printf "%s" "${out}" | sed '$d' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}catch(e){process.stdout.write('')}})")"
      ;;
    "POST:/auth/register")
      out="$(curl -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" -H "Content-Type: application/json" -H "X-CSRF-Token: ${CSRF}" -X POST -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\",\"fullName\":\"${FULL_NAME}\",\"orgName\":\"${ORG_NAME}\"}" -w $'\n%{http_code}' "${BASE}${BASE_PATH}${path}")"
      ;;
    "POST:/auth/login")
      out="$(curl -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" -H "Content-Type: application/json" -H "X-CSRF-Token: ${CSRF}" -X POST -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}" -w $'\n%{http_code}' "${BASE}${BASE_PATH}${path}")"
      ;;
    "GET:/auth/me")
      out="$(curl -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" -H "X-CSRF-Token: ${CSRF}" -w $'\n%{http_code}' "${BASE}${BASE_PATH}${path}")"
      ;;
    "POST:/workspaces")
      out="$(curl -s -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" -H "Content-Type: application/json" -H "X-CSRF-Token: ${CSRF}" -X POST -d "{\"name\":\"${WS_NAME}\",\"slug\":\"${WS_SLUG}\"}" -w $'\n%{http_code}' "${BASE}${BASE_PATH}${path}")"
      ;;
    *)
      out="$(curl -s -X "${method}" -w $'\n%{http_code}' "${BASE}${BASE_PATH}${path}")"
      ;;
  esac

  printf "%s" "${out}" | tail -n 1 | tr -d '\r'
}

while IFS=$'\t' read -r method path allowed_csv; do
  if [[ -z "${method}" ]]; then
    continue
  fi
  status="$(route_call "${method}" "${path}")"
  if check_allowed "${status}" "${allowed_csv}"; then
    echo "Checking ${method} ${path} -> ${status} OK"
  else
    echo "❌ Contract violation"
    echo "Route ${method} ${path} returned ${status}"
    echo "Expected ${allowed_csv}"
    exit 1
  fi
done < <(node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));for(const r of c.routes||[]){const statuses=Array.isArray(r.status)?r.status:[r.status];console.log([r.method,r.path,statuses.join(',')].join('\t'));}" "${CONTRACT_FILE}")
