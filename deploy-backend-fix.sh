#!/bin/bash

echo "🚀 Starting Railway Backend Deployment Fix..."

# Check if we're in the correct directory
if [ ! -d "zephix-backend" ]; then
    echo "❌ Error: zephix-backend directory not found!"
    echo "Current directory: $(pwd)"
    echo "Available directories:"
    ls -la
    exit 1
fi

echo "✅ Found zephix-backend directory"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"

# Check if we're logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please login first:"
    echo "railway login"
    exit 1
fi

echo "✅ Logged in to Railway"

# List projects to get the correct project ID
echo "📋 Available Railway projects:"
railway projects

echo ""
echo "🔧 Railway Configuration Check:"
echo "Root railway.toml:"
cat railway.toml

echo ""
echo "Backend railway.json:"
cat zephix-backend/railway.json

echo ""
echo "Backend package.json scripts:"
cat zephix-backend/package.json | grep -A 10 '"scripts"'

echo ""
echo "🚀 To deploy the backend, run:"
echo "railway up --service backend"
echo ""
echo "Or to deploy all services:"
echo "railway up"
echo ""
echo "To check deployment status:"
echo "railway status"
echo ""
echo "To view logs:"
echo "railway logs --service backend" 