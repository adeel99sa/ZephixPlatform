#!/bin/bash

# Environment Setup Script for Zephix MCP
# Sets up required environment variables

echo "🔧 Setting up MCP environment variables..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "✅ .env file created from env.example"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔑 Required Environment Variables:"
echo "=================================="

# Railway Token
if [ -n "$RAILWAY_TOKEN" ]; then
    echo "✅ RAILWAY_TOKEN is set"
else
    echo "❌ RAILWAY_TOKEN not set"
    echo "   Get from: https://railway.app/account/tokens"
    echo "   Add to .env: RAILWAY_TOKEN=your_token_here"
fi

# Check if we can get Railway token from CLI
echo ""
echo "🔍 Checking Railway authentication..."
if command -v railway &> /dev/null; then
    if railway whoami &> /dev/null; then
        echo "✅ Railway CLI authenticated"
        echo "   You can get your token with: railway whoami"
    else
        echo "❌ Railway CLI not authenticated"
        echo "   Run: railway login"
    fi
else
    echo "❌ Railway CLI not found"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Add your RAILWAY_TOKEN to .env file"
echo "2. Restart Cursor to load MCP configuration"
echo "3. Test MCP with: ./scripts/test-mcp.sh"
echo ""
echo "💡 Tip: You can also set environment variables in your shell profile:"
echo "   echo 'export RAILWAY_TOKEN=your_token_here' >> ~/.zshrc"
echo "   source ~/.zshrc"
