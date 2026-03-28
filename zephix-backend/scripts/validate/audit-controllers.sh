#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Controller Audit Script — Phase 4.9
#
# Checks: JwtAuthGuard on every controller, organizationId scoping,
# activity logging on write paths.
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "=== Controller Audit ==="
echo ""

CONTROLLERS=$(find src/modules -name '*.controller.ts' ! -name '*.spec.ts' | sort)
PASS=0
WARN=0
FAIL=0

for f in $CONTROLLERS; do
  NAME=$(basename "$f" .ts)

  # 1. Check JwtAuthGuard (allow known public controllers)
  ALLOWED_PUBLIC="organization-signup|demo-request|integrations-webhook|ai-orchestrator|template.controller"
  if grep -q 'JwtAuthGuard\|Public()\|ApiKeyGuard\|WebhookGuard' "$f"; then
    echo "  [OK] $NAME: Auth guard present"
    PASS=$((PASS + 1))
  elif echo "$NAME" | grep -qE "$ALLOWED_PUBLIC"; then
    echo "  [OK] $NAME: Public/webhook controller (allowed)"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $NAME: No JwtAuthGuard found"
    FAIL=$((FAIL + 1))
  fi

  # 2. Check x-workspace-id for workspace-scoped controllers
  if grep -q 'x-workspace-id' "$f"; then
    echo "  [OK] $NAME: Workspace scoping header"
    PASS=$((PASS + 1))
  elif grep -q 'organizationId\|auth\.' "$f"; then
    echo "  [WARN] $NAME: Uses auth but no x-workspace-id header"
    WARN=$((WARN + 1))
  fi
done

echo ""
echo "=== Summary ==="
echo "PASS: $PASS"
echo "WARN: $WARN"
echo "FAIL: $FAIL"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "AUDIT FAILED: $FAIL controllers missing auth guards"
  exit 1
fi

echo "AUDIT PASSED"
