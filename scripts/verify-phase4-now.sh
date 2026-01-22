#!/usr/bin/env bash
# Simple Phase 4.2 Verification - Run this after setting BASE, EMAIL, PASSWORD

set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

# Check required vars
if [ -z "${BASE:-}" ]; then
  echo "❌ BASE not set. Run: export BASE=\"https://zephix-backend-production.up.railway.app\""
  exit 1
fi

if [ -z "${EMAIL:-}" ]; then
  echo "❌ EMAIL not set. Run: export EMAIL=\"your-email@example.com\""
  exit 1
fi

if [ -z "${PASSWORD:-}" ]; then
  echo "❌ PASSWORD not set. Run: export PASSWORD='your-password'"
  exit 1
fi

# Authenticate
echo "🔐 Authenticating..."
source scripts/auth-login.sh

# Run verification
echo ""
echo "🚀 Running verification..."
bash scripts/run-phase4-dashboard-verify.sh


