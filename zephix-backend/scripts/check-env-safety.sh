#!/bin/bash

# Zephix Environment Safety Check
# This script checks if .env files are accidentally committed

set -e

echo "🔒 Checking environment file safety..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files are tracked by git
if git ls-files | grep -q "\.env$"; then
    echo -e "${RED}❌ CRITICAL: .env file is tracked by git!${NC}"
    echo "   This exposes sensitive credentials to version control."
    echo "   Run: git rm --cached .env"
    echo "   Then add .env to .gitignore if not already there."
    exit 1
fi

# Check if any .env files are tracked
if git ls-files | grep -q "\.env"; then
    echo -e "${YELLOW}⚠️  WARNING: Some .env files are tracked by git${NC}"
    git ls-files | grep "\.env"
    echo "   Consider removing these from version control."
else
    echo -e "${GREEN}✅ No .env files are tracked by git${NC}"
fi

# Check if .env.example exists
if [ -f "env.example" ]; then
    echo -e "${GREEN}✅ env.example exists for team configuration${NC}"
else
    echo -e "${YELLOW}⚠️  env.example not found${NC}"
    echo "   Create this file to show required environment variables."
fi

# Check .gitignore
if grep -q "\.env" .gitignore; then
    echo -e "${GREEN}✅ .env files are properly excluded in .gitignore${NC}"
else
    echo -e "${RED}❌ .env files are NOT excluded in .gitignore${NC}"
    echo "   Add '.env' to .gitignore to prevent accidental commits."
fi

echo ""
echo -e "${GREEN}🎉 Environment safety check complete!${NC}"
echo ""
echo "💡 Remember:"
echo "   - Never commit .env files"
echo "   - Use env.example for team configuration"
echo "   - Keep .env.local, .env.development, etc. out of version control"
