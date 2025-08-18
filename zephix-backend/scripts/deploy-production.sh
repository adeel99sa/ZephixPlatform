#!/bin/bash

# Zephix Backend Production Deployment Script
# Deploys to Railway

set -e

echo "🚀 Deploying Zephix Backend to Production..."

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
railway up --service zephix-backend-production

echo "✅ Production deployment completed!"
echo "🔗 Backend URL: https://zephix-backend-production.up.railway.app"
echo "🔗 Health Check: https://zephix-backend-production.up.railway.app/api/health"

# Run smoke tests
echo "🧪 Running smoke tests..."

echo "Testing health endpoint..."
curl -i "https://zephix-backend-production.up.railway.app/api/health"

echo "✅ Production deployment and smoke tests completed!"
