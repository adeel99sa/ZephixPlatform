#!/bin/bash

# Zephix Platform - Railway Monorepo Deployment Script
# Enterprise-grade deployment automation for NestJS Backend + React Frontend
# 
# @author Zephix Development Team
# @version 2.1.0
# @description Automated deployment script for Railway monorepo

set -e  # Exit on any error

# =============================================================================
# CONFIGURATION
# =============================================================================
PROJECT_NAME="Zephix Platform"
BACKEND_SERVICE="zephix-backend"
FRONTEND_SERVICE="zephix-frontend"
DATABASE_SERVICE="zephix-database"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# =============================================================================
# PREREQUISITE CHECKS
# =============================================================================

log_info "Checking prerequisites..."

# Check if Railway CLI is installed
check_command "railway"

# Check if we're in the correct directory
if [ ! -f "railway.toml" ]; then
    log_error "railway.toml not found. Please run this script from the project root."
    exit 1
fi

# Check if backend directory exists
if [ ! -d "zephix-backend" ]; then
    log_error "zephix-backend directory not found."
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "zephix-frontend" ]; then
    log_error "zephix-frontend directory not found."
    exit 1
fi

log_success "Prerequisites check passed!"

# =============================================================================
# RAILWAY PROJECT SETUP
# =============================================================================

log_info "Setting up Railway project..."

# Check if we're logged into Railway
if ! railway whoami &> /dev/null; then
    log_error "Not logged into Railway. Please run 'railway login' first."
    exit 1
fi

# Get current project or create new one
PROJECT_ID=$(railway project --json | jq -r '.id' 2>/dev/null || echo "")

if [ -z "$PROJECT_ID" ]; then
    log_info "Creating new Railway project..."
    PROJECT_ID=$(railway project create --name "$PROJECT_NAME" --json | jq -r '.id')
    log_success "Created project with ID: $PROJECT_ID"
else
    log_info "Using existing project with ID: $PROJECT_ID"
fi

# =============================================================================
# SERVICE DEPLOYMENT
# =============================================================================

log_info "Starting monorepo deployment..."

# Deploy backend service
log_info "Deploying backend service..."
cd zephix-backend

# Set environment variables for backend
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET="ZephixJWT2024SecureKey!"
railway variables set JWT_EXPIRES_IN="15m"
railway variables set LOG_LEVEL=info
railway variables set CORS_ORIGIN="https://getzephix.com"
railway variables set API_PREFIX="/api"

# Deploy backend
railway up --service backend

log_success "Backend service deployed successfully!"

# Deploy frontend service
log_info "Deploying frontend service..."
cd ../zephix-frontend

# Set environment variables for frontend
railway variables set VITE_API_BASE_URL="https://getzephix.com/api"
railway variables set NODE_ENV=production
railway variables set NIXPACKS_BUILDER=true
railway variables set VITE_APP_NAME="Zephix AI"
railway variables set VITE_APP_VERSION="2.0.0"

# Deploy frontend
railway up --service frontend

log_success "Frontend service deployed successfully!"

# =============================================================================
# DATABASE SETUP (Optional)
# =============================================================================

log_info "Setting up database service..."

# Create PostgreSQL database service
railway service create --name "$DATABASE_SERVICE" --type postgresql

# Set database environment variables
railway variables set POSTGRES_PASSWORD="$(openssl rand -base64 32)"
railway variables set POSTGRES_DB="zephix_production"

log_success "Database service configured!"

# =============================================================================
# DOMAIN CONFIGURATION
# =============================================================================

log_info "Configuring domains..."

# Get service URLs
BACKEND_URL=$(railway domain --service backend --json | jq -r '.url' 2>/dev/null || echo "")
FRONTEND_URL=$(railway domain --service frontend --json | jq -r '.url' 2>/dev/null || echo "")

if [ -n "$BACKEND_URL" ]; then
    log_success "Backend URL: $BACKEND_URL"
fi

if [ -n "$FRONTEND_URL" ]; then
    log_success "Frontend URL: $FRONTEND_URL"
fi

# =============================================================================
# HEALTH CHECKS
# =============================================================================

log_info "Performing health checks..."

# Wait for services to be ready
sleep 30

# Check backend health
if [ -n "$BACKEND_URL" ]; then
    if curl -f "$BACKEND_URL/api/health" &> /dev/null; then
        log_success "Backend health check passed!"
    else
        log_warning "Backend health check failed. Service may still be starting..."
    fi
fi

# Check frontend health
if [ -n "$FRONTEND_URL" ]; then
    if curl -f "$FRONTEND_URL" &> /dev/null; then
        log_success "Frontend health check passed!"
    else
        log_warning "Frontend health check failed. Service may still be starting..."
    fi
fi

# =============================================================================
# DEPLOYMENT SUMMARY
# =============================================================================

log_success "=========================================="
log_success "DEPLOYMENT COMPLETE!"
log_success "=========================================="
log_success "Project: $PROJECT_NAME"
log_success "Project ID: $PROJECT_ID"
log_success "Backend URL: $BACKEND_URL"
log_success "Frontend URL: $FRONTEND_URL"
log_success "=========================================="

# =============================================================================
# MONITORING COMMANDS
# =============================================================================

log_info "Useful monitoring commands:"
echo "  railway logs --service backend"
echo "  railway logs --service frontend"
echo "  railway status"
echo "  railway service list"

log_success "Deployment script completed successfully!"
