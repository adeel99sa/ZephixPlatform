#!/bin/bash

# Zephix Backend Staging Deployment Script
# Deploys to Railway

set -e

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
echo "🔗 Backend URL: https://zephix-backend-staging.up.railway.app"
echo "🔗 Health Check: https://zephix-backend-staging.up.railway.app/api/health"

# Run smoke tests
echo "🧪 Running smoke tests..."

echo "Testing health endpoint..."
curl -i "https://zephix-backend-staging.up.railway.app/api/health"

echo "✅ Staging deployment and smoke tests completed!"
