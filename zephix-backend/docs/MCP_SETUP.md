# MCP (Model Context Protocol) Setup for Zephix

## Overview

MCP enables AI assistants to interact with external tools and services, providing enhanced development capabilities for the Zephix project.

## 🚀 Quick Setup

### 1. Run the Setup Script
```bash
cd zephix-backend
./scripts/setup-mcp.sh
```

### 2. Set Environment Variables
```bash
# Railway MCP (Deployment Management)
export RAILWAY_TOKEN='your_railway_token_here'

# GitHub MCP (Repository Operations)
export GITHUB_TOKEN='your_github_pat_here'

# Web Search MCP (Research & Intelligence)
export SERPER_API_KEY='your_serper_api_key_here'
```

### 3. Restart Cursor
Restart Cursor to load the MCP configuration.

## 🔧 MCP Servers Configuration

### Railway MCP Server
- **Purpose**: Deploy, monitor, and manage Railway services
- **Commands**: Check deployment status, view logs, manage services
- **Token**: Get from Railway dashboard → Account → Tokens

### GitHub MCP Server
- **Purpose**: Repository operations, PR management, code review
- **Commands**: Create PRs, review code, manage issues
- **Token**: Create GitHub Personal Access Token with repo permissions

### Filesystem MCP Server
- **Purpose**: File operations and workspace management
- **Commands**: Read/write files, directory operations
- **Configuration**: Automatically configured for workspace

### SQLite MCP Server
- **Purpose**: Database operations and queries
- **Commands**: Execute SQL queries, manage database
- **Database**: Points to `zephix-backend/data/development.db`

### Web Search MCP Server
- **Purpose**: Research and competitive intelligence
- **Commands**: Web searches, research queries
- **API**: Serper API for Google search results

## 📋 Available MCP Commands

### Railway Operations
```bash
# Check deployment status
railway status

# View recent logs
railway logs

# Deploy to production
railway deploy --service backend

# Check service health
railway service logs backend
```

### GitHub Operations
```bash
# Create pull request
github create-pr --title "Feature: Queue System" --body "Implements background processing"

# Review code
github review-code --pr 123

# Check repository status
github repo-status
```

### Database Operations
```bash
# Execute SQL query
sqlite "SELECT * FROM users LIMIT 10"

# Check table schema
sqlite ".schema users"

# Run migration
sqlite "SELECT * FROM migrations ORDER BY id DESC LIMIT 5"
```

### Web Research
```bash
# Search for competitor information
web-search "Monday.com project management features"

# Research best practices
web-search "NestJS queue system best practices 2024"

# Find documentation
web-search "BullMQ timeout configuration"
```

## 🔑 Getting API Tokens

### Railway Token
1. Go to [Railway Dashboard](https://railway.app)
2. Navigate to Account → Tokens
3. Create new token with appropriate permissions
4. Copy token to environment variable

### GitHub Personal Access Token
1. Go to [GitHub Settings](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`, `admin:org`
4. Copy token to environment variable

### Serper API Key
1. Go to [Serper.dev](https://serper.dev)
2. Sign up for free account
3. Get API key from dashboard
4. Copy key to environment variable

## 🛠️ Troubleshooting

### MCP Server Not Starting
```bash
# Check if servers are installed
npm list -g | grep mcp

# Reinstall specific server
npm install -g @railway/mcp-server

# Check environment variables
echo $RAILWAY_TOKEN
echo $GITHUB_TOKEN
echo $SERPER_API_KEY
```

### Permission Issues
```bash
# Fix script permissions
chmod +x scripts/setup-mcp.sh

# Check npm global permissions
npm config get prefix
```

### Connection Issues
```bash
# Test Railway connection
railway whoami

# Test GitHub connection
gh auth status

# Check MCP server logs
# Look for errors in Cursor's output panel
```

## 📚 Advanced Configuration

### Custom MCP Server
```json
{
  "mcpServers": {
    "custom-server": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "CUSTOM_VAR": "value"
      }
    }
  }
}
```

### Environment-Specific Configuration
```json
{
  "mcpServers": {
    "railway-mcp": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"],
      "env": {
        "RAILWAY_TOKEN": "${env:RAILWAY_TOKEN}",
        "RAILWAY_ENVIRONMENT": "${env:NODE_ENV}"
      }
    }
  }
}
```

## 🎯 Use Cases

### Development Workflow
1. **Code Review**: Use GitHub MCP to review PRs and suggest improvements
2. **Deployment**: Use Railway MCP to deploy and monitor services
3. **Research**: Use Web Search MCP to find solutions and best practices
4. **Database**: Use SQLite MCP to query and manage data

### Production Operations
1. **Monitoring**: Check deployment status and logs
2. **Rollbacks**: Manage service rollbacks and deployments
3. **Debugging**: Access production logs and metrics
4. **Updates**: Deploy new versions and manage releases

## 🔒 Security Considerations

- **Never commit tokens** to version control
- **Use environment variables** for all sensitive data
- **Rotate tokens regularly** for production environments
- **Limit token permissions** to minimum required scope
- **Monitor token usage** for suspicious activity

## 📖 Additional Resources

- [MCP Official Documentation](https://modelcontextprotocol.io/)
- [Railway MCP Server](https://github.com/railwayapp/mcp-server)
- [GitHub MCP Server](https://github.com/modelcontextprotocol/server-github)
- [Cursor MCP Integration](https://cursor.sh/docs/mcp)

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify environment variables are set correctly
3. Check Cursor's output panel for MCP errors
4. Restart Cursor after configuration changes
5. Ensure all MCP servers are properly installed
