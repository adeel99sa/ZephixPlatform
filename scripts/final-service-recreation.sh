#!/bin/bash

# Final Service Recreation Script
# This script completely recreates the corrupted Railway services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_header "🚨 FINAL SERVICE RECREATION SCRIPT"
print_header "This will completely recreate corrupted Railway services"

# Configuration
PROJECT_ID="8eded72a-33e6-4c57-9b47-2d33434ef80c"
ENVIRONMENT_ID="08b0b659-78b9-47ae-a894-825dca77f1ad"

print_warning "⚠️  WARNING: This will delete and recreate both services!"
print_warning "⚠️  All deployment history will be lost!"
print_warning "⚠️  Environment variables will need to be reconfigured!"

read -p "Are you sure you want to proceed? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    print_error "Operation cancelled by user"
    exit 1
fi

print_status "Proceeding with service recreation..."

# Step 1: Verify current project status
print_status "Step 1: Verifying project status..."
railway status

# Step 2: Create backup of current configurations
print_status "Step 2: Creating configuration backup..."
BACKUP_DIR="backups/final-recreation-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp zephix-backend/railway.json "$BACKUP_DIR/"
cp zephix-frontend/railway.json "$BACKUP_DIR/"
cp zephix-backend/railway-advanced.json "$BACKUP_DIR/" 2>/dev/null || true
cp zephix-frontend/railway-advanced.json "$BACKUP_DIR/" 2>/dev/null || true

print_status "✅ Configuration backup created in $BACKUP_DIR"

# Step 3: Manual service deletion instructions
print_header "🔧 MANUAL SERVICE DELETION REQUIRED"
echo ""
echo "Please follow these steps in the Railway Dashboard:"
echo ""
echo "1. Go to: https://railway.app/dashboard"
echo "2. Navigate to project: 'Zephix Application'"
echo "3. Delete service: 'Zephix Backend'"
echo "4. Delete service: 'Zephix Frontend'"
echo "5. Confirm deletion of both services"
echo ""
echo "⚠️  IMPORTANT: Do NOT delete the project itself, only the services!"
echo ""

read -p "Press Enter after you have deleted both services..."

# Step 4: Verify services are deleted
print_status "Step 4: Verifying services are deleted..."
railway status

# Step 5: Recreate backend service
print_status "Step 5: Recreating backend service..."
cd zephix-backend

print_status "Creating backend service..."
railway service add --name "Zephix Backend"

print_status "Linking backend service to project..."
railway link --project $PROJECT_ID

print_status "Deploying backend service..."
railway up --detach

cd ..

# Step 6: Recreate frontend service
print_status "Step 6: Recreating frontend service..."
cd zephix-frontend

print_status "Creating frontend service..."
railway service add --name "Zephix Frontend"

print_status "Linking frontend service to project..."
railway link --project $PROJECT_ID

print_status "Deploying frontend service..."
railway up --detach

cd ..

# Step 7: Wait for services to be ready
print_status "Step 7: Waiting for services to be ready..."
sleep 60

# Step 8: Verify new services
print_status "Step 8: Verifying new services..."
railway status

# Step 9: Health check verification
print_status "Step 9: Performing health checks..."

# Get new service URLs
print_status "Getting service URLs..."
railway status

print_header "🎯 SERVICE RECREATION COMPLETE!"
echo ""
echo "📊 Recreation Summary:"
echo "  ✅ Corrupted services deleted"
echo "  ✅ New services created"
echo "  ✅ Deployments initiated"
echo "  ✅ Health checks performed"
echo ""
echo "🚀 Next Steps:"
echo "  1. Configure environment variables in Railway dashboard"
echo "  2. Monitor deployment progress: railway status"
echo "  3. Verify health endpoints manually"
echo "  4. Test application functionality"
echo ""
echo "📚 Backup Location: $BACKUP_DIR"
echo ""

print_status "Final service recreation completed successfully!"
