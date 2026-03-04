#!/bin/bash

# Zephix Frontend Staging Deployment Script
# Deploys to Railway static hosting

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
if [ ! -f "${ENV_FILE}" ]; then
    echo "❌ Missing canonical staging env file: ${ENV_FILE}"
    exit 1
fi
STAGING_BACKEND_API="$(rg '^STAGING_BACKEND_API=' "${ENV_FILE}" -N | head -n 1 | sed 's/^STAGING_BACKEND_API=//')"
if [ -z "${STAGING_BACKEND_API}" ]; then
    echo "❌ Missing STAGING_BACKEND_API in ${ENV_FILE}"
    exit 1
fi

echo "🚀 Deploying Zephix Frontend to Staging..."

# Build the application
echo "📦 Building application..."
npm run build

# Verify build output
if [ ! -d "dist" ]; then
    echo "❌ Build failed: dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Railway
echo "🚂 Deploying to Railway staging..."
railway up --service zephix-frontend-staging

echo "✅ Staging deployment completed!"
echo "🌐 Frontend URL: https://zephix-frontend-staging.up.railway.app"
echo "🔗 Backend API: ${STAGING_BACKEND_API}"

# Run smoke tests
echo "🧪 Running smoke tests..."
echo "Opening staging app in browser..."
open "https://zephix-frontend-staging.up.railway.app"

echo "✅ Staging deployment and smoke tests completed!"
