#!/usr/bin/env bash
# prod-rbac-rollout-readiness.sh
#
# OFFLINE guard — verifies local state readiness for RBAC V2 production rollout.
# Does NOT connect to production or perform any live probes.
#
# Checks:
#   1. no-import-drift:      normalizePlatformRole defined only in canonical module
#   2. no-role-drift:        no direct user.role comparisons in business-auth
#   3. contract-all:         all API contract guards pass
#   4. contract-runner-parity: smoke runners match contract declarations
#   5. no-token-in-proof-artifacts: no raw tokens in staging proof dirs
#   6. smoke-proof-trust:    recent proof dirs have deployment trust anchors
#
# This guard is a pre-flight checklist — it does not run smoke against any live
# environment. Run it from repo root before triggering a production deploy.
#
# Usage:
#   bash scripts/guard/prod-rbac-rollout-readiness.sh
#
# Exit codes:
#   0 — all offline checks pass; proceed to live verification
#   1 — one or more checks fail; do not deploy

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FAIL=0

run_check() {
  local label="$1"; shift
  echo "--- ${label} ---"
  if "$@"; then
    echo "PASS: ${label}"
  else
    echo "FAIL: ${label}"
    FAIL=1
  fi
  echo ""
}

echo "=== RBAC V2 Production Rollout Readiness (offline checks) ==="
echo "date_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

run_check "no-import-drift" bash "${ROOT_DIR}/scripts/guard/no-import-drift.sh"
run_check "no-role-drift"   bash "${ROOT_DIR}/scripts/guard/no-role-drift.sh"
run_check "contract-all"    bash "${ROOT_DIR}/scripts/smoke/run.sh" contract-all
run_check "contract-runner-parity" bash "${ROOT_DIR}/scripts/guard/contract-runner-parity.sh"
run_check "no-token-in-proof-artifacts" bash "${ROOT_DIR}/scripts/guard/no-token-in-proof-artifacts.sh" "${ROOT_DIR}/docs/architecture/proofs/staging"

# Deployment trust: check proof dirs that exist
PROOF_DIRS=(
  "${ROOT_DIR}/docs/architecture/proofs/staging/org-invites-latest"
  "${ROOT_DIR}/docs/architecture/proofs/staging/customer-journey-latest"
)
for dir in "${PROOF_DIRS[@]}"; do
  if [[ -d "${dir}" ]]; then
    run_check "smoke-proof-trust: $(basename ${dir})" \
      bash "${ROOT_DIR}/scripts/guard/smoke-proof-deployment-trust.sh" "${dir}"
  else
    echo "--- smoke-proof-trust: $(basename ${dir}) ---"
    echo "SKIP: proof dir not found — run the smoke lane first"
    echo ""
  fi
done

echo "================================"
if [[ "${FAIL}" -eq 0 ]]; then
  echo "OFFLINE READINESS: PASS"
  echo ""
  echo "Next steps (live verification required before production deploy):"
  echo "  1. Deploy RBAC V2 to staging: cd zephix-backend && railway up --service zephix-backend-v2 --environment staging --detach"
  echo "  2. Verify staging: bash scripts/smoke/run.sh org-invites && bash scripts/smoke/run.sh customer-journey"
  echo "  3. Verify commitShaTrusted=true in staging /api/version"
  echo "  4. Re-run this guard after staging verification"
  echo "  5. Then proceed to production deploy per docs/architecture/proofs/rbac-parity/12-production-rbac-rollout-readiness.md"
  exit 0
else
  echo "OFFLINE READINESS: FAIL"
  echo "Fix the failures above before proceeding with production rollout."
  exit 1
fi
