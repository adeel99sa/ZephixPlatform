#!/bin/bash

# Railway Service Recreation Script
# This script handles recreation of Railway frontend service if Docker builds persist

echo "🔄 Railway Service Recreation Script"
echo "===================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$1" = "INFO" ]; then
        echo -e "${BLUE}ℹ️  $2${NC}"
    elif [ "$1" = "SUCCESS" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
    elif [ "$1" = "ERROR" ]; then
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Check if Railway CLI is installed
check_railway_cli() {
    if command -v railway &> /dev/null; then
        print_status "SUCCESS" "Railway CLI is installed"
        return 0
    else
        print_status "ERROR" "Railway CLI is not installed"
        print_status "INFO" "Install Railway CLI: npm install -g @railway/cli"
        return 1
    fi
}

# Check if user is logged into Railway
check_railway_auth() {
    if railway whoami &> /dev/null; then
        print_status "SUCCESS" "Logged into Railway"
        return 0
    else
        print_status "ERROR" "Not logged into Railway"
        print_status "INFO" "Run: railway login"
        return 1
    fi
}

# Get current service information
get_service_info() {
    print_status "INFO" "Getting current service information..."
    
    # Try to get service list
    if railway service list &> /dev/null; then
        print_status "SUCCESS" "Service list retrieved"
        railway service list
    else
        print_status "WARNING" "Could not retrieve service list"
    fi
}

# Delete frontend service
delete_frontend_service() {
    print_status "WARNING" "This will delete the frontend service and all its data"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "INFO" "Deleting frontend service..."
        
        # Try to delete the service
        if railway service delete --service frontend 2>/dev/null; then
            print_status "SUCCESS" "Frontend service deleted"
        else
            print_status "WARNING" "Could not delete service via CLI"
            print_status "INFO" "Please delete the frontend service manually from Railway Dashboard"
        fi
    else
        print_status "INFO" "Service deletion cancelled"
    fi
}

# Create new frontend service
create_frontend_service() {
    print_status "INFO" "Creating new frontend service..."
    
    # Create new service with correct configuration
    if railway service create --name frontend --source zephix-frontend; then
        print_status "SUCCESS" "Frontend service created"
    else
        print_status "ERROR" "Failed to create frontend service"
        return 1
    fi
}

# Configure service settings
configure_service() {
    print_status "INFO" "Configuring service settings..."
    
    # Set root directory
    if railway service update --service frontend --root-dir zephix-frontend; then
        print_status "SUCCESS" "Root directory set to zephix-frontend"
    else
        print_status "WARNING" "Could not set root directory via CLI"
        print_status "INFO" "Please set root directory manually in Railway Dashboard"
    fi
    
    # Set environment variables
    print_status "INFO" "Setting environment variables..."
    railway variables set NODE_ENV=production --service frontend
    railway variables set VITE_API_BASE_URL=https://getzephix.com/api --service frontend
}

# Deploy service
deploy_service() {
    print_status "INFO" "Deploying service..."
    
    if railway up --service frontend; then
        print_status "SUCCESS" "Service deployment initiated"
    else
        print_status "ERROR" "Failed to deploy service"
        return 1
    fi
}

# Monitor deployment
monitor_deployment() {
    print_status "INFO" "Monitoring deployment..."
    
    echo "📋 Deployment monitoring commands:"
    echo "   - View logs: railway logs --service frontend"
    echo "   - Check status: railway service status --service frontend"
    echo "   - Open dashboard: railway open --service frontend"
    
    # Show logs
    print_status "INFO" "Recent deployment logs:"
    railway logs --service frontend --tail 20
}

# Main execution
main() {
    echo "🚀 Railway Service Recreation Process"
    echo "===================================="
    
    # Step 1: Check prerequisites
    print_status "INFO" "Step 1: Checking prerequisites..."
    if ! check_railway_cli; then
        exit 1
    fi
    
    if ! check_railway_auth; then
        exit 1
    fi
    
    # Step 2: Get current service info
    print_status "INFO" "Step 2: Getting current service information..."
    get_service_info
    
    # Step 3: Delete existing service
    print_status "INFO" "Step 3: Deleting existing frontend service..."
    delete_frontend_service
    
    # Step 4: Create new service
    print_status "INFO" "Step 4: Creating new frontend service..."
    if ! create_frontend_service; then
        exit 1
    fi
    
    # Step 5: Configure service
    print_status "INFO" "Step 5: Configuring service settings..."
    configure_service
    
    # Step 6: Deploy service
    print_status "INFO" "Step 6: Deploying service..."
    if ! deploy_service; then
        exit 1
    fi
    
    # Step 7: Monitor deployment
    print_status "INFO" "Step 7: Monitoring deployment..."
    monitor_deployment
    
    echo ""
    print_status "SUCCESS" "Service recreation process completed!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Monitor deployment logs for NIXPACKS usage"
    echo "   2. Verify no Docker stages appear in build logs"
    echo "   3. Test application URLs"
    echo "   4. Confirm React app loads correctly"
    echo ""
    echo "🔍 Success indicators:"
    echo "   - Railway logs show 'NIXPACKS' instead of 'Docker'"
    echo "   - Successful npm install and build"
    echo "   - React app accessible at Railway URLs"
}

# Run main function
main "$@" 