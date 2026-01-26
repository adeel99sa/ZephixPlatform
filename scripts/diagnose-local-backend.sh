#!/bin/bash
# Quick diagnostic script for local backend connection issues

echo "🔍 Diagnosing Local Backend Connection Issues"
echo "=============================================="
echo ""

echo "1️⃣ Checking if backend is running on port 3000..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Port 3000 is in use:"
    lsof -i :3000
else
    echo "❌ Port 3000 is NOT in use - backend is not running"
    echo ""
    echo "💡 Start backend with:"
    echo "   cd zephix-backend && npm run start:dev"
    exit 1
fi

echo ""
echo "2️⃣ Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3000/api/health 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend is responding:"
    echo "$BODY" | head -5
else
    echo "❌ Backend health check failed (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    echo ""
    echo "💡 Check backend terminal for errors"
    exit 1
fi

echo ""
echo "3️⃣ Testing Vite proxy target..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is accessible from localhost"
else
    echo "❌ Cannot reach backend from localhost"
    echo ""
    echo "💡 Check:"
    echo "   - Backend is running (see step 1)"
    echo "   - No firewall blocking localhost:3000"
    echo "   - Backend didn't crash (check backend terminal)"
    exit 1
fi

echo ""
echo "4️⃣ Checking Vite configuration..."
if [ -f "zephix-frontend/vite.config.ts" ]; then
    PROXY_TARGET=$(grep -A 3 "proxy:" zephix-frontend/vite.config.ts | grep "target:" | head -1)
    if echo "$PROXY_TARGET" | grep -q "localhost:3000"; then
        echo "✅ Vite proxy configured for localhost:3000"
    else
        echo "⚠️  Vite proxy target: $PROXY_TARGET"
        echo "   Expected: target: 'http://localhost:3000'"
    fi
else
    echo "❌ vite.config.ts not found"
fi

echo ""
echo "✅ All checks passed! Backend should be accessible."
echo ""
echo "💡 If frontend still can't connect:"
echo "   1. Restart Vite dev server (Ctrl+C, then npm run dev)"
echo "   2. Check browser console for CORS errors"
echo "   3. Verify frontend is on http://localhost:5173"
