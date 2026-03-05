#!/usr/bin/env bash
# no-dead-home-files.sh
#
# Fail if any of the confirmed-dead home files have been reintroduced.
# These files were deleted in chore(frontend): remove dead home paths
# and must never come back — they contained hook violations and duplicate
# workspace resolution logic that conflicts with OrgHomePage.
#
# Usage:
#   bash scripts/guard/no-dead-home-files.sh

set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
FAIL=0

DEAD_FILES=(
  "zephix-frontend/src/views/HomeView.tsx"
  "zephix-frontend/src/pages/home/GlobalHomePage.tsx"
  "zephix-frontend/src/pages/home/HomeRouterPage.tsx"
  "zephix-frontend/src/app/Sidebar.tsx"
)

echo "=== Dead Home Files Guard ==="

for file in "${DEAD_FILES[@]}"; do
  if [ -f "$REPO_ROOT/$file" ]; then
    echo "FAIL: Dead file reintroduced: $file"
    FAIL=1
  fi
done

if [ "$FAIL" -eq 0 ]; then
  echo "PASS: No dead home files found."
fi

echo ""

if [ "$FAIL" -eq 1 ]; then
  echo "=== RESULT: FAIL — dead files must not be reintroduced ==="
  echo "See commit: chore(frontend): remove dead home paths and app/Sidebar stub"
  exit 1
else
  echo "=== RESULT: PASS ==="
fi
