#!/bin/bash

# Zephix Backend Staging Deployment Script
# Deploys to Railway

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
ENV_FILE="${ROOT_DIR}/docs/ai/environments/staging.env"
if [ ! -f "${ENV_FILE}" ]; then
    echo "❌ Missing canonical staging env file: ${ENV_FILE}"
    exit 1
fi
STAGING_BACKEND_BASE="$(rg '^STAGING_BACKEND_BASE=' "${ENV_FILE}" -N | head -n 1 | sed 's/^STAGING_BACKEND_BASE=//')"
STAGING_BACKEND_API="$(rg '^STAGING_BACKEND_API=' "${ENV_FILE}" -N | head -n 1 | sed 's/^STAGING_BACKEND_API=//')"
if [ -z "${STAGING_BACKEND_BASE}" ] || [ -z "${STAGING_BACKEND_API}" ]; then
    echo "❌ Missing STAGING_BACKEND_BASE or STAGING_BACKEND_API in ${ENV_FILE}"
    exit 1
fi

echo "🚀 Deploying Zephix Backend to Staging..."

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
railway up --service zephix-backend-staging

echo "✅ Staging deployment completed!"
echo "🔗 Backend URL: ${STAGING_BACKEND_BASE}"
echo "🔗 Health Check: ${STAGING_BACKEND_API}/health"

# Run smoke tests
echo "🧪 Running smoke tests..."

echo "Testing health endpoint..."
curl -i "${STAGING_BACKEND_API}/health"

echo "✅ Staging deployment and smoke tests completed!"
