#!/bin/bash
# Phase 3C Preconditions Setup
set -e

echo "🔐 Zephix Dashboards Phase 3C - Preconditions Setup"
echo "=================================================="

echo "📋 Setting up environment variables..."
echo ""

# Backend reachable for real tests (adjust host)
export VITE_API_URL="https://api.zephix.yourdomain.com"
export E2E_BASE_URL="https://app.zephix.yourdomain.com"

# Feature flags (enable per rollout plan)
export VITE_FLAGS="FF_DASHBOARD_DUPLICATE,FF_DASHBOARD_DELETE,FF_AUTOSAVE_CONFLICT_UI"

echo "✅ Environment variables set:"
echo "  VITE_API_URL: $VITE_API_URL"
echo "  E2E_BASE_URL: $E2E_BASE_URL"
echo "  VITE_FLAGS: $VITE_FLAGS"
echo ""

echo "📝 To persist these variables, add to your shell profile:"
echo "export VITE_API_URL=\"https://api.zephix.yourdomain.com\""
echo "export E2E_BASE_URL=\"https://app.zephix.yourdomain.com\""
echo "export VITE_FLAGS=\"FF_DASHBOARD_DUPLICATE,FF_DASHBOARD_DELETE,FF_AUTOSAVE_CONFLICT_UI\""
echo ""

echo "🚀 Ready to run verification scripts!"
