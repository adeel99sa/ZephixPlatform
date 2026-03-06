#!/usr/bin/env bash
# UI acceptance smoke lane runner.
# Targets live staging frontend + backend. No local dev server required.
#
# Required env vars:
#   STAGING_SMOKE_KEY        — smoke bypass key
#
# STAGING_FRONTEND_BASE and STAGING_BACKEND_BASE are read from staging.env.
# STAGING_FRONTEND_BASE must be non-empty or this script exits 1 (stop condition).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/zephix-frontend"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
OUT_DIR="${ROOT_DIR}/docs/architecture/proofs/staging/ui-acceptance-latest"

read_env() {
  local key="$1"
  rg "^${key}=" "${ENV_FILE}" -N 2>/dev/null | head -n 1 | sed "s/^${key}=//"
}

# ── Preflight checks ──────────────────────────────────────────────────────────

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "STOP: Missing staging env file: ${ENV_FILE}"
  exit 1
fi

STAGING_FRONTEND_BASE="${STAGING_FRONTEND_BASE:-$(read_env STAGING_FRONTEND_BASE)}"
STAGING_BACKEND_BASE="${STAGING_BACKEND_BASE:-$(read_env STAGING_BACKEND_BASE)}"

if [[ -z "${STAGING_FRONTEND_BASE}" ]]; then
  echo "STOP: STAGING_FRONTEND_BASE is empty."
  echo "Set it in ${ENV_FILE} key STAGING_FRONTEND_BASE= before running the UI acceptance lane."
  exit 1
fi

if [[ -z "${STAGING_SMOKE_KEY:-}" ]]; then
  echo "STOP: STAGING_SMOKE_KEY is missing from environment."
  exit 1
fi

# ── Setup proof directory ─────────────────────────────────────────────────────

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

export UI_ACCEPTANCE_PROOF_DIR="${OUT_DIR}"
export STAGING_FRONTEND_BASE
export STAGING_BACKEND_BASE
export STAGING_SMOKE_KEY

echo "UI acceptance lane starting"
echo "  frontend: ${STAGING_FRONTEND_BASE}"
echo "  backend:  ${STAGING_BACKEND_BASE}"
echo "  proof:    ${OUT_DIR}"

# ── Playwright install (if browsers missing) ──────────────────────────────────

cd "${FRONTEND_DIR}"

if ! npx playwright install --help >/dev/null 2>&1; then
  echo "STOP: playwright not available in ${FRONTEND_DIR}"
  exit 1
fi

# Check if chromium is installed; install with deps if not
if ! npx playwright install --dry-run chromium 2>&1 | grep -q "chromium"; then
  echo "Installing Playwright chromium..."
  npx playwright install --with-deps chromium
fi

# ── Run tests ─────────────────────────────────────────────────────────────────

EXIT_CODE=0
npx playwright test tests/ui-acceptance.spec.ts \
  --config playwright.acceptance.config.ts \
  2>&1 | tee "${OUT_DIR}/playwright-output.log" || EXIT_CODE=$?

# ── Copy playwright report artifacts ─────────────────────────────────────────

if [[ -d "playwright-acceptance-report" ]]; then
  cp -r playwright-acceptance-report "${OUT_DIR}/playwright-report" 2>/dev/null || true
fi
if [[ -d "test-results" ]]; then
  # Copy any screenshots or traces from test-results
  find test-results -name "*.png" -o -name "*.zip" 2>/dev/null | head -50 | while read -r f; do
    cp "${f}" "${OUT_DIR}/" 2>/dev/null || true
  done
fi

# ── Final summary ─────────────────────────────────────────────────────────────

if [[ ${EXIT_CODE} -eq 0 ]]; then
  echo "UI acceptance lane: PASS"
else
  echo "UI acceptance lane: FAIL (exit code ${EXIT_CODE})"
  echo "Proof artifacts: ${OUT_DIR}"
fi

exit ${EXIT_CODE}
