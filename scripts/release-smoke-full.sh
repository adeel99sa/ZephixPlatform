#!/usr/bin/env bash
###############################################################################
# Zephix Release Smoke - Full Suite
#
# Runs the complete E2E verification:
#   1. Seed baseline dataset
#   2. API smoke tests
#   3. Frontend Playwright smoke tests
#
# Usage:
#   ./scripts/release-smoke-full.sh [BASE_URL]
#
# Environment:
#   BASE_URL       – Backend API root (default: http://localhost:3000/api)
#   FRONTEND_URL   – Frontend URL (default: http://localhost:5173)
#   SKIP_SEED      – Set to "1" to skip seeding (reuse existing e2e-ids.json)
#   SKIP_API       – Set to "1" to skip API smoke tests
#   SKIP_FRONTEND  – Set to "1" to skip Playwright tests
#   CI             – Set to "1" for CI mode (no interactive output)
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BASE_URL="${1:-${BASE_URL:-http://localhost:3000/api}}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
SKIP_SEED="${SKIP_SEED:-0}"
SKIP_API="${SKIP_API:-0}"
SKIP_FRONTEND="${SKIP_FRONTEND:-0}"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[1;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

OVERALL_EXIT=0

section() { printf "\n${BLUE}══════════════════════════════════════════════════════════════${NC}\n${BLUE}  %s${NC}\n${BLUE}══════════════════════════════════════════════════════════════${NC}\n\n" "$1"; }
step_pass() { printf "${GREEN}✓${NC} %s\n" "$1"; }
step_fail() { printf "${RED}✗${NC} %s\n" "$1"; OVERALL_EXIT=1; }
step_skip() { printf "${YELLOW}⊘${NC} %s (skipped)\n" "$1"; }

printf "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}\n"
printf "${BLUE}║         ZEPHIX RELEASE SMOKE TEST - FULL SUITE             ║${NC}\n"
printf "${BLUE}╠══════════════════════════════════════════════════════════════╣${NC}\n"
printf "${BLUE}║${NC} Backend:  %-49s ${BLUE}║${NC}\n" "$BASE_URL"
printf "${BLUE}║${NC} Frontend: %-49s ${BLUE}║${NC}\n" "$FRONTEND_URL"
printf "${BLUE}║${NC} Time:     %-49s ${BLUE}║${NC}\n" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
printf "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}\n"

###############################################################################
# Phase 1: Seed
###############################################################################
section "PHASE 1: Seed Baseline Dataset"

if [ "$SKIP_SEED" = "1" ]; then
  step_skip "Seeding (SKIP_SEED=1)"
  if [ ! -f "${SCRIPT_DIR}/smoke/e2e-ids.json" ]; then
    printf "${RED}ERROR: e2e-ids.json not found. Cannot skip seed without existing data.${NC}\n"
    exit 1
  fi
else
  if bash "${SCRIPT_DIR}/smoke/e2e-seed.sh" "$BASE_URL"; then
    step_pass "Seed completed"
  else
    step_fail "Seed FAILED"
    printf "${RED}Cannot continue without seed data. Aborting.${NC}\n"
    exit 1
  fi
fi

###############################################################################
# Phase 2: API Smoke Tests
###############################################################################
section "PHASE 2: API Smoke Tests"

if [ "$SKIP_API" = "1" ]; then
  step_skip "API smoke tests (SKIP_API=1)"
else
  if bash "${SCRIPT_DIR}/smoke/e2e-api.sh" "${SCRIPT_DIR}/smoke/e2e-ids.json" "$BASE_URL"; then
    step_pass "API smoke tests passed"
  else
    step_fail "API smoke tests FAILED"
  fi
fi

###############################################################################
# Phase 3: Frontend Playwright Smoke Tests
###############################################################################
section "PHASE 3: Frontend Playwright Smoke Tests"

if [ "$SKIP_FRONTEND" = "1" ]; then
  step_skip "Frontend smoke tests (SKIP_FRONTEND=1)"
else
  cd "${REPO_ROOT}/zephix-frontend"

  # Check if Playwright is installed
  if ! npx playwright --version &>/dev/null; then
    printf "Installing Playwright browsers ...\n"
    npx playwright install chromium --with-deps 2>/dev/null || true
  fi

  # Run smoke tests
  if npx playwright test tests/smoke/ --reporter=list ${CI:+--retries=2 --workers=1}; then
    step_pass "Frontend smoke tests passed"
  else
    step_fail "Frontend smoke tests FAILED"
    printf "${YELLOW}Check test results: npx playwright show-report${NC}\n"
  fi

  cd "${REPO_ROOT}"
fi

###############################################################################
# Summary
###############################################################################
section "SUMMARY"

if [ "$OVERALL_EXIT" -eq 0 ]; then
  printf "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}\n"
  printf "${GREEN}║              ALL SMOKE TESTS PASSED                        ║${NC}\n"
  printf "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}\n"
else
  printf "${RED}╔══════════════════════════════════════════════════════════════╗${NC}\n"
  printf "${RED}║           SOME SMOKE TESTS FAILED — SEE ABOVE              ║${NC}\n"
  printf "${RED}╚══════════════════════════════════════════════════════════════╝${NC}\n"
fi

printf "\nRerun commands:\n"
printf "  Seed only:     ./scripts/smoke/e2e-seed.sh %s\n" "$BASE_URL"
printf "  API only:      SKIP_SEED=1 ./scripts/release-smoke-full.sh %s\n" "$BASE_URL"
printf "  Frontend only: SKIP_SEED=1 SKIP_API=1 ./scripts/release-smoke-full.sh %s\n" "$BASE_URL"
printf "  Full suite:    ./scripts/release-smoke-full.sh %s\n" "$BASE_URL"

exit $OVERALL_EXIT
