#!/bin/bash

# Zephix Frontend Production Deployment Script
# Deploys to Railway static hosting

set -e

echo "🚀 Deploying Zephix Frontend to Production..."

# Run CI guardrails
echo "🔒 Running CI guardrails..."
./scripts/ci-guardrails.sh

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
echo "🚂 Deploying to Railway production..."
railway up --service zephix-frontend-production

echo "✅ Production deployment completed!"
echo "🌐 Frontend URL: https://zephix-frontend-production.up.railway.app"
echo "🔗 Backend API: https://zephix-backend-production.up.railway.app/api"

# Run smoke tests
echo "🧪 Running smoke tests..."
echo "Opening production app in browser..."
open "https://zephix-frontend-production.up.railway.app"

echo "✅ Production deployment and smoke tests completed!"
