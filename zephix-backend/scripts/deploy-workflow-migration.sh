#!/bin/bash

# Railway Workflow Migration Deployment Script
# This script safely deploys the fixed workflow framework migration

set -e

echo "🚀 Starting Railway Workflow Migration Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the zephix-backend directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Please ensure environment variables are configured."
    exit 1
fi

print_status "Building project..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Build completed successfully"
else
    print_error "Build failed. Please fix build issues before proceeding."
    exit 1
fi

print_status "Checking migration files..."
if [ ! -f "dist/database/migrations/1704123600000-CreateWorkflowFramework.js" ]; then
    print_error "Migration file not found in dist directory. Build may have failed."
    exit 1
fi

print_status "Migration file found and ready for deployment"

print_status "🚨 IMPORTANT: Before running this migration on Railway:"
echo "1. Ensure you have a backup of your production database"
echo "2. Verify the migration has been tested locally"
echo "3. Confirm all team members are aware of the deployment"
echo "4. Have a rollback plan ready"

read -p "Do you want to proceed with Railway deployment? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled by user"
    exit 0
fi

print_status "Starting Railway deployment..."

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    print_warning "Railway CLI not found. Please install it or use Railway dashboard."
    print_status "You can deploy manually by:"
    echo "1. Push your changes to GitHub"
    echo "2. Deploy via Railway dashboard"
    echo "3. Or install Railway CLI: npm install -g @railway/cli"
    exit 1
fi

# Deploy to Railway
print_status "Deploying to Railway..."
railway up

if [ $? -eq 0 ]; then
    print_success "Railway deployment completed successfully!"
    
    print_status "Next steps:"
    echo "1. Monitor the deployment logs in Railway dashboard"
    echo "2. Check if the migration runs successfully"
    echo "3. Verify the new tables and constraints are created"
    echo "4. Test the workflow functionality"
    
    print_status "To monitor migration logs:"
    echo "railway logs --follow"
    
else
    print_error "Railway deployment failed!"
    print_status "Troubleshooting steps:"
    echo "1. Check Railway dashboard for error details"
    echo "2. Verify environment variables are set correctly"
    echo "3. Check if the service has sufficient resources"
    echo "4. Review the build logs for any issues"
    exit 1
fi

print_success "Deployment script completed!"
