#!/usr/bin/env bash
# Phase 4.2 Complete Verification Script
# Executes all verification steps in order
# Requires: BASE, EMAIL, PASSWORD environment variables

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo -e "${GREEN}🚀 Phase 4.2 Complete Verification${NC}"
echo "=============================================="
echo ""

# Step 0: Sanity checks
echo -e "${YELLOW}Step 0: Sanity checks${NC}"
test -f scripts/auth-login.sh || (echo "Missing scripts/auth-login.sh" && exit 1)
test -f scripts/run-phase4-dashboard-verify.sh || (echo "Missing scripts/run-phase4-dashboard-verify.sh" && exit 1)
test -f scripts/phase4-dashboard-studio-verify.sh || (echo "Missing scripts/phase4-dashboard-studio-verify.sh" && exit 1)
test -f docs/RELEASE_LOG_PHASE4.md || (echo "Missing docs/RELEASE_LOG_PHASE4.md" && exit 1)

if [ -z "${BASE:-}" ]; then
  echo -e "${RED}❌ BASE is required${NC}"
  exit 1
fi
echo -e "${GREEN}✅ All files exist, BASE is set${NC}"
echo ""

# Step 1: Verify auth-login.sh supports non-interactive mode
echo -e "${YELLOW}Step 1: Verifying auth-login.sh non-interactive support${NC}"
if ! grep -q 'EMAIL="${EMAIL:-}"' scripts/auth-login.sh; then
  echo -e "${RED}❌ auth-login.sh does not support non-interactive mode${NC}"
  exit 1
fi
echo -e "${GREEN}✅ auth-login.sh supports non-interactive mode${NC}"
echo ""

# Step 2: Authenticate
echo -e "${YELLOW}Step 2: Authenticating${NC}"
if [ -z "${EMAIL:-}" ] || [ -z "${PASSWORD:-}" ]; then
  echo -e "${RED}❌ EMAIL and PASSWORD must be set in environment${NC}"
  exit 1
fi

# Source auth-login.sh (it will export TOKEN)
source scripts/auth-login.sh

if [ -z "${TOKEN:-}" ]; then
  echo -e "${RED}❌ TOKEN not set, login failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# Step 3: Discover context
echo -e "${YELLOW}Step 3: Discovering ORG_ID and WORKSPACE_ID${NC}"
source scripts/_phase4_ctx.sh

if [ -z "${ORG_ID:-}" ] || [ -z "${WORKSPACE_ID:-}" ]; then
  echo -e "${RED}❌ Unable to resolve ORG_ID or WORKSPACE_ID${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Context discovered${NC}"
echo ""

# Step 4: Run verification
echo -e "${YELLOW}Step 4: Running verification script${NC}"
export BASE
export ORG_ID
export WORKSPACE_ID

OUTPUT_FILE="docs/_proof_phase4_2_verify_output.txt"
bash scripts/run-phase4-dashboard-verify.sh > "$OUTPUT_FILE" 2>&1
VERIFY_EXIT_CODE=$?

if [ $VERIFY_EXIT_CODE -ne 0 ]; then
  echo -e "${RED}❌ Verification script failed with exit code $VERIFY_EXIT_CODE${NC}"
  cat "$OUTPUT_FILE"
  exit 1
fi

echo -e "${GREEN}✅ Verification script completed${NC}"
echo ""

# Step 5: Post verification assertions
echo -e "${YELLOW}Step 5: Verifying assertions${NC}"

# Assertion 1: Commit proof
if ! grep -q "commitShaTrusted.*true" "$OUTPUT_FILE"; then
  echo -e "${RED}❌ Assertion failed: commitShaTrusted must be true${NC}"
  exit 1
fi

# Assertion 2: Templates list
if ! grep -q "Templates listed.*[1-9]" "$OUTPUT_FILE"; then
  echo -e "${RED}❌ Assertion failed: Templates list must return at least 1 template${NC}"
  exit 1
fi

# Assertion 3: Activate template
if ! grep -q "Template activated.*Dashboard.*created (201)" "$OUTPUT_FILE"; then
  echo -e "${RED}❌ Assertion failed: Activate template must return 201 and dashboardId${NC}"
  exit 1
fi

# Assertion 4: Dashboards list includes dashboardId
if ! grep -q "Dashboard.*found in dashboards list" "$OUTPUT_FILE"; then
  echo -e "${RED}❌ Assertion failed: Dashboards list must include the new dashboardId${NC}"
  exit 1
fi

# Assertion 5: Dashboard detail includes widgets
if ! grep -q "Dashboard fetched.*widgets (non-empty)" "$OUTPUT_FILE"; then
  echo -e "${RED}❌ Assertion failed: Dashboard detail must include non-empty widgets array${NC}"
  exit 1
fi

# Assertion 6: Analytics widget returns 200
if ! grep -q "widget: 200 with required fields" "$OUTPUT_FILE"; then
  echo -e "${RED}❌ Assertion failed: At least one analytics widget endpoint must return 200 with expected fields${NC}"
  exit 1
fi

# Assertion 7: AI suggest returns allowed widget types
if ! grep -q "AI suggest:.*widgetSuggestions from allowlist" "$OUTPUT_FILE"; then
  echo -e "${RED}❌ Assertion failed: AI suggest must return only allowed widget types${NC}"
  exit 1
fi

# Assertion 8: AI generate returns schema compliant dashboard
if ! grep -q "AI generate:.*schema valid" "$OUTPUT_FILE"; then
  echo -e "${RED}❌ Assertion failed: AI generate must return a schema compliant dashboard${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All assertions passed${NC}"
echo ""

# Step 6: Update release log
echo -e "${YELLOW}Step 6: Updating release log${NC}"

# Get commit SHA and trusted status from version endpoint
VERSION_JSON=$(curl -s "$BASE/api/version")
COMMIT_SHA=$(echo "$VERSION_JSON" | jq -r '.data.commitSha')
COMMIT_SHA_TRUSTED=$(echo "$VERSION_JSON" | jq -r '.data.commitShaTrusted')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Determine PASS or FAIL
if [ $VERIFY_EXIT_CODE -eq 0 ]; then
  STATUS="PASS"
else
  STATUS="FAIL"
fi

# Append to release log
cat >> docs/RELEASE_LOG_PHASE4.md <<EOF

### Phase 4.2 Verification Execution (${TIMESTAMP})

**Timestamp**: ${TIMESTAMP}
**BASE**: ${BASE}
**Commit SHA**: ${COMMIT_SHA}
**Commit SHA Trusted**: ${COMMIT_SHA_TRUSTED}
**Status**: ${STATUS}

**Full Verification Output**:
\`\`\`
$(cat "$OUTPUT_FILE")
\`\`\`

EOF

echo -e "${GREEN}✅ Release log updated${NC}"
echo ""

# Step 7: Security cleanup - redact Authorization headers if present
if grep -q "Authorization:" "$OUTPUT_FILE"; then
  echo -e "${YELLOW}Step 7: Redacting sensitive headers${NC}"
  sed -i.bak '/Authorization:/d' "$OUTPUT_FILE"
  rm -f "${OUTPUT_FILE}.bak"
  echo -e "${GREEN}✅ Sensitive headers redacted${NC}"
  echo ""
fi

echo -e "${GREEN}✅ Phase 4.2 verification finished${NC}"


