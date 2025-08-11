#!/bin/bash

echo "🚀 Zephix Frontend Deployment Verification"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from zephix-frontend directory"
    exit 1
fi

echo "✅ Current directory: $(pwd)"

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Check dist folder
echo "📁 Checking build output..."
if [ -f "dist/index.html" ]; then
    echo "✅ dist/index.html exists"
else
    echo "❌ dist/index.html missing"
    exit 1
fi

if [ -d "dist/assets" ]; then
    echo "✅ dist/assets directory exists"
    echo "   Assets count: $(ls dist/assets | wc -l)"
else
    echo "❌ dist/assets directory missing"
    exit 1
fi

# Check configuration files
echo "⚙️  Checking configuration files..."
if [ -f "nginx.conf" ]; then
    echo "✅ nginx.conf exists"
    if grep -q "\${PORT:-80}" nginx.conf; then
        echo "✅ PORT environment variable configured"
    else
        echo "❌ PORT environment variable not configured"
    fi
else
    echo "❌ nginx.conf missing"
fi

if [ -f "start-nginx.sh" ]; then
    echo "✅ start-nginx.sh exists"
    if [ -x "start-nginx.sh" ]; then
        echo "✅ start-nginx.sh is executable"
    else
        echo "❌ start-nginx.sh is not executable"
    fi
else
    echo "❌ start-nginx.sh missing"
fi

if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile exists"
    if grep -q "start-nginx.sh" Dockerfile; then
        echo "✅ Dockerfile uses startup script"
    else
        echo "❌ Dockerfile doesn't use startup script"
    fi
else
    echo "❌ Dockerfile missing"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Commit and push these changes:"
echo "   git add ."
echo "   git commit -m 'fix: configure nginx for Railway PORT environment variable'"
echo "   git push origin main"
echo ""
echo "2. Railway will automatically redeploy"
echo "3. Check Railway logs for: 'Starting nginx on port X'"
echo "4. Test health endpoint: https://your-domain.railway.app/health"
echo "5. Test main site: https://your-domain.railway.app"
echo ""
echo "🔍 If issues persist, check Railway logs for:"
echo "   - PORT environment variable value"
echo "   - nginx startup messages"
echo "   - Any error messages"
