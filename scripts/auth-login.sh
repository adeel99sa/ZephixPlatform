#!/usr/bin/env bash
# Developer Auth Login Helper
#
# Usage (MUST use 'source' to export TOKEN to current shell):
#
# Interactive mode (prompts for email and password):
#   export BASE="https://zephix-backend-production.up.railway.app"
#   source scripts/auth-login.sh
#
# Non-interactive mode (reads EMAIL and PASSWORD from env):
#   export BASE="https://zephix-backend-production.up.railway.app"
#   export EMAIL="your-email@example.com"
#   export PASSWORD="your-password"
#   source scripts/auth-login.sh
#
# Security notes:
#   - Password is never echoed to console
#   - Token is masked in output (first 6 and last 6 chars shown)
#   - Token is never written to disk
#   - Token is only exported to current shell environment
#
# This script is for engineers only. Customers never use this.
# Dev and staging environments only.

# Detect if script is being sourced (vs executed)
IS_SOURCED=false
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  IS_SOURCED=true
fi

# Use return when sourced, exit when executed
exit_or_return() {
  if [ "$IS_SOURCED" = true ]; then
    return "$1"
  else
    exit "$1"
  fi
}

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE:-}"

# Check BASE is set
if [ -z "$BASE_URL" ]; then
  echo -e "${RED}❌ ERROR: BASE environment variable is required${NC}"
  echo "   export BASE=\"https://zephix-backend-production.up.railway.app\""
  exit_or_return 1
fi

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ ERROR: jq is required but not installed${NC}"
  exit_or_return 1
fi

# Get email (non-interactive if EMAIL env var is set)
EMAIL="${EMAIL:-}"
if [ -z "$EMAIL" ]; then
  echo -n "Email: "
  read -r EMAIL
fi

# Get password (non-interactive if PASSWORD env var is set)
PASSWORD="${PASSWORD:-}"
if [ -z "$PASSWORD" ]; then
  echo -n "Password: "
  read -rs PASSWORD
  echo ""
fi

# Validate inputs
if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo -e "${RED}❌ ERROR: Email and password are required${NC}"
  exit_or_return 1
fi

# Call login endpoint
echo "🔐 Logging in..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Check for errors (accept both 200 and 201 as success)
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo -e "${RED}❌ ERROR: Login failed (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit_or_return 1
fi

# Extract token (handle both wrapped and unwrapped responses)
TOKEN=$(echo "$BODY" | jq -r '.data.accessToken // .accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ ERROR: Access token not found in response${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit_or_return 1
fi

# Extract expiry (if available in response)
EXPIRY=$(echo "$BODY" | jq -r '.data.expiresIn // .expiresIn // "unknown"')

# Mask token for display (first 6 and last 6 chars)
if [ ${#TOKEN} -gt 12 ]; then
  TOKEN_MASKED="${TOKEN:0:6}...${TOKEN: -6}"
else
  TOKEN_MASKED="***masked***"
fi

# Export token to current shell
export TOKEN="$TOKEN"

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Token: $TOKEN_MASKED"
if [ "$EXPIRY" != "unknown" ] && [ "$EXPIRY" != "null" ]; then
  echo "   Expires in: ${EXPIRY}s"
fi
echo ""
if [ "$IS_SOURCED" = true ]; then
  echo "💡 Token exported to TOKEN environment variable in current shell"
  echo "   Run verification: bash scripts/phase3-deploy-verify.sh"
else
  echo "⚠️  WARNING: Script was executed (not sourced)"
  echo "   TOKEN export will not persist. Use 'source scripts/auth-login.sh' instead"
fi

