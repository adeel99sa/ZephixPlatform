#!/bin/bash

# Zephix Platform Deployment Script
# This script builds and deploys the Zephix platform components

set -e  # Exit on any error

echo "🚀 Starting Zephix Platform Deployment..."

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

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "zephix-backend" ]; then
    print_error "Please run this script from the Zephix project root directory"
    exit 1
fi

print_status "Building Backend Service..."

# Build backend
cd zephix-backend
npm install
npm run build

if [ $? -eq 0 ]; then
    print_status "Backend build successful"
else
    print_error "Backend build failed"
    exit 1
fi

cd ..

print_status "Building Frontend Service..."

# Build frontend
cd zephix-frontend
npm install
npm run build

if [ $? -eq 0 ]; then
    print_status "Frontend build successful"
else
    print_error "Frontend build failed"
    exit 1
fi

cd ..

print_status "✅ All builds completed successfully!"
print_status "🚀 Ready for deployment to Railway"

echo ""
echo "Next steps:"
echo "1. Commit your changes: git add . && git commit -m 'Deploy updates'"
echo "2. Push to Railway: git push railway main"
echo "3. Monitor deployment at: https://railway.app" 