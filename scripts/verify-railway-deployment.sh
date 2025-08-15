#!/bin/bash

# Zephix Railway Deployment Verification Script
# Ensures proper deployment configuration and service health

set -e

echo "🚀 Zephix Railway Deployment Verification"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
}

# Check if Railway CLI is installed
check_railway_cli() {
    if command -v railway &> /dev/null; then
        print_status "SUCCESS" "Railway CLI is installed"
        railway --version
    else
        print_status "WARNING" "Railway CLI not found. Install with: npm install -g @railway/cli"
        return 1
    fi
}

# Verify Railway project configuration
verify_project_config() {
    echo -e "\n🔍 Verifying Railway Project Configuration..."
    
    if [ -f "railway.toml" ]; then
        print_status "SUCCESS" "Root railway.toml found"
    else
        print_status "ERROR" "Root railway.toml not found"
        return 1
    fi
    
    if [ -f "zephix-backend/railway.toml" ]; then
        print_status "SUCCESS" "Backend railway.toml found"
    else
        print_status "ERROR" "Backend railway.toml not found"
        return 1
    fi
    
    if [ -f "zephix-frontend/railway.toml" ]; then
        print_status "SUCCESS" "Frontend railway.toml found"
    else
        print_status "ERROR" "Frontend railway.toml found"
        return 1
    fi
}

# Verify service isolation
verify_service_isolation() {
    echo -e "\n🔒 Verifying Service Isolation..."
    
    # Check for Dockerfiles (should not exist)
    if find . -name "Dockerfile*" -type f | grep -q .; then
        print_status "WARNING" "Dockerfiles found - these should be removed for Railway deployment"
        find . -name "Dockerfile*" -type f
    else
        print_status "SUCCESS" "No Dockerfiles found - proper for Railway deployment"
    fi
    
    # Check .railwayignore files
    if [ -f ".railwayignore" ]; then
        print_status "SUCCESS" "Root .railwayignore found"
    else
        print_status "ERROR" "Root .railwayignore not found"
    fi
    
    if [ -f "zephix-backend/.railwayignore" ]; then
        print_status "SUCCESS" "Backend .railwayignore found"
    else
        print_status "ERROR" "Backend .railwayignore not found"
    fi
    
    if [ -f "zephix-frontend/.railwayignore" ]; then
        print_status "SUCCESS" "Frontend .railwayignore found"
    else
        print_status "ERROR" "Frontend .railwayignore not found"
    fi
}

# Verify package.json configurations
verify_package_configs() {
    echo -e "\n📦 Verifying Package Configurations..."
    
    # Check backend package.json
    if [ -f "zephix-backend/package.json" ]; then
        if grep -q '"start:railway"' zephix-backend/package.json; then
            print_status "SUCCESS" "Backend start:railway script found"
        else
            print_status "ERROR" "Backend start:railway script not found"
        fi
        
        if grep -q '"build"' zephix-backend/package.json; then
            print_status "SUCCESS" "Backend build script found"
        else
            print_status "ERROR" "Backend build script not found"
        fi
    fi
    
    # Check frontend package.json
    if [ -f "zephix-frontend/package.json" ]; then
        if grep -q '"preview"' zephix-frontend/package.json; then
            print_status "SUCCESS" "Frontend preview script found"
        else
            print_status "ERROR" "Frontend preview script not found"
        fi
        
        if grep -q '"build"' zephix-frontend/package.json; then
            print_status "SUCCESS" "Frontend build script found"
        else
            print_status "ERROR" "Frontend build script not found"
        fi
    fi
}

# Verify Railway service status (if logged in)
verify_railway_status() {
    echo -e "\n🚂 Verifying Railway Service Status..."
    
    if railway whoami &> /dev/null; then
        print_status "SUCCESS" "Logged into Railway"
        
        # Get project info
        if railway status &> /dev/null; then
            print_status "SUCCESS" "Railway project status retrieved"
            railway status
        else
            print_status "WARNING" "Could not retrieve Railway project status"
        fi
    else
        print_status "WARNING" "Not logged into Railway. Run: railway login"
    fi
}

# Main verification function
main() {
    echo "Starting deployment verification..."
    
    check_railway_cli
    verify_project_config
    verify_service_isolation
    verify_package_configs
    verify_railway_status
    
    echo -e "\n🎯 Deployment Verification Complete!"
    echo -e "\nNext Steps:"
    echo "1. Ensure all environment variables are set in Railway"
    echo "2. Deploy services: railway up"
    echo "3. Monitor deployment: railway logs"
    echo "4. Verify health checks: railway status"
}

# Run main function
main "$@"
