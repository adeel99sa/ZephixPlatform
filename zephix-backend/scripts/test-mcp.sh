#!/bin/bash

# MCP Test Script for Zephix
# Tests basic MCP server functionality

echo "🧪 Testing MCP servers..."

# Test Railway MCP
echo "🔍 Testing Railway MCP..."
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI found"
    railway --version
else
    echo "❌ Railway CLI not found"
    echo "   Install with: npm install -g @railway/cli"
fi

# Test GitHub CLI
echo ""
echo "🔍 Testing GitHub CLI..."
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI found"
    gh --version
else
    echo "❌ GitHub CLI not found"
    echo "   Install with: brew install gh (macOS) or apt install gh (Ubuntu)"
fi

# Test environment variables
echo ""
echo "🔍 Testing Environment Variables..."
if [ -n "$RAILWAY_TOKEN" ]; then
    echo "✅ RAILWAY_TOKEN is set"
else
    echo "❌ RAILWAY_TOKEN not set"
fi

if [ -n "$GITHUB_TOKEN" ]; then
    echo "✅ GITHUB_TOKEN is set"
else
    echo "❌ GITHUB_TOKEN not set"
fi

if [ -n "$SERPER_API_KEY" ]; then
    echo "✅ SERPER_API_KEY is set"
else
    echo "❌ SERPER_API_KEY not set"
fi

# Test MCP server packages
echo ""
echo "🔍 Testing MCP Server Packages..."
echo "Checking globally installed MCP servers:"
npm list -g | grep mcp || echo "No MCP servers found globally"

echo ""
echo "📋 MCP Status Summary:"
echo "========================"
echo "Railway MCP: $(if command -v railway &> /dev/null; then echo "✅ Ready"; else echo "❌ Not Ready"; fi)"
echo "GitHub MCP: $(if command -v gh &> /dev/null; then echo "✅ Ready"; else echo "❌ Not Ready"; fi)"
echo "Environment: $(if [ -n "$RAILWAY_TOKEN" ] && [ -n "$GITHUB_TOKEN" ]; then echo "✅ Configured"; else echo "❌ Not Configured"; fi)"

echo ""
echo "🎯 Next Steps:"
if command -v railway &> /dev/null && command -v gh &> /dev/null && [ -n "$RAILWAY_TOKEN" ] && [ -n "$GITHUB_TOKEN" ]; then
    echo "✅ All MCP servers are ready!"
    echo "   Restart Cursor to enable MCP functionality"
else
    echo "❌ Some MCP servers need setup:"
    echo "   1. Run: ./scripts/setup-mcp.sh"
    echo "   2. Set environment variables"
    echo "   3. Install missing CLI tools"
fi
