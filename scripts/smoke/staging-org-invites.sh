#!/usr/bin/env bash
# staging-org-invites.sh
#
# Smoke lane: full org-level email invite flow.
# Admin logs in, creates workspace, invites a fresh invitee, invitee registers,
# invitee smoke-logins, token is read from outbox (never printed), invitee accepts.
#
# Requires: STAGING_SMOKE_KEY exported in shell
# Reads:    STAGING_BACKEND_BASE from docs/ai/environments/staging.env
# Proof:    docs/architecture/proofs/staging/org-invites-latest/

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
CONTRACT_FILE="${ROOT_DIR}/docs/api-contract/staging/org-invites-contract.json"
OUT_DIR="${ROOT_DIR}/docs/architecture/proofs/staging/org-invites-latest"

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
  grep -E "^${key}=" "${ENV_FILE}" | head -n 1 | sed "s/^${key}=//"
}

STAGING_BACKEND_BASE="$(read_env STAGING_BACKEND_BASE)"
STAGING_SMOKE_KEY="${STAGING_SMOKE_KEY:-}"

if [[ -z "${STAGING_BACKEND_BASE}" ]]; then
  echo "STAGING_BACKEND_BASE missing in ${ENV_FILE}"
  exit 1
fi
if [[ -z "${STAGING_SMOKE_KEY}" ]]; then
  echo "STAGING_SMOKE_KEY missing. Export it in your shell before running."
  exit 1
fi

API_BASE="${STAGING_BACKEND_BASE}/api"
RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
ADMIN_EMAIL="${ADMIN_EMAIL:-staging+smoke@zephix.dev}"
INVITEE_EMAIL="$(printf 'staging+invitee+%s@zephix.dev' "${RUN_ID}" | tr '[:upper:]' '[:lower:]')"
INVITEE_EMAIL_ENC="$(node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "${INVITEE_EMAIL}")"


mkdir -p "${OUT_DIR}"
rm -f "${OUT_DIR}/admin-cookiejar.txt" "${OUT_DIR}/invitee-cookiejar.txt"

# ─── HELPERS ─────────────────────────────────────────────────────────────────

status_code() {
  sed -n 's/^HTTP\/[0-9.]* \([0-9][0-9][0-9]\).*/\1/p' "$1" | head -n 1 | tr -d '\r'
}

body_from_http_file() {
  awk 'BEGIN{body=0} body{print} /^\r?$/{body=1}' "$1"
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
    echo "Missing contract step/field: step=${step} field=${field}"
    exit 1
  }
}

assert_contract_step() {
  local step="$1" expected_method="$2" expected_path="$3"
  local actual_method actual_path
  actual_method="$(contract_field "${step}" method)"
  actual_path="$(contract_field "${step}" path)"
  if [[ "${actual_method}" != "${expected_method}" || "${actual_path}" != "${expected_path}" ]]; then
    echo "Contract drift for ${step}: expected ${expected_method} ${expected_path}, got ${actual_method} ${actual_path}"
    exit 1
  fi
}

require_status() {
  local file="$1"; shift
  local code
  code="$(status_code "${file}")"
  for allowed in "$@"; do
    if [[ "${code}" == "${allowed}" ]]; then return 0; fi
  done
  echo "FAIL: step=$(basename "${file}" .txt) — expected one of [$*], got ${code}"
  echo "  file: ${file}"
  sed -n '1,60p' "${file}"
  exit 1
}

require_status_csv() {
  local file="$1" allowed_csv="$2"
  IFS=',' read -r -a allowed <<< "${allowed_csv}"
  require_status "${file}" "${allowed[@]}"
}

extract_json() {
  # usage: extract_json <file> <node-expression>
  local file="$1" expr="$2"
  body_from_http_file "${file}" | node -e "
let d='';
process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{
    const j=JSON.parse(d);
    const val=${expr};
    process.stdout.write(String(val||''));
  }catch(e){process.stdout.write('')}
})"
}

# ─── CONTRACT DRIFT GUARDS ───────────────────────────────────────────────────

assert_contract_step "health_ready"            "GET"  "/health/ready"
assert_contract_step "version"                 "GET"  "/version"
assert_contract_step "csrf"                    "GET"  "/auth/csrf"
assert_contract_step "smoke_login"             "POST" "/auth/smoke-login"
assert_contract_step "auth_me"                 "GET"  "/auth/me"
assert_contract_step "workspace_create"        "POST" "/workspaces"
assert_contract_step "invite_create"           "POST" "/orgs/{orgId}/invites"
assert_contract_step "invitee_register"        "POST" "/auth/register"
assert_contract_step "invitee_smoke_login"     "POST" "/auth/smoke-login"
assert_contract_step "invite_token_read"       "GET"  "/smoke/invites/latest-token"
assert_contract_step "invite_accept"           "POST" "/invites/accept"
assert_contract_step "invitee_auth_me"         "GET"  "/auth/me"
assert_contract_step "invitee_workspaces_list" "GET"  "/workspaces"

echo "=== Org Invites Smoke Lane: ${RUN_ID} ==="
echo "admin:   ${ADMIN_EMAIL}"
echo "invitee: ${INVITEE_EMAIL}"
echo ""

# ─── 01 HEALTH ───────────────────────────────────────────────────────────────

curl -s -o "${OUT_DIR}/01-health-ready.txt" -w "%{http_code}" \
  "${API_BASE}/health/ready" > /dev/null
curl -i "${API_BASE}/health/ready" > "${OUT_DIR}/01-health-ready.txt"
require_status_csv "${OUT_DIR}/01-health-ready.txt" "$(contract_field health_ready status)"

# ─── 02 VERSION ──────────────────────────────────────────────────────────────

curl -i "${API_BASE}/version" > "${OUT_DIR}/02-version.txt"
require_status_csv "${OUT_DIR}/02-version.txt" "$(contract_field version status)"
VERSION_JSON="$(body_from_http_file "${OUT_DIR}/02-version.txt")"
RAILWAY_DEPLOYMENT_ID="$(printf "%s" "${VERSION_JSON}" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.railwayDeploymentId||(j.data&&j.data.railwayDeploymentId)||''))}
  catch(e){process.stdout.write('')}
})")"
DEPLOYED_COMMIT_SHA="$(printf "%s" "${VERSION_JSON}" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.commitSha||j.gitSha||(j.data&&j.data.commitSha)||''))}
  catch(e){process.stdout.write('')}
})")"
COMMIT_SHA_TRUSTED="$(printf "%s" "${VERSION_JSON}" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.commitShaTrusted||(j.data&&j.data.commitShaTrusted)||''))}
  catch(e){process.stdout.write('')}
})")"
if [[ -z "${RAILWAY_DEPLOYMENT_ID}" || -z "${DEPLOYED_COMMIT_SHA}" ]]; then
  echo "FAIL: Could not parse version metadata"
  sed -n '1,60p' "${OUT_DIR}/02-version.txt"
  exit 1
fi

# ─── 03 CSRF (admin jar) ─────────────────────────────────────────────────────

CSRF_JSON="$(curl -s -c "${OUT_DIR}/admin-cookiejar.txt" "${API_BASE}/auth/csrf")"
printf "HTTP/1.1 200 OK\r\n\r\n%s" "${CSRF_JSON}" > "${OUT_DIR}/03-admin-csrf.txt"
ADMIN_CSRF="$(printf "%s" "${CSRF_JSON}" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}
  catch(e){process.stdout.write('')}
})")"
if [[ "${#ADMIN_CSRF}" -lt 10 ]]; then
  echo "FAIL: Admin CSRF token missing or too short"
  exit 1
fi

# ─── 04 SMOKE LOGIN (admin) ──────────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -X POST "${API_BASE}/auth/smoke-login" \
  -d "{\"email\":\"${ADMIN_EMAIL}\"}" \
  > "${OUT_DIR}/04-admin-smoke-login.txt"
require_status_csv "${OUT_DIR}/04-admin-smoke-login.txt" "$(contract_field smoke_login status)"
if ! grep -qi "^set-cookie:" "${OUT_DIR}/04-admin-smoke-login.txt"; then
  echo "FAIL: Missing Set-Cookie header in smoke-login response"
  sed -n '1,40p' "${OUT_DIR}/04-admin-smoke-login.txt"
  exit 1
fi

# ─── 05 AUTH ME (admin) → orgId ──────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  "${API_BASE}/auth/me" \
  > "${OUT_DIR}/05-admin-auth-me.txt"
require_status_csv "${OUT_DIR}/05-admin-auth-me.txt" "$(contract_field auth_me status)"
ORG_ID="$(body_from_http_file "${OUT_DIR}/05-admin-auth-me.txt" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{
    const j=JSON.parse(d);
    const u=j.user||j.data?.user||j.data||j;
    process.stdout.write(String(u.organizationId||u.orgId||u.organization?.id||''));
  }catch(e){process.stdout.write('')}
})")"
if [[ -z "${ORG_ID}" ]]; then
  echo "FAIL: Could not extract orgId from admin /auth/me"
  sed -n '1,80p' "${OUT_DIR}/05-admin-auth-me.txt"
  exit 1
fi

# ─── 06 WORKSPACE CREATE ─────────────────────────────────────────────────────

WORKSPACE_NAME="SMOKE INVITE ${RUN_ID}"
curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -X POST "${API_BASE}/workspaces" \
  -d "{\"name\":\"${WORKSPACE_NAME}\"}" \
  > "${OUT_DIR}/06-workspace-create.txt"
require_status_csv "${OUT_DIR}/06-workspace-create.txt" "$(contract_field workspace_create status)"
WORKSPACE_ID="$(body_from_http_file "${OUT_DIR}/06-workspace-create.txt" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{
    const j=JSON.parse(d);
    const id=j.data?.id||j.id||j.data?.workspace?.id||j.workspace?.id||'';
    process.stdout.write(String(id||''));
  }catch(e){process.stdout.write('')}
})")"
if [[ -z "${WORKSPACE_ID}" ]]; then
  echo "FAIL: Could not extract workspaceId from workspace create response"
  sed -n '1,80p' "${OUT_DIR}/06-workspace-create.txt"
  exit 1
fi

# ─── 07 INVITE CREATE ────────────────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" -c "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -X POST "${API_BASE}/orgs/${ORG_ID}/invites" \
  -d "{\"email\":\"${INVITEE_EMAIL}\",\"role\":\"pm\"}" \
  > "${OUT_DIR}/07-invite-create.txt"
INVITE_CREATE_STATUS="$(status_code "${OUT_DIR}/07-invite-create.txt")"
require_status_csv "${OUT_DIR}/07-invite-create.txt" "$(contract_field invite_create status)"

# ─── 08 INVITEE REGISTER ─────────────────────────────────────────────────────
# Uses admin cookiejar for CSRF cookie; register endpoint is public but requires CSRF.

INVITEE_PASSWORD="Smoke!${RUN_ID:0:8}Zx"
curl -i \
  -b "${OUT_DIR}/admin-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${ADMIN_CSRF}" \
  -X POST "${API_BASE}/auth/register" \
  -d "{\"email\":\"${INVITEE_EMAIL}\",\"password\":\"${INVITEE_PASSWORD}\",\"fullName\":\"Smoke Invitee ${RUN_ID}\",\"orgName\":\"SmokeInvOrg${RUN_ID}\"}" \
  > "${OUT_DIR}/08-invitee-register.txt"
require_status_csv "${OUT_DIR}/08-invitee-register.txt" "$(contract_field invitee_register status)"

# ─── 09 CSRF (invitee jar) ───────────────────────────────────────────────────

INVITEE_CSRF_JSON="$(curl -s -c "${OUT_DIR}/invitee-cookiejar.txt" "${API_BASE}/auth/csrf")"
INVITEE_CSRF="$(printf "%s" "${INVITEE_CSRF_JSON}" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.csrfToken||j.token||''))}
  catch(e){process.stdout.write('')}
})")"
printf "HTTP/1.1 200 OK\r\n\r\n%s" "${INVITEE_CSRF_JSON}" > "${OUT_DIR}/09-invitee-csrf.txt"
if [[ "${#INVITEE_CSRF}" -lt 10 ]]; then
  echo "FAIL: Invitee CSRF token missing or too short"
  exit 1
fi

# ─── 10 SMOKE LOGIN (invitee) ────────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/invitee-cookiejar.txt" -c "${OUT_DIR}/invitee-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${INVITEE_CSRF}" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  -X POST "${API_BASE}/auth/smoke-login" \
  -d "{\"email\":\"${INVITEE_EMAIL}\"}" \
  > "${OUT_DIR}/10-invitee-smoke-login.txt"
require_status_csv "${OUT_DIR}/10-invitee-smoke-login.txt" "$(contract_field invitee_smoke_login status)"

# ─── 11 INVITE TOKEN READ (never printed) ────────────────────────────────────

INVITE_TOKEN_RAW_FILE="$(mktemp)"
curl -s \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  "${API_BASE}/smoke/invites/latest-token?email=${INVITEE_EMAIL_ENC}" \
  > "${INVITE_TOKEN_RAW_FILE}"
INVITE_TOKEN_READ_STATUS_TEMP="$(curl -o /dev/null -s -w "%{http_code}" \
  -H "X-Smoke-Key: ${STAGING_SMOKE_KEY}" \
  "${API_BASE}/smoke/invites/latest-token?email=${INVITEE_EMAIL_ENC}")"

# Parse token without echoing it
INVITE_TOKEN="$(node -e "
const fs=require('fs');
const raw=fs.readFileSync(process.argv[1],'utf8');
try{
  const j=JSON.parse(raw);
  process.stdout.write(String(j.token||(j.data&&j.data.token)||''));
}catch(e){process.stdout.write('')}
" "${INVITE_TOKEN_RAW_FILE}")"
rm -f "${INVITE_TOKEN_RAW_FILE}"

# Write sanitised proof (status only, no token value)
printf "HTTP/1.1 %s OK\r\n\r\n{\"token\":\"[REDACTED]\"}" "${INVITE_TOKEN_READ_STATUS_TEMP}" \
  > "${OUT_DIR}/11-invite-token-read.txt"

INVITE_TOKEN_READ_STATUS="${INVITE_TOKEN_READ_STATUS_TEMP}"
if [[ "${INVITE_TOKEN_READ_STATUS}" != "200" ]]; then
  echo "FAIL: invite_token_read returned ${INVITE_TOKEN_READ_STATUS} (expected 200)"
  exit 1
fi
if [[ -z "${INVITE_TOKEN}" ]]; then
  echo "FAIL: Invite token was empty after reading from outbox"
  exit 1
fi

# ─── 12 INVITE ACCEPT (invitee) ──────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/invitee-cookiejar.txt" -c "${OUT_DIR}/invitee-cookiejar.txt" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${INVITEE_CSRF}" \
  -X POST "${API_BASE}/invites/accept" \
  -d "{\"token\":\"${INVITE_TOKEN}\"}" \
  > "${OUT_DIR}/12-invite-accept.txt"
INVITE_ACCEPT_STATUS="$(status_code "${OUT_DIR}/12-invite-accept.txt")"
require_status_csv "${OUT_DIR}/12-invite-accept.txt" "$(contract_field invite_accept status)"

# Verify orgId returned matches admin's org
RETURNED_ORG_ID="$(body_from_http_file "${OUT_DIR}/12-invite-accept.txt" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  try{const j=JSON.parse(d);process.stdout.write(String(j.orgId||j.data?.orgId||''))}
  catch(e){process.stdout.write('')}
})")"
if [[ -n "${RETURNED_ORG_ID}" && "${RETURNED_ORG_ID}" != "${ORG_ID}" ]]; then
  echo "FAIL: invite_accept returned orgId=${RETURNED_ORG_ID}, expected ${ORG_ID}"
  exit 1
fi

# ─── 13 INVITEE AUTH ME ──────────────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/invitee-cookiejar.txt" -c "${OUT_DIR}/invitee-cookiejar.txt" \
  -H "X-CSRF-Token: ${INVITEE_CSRF}" \
  "${API_BASE}/auth/me" \
  > "${OUT_DIR}/13-invitee-auth-me.txt"
INVITEE_AUTH_ME_STATUS="$(status_code "${OUT_DIR}/13-invitee-auth-me.txt")"
require_status_csv "${OUT_DIR}/13-invitee-auth-me.txt" "$(contract_field invitee_auth_me status)"

# ─── 14 INVITEE WORKSPACES LIST ──────────────────────────────────────────────

curl -i \
  -b "${OUT_DIR}/invitee-cookiejar.txt" -c "${OUT_DIR}/invitee-cookiejar.txt" \
  -H "X-CSRF-Token: ${INVITEE_CSRF}" \
  "${API_BASE}/workspaces" \
  > "${OUT_DIR}/14-invitee-workspaces-list.txt"
INVITEE_WORKSPACES_LIST_STATUS="$(status_code "${OUT_DIR}/14-invitee-workspaces-list.txt")"
require_status_csv "${OUT_DIR}/14-invitee-workspaces-list.txt" "$(contract_field invitee_workspaces_list status)"

# ─── PROOF BUNDLE ─────────────────────────────────────────────────────────────

RUN_DATE_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
WORKSPACE_CREATE_STATUS="$(status_code "${OUT_DIR}/06-workspace-create.txt")"
INVITEE_SMOKE_LOGIN_STATUS="$(status_code "${OUT_DIR}/10-invitee-smoke-login.txt")"

cat > "${OUT_DIR}/README.md" <<EOF
# Staging Org Invites Smoke Proof

- date_utc: ${RUN_DATE_UTC}
- run_id: ${RUN_ID}
- domain: ${STAGING_BACKEND_BASE}
- api_base: ${API_BASE}
- railwayDeploymentId: ${RAILWAY_DEPLOYMENT_ID}
- commitSha: ${DEPLOYED_COMMIT_SHA}
- commitShaTrusted: ${COMMIT_SHA_TRUSTED}
- org_id: ${ORG_ID}
- workspace_id: ${WORKSPACE_ID}
- invitee_email: ${INVITEE_EMAIL}
- workspace_create_status: ${WORKSPACE_CREATE_STATUS}
- invite_create_status: ${INVITE_CREATE_STATUS}
- invite_token_read_status: ${INVITE_TOKEN_READ_STATUS}
- invite_accept_status: ${INVITE_ACCEPT_STATUS}
- invitee_smoke_login_status: ${INVITEE_SMOKE_LOGIN_STATUS}
- invitee_auth_me_status: ${INVITEE_AUTH_ME_STATUS}
- invitee_workspaces_list_status: ${INVITEE_WORKSPACES_LIST_STATUS}
- result: PASS
EOF

echo ""
echo "railwayDeploymentId=${RAILWAY_DEPLOYMENT_ID}"
echo "invite_create_status=${INVITE_CREATE_STATUS}"
echo "invite_token_read_status=${INVITE_TOKEN_READ_STATUS} (token value redacted)"
echo "invite_accept_status=${INVITE_ACCEPT_STATUS}"
echo "invitee_workspaces_list_status=${INVITEE_WORKSPACES_LIST_STATUS}"
echo "proof_dir=${OUT_DIR}"
