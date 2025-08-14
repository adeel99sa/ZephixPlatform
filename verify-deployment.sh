#!/bin/bash

echo "🔍 Verifying Railway deployment..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check project status
echo "📊 Checking Railway project status..."
railway status

# Check service status
echo "🚀 Checking service status..."
railway service:list

echo "✅ Deployment verification complete!"
echo "Next steps:"
echo "1. Run: railway up (from respective service directories)"
echo "2. Check logs: railway logs"
echo "3. Monitor deployment: railway status"
