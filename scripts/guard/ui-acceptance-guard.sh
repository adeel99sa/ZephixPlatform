#!/usr/bin/env bash
# Offline guard for the UI acceptance lane.
# No network calls. No secrets required.
# Validates that the lane scaffolding is correctly wired.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/zephix-frontend"
GITIGNORE="${ROOT_DIR}/.gitignore"
FAIL=0

check() {
  local label="$1"
  local path="$2"
  if [[ -e "${path}" ]]; then
    echo "PASS: ${label}"
  else
    echo "FAIL: ${label} — not found: ${path}"
    FAIL=1
  fi
}

check_gitignored() {
  local label="$1"
  local pattern="$2"
  if grep -qF "${pattern}" "${GITIGNORE}" 2>/dev/null; then
    echo "PASS: ${label} is gitignored"
  else
    echo "FAIL: ${label} — not found in .gitignore: ${pattern}"
    FAIL=1
  fi
}

check_content() {
  local label="$1"
  local file="$2"
  local pattern="$3"
  if rg -q "${pattern}" "${file}" 2>/dev/null; then
    echo "PASS: ${label}"
  else
    echo "FAIL: ${label} — pattern not found in ${file}: ${pattern}"
    FAIL=1
  fi
}

# ── File existence ────────────────────────────────────────────────────────────

check "ui-acceptance spec exists" \
  "${FRONTEND_DIR}/tests/ui-acceptance.spec.ts"

check "playwright.acceptance.config.ts exists" \
  "${FRONTEND_DIR}/playwright.acceptance.config.ts"

check "tests/helpers/session.ts exists" \
  "${FRONTEND_DIR}/tests/helpers/session.ts"

check "tests/helpers/proof.ts exists" \
  "${FRONTEND_DIR}/tests/helpers/proof.ts"

check "staging-ui-acceptance.sh runner exists" \
  "${ROOT_DIR}/scripts/smoke/staging-ui-acceptance.sh"

check "UI_ACCEPTANCE_JOURNEY.md exists" \
  "${ROOT_DIR}/docs/ai/UI_ACCEPTANCE_JOURNEY.md"

# ── Gitignore ─────────────────────────────────────────────────────────────────

check_gitignored "ui-acceptance-latest proof dir" \
  "/docs/architecture/proofs/staging/ui-acceptance-latest/"

# ── Key content assertions ────────────────────────────────────────────────────

check_content "spec imports session helper" \
  "${FRONTEND_DIR}/tests/ui-acceptance.spec.ts" \
  "smokeLoginSession"

check_content "spec imports proof helper" \
  "${FRONTEND_DIR}/tests/ui-acceptance.spec.ts" \
  "writeReadme"

check_content "spec has STAGING_FRONTEND_BASE stop condition" \
  "${FRONTEND_DIR}/tests/ui-acceptance.spec.ts" \
  "STAGING_FRONTEND_BASE"

check_content "spec has STAGING_SMOKE_KEY check" \
  "${FRONTEND_DIR}/tests/ui-acceptance.spec.ts" \
  "STAGING_SMOKE_KEY"

# Inverted check — FAIL if spec logs SMOKE_KEY value
if rg -q "console\.(log|error|warn).*SMOKE_KEY\|SMOKE_KEY.*console\.(log|error|warn)" \
    "${FRONTEND_DIR}/tests/ui-acceptance.spec.ts" 2>/dev/null; then
  echo "FAIL: spec logs SMOKE_KEY — secrets must not be printed"
  FAIL=1
else
  echo "PASS: spec does not log SMOKE_KEY"
fi

check_content "session helper has smokeLoginSession export" \
  "${FRONTEND_DIR}/tests/helpers/session.ts" \
  "export async function smokeLoginSession"

check_content "proof helper has writeReadme export" \
  "${FRONTEND_DIR}/tests/helpers/proof.ts" \
  "export function writeReadme"

check_content "runner checks STAGING_FRONTEND_BASE" \
  "${ROOT_DIR}/scripts/smoke/staging-ui-acceptance.sh" \
  "STAGING_FRONTEND_BASE"

check_content "runner checks STAGING_SMOKE_KEY" \
  "${ROOT_DIR}/scripts/smoke/staging-ui-acceptance.sh" \
  "STAGING_SMOKE_KEY"

check_content "runner wipes proof dir before run" \
  "${ROOT_DIR}/scripts/smoke/staging-ui-acceptance.sh" \
  'rm -rf.*OUT_DIR'

check_content "serial mode configured in spec" \
  "${FRONTEND_DIR}/tests/ui-acceptance.spec.ts" \
  "mode.*serial"

# ── Result ────────────────────────────────────────────────────────────────────

if [[ ${FAIL} -eq 0 ]]; then
  echo "PASS: UI acceptance lane guard passed"
  exit 0
else
  echo "FAIL: UI acceptance lane guard failed — fix the issues above"
  exit 1
fi
