#!/usr/bin/env bash
# check-secret-leak.sh
#
# Scan scripts/ and .github/ for patterns that would leak secret values.
# Fails with exit code 1 if any forbidden patterns are found.
#
# Usage:
#   bash scripts/security/check-secret-leak.sh
#
# Run before any commit that touches scripts/ or .github/workflows/.

set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
SCAN_DIRS=("$REPO_ROOT/scripts" "$REPO_ROOT/.github")
FAIL=0

echo "=== Secret Leak Check ==="
echo "Scanning: scripts/ .github/"
echo ""

# Pattern 1: unfiltered `railway variables` dump (blocks full dump; allows safe patterns)
#
# Allowed:
#   railway variables --json | jq ...     (filtered dump via jq)
#   railway variables get <KEY>           (single key fetch assigned to variable)
#
# Forbidden:
#   railway variables                     (unfiltered full dump)
#   railway variables --json > file       (full dump to file)
echo "--- Check: unfiltered 'railway variables' dump ---"
MATCHES=$(grep -rn "railway variables" \
  "${SCAN_DIRS[@]}" \
  --include="*.sh" --include="*.yml" --include="*.yaml" \
  | grep -v "railway variables --json | jq" \
  | grep -v "railway variables get " \
  | grep -v "railway-vars-safe.sh" \
  | grep -v "check-secret-leak.sh" \
  || true)

if [ -n "$MATCHES" ]; then
  echo "FAIL: unfiltered 'railway variables' found:"
  echo "$MATCHES"
  FAIL=1
else
  echo "PASS"
fi

echo ""

# Pattern 2: echo of known secret variable names
echo "--- Check: echo of secret env vars ---"
SECRET_PATTERNS=(
  'echo \$JWT_SECRET'
  'echo \$JWT_REFRESH_SECRET'
  'echo \$SENDGRID_API_KEY'
  'echo \$STAGING_SMOKE_KEY'
  'echo \$REFRESH_TOKEN_PEPPER'
  'echo \$TOKEN_HASH_SECRET'
  'echo \$DATABASE_URL'
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  MATCHES=$(grep -rn "$pattern" \
    "${SCAN_DIRS[@]}" \
    --include="*.sh" --include="*.yml" --include="*.yaml" \
    || true)
  if [ -n "$MATCHES" ]; then
    echo "FAIL: '$pattern' found:"
    echo "$MATCHES"
    FAIL=1
  fi
done

if [ "$FAIL" -eq 0 ]; then
  echo "PASS"
fi

echo ""

if [ "$FAIL" -eq 1 ]; then
  echo "=== RESULT: FAIL — secret leak patterns detected ==="
  echo "See docs/ai/SECURITY_CLI_USAGE.md for allowed patterns."
  exit 1
else
  echo "=== RESULT: PASS — no forbidden patterns found ==="
fi
