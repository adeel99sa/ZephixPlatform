#!/usr/bin/env bash
# Enterprise quality signals (grep-based; no new dependencies).
# Run from repo root: bash scripts/enterprise-quality-audit.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== TIER 1: explicit any (frontend src, production-ish) ==="
if command -v rg >/dev/null 2>&1; then
  rg -c ":\s*any\b|as any\b|Promise<\s*any\s*>|<any\b" zephix-frontend/src \
    -g '*.ts' -g '*.tsx' \
    -g '!**/__tests__/**' -g '!**/*.test.*' -g '!**/*.spec.*' \
    -g '!**/backup/**' -g '!**/archived-admin-components/**' \
    || true
  echo "(line matches above; use: rg ... --no-heading for full paths)"
else
  echo "Install ripgrep (rg) for accurate counts."
fi

echo ""
echo "=== TIER 1: explicit any (backend src, excluding *.spec.ts) ==="
if command -v rg >/dev/null 2>&1; then
  rg ":\s*any\b|as any\b|Promise<\s*any\s*>" zephix-backend/src -g '*.ts' -g '!**/*.spec.ts' --stats 2>/dev/null | tail -n 5 || true
fi

echo ""
echo "=== TIER 1: @ts-ignore / @ts-expect-error ==="
rg "@ts-ignore|@ts-expect-error" --glob '*.ts' --glob '*.tsx' zephix-backend zephix-frontend packages 2>/dev/null | head -n 40 || true

echo ""
echo "=== TIER 1: eslint-disable (sample) ==="
rg "eslint-disable" zephix-frontend/src zephix-backend/src --glob '*.{ts,tsx}' 2>/dev/null | head -n 40 || true

echo ""
echo "=== TIER 1: console.* in frontend src (sample count) ==="
if command -v rg >/dev/null 2>&1; then
  rg "console\.(log|debug|info|warn|error)" zephix-frontend/src -g '*.tsx' -g '*.ts' --count-matches 2>/dev/null | awk -F: '{s+=$2} END {print "total matches (sum of files):", s+0}'
fi

echo ""
echo "=== TIER 1: dangerouslySetInnerHTML / eval ==="
rg "dangerouslySetInnerHTML|\beval\(" zephix-frontend/src zephix-backend/src --glob '*.{ts,tsx}' 2>/dev/null || true

echo ""
echo "=== TIER 2: files over 300 lines (dashboard + workspace + admin) ==="
for f in \
  zephix-frontend/src/views/dashboards/View.tsx \
  zephix-frontend/src/views/dashboards/Builder.tsx \
  zephix-frontend/src/features/workspaces/views/WorkspaceHome.tsx \
  zephix-backend/src/admin/admin.controller.ts \
  zephix-frontend/src/features/projects/components/TaskListSection.tsx
do
  if [[ -f "$f" ]]; then
    printf '%5s  %s\n' "$(wc -l < "$f" | tr -d ' ')" "$f"
  fi
done

echo ""
echo "=== TIER 3: react-window usage ==="
rg "react-window|FixedSizeList|VariableSizeList" zephix-frontend/src 2>/dev/null || echo "(none found)"

echo ""
echo "=== tsconfig strict flags ==="
echo "--- zephix-frontend/tsconfig.app.json (strict) ---"
rg '"strict"' zephix-frontend/tsconfig.app.json || true
echo "--- zephix-backend/tsconfig.json (strict*) ---"
rg 'strict|noImplicitAny|strictNullChecks' zephix-backend/tsconfig.json || true

echo ""
echo "Done. Fix issues iteratively; full violation lists: rg with patterns above (no head)."
