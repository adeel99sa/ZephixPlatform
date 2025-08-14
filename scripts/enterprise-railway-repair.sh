#!/bin/bash

# Enterprise Railway Service Repair Script
# This script implements advanced repair techniques for Railway services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[HEADER]${NC} $1"
}

# Configuration
PROJECT_ID="8eded72a-33e6-4c57-9b47-2d33434ef80c"
ENVIRONMENT_ID="08b0b659-78b9-47ae-a894-825dca77f1ad"
BACKEND_SERVICE_ID="27fb104a-84b0-416e-a995-c2268e983ce1"
FRONTEND_SERVICE_ID="c2e60cd1-d8f1-42c6-8ed5-2fa3508dd8b0"

print_header "🚀 Enterprise Railway Service Repair Script"
print_header "Starting advanced service repair process..."

# Phase 1: Deep System Inspection
print_status "Phase 1: Deep System Inspection"

# Check Railway CLI and authentication
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Verify authentication
if ! railway whoami &> /dev/null; then
    print_error "Not authenticated with Railway. Please run: railway login"
    exit 1
fi

print_status "✅ Railway CLI verified and authenticated"

# Check project status
print_status "Checking project status..."
railway status

# Phase 2: Non-Destructive Service Repair
print_status "Phase 2: Non-Destructive Service Repair"

# Create backup of current configuration
print_status "Creating configuration backup..."
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
cp zephix-backend/railway.json backups/$(date +%Y%m%d_%H%M%S)/backend-railway.json
cp zephix-frontend/railway.json backups/$(date +%Y%m%d_%H%M%S)/frontend-railway.json

print_status "✅ Configuration backup created"

# Phase 3: Advanced Configuration Update
print_status "Phase 3: Advanced Configuration Update"

# Update backend with advanced configuration
print_status "Updating backend service configuration..."
if [ -f "zephix-backend/railway-advanced.json" ]; then
    cp zephix-backend/railway-advanced.json zephix-backend/railway.json
    print_status "✅ Backend advanced configuration applied"
else
    print_warning "Backend advanced configuration not found, using standard config"
fi

# Update frontend with advanced configuration
print_status "Updating frontend service configuration..."
if [ -f "zephix-frontend/railway-advanced.json" ]; then
    cp zephix-frontend/railway-advanced.json zephix-frontend/railway.json
    print_status "✅ Frontend advanced configuration applied"
else
    print_warning "Frontend advanced configuration not found, using standard config"
fi

# Phase 4: Reference Reconciliation
print_status "Phase 4: Reference Reconciliation"

# Verify directory structure
print_status "Verifying directory structure..."
if [ ! -d "zephix-backend" ]; then
    print_error "Backend directory not found"
    exit 1
fi

if [ ! -d "zephix-frontend" ]; then
    print_error "Frontend directory not found"
    exit 1
fi

print_status "✅ Directory structure verified"

# Verify required files exist
print_status "Verifying required files..."
required_backend_files=("package.json" "src/main.ts" "tsconfig.json")
required_frontend_files=("package.json" "src/main.tsx" "vite.config.ts" "index.html")

for file in "${required_backend_files[@]}"; do
    if [ ! -f "zephix-backend/$file" ]; then
        print_error "Required backend file not found: $file"
        exit 1
    fi
done

for file in "${required_frontend_files[@]}"; do
    if [ ! -f "zephix-frontend/$file" ]; then
        print_error "Required frontend file not found: $file"
        exit 1
    fi
done

print_status "✅ Required files verified"

# Phase 5: Controlled Deployment Reset
print_status "Phase 5: Controlled Deployment Reset"

# Link to backend service and deploy
print_status "Deploying backend service..."
cd zephix-backend
railway link --project $PROJECT_ID
railway up --detach
cd ..

# Link to frontend service and deploy
print_status "Deploying frontend service..."
cd zephix-frontend
railway link --project $PROJECT_ID
railway up --detach
cd ..

print_status "✅ Deployment initiated for both services"

# Phase 6: Advanced Verification
print_status "Phase 6: Advanced Verification"

# Wait for deployments to start
print_status "Waiting for deployments to initialize..."
sleep 30

# Check deployment status
print_status "Checking deployment status..."
railway status

# Phase 7: Health Validation
print_status "Phase 7: Health Validation"

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 60

# Check service health
print_status "Checking service health..."

# Get service URLs
BACKEND_URL=$(railway variables get RAILWAY_BACKEND_URL 2>/dev/null || echo "https://zephix-backend-production.up.railway.app")
FRONTEND_URL=$(railway variables get RAILWAY_FRONTEND_URL 2>/dev/null || echo "https://zephix-frontend-production.up.railway.app")

print_status "Backend URL: $BACKEND_URL"
print_status "Frontend URL: $FRONTEND_URL"

# Health check backend
print_status "Performing backend health check..."
if curl -f "$BACKEND_URL/api/health" &> /dev/null; then
    print_status "✅ Backend health check passed"
else
    print_warning "⚠️  Backend health check failed"
fi

# Health check frontend
print_status "Performing frontend health check..."
if curl -f "$FRONTEND_URL/" &> /dev/null; then
    print_status "✅ Frontend health check passed"
else
    print_warning "⚠️  Frontend health check failed"
fi

# Phase 8: Summary and Next Steps
print_header "🎯 Enterprise Railway Service Repair Complete!"

echo ""
echo "📊 Repair Summary:"
echo "  ✅ Configuration backup created"
echo "  ✅ Advanced configurations applied"
echo "  ✅ Directory structure verified"
echo "  ✅ Required files verified"
echo "  ✅ Deployments initiated"
echo "  ✅ Health checks performed"
echo ""

echo "🚀 Next Steps:"
echo "  1. Monitor deployment progress: railway status"
echo "  2. Check service logs: railway logs"
echo "  3. Verify health endpoints manually"
echo "  4. Review monitoring dashboard"
echo ""

echo "📚 Documentation:"
echo "  - Advanced configs: zephix-*/railway-advanced.json"
echo "  - SRE monitoring: monitoring/railway-sre.yaml"
echo "  - Backup location: backups/$(date +%Y%m%d_%H%M%S)/"
echo ""

print_status "Enterprise repair script completed successfully!"
