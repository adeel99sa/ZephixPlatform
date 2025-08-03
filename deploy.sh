#!/bin/bash

# Zephix Application Deployment Script
# This script helps deploy the application to Railway

set -e

echo "🚀 Starting Zephix Application Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    print_error "Not logged in to Railway. Please run: railway login"
    exit 1
fi

print_status "Building backend service..."
cd zephix-auth-service
npm install
npm run build
cd ..

print_status "Building frontend service..."
cd zephix-frontend
npm install
npm run build
cd ..

print_status "Deploying to Railway..."
railway up

print_status "Deployment completed! 🎉"
print_status "Check your Railway dashboard for deployment status."
print_status "Health check endpoints:"
echo "  - Backend: https://zephix-backend-production-27fb104a.up.railway.app/api/health"
echo "  - Frontend: https://zephix-frontend-production-2c3ec553.up.railway.app"

print_warning "Remember to:"
echo "  1. Configure your custom domain (getzephix.com) in Railway dashboard"
echo "  2. Set up DNS records for your domain"
echo "  3. Configure path-based routing for API endpoints" 