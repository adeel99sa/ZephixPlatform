#!/usr/bin/env bash
# Sprint 5.2a Phase 0 — live staging smoke for project artifacts (F7 gate).
# Writes proof log under docs/architecture/proofs/staging/project-artifacts-latest/
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
OUT_DIR="${ROOT_DIR}/docs/architecture/proofs/staging/project-artifacts-latest"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}"
  exit 1
fi

read_env() {
  local key="$1"
  grep -E "^${key}=" "${ENV_FILE}" 2>/dev/null | head -n 1 | sed "s/^${key}=//"
}

STAGING_BACKEND_BASE="$(read_env STAGING_BACKEND_BASE)"
STAGING_SMOKE_KEY="${STAGING_SMOKE_KEY:-}"

if [[ -z "${STAGING_BACKEND_BASE}" ]]; then
  echo "STAGING_BACKEND_BASE missing in ${ENV_FILE}"
  exit 1
fi
if [[ -z "${STAGING_SMOKE_KEY}" ]]; then
  echo "STAGING_SMOKE_KEY missing. Export it or inject via GitHub Secrets."
  exit 1
fi

# API env for test-project-artifacts.sh is host-only (no /api suffix).
# GitHub secret STAGING_API_URL must match STAGING_BACKEND_BASE (host-only).
export API="${API:-${STAGING_API_URL:-${STAGING_BACKEND_BASE}}}"
export STAGING_SMOKE_KEY
export ENV_NAME="${ENV_NAME:-staging}"
export REQUIRE_AUDIT_VERIFY="${REQUIRE_AUDIT_VERIFY:-0}"

mkdir -p "${OUT_DIR}"
LOG_FILE="${OUT_DIR}/smoke.log"

echo "Running project artifacts smoke → ${LOG_FILE}"
set +e
bash "${ROOT_DIR}/scripts/smoke/test-project-artifacts.sh" 2>&1 | tee "${LOG_FILE}"
SMOKE_EXIT=${PIPESTATUS[0]}
set -e

if [[ ${SMOKE_EXIT} -ne 0 ]]; then
  echo "Project artifacts smoke FAILED (exit ${SMOKE_EXIT})"
  exit "${SMOKE_EXIT}"
fi

echo "Project artifacts smoke PASSED"
exit 0
