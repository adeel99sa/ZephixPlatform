#!/bin/bash

# Zephix Railway Deployment Script
# Streamlined deployment for both backend and frontend services

set -e

echo "🚀 Zephix Railway Deployment"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        *) echo -e "${RED}❌ $message${NC}" ;;
    esac
}

# Function to check if user wants to continue
confirm_deployment() {
    echo -e "\n${YELLOW}⚠️  This will deploy to Railway production environment${NC}"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "WARNING" "Deployment cancelled by user"
        exit 0
    fi
}

# Function to deploy service
deploy_service() {
    local service=$1
    local service_name=$2
    
    echo -e "\n${BLUE}🚂 Deploying $service_name...${NC}"
    
    if railway up --service $service; then
        print_status "SUCCESS" "$service_name deployed successfully"
    else
        print_status "ERROR" "$service_name deployment failed"
        return 1
    fi
}

# Function to check service health
check_service_health() {
    local service=$1
    local service_name=$2
    
    echo -e "\n${BLUE}🏥 Checking $service_name health...${NC}"
    
    # Wait a bit for service to start
    sleep 10
    
    if railway status --service $service | grep -q "healthy"; then
        print_status "SUCCESS" "$service_name is healthy"
    else
        print_status "WARNING" "$service_name health check failed - check logs"
        railway logs --service $service --tail 20
    fi
}

# Function to show deployment summary
show_deployment_summary() {
    echo -e "\n${GREEN}🎯 Deployment Summary${NC}"
    echo "=================="
    
    echo -e "\n${BLUE}Backend Service:${NC}"
    railway status --service backend
    
    echo -e "\n${BLUE}Frontend Service:${NC}"
    railway status --service frontend
    
    echo -e "\n${BLUE}Project Overview:${NC}"
    railway status
}

# Main deployment function
main() {
    print_status "INFO" "Starting Railway deployment verification..."
    
    # Check if Railway CLI is available
    if ! command -v railway &> /dev/null; then
        print_status "ERROR" "Railway CLI not found. Install with: npm install -g @railway/cli"
        exit 1
    fi
    
    # Check if logged into Railway
    if ! railway whoami &> /dev/null; then
        print_status "ERROR" "Not logged into Railway. Run: railway login"
        exit 1
    fi
    
    print_status "SUCCESS" "Railway CLI ready"
    
    # Show current project status
    echo -e "\n${BLUE}📊 Current Project Status:${NC}"
    railway status
    
    # Confirm deployment
    confirm_deployment
    
    # Deploy backend first (dependencies)
    if deploy_service "backend" "Backend Service"; then
        check_service_health "backend" "Backend Service"
    else
        print_status "ERROR" "Backend deployment failed - aborting"
        exit 1
    fi
    
    # Deploy frontend
    if deploy_service "frontend" "Frontend Service"; then
        check_service_health "frontend" "Frontend Service"
    else
        print_status "ERROR" "Frontend deployment failed"
        exit 1
    fi
    
    # Show final status
    show_deployment_summary
    
    print_status "SUCCESS" "Deployment completed successfully!"
    
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "1. Monitor logs: railway logs"
    echo "2. Check health: railway status"
    echo "3. View services: railway open"
    echo "4. Scale if needed: railway scale"
}

# Run main function
main "$@"
