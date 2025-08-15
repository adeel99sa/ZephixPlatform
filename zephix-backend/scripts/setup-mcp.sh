#!/bin/bash

# Zephix MCP Setup Script
# This script installs and configures all MCP servers for development

echo "🚀 Setting up MCP servers for Zephix development..."

# Install Railway MCP Server
echo "📦 Installing Railway MCP Server..."
npm install -g @railway/mcp-server

# Install GitHub MCP Server
echo "📦 Installing GitHub MCP Server..."
npm install -g @modelcontextprotocol/server-github

# Install Filesystem MCP Server
echo "📦 Installing Filesystem MCP Server..."
npm install -g @modelcontextprotocol/server-filesystem

# Install SQLite MCP Server
echo "📦 Installing SQLite MCP Server..."
npm install -g @modelcontextprotocol/server-sqlite

# Install Web Search MCP Server
echo "📦 Installing Web Search MCP Server..."
npm install -g @modelcontextprotocol/server-web-search

echo ""
echo "✅ MCP servers installed successfully!"
echo ""
echo "🔑 Next steps:"
echo "1. Set your RAILWAY_TOKEN in environment:"
echo "   export RAILWAY_TOKEN='your_token_here'"
echo ""
echo "2. Set your GITHUB_TOKEN in environment:"
echo "   export GITHUB_TOKEN='your_github_pat_here'"
echo ""
echo "3. Set your SERPER_API_KEY in environment:"
echo "   export SERPER_API_KEY='your_serper_key_here'"
echo ""
echo "4. Restart Cursor to load MCP configuration"
echo ""
echo "📚 Available MCP Commands:"
echo "   - Railway: Check deployment status, logs, and manage services"
echo "   - GitHub: Repository operations, PR management, code review"
echo "   - Filesystem: File operations and workspace management"
echo "   - SQLite: Database operations and queries"
echo "   - Web Search: Research and competitive intelligence"
