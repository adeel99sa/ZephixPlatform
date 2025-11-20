#!/bin/bash

# Railway Branch Verification Script
# Checks if Railway is configured to deploy from correct branch

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Railway Branch Configuration Check${NC}\n"

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI not installed${NC}"
    echo -e "${YELLOW}   Install: npm i -g @railway/cli${NC}"
    echo -e "${YELLOW}   Or check manually in Railway Dashboard${NC}"
    echo ""
    echo -e "${YELLOW}Manual Check:${NC}"
    echo "1. Railway Dashboard → Backend Service → Settings → Source"
    echo "2. Verify Branch is: release/v0.5.0-alpha"
    exit 0
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged into Railway${NC}"
    echo -e "${YELLOW}   Run: railway login${NC}"
    exit 1
fi

# Get current git branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "Current Git Branch: ${GREEN}$CURRENT_BRANCH${NC}"

# Expected branch
EXPECTED_BRANCH="release/v0.5.0-alpha"

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    echo -e "${YELLOW}⚠️  You're on branch: $CURRENT_BRANCH${NC}"
    echo -e "${YELLOW}   Expected: $EXPECTED_BRANCH${NC}"
    echo ""
    echo -e "${YELLOW}Switch branch:${NC}"
    echo "  git checkout release/v0.5.0-alpha"
fi

# Check Railway service configuration
echo -e "\n${YELLOW}Checking Railway Service Configuration...${NC}"

# Try to get service info (may require service selection)
if railway status 2>/dev/null | grep -q "Connected"; then
    echo -e "${GREEN}✅ Railway CLI connected${NC}"
    
    # Get latest deployment info
    echo -e "\n${YELLOW}Latest Deployment Info:${NC}"
    railway logs --tail 1 2>/dev/null || echo "  (Run 'railway logs' for deployment details)"
else
    echo -e "${YELLOW}⚠️  Railway service not linked in this directory${NC}"
    echo -e "${YELLOW}   Check Railway Dashboard manually${NC}"
fi

echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Manual Verification Steps:${NC}"
echo ""
echo "1. Railway Dashboard → Backend Service → Settings → Source"
echo "   Expected Branch: ${GREEN}release/v0.5.0-alpha${NC}"
echo ""
echo "2. Railway Dashboard → Backend Service → Deployments → Latest"
echo "   Check commit hash matches latest in GitHub"
echo ""
echo "3. If branch is wrong:"
echo "   - Settings → Source → Change Branch → Select release/v0.5.0-alpha"
echo "   - Save and redeploy"
echo ""
echo "4. If commit is old:"
echo "   - Deployments → Click 'Redeploy'"
echo "   - This forces Railway to pull latest code"

