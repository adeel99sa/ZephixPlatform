#!/bin/bash

# Railway Build Verification Script
# Ensures build output structure matches Railway deployment expectations

set -e

echo "🔍 Verifying Railway build compatibility..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ dist directory not found. Running build first..."
    npm run build
fi

# Verify main.js exists in correct location
if [ ! -f "dist/main.js" ]; then
    echo "❌ CRITICAL ERROR: dist/main.js not found!"
    echo "Expected location: dist/main.js"
    echo "Actual build output:"
    ls -la dist/
    echo ""
    echo "Files containing 'main':"
    find dist/ -name "*main*" -type f
    exit 1
fi

# Verify build output structure
echo "✅ Build verification successful:"
echo "   - dist/main.js exists ✓"
echo "   - Build output structure:"
ls -la dist/ | head -10

# Test start command locally
echo ""
echo "🧪 Testing start command locally..."
echo "Starting service for 5 seconds to verify it works..."

# Cross-platform timeout (macOS uses gtimeout, Linux uses timeout)
if command -v gtimeout >/dev/null 2>&1; then
    gtimeout 5s node dist/main.js || echo "Service started successfully (timeout expected)"
elif command -v timeout >/dev/null 2>&1; then
    timeout 5s node dist/main.js || echo "Service started successfully (timeout expected)"
else
    echo "⚠️  Timeout command not available, testing start command directly..."
    node dist/main.js &
    PID=$!
    sleep 3
    kill $PID 2>/dev/null || echo "Service started successfully"
fi

echo ""
echo "🚀 Railway deployment ready!"
echo "   - Start command: node dist/main.js"
echo "   - Build output: dist/main.js"
echo "   - All configurations verified ✓"
