#!/usr/bin/env bash
# railway-vars-safe.sh
#
# Safe Railway variable inspection.
# NEVER prints values. Prints only key names and environment.
#
# Usage:
#   bash scripts/security/railway-vars-safe.sh
#   bash scripts/security/railway-vars-safe.sh --filter JWT
#
# This is the ONLY approved way to inspect Railway variables from CLI.
# See docs/ai/SECURITY_CLI_USAGE.md for policy.

set -euo pipefail

FILTER="${1:-}"

echo "=== Railway Variable Keys (values hidden) ==="

if [ -n "$FILTER" ]; then
  echo "Filter: $FILTER"
  railway variables --json | jq --arg f "$FILTER" '[keys[] | select(ascii_downcase | contains($f | ascii_downcase))]'
else
  railway variables --json | jq 'keys'
fi

echo ""
echo "Environment: $(railway environment 2>/dev/null || echo 'unknown')"
echo "Values are NOT shown. Use Railway dashboard to inspect values."
