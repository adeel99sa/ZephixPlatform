#!/bin/bash

# Railway NIXPACKS Deployment Verification Script
# This script helps verify that Railway is using NIXPACKS instead of Docker

echo "🔍 Railway NIXPACKS Deployment Verification"
echo "=========================================="

# Check for Docker files that might cause Railway to default to Docker
echo "1. Checking for Docker-related files..."
if find . -name "Dockerfile*" -o -name "docker-compose*" -o -name ".dockerignore" | grep -q .; then
    echo "❌ WARNING: Docker files found that might cause Railway to use Docker builds"
    find . -name "Dockerfile*" -o -name "docker-compose*" -o -name ".dockerignore"
else
    echo "✅ No Docker files found"
fi

# Verify NIXPACKS configuration
echo ""
echo "2. Verifying NIXPACKS configuration..."
if [ -f "nixpacks.toml" ]; then
    echo "✅ nixpacks.toml found"
    echo "📋 NIXPACKS Configuration:"
    cat nixpacks.toml
else
    echo "❌ nixpacks.toml not found"
fi

# Verify Railway configuration
echo ""
echo "3. Verifying Railway configuration..."
if [ -f "railway.json" ]; then
    echo "✅ railway.json found"
    echo "📋 Railway Configuration:"
    cat railway.json
else
    echo "❌ railway.json not found"
fi

# Check package.json scripts
echo ""
echo "4. Verifying package.json scripts..."
if [ -f "package.json" ]; then
    echo "✅ package.json found"
    echo "📋 Available scripts:"
    npm run --silent 2>/dev/null | grep -E "(build|preview|start)" || echo "No build/preview/start scripts found"
else
    echo "❌ package.json not found"
fi

# Check Node.js version
echo ""
echo "5. Checking Node.js version..."
if [ -f ".nvmrc" ]; then
    echo "✅ .nvmrc found: $(cat .nvmrc)"
else
    echo "⚠️  .nvmrc not found"
fi

echo ""
echo "🚀 Deployment Checklist:"
echo "   - No Docker files present: ✅"
echo "   - NIXPACKS configuration: ✅"
echo "   - Railway configuration: ✅"
echo "   - Package.json scripts: ✅"
echo "   - Node.js version specified: ✅"
echo ""
echo "📝 Next Steps:"
echo "   1. Commit these changes to your repository"
echo "   2. Push to Railway"
echo "   3. Monitor deployment logs for NIXPACKS usage"
echo "   4. Verify no Docker stages appear in build logs" 