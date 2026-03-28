#!/usr/bin/env bash
# smoke-proof-deployment-trust.sh
#
# Guard: verify that a smoke proof directory's README.md contains both:
#   - railway_deploy_id: <non-empty UUID>
#   - commit_trusted:    true
#
# These two fields together constitute the deployment trust anchor: the proof
# is tied to a specific Railway deployment ID and the commit SHA was verified
# against the live /api/version endpoint (commitShaTrusted=true).
#
# A proof missing either field was either generated against an unverified
# deployment or is a stale/manual artifact — both disqualify it as a gate.
#
# Usage:
#   bash scripts/guard/smoke-proof-deployment-trust.sh <proof-dir>
#   bash scripts/guard/smoke-proof-deployment-trust.sh docs/architecture/proofs/staging/customer-journey-latest
#
# Exit codes:
#   0 — both trust anchors present
#   1 — one or both anchors missing

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <proof-dir>"
  exit 1
fi

PROOF_DIR="$1"
README="${PROOF_DIR}/README.md"

echo "=== Smoke Proof Deployment Trust Guard ==="
echo "Proof dir: ${PROOF_DIR}"
echo ""

if [[ ! -f "${README}" ]]; then
  echo "FAIL: README.md not found in ${PROOF_DIR}"
  echo "      Smoke lane must generate a README.md proof artifact."
  exit 1
fi

FAIL=0

# --- Check 1: railway deployment ID must be present and non-empty ---
# Accepts both naming conventions used across smoke scripts:
#   - railway_deploy_id:    (snake_case — customer-journey, onboarding)
#   - railwayDeploymentId:  (camelCase — org-invites, platform-core)
DEPLOY_LINE=$(grep -E '^-\s+(railway_deploy_id|railwayDeploymentId):' "${README}" 2>/dev/null || true)
if [ -z "${DEPLOY_LINE}" ]; then
  echo "FAIL: deployment ID field not found in README.md"
  echo "      Expected 'railway_deploy_id:' or 'railwayDeploymentId:'"
  FAIL=1
else
  DEPLOY_VAL=$(echo "${DEPLOY_LINE}" | sed 's/.*:[[:space:]]*//' | tr -d '[:space:]')
  if [ -z "${DEPLOY_VAL}" ]; then
    echo "FAIL: deployment ID field is empty"
    FAIL=1
  else
    echo "PASS: railway deployment ID = ${DEPLOY_VAL}"
  fi
fi

# --- Check 2: commit trust anchor must be 'true' ---
# Accepts both naming conventions:
#   - commit_trusted:    (snake_case — customer-journey, onboarding)
#   - commitShaTrusted:  (camelCase — org-invites, platform-core)
TRUST_LINE=$(grep -E '^-\s+(commit_trusted|commitShaTrusted):' "${README}" 2>/dev/null || true)
if [ -z "${TRUST_LINE}" ]; then
  echo "FAIL: commit trust field not found in README.md"
  echo "      Expected 'commit_trusted:' or 'commitShaTrusted:'"
  FAIL=1
else
  TRUST_VAL=$(echo "${TRUST_LINE}" | sed 's/.*:[[:space:]]*//' | tr -d '[:space:]')
  if [ "${TRUST_VAL}" != "true" ]; then
    echo "FAIL: commit trust = '${TRUST_VAL}' (expected 'true')"
    echo "      The smoke run must verify commitSha against /api/version before writing proof."
    FAIL=1
  else
    echo "PASS: commit_trusted = true"
  fi
fi

echo ""
if [ "${FAIL}" -eq 0 ]; then
  echo "=== RESULT: PASS — deployment trust anchor verified ==="
  exit 0
else
  echo "=== RESULT: FAIL — proof does not meet deployment trust requirements ==="
  echo ""
  echo "Required fields in README.md (either naming convention accepted):"
  echo "  - railway_deploy_id: / railwayDeploymentId:  <Railway deployment UUID>"
  echo "  - commit_trusted: / commitShaTrusted:         true"
  exit 1
fi
