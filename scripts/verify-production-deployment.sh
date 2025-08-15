#!/bin/bash

echo "🔍 Verifying Project Zephix Production Deployment..."

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI installed"

# Verify configurations
if [[ -f "zephix-backend/railway.toml" && -f "zephix-frontend/railway.toml" ]]; then
    echo "✅ Railway configurations present"
else
    echo "❌ Missing Railway configurations"
    exit 1
fi

# Check for Docker conflicts
if find . -name "Dockerfile*" -not -path "./node_modules/*" | grep -q .; then
    echo "❌ Docker files found - may cause conflicts"
    find . -name "Dockerfile*" -not -path "./node_modules/*"
    exit 1
fi

echo "✅ No Docker conflicts detected"

# Verify package.json
if [[ -f "zephix-backend/package.json" && -f "zephix-frontend/railway.toml" ]]; then
    echo "✅ Package configurations present"
else
    echo "❌ Missing package.json files"
    exit 1
fi

echo "🎉 Production deployment configuration verified!"
echo "Ready to deploy with: railway up"
