#!/usr/bin/env bash
# Quick Phase 4.2 Verification Runner
# Run this in your terminal after setting: export BASE, EMAIL, PASSWORD

cd "$(dirname "$0")/.." || exit 1

if [ -z "${BASE:-}" ] || [ -z "${EMAIL:-}" ] || [ -z "${PASSWORD:-}" ]; then
  echo "❌ Error: BASE, EMAIL, and PASSWORD must be set"
  echo "   export BASE=\"https://zephix-backend-production.up.railway.app\""
  echo "   export EMAIL=\"your-email@example.com\""
  echo "   export PASSWORD='your-password'"
  exit 1
fi

bash scripts/_phase4_2_verify_complete.sh


