#!/bin/bash

# Zephix Uptime Monitor - Railway Deployment Script

echo "🚀 Deploying Zephix Uptime Monitor to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   or visit: https://railway.app/cli"
    exit 1
fi

# Check if logged in
if ! railway status &> /dev/null; then
    echo "🔐 Please log in to Railway first:"
    echo "   railway login"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env with your email settings before continuing."
    echo "   Required variables: SMTP_USER, SMTP_PASS, ALERT_EMAIL"
    exit 1
fi

echo "📋 Setting up Railway project..."

# Create new Railway project
railway create "zephix-uptime-monitor"

echo "⚙️  Setting environment variables..."

# Read .env file and set variables in Railway
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
        continue
    fi
    
    # Remove quotes from value if present
    value=$(echo "$value" | sed 's/^["'\'']\|["'\'']$//g')
    
    # Set variable in Railway
    if [[ -n $value ]]; then
        echo "Setting $key..."
        railway variables set "$key=$value"
    fi
done < .env

echo "📦 Deploying to Railway..."

# Deploy the service
railway up

echo "✅ Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "1. Check deployment status: railway status"
echo "2. View logs: railway logs"
echo "3. Check service URL: railway domain"
echo ""
echo "🔧 To update environment variables:"
echo "   railway variables set VARIABLE_NAME=value"
echo ""
echo "📧 Test email alerts:"
echo "   railway run npm test"
