#!/usr/bin/env bash
# contract-runner-parity.sh
#
# Guard: verify that smoke runner scripts call the paths declared in their contracts.
#
# Rules:
#   1. For each non-smoke-only step in a contract, the runner must call the
#      declared path OR the step must have an `override: true` annotation.
#   2. For override steps with `overridePath`: runner must call `overridePath`.
#   3. For override steps without `overridePath`: step is intentionally skipped
#      by the runner (e.g., uses pre-seeded data). Only `overrideReason` required.
#   4. All override steps must have `overrideReason`.
#
# Usage:
#   bash scripts/guard/contract-runner-parity.sh
#
# Checks:
#   - customer-journey-contract.json ↔ staging-customer-journey.sh
#   - org-invites-contract.json      ↔ staging-org-invites.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FAIL=0

# JavaScript parity checker — written to a temp file to avoid shell quoting issues.
JS_CHECKER="$(mktemp /tmp/parity-check-XXXXXX.js)"
trap 'rm -f "${JS_CHECKER}"' EXIT

cat > "${JS_CHECKER}" <<'JSEOF'
const fs = require('fs');
const contract = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const runner   = fs.readFileSync(process.argv[3], 'utf8');
let fail = 0;

for (const step of (contract.flow || [])) {
  const { step: name, path, method, override, overridePath, overrideReason } = step;

  // Smoke-only infrastructure endpoints are in the runner by design; skip parity check.
  const isSmokeOnly = path.startsWith('/smoke/') || path.startsWith('/auth/smoke-');
  if (isSmokeOnly) continue;

  if (override) {
    // Must have overrideReason
    if (!overrideReason) {
      process.stderr.write('FAIL: [' + name + '] override=true but missing overrideReason\n');
      fail = 1;
    }

    if (overridePath) {
      // Verify runner calls overridePath
      // Replace path params {x} with wildcard; escape slashes for regex
      const escaped = overridePath.replace(/\{[^}]+\}/g, '[^\'"\s]+').replace(/\//g, '\\/');
      const pattern = new RegExp(escaped);
      if (!pattern.test(runner)) {
        process.stderr.write('FAIL: [' + name + '] override declared but runner does not call overridePath: ' + overridePath + '\n');
        fail = 1;
      } else {
        process.stdout.write('PASS: [' + name + '] override => ' + overridePath + ' (canonical: ' + path + ')\n');
      }
    } else {
      // Step intentionally skipped by runner (pre-seeded data, no runtime call)
      process.stdout.write('PASS: [' + name + '] override (step skipped by runner)\n');
    }
  } else {
    // Non-override: runner should call the canonical path somewhere
    const escaped = path.replace(/\{[^}]+\}/g, '[^\'"\s]+').replace(/\//g, '\\/');
    const pattern = new RegExp(escaped);
    if (!pattern.test(runner)) {
      process.stderr.write('FAIL: [' + name + '] runner does not call path: ' + path + ' (add override annotation if intentional)\n');
      fail = 1;
    } else {
      process.stdout.write('PASS: [' + name + '] ' + method + ' ' + path + '\n');
    }
  }
}

process.exit(fail);
JSEOF

check_parity() {
  local contract_file="$1"
  local runner_file="$2"
  local label="$3"

  echo "--- ${label} ---"

  if [[ ! -f "${contract_file}" ]]; then
    echo "FAIL: contract not found: ${contract_file}"
    FAIL=1; return
  fi
  if [[ ! -f "${runner_file}" ]]; then
    echo "FAIL: runner not found: ${runner_file}"
    FAIL=1; return
  fi

  node "${JS_CHECKER}" "${contract_file}" "${runner_file}" || FAIL=1
}

echo "=== Contract-Runner Parity Guard ==="

check_parity \
  "${ROOT_DIR}/docs/api-contract/staging/customer-journey-contract.json" \
  "${ROOT_DIR}/scripts/smoke/staging-customer-journey.sh" \
  "customer-journey"

check_parity \
  "${ROOT_DIR}/docs/api-contract/staging/org-invites-contract.json" \
  "${ROOT_DIR}/scripts/smoke/staging-org-invites.sh" \
  "org-invites"

echo ""
if [[ "${FAIL}" -eq 0 ]]; then
  echo "=== RESULT: PASS ==="
  exit 0
else
  echo "=== RESULT: FAIL ==="
  exit 1
fi
