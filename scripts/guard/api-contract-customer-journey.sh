#!/usr/bin/env bash
# Guard: customer journey contract completeness
#
# Verifies:
#  1. All required steps are present in the contract file
#  2. No step has been removed or renamed without updating this guard
#  3. No staging auto-migrate re-enabled in source

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACT_FILE="${ROOT_DIR}/docs/api-contract/staging/customer-journey-contract.json"

if [[ ! -f "${CONTRACT_FILE}" ]]; then
  echo "FAIL: Contract file missing: ${CONTRACT_FILE}"
  exit 1
fi

REQUIRED_STEPS=(
  health_ready
  version
  csrf
  org_signup
  smoke_login
  auth_me
  workspace_create
  portfolio_create
  program_create
  project_create
  project_link
  project_get
  task_create
  portfolio_rollup
  invite_create
  invitee_register
  invitee_smoke_login
  invite_token_read
  invite_accept
  invitee_auth_me
  invitee_workspaces_list
)

MISSING=()
for step in "${REQUIRED_STEPS[@]}"; do
  found="$(node -e "
const fs=require('fs');
const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
process.stdout.write((c.flow||[]).some(s=>s.step===process.argv[2])?'yes':'no');
" "${CONTRACT_FILE}" "${step}" 2>/dev/null || echo "no")"
  if [[ "${found}" != "yes" ]]; then
    MISSING+=("${step}")
  fi
done

if [[ "${#MISSING[@]}" -gt 0 ]]; then
  echo "FAIL: Missing required steps in customer-journey-contract.json:"
  for s in "${MISSING[@]}"; do echo "  - ${s}"; done
  exit 1
fi

echo "PASS: All ${#REQUIRED_STEPS[@]} required steps present in customer-journey-contract.json"

# Guard: staging auto-migrate must not be re-enabled in source
# Any condition that allows staging to call runMigrations on boot is a deployment risk.
if grep -rn "staging.*auto\|env === 'staging'.*auto\|auto.*staging" \
     "${ROOT_DIR}/zephix-backend/src/" \
     --include="*.ts" \
     --exclude-dir=__tests__ \
     --exclude-dir=node_modules \
     2>/dev/null | grep -v "//"; then
  echo "FAIL: Staging auto-migrate appears to be re-enabled in source."
  echo "  Staging migrations must run via scripts/migrations/run-staging.sh before deploy."
  exit 1
fi

echo "PASS: No staging auto-migrate found in source"
