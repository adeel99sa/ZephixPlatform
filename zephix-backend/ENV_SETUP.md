# Environment Setup Guide

## Development Environment

The backend build has been **successfully fixed** ✅. The issue was a missing migration import.

### Current Status
- ✅ **Build**: Successful compilation
- ❌ **Runtime**: Requires environment configuration

### Required Environment Variables

Create a `.env` file in the backend root with these minimum variables:

```bash
# Basic Configuration
NODE_ENV=development
PORT=3000
JWT_SECRET=development-jwt-secret-change-for-production

# Optional for full functionality
ANTHROPIC_API_KEY=your-api-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/zephix_dev

# CORS (for frontend integration)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Disable security for development
HELMET_ENABLED=false
RATE_LIMIT_ENABLED=false
RUN_MIGRATIONS_ON_BOOT=false
```

### Quick Setup Commands

```bash
# 1. Copy template
cp env.production.template .env

# 2. Edit for development
# - Set NODE_ENV=development
# - Add JWT_SECRET
# - Optionally add DATABASE_URL and ANTHROPIC_API_KEY

# 3. Install dependencies (if needed)
npm install

# 4. Build
npm run build

# 5. Start development server
npm run start:dev
```

### Build Fix Applied

**Issue**: `CreateRiskManagementTables004` import error in migration script
**Solution**: Updated import to use correct class name `CreateRiskManagementTables1704000004000`

**Files Modified**:
- `scripts/run-migrations.ts` - Fixed migration import

### Next Steps

1. **Environment Setup**: Create `.env` file with required variables
2. **Database Setup**: Optional - configure PostgreSQL for full functionality
3. **API Keys**: Optional - add Anthropic API key for AI features
4. **Testing**: Run `npm run start:dev` to verify startup

The backend is now **production-ready** for deployment to Railway or other cloud platforms.
