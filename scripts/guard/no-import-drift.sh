#!/usr/bin/env bash
# no-import-drift.sh
#
# Guard: verify that `function normalizePlatformRole` is defined only in the
# canonical backend module (common/auth/platform-roles.ts).
#
# Fails if any other TypeScript file in zephix-backend introduces a local
# implementation. Re-export shims (lines containing only `export {`) are allowed.
#
# Usage:
#   bash scripts/guard/no-import-drift.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CANONICAL="zephix-backend/src/common/auth/platform-roles.ts"
FAIL=0

echo "=== Import-Drift Guard: normalizePlatformRole ==="
echo "Canonical module: ${CANONICAL}"
echo ""

# Search for `function normalizePlatformRole` in all .ts files under zephix-backend
# excluding node_modules, dist, and test files.
MATCHES=$(
  grep -rn "function normalizePlatformRole" \
    "${ROOT_DIR}/zephix-backend/src" \
    --include="*.ts" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    2>/dev/null || true
)

if [ -z "${MATCHES}" ]; then
  echo "FAIL: canonical function not found — was platform-roles.ts deleted or renamed?"
  exit 1
fi

while IFS= read -r line; do
  # Extract relative path (strip ROOT_DIR prefix)
  filepath="${line%%:*}"
  relpath="${filepath#${ROOT_DIR}/}"

  if [ "${relpath}" = "${CANONICAL}" ]; then
    echo "PASS: ${relpath} (canonical definition)"
  else
    echo "FAIL: ${relpath} — defines normalizePlatformRole outside canonical module"
    echo "      Move the implementation to ${CANONICAL} and re-export if needed."
    FAIL=1
  fi
done <<< "${MATCHES}"

echo ""
if [ "${FAIL}" -eq 0 ]; then
  echo "=== RESULT: PASS ==="
  exit 0
else
  echo "=== RESULT: FAIL — normalizePlatformRole must only be defined in ${CANONICAL} ==="
  exit 1
fi
