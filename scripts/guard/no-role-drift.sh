#!/usr/bin/env bash
# no-role-drift.sh
#
# Guard: static scan for direct `user.role` comparisons against role string literals
# in backend business-auth code outside canonical/test/migration files.
#
# Patterns detected:
#   user.role === 'admin'     user.role === 'ADMIN'
#   user.role === 'member'    user.role === 'MEMBER'
#   user.role === 'viewer'    user.role === 'VIEWER'
#   user.role === 'owner'     user.role === 'OWNER'
#   user.role !== 'admin'     (any != / !== variant)
#
# These indicate drift: business-auth code should read `user.platformRole ?? user.role`
# and pass through `normalizePlatformRole` (or `resolvePlatformRoleFromRequestUser`).
#
# Allowed exceptions (excluded from scan):
#   - **/common/auth/platform-roles.ts    (canonical module — comparisons are intentional)
#   - **/*.spec.ts / **/*.test.ts          (unit tests)
#   - **/migrations/**                     (DB migrations — compare raw values by design)
#   - **/shared/enums/platform-roles.enum.ts (re-export shim — no logic)
#
# Usage:
#   bash scripts/guard/no-role-drift.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FAIL=0

echo "=== Role-Drift Guard: direct user.role comparisons ==="
echo ""

# Pattern: user.role (with optional spaces) followed by === or !== and a role string literal
PATTERN='user\.role\s*[!=]==?\s*['"'"'"]( *admin *| *ADMIN *| *member *| *MEMBER *| *viewer *| *VIEWER *| *owner *| *OWNER *)['"'"'"]'

MATCHES=$(
  grep -rPn "${PATTERN}" \
    "${ROOT_DIR}/zephix-backend/src" \
    --include="*.ts" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    2>/dev/null || true
)

if [ -z "${MATCHES}" ]; then
  echo "PASS: no direct user.role comparisons found"
  echo ""
  echo "=== RESULT: PASS ==="
  exit 0
fi

ALLOWED_PATTERNS=(
  "common/auth/platform-roles.ts"
  "shared/enums/platform-roles.enum.ts"
  ".spec.ts"
  ".test.ts"
  "/migrations/"
)

while IFS= read -r line; do
  filepath="${line%%:*}"
  relpath="${filepath#${ROOT_DIR}/}"

  skip=0
  for pattern in "${ALLOWED_PATTERNS[@]}"; do
    if [[ "${relpath}" == *"${pattern}"* ]]; then
      skip=1
      break
    fi
  done

  if [ "${skip}" -eq 1 ]; then
    echo "SKIP (allowed): ${line#${ROOT_DIR}/}"
  else
    echo "FAIL: ${line#${ROOT_DIR}/}"
    echo "      Replace with: resolvePlatformRoleFromRequestUser(user)"
    echo "      or:           user.platformRole ?? user.role"
    FAIL=1
  fi
done <<< "${MATCHES}"

echo ""
if [ "${FAIL}" -eq 0 ]; then
  echo "=== RESULT: PASS ==="
  exit 0
else
  echo ""
  echo "Fix: use resolvePlatformRoleFromRequestUser(user) from common/auth/platform-roles.ts"
  echo "     or inline: user.platformRole ?? user.role"
  echo ""
  echo "=== RESULT: FAIL ==="
  exit 1
fi
