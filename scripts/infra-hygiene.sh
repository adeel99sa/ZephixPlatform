#!/bin/bash
# 🧼 Infrastructure Hygiene Script
# Zero-risk hardening moves for Zephix infrastructure

set -e

echo "🧼 Running Zephix Infrastructure Hygiene..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Verify Railway CLI is installed and logged in
echo "🔍 Checking Railway CLI..."
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not found. Install it first."
    exit 1
fi

if ! railway whoami &> /dev/null; then
    print_error "Not logged into Railway. Run 'railway login' first."
    exit 1
fi

print_status "Railway CLI ready"

# 2. Check current service status
echo "🔍 Checking service status..."
railway status

# 3. Verify database health
echo "🔍 Verifying database health..."
if psql "$DATABASE_URL" -c "select version(), now(), current_database();" &> /dev/null; then
    print_status "Database connection healthy"
else
    print_error "Database connection failed"
    exit 1
fi

# 4. Verify API health
echo "🔍 Verifying API health..."
API_URL="https://zephix-backend-production.up.railway.app"
if curl -s "$API_URL/api/health" | jq -e '.status == "healthy"' &> /dev/null; then
    print_status "API health check passing"
else
    print_warning "API health check failed - check manually"
fi

# 5. Check environment variables
echo "🔍 Checking environment variables..."
railway variables --service zephix-backend | grep -E "DATABASE_URL|JWT_SECRET|CORS_ALLOWED_ORIGINS" > /dev/null
if [ $? -eq 0 ]; then
    print_status "Critical environment variables present"
else
    print_warning "Some environment variables may be missing"
fi

# 6. Verify no local .env files that could shadow Railway vars
echo "🔍 Checking for local .env files..."
if [ -f ".env" ] || [ -f ".env.local" ] || [ -f ".env.production" ]; then
    print_warning "Local .env files found - ensure they don't shadow Railway variables"
    ls -la .env* 2>/dev/null || true
else
    print_status "No local .env files found (good for Railway deployment)"
fi

# 7. Check database connection count
echo "🔍 Checking database connection count..."
CONN_COUNT=$(psql "$DATABASE_URL" -t -c "select count(*) from pg_stat_activity;" 2>/dev/null | tr -d ' ')
if [ -n "$CONN_COUNT" ] && [ "$CONN_COUNT" -lt 20 ]; then
    print_status "Database connection count healthy: $CONN_COUNT"
else
    print_warning "Database connection count: $CONN_COUNT (monitor if > 20)"
fi

# 8. Verify SSL is enforced
echo "🔍 Checking SSL configuration..."
if railway variables --service zephix-backend | grep -q "DB_SSL=require"; then
    print_status "SSL enforced for database connections"
else
    print_warning "DB_SSL not set to 'require' - check security"
fi

echo ""
echo "🎉 Infrastructure hygiene check complete!"
echo ""
echo "📋 Next steps:"
echo "1. Rename services in Railway dashboard:"
echo "   - 'Postgres' → 'db-postgres'"
echo "   - 'zephix-backend' → 'api-backend'"
echo ""
echo "2. Add service note on DB plugin:"
echo "   'Managed Railway Postgres plugin; ignore code build logs.'"
echo ""
echo "3. Set up monitoring alerts for:"
echo "   - API health check non-200"
echo "   - Database connection failures"
echo ""
echo "4. Schedule quarterly backup restore tests"
echo ""
echo "📖 See INFRASTRUCTURE.md for detailed runbook"
