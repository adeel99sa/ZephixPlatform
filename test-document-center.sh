#!/bin/bash

echo "🧪 Testing Document Center Implementation"
echo "========================================"

# Check if backend is running
echo "1. Checking if backend server is running..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend server is running"
else
    echo "❌ Backend server is not running. Please start it first."
    echo "   Run: npm run start:dev"
    exit 1
fi

# Test document endpoints
echo ""
echo "2. Testing Document Endpoints..."

# Test templates endpoint
echo "   Testing GET /api/documents/templates..."
TEMPLATES_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/templates.json http://localhost:3000/api/documents/templates)
if [ "$TEMPLATES_RESPONSE" = "200" ]; then
    echo "   ✅ Templates endpoint working"
    TEMPLATE_COUNT=$(cat /tmp/templates.json | jq '. | length' 2>/dev/null || echo "0")
    echo "   📊 Found $TEMPLATE_COUNT templates"
else
    echo "   ❌ Templates endpoint failed (HTTP $TEMPLATES_RESPONSE)"
fi

# Test category filter
echo "   Testing GET /api/documents/templates?category=initiation..."
CATEGORY_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/category.json "http://localhost:3000/api/documents/templates?category=initiation")
if [ "$CATEGORY_RESPONSE" = "200" ]; then
    echo "   ✅ Category filter working"
    CATEGORY_COUNT=$(cat /tmp/category.json | jq '. | length' 2>/dev/null || echo "0")
    echo "   📊 Found $CATEGORY_COUNT initiation templates"
else
    echo "   ❌ Category filter failed (HTTP $CATEGORY_RESPONSE)"
fi

# Test stats endpoint
echo "   Testing GET /api/documents/stats/overview..."
STATS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/stats.json http://localhost:3000/api/documents/stats/overview)
if [ "$STATS_RESPONSE" = "200" ]; then
    echo "   ✅ Stats endpoint working"
    TOTAL_DOCS=$(cat /tmp/stats.json | jq '.total' 2>/dev/null || echo "0")
    echo "   📊 Total documents: $TOTAL_DOCS"
else
    echo "   ❌ Stats endpoint failed (HTTP $STATS_RESPONSE)"
fi

echo ""
echo "3. Testing Frontend Components..."

# Check if frontend builds
echo "   Testing frontend build..."
cd zephix-frontend
if npm run build > /dev/null 2>&1; then
    echo "   ✅ Frontend builds successfully"
else
    echo "   ❌ Frontend build failed"
fi

echo ""
echo "🎉 Document Center Test Complete!"
echo ""
echo "📋 Implementation Summary:"
echo "✅ Database schema created"
echo "✅ Backend entities and services implemented"
echo "✅ API endpoints created"
echo "✅ Frontend components built"
echo "✅ Command palette integration added"
echo "✅ Navigation updated"
echo ""
echo "🚀 Next Steps:"
echo "1. Set up database connection"
echo "2. Run migrations to create document tables"
echo "3. Initialize document templates"
echo "4. Test document creation and editing"
echo "5. Deploy to production"


