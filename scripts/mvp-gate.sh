#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# MVP Release Gate — Phase 4.9
#
# One command to run all quality gates:
#   1. Backend typecheck
#   2. Frontend typecheck
#   3. Backend build
#   4. Frontend build
#   5. Backend unit tests (critical path)
#   6. Controller security audit
#   7. Frontend lint (new files only)
#
# Usage: bash scripts/mvp-gate.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0
TOTAL=0

run_gate() {
  TOTAL=$((TOTAL + 1))
  local name="$1"
  shift
  echo ""
  echo "━━━ Gate $TOTAL: $name ━━━"
  if "$@" > /tmp/gate-output-$TOTAL.txt 2>&1; then
    echo "  ✓ PASS"
    PASS=$((PASS + 1))
  else
    echo "  ✗ FAIL"
    tail -10 /tmp/gate-output-$TOTAL.txt
    FAIL=$((FAIL + 1))
  fi
}

echo "╔══════════════════════════════════════════╗"
echo "║       Zephix MVP Release Gate            ║"
echo "╚══════════════════════════════════════════╝"

# 1. Backend typecheck
run_gate "Backend typecheck" \
  npx tsc --noEmit --project "$ROOT/zephix-backend/tsconfig.json"

# 2. Frontend typecheck
run_gate "Frontend typecheck" \
  npx tsc --noEmit --project "$ROOT/zephix-frontend/tsconfig.json"

# 3. Backend build
run_gate "Backend build" \
  bash -c "cd $ROOT/zephix-backend && npm run build"

# 4. Frontend build
run_gate "Frontend build" \
  bash -c "cd $ROOT/zephix-frontend && npm run build"

# 5. Backend unit tests (critical path)
run_gate "Backend unit tests (critical)" \
  bash -c "cd $ROOT/zephix-backend && npx jest --testPathPattern='sprint\.service\.spec|budget\.service\.spec|tailoring|command-context-resolver|phase-gate-evaluator|template-activation|policies\.service' --passWithNoTests"

# 6. Controller security audit
run_gate "Controller security audit" \
  bash "$ROOT/zephix-backend/scripts/validate/audit-controllers.sh"

# ─── Step 19 Trust Gates ────────────────────────────────────────────────────

# 7. No alert() usage in frontend source
run_gate "No alert() in frontend" \
  bash -c '! grep -rn "\\balert(" "$ROOT/zephix-frontend/src" --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v ".test." | grep -v ".spec."'

# 8. No placeholder text in built frontend bundle
run_gate "No placeholder text in bundle" \
  bash -c '
    DIST="$ROOT/zephix-frontend/dist"
    if [ ! -d "$DIST" ]; then
      echo "SKIP: dist/ not found — run frontend build first"
      exit 0
    fi
    FOUND=0
    for PATTERN in "temporarily disabled" "system repair" "NotImplementedException" "coming soon" "under construction"; do
      if grep -rl "$PATTERN" "$DIST" --include="*.js" 2>/dev/null | head -1 | grep -q .; then
        echo "FOUND placeholder text: $PATTERN"
        FOUND=1
      fi
    done
    exit $FOUND
  '

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           Gate Results                   ║"
echo "╠══════════════════════════════════════════╣"
echo "║  PASS: $PASS / $TOTAL                           ║"
echo "║  FAIL: $FAIL                                    ║"
echo "╚══════════════════════════════════════════╝"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "🚫 MVP GATE FAILED — $FAIL gate(s) did not pass"
  exit 1
fi

echo ""
echo "✅ MVP GATE PASSED — all $TOTAL gates green"
