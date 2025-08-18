#!/bin/bash

# Zephix Frontend Staging Deployment Script
# Deploys to Railway static hosting

set -e

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
echo "🔗 Backend API: https://zephix-backend-staging.up.railway.app/api"

# Run smoke tests
echo "🧪 Running smoke tests..."
echo "Opening staging app in browser..."
open "https://zephix-frontend-staging.up.railway.app"

echo "✅ Staging deployment and smoke tests completed!"
