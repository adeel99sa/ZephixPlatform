# Dashboard System - CI/CD Guide

This guide provides step-by-step instructions for setting up, testing, and deploying the comprehensive dashboard system.

## Prerequisites

### System Requirements
- Node.js 18+ with npm/yarn
- PostgreSQL 13+ with UUID extension
- Redis (optional, for caching)
- Docker and Docker Compose (for containerized development)

### Environment Setup
```bash
# Clone the repository
git clone <repository-url>
cd zephix-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Environment Variables
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/zephix_dashboard
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=zephix_dashboard

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# AI Service Configuration
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_MODEL=claude-3-sonnet-20240229

# Dashboard System Configuration
DASHBOARD_DEFAULT_REFRESH_INTERVAL=300
DASHBOARD_MAX_WIDGETS_PER_DASHBOARD=50
DASHBOARD_MAX_DASHBOARDS_PER_USER=100
DASHBOARD_AI_ENABLED=true
```

## Local Development Setup

### 1. Database Setup
```bash
# Start PostgreSQL (using Docker)
docker run --name postgres-dashboard -e POSTGRES_PASSWORD=your_password -e POSTGRES_DB=zephix_dashboard -p 5432:5432 -d postgres:13

# Or use local PostgreSQL
createdb zephix_dashboard

# Run database migrations
npm run migration:run

# Verify tables created
npm run migration:show
```

### 2. Start Development Server
```bash
# Start in development mode
npm run start:dev

# Or start with debugging
npm run start:debug

# Verify server is running
curl http://localhost:3000/health
```

### 3. Verify Dashboard System
```bash
# Check if dashboard module is loaded
curl http://localhost:3000/api/dashboards

# Should return 401 (unauthorized) - this confirms the endpoint exists
```

## Testing

### 1. Unit Tests
```bash
# Run all unit tests
npm run test

# Run dashboard-specific tests
npm run test -- --testPathPattern=dashboard

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

### 2. Integration Tests
```bash
# Run integration tests
npm run test:e2e

# Run dashboard integration tests
npm run test:e2e -- --testPathPattern=dashboard

# Run tests with specific database
npm run test:e2e -- --config=test/jest-e2e.json
```

### 3. Manual Testing
```bash
# Create test user and organization first
# Then test dashboard endpoints:

# 1. Create dashboard
curl -X POST http://localhost:3000/api/dashboards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Dashboard",
    "type": "personal",
    "organizationId": "YOUR_ORG_ID"
  }'

# 2. List dashboards
curl http://localhost:3000/api/dashboards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Get AI recommendations
curl http://localhost:3000/api/dashboards/ai/recommendations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Migration

### 1. Generate Migration
```bash
# Generate migration for dashboard system
npm run migration:generate -- -n CreateDashboardSystem

# This creates a new migration file in src/database/migrations/
```

### 2. Review Migration
```bash
# Check the generated migration file
cat src/database/migrations/*CreateDashboardSystem.ts

# Verify:
# - All tables are created with proper constraints
# - Indexes are created for performance
# - Foreign keys are properly defined
# - Enums are correctly defined
```

### 3. Run Migration
```bash
# Run the migration
npm run migration:run

# Verify tables created
npm run migration:show

# Check database schema
npm run db:audit:schema
```

### 4. Rollback (if needed)
```bash
# Revert the migration
npm run migration:revert

# Verify rollback
npm run migration:show
```

## Security Testing

### 1. Authentication Tests
```bash
# Test without JWT token
curl http://localhost:3000/api/dashboards
# Should return 401

# Test with invalid JWT token
curl -H "Authorization: Bearer invalid_token" http://localhost:3000/api/dashboards
# Should return 401
```

### 2. Authorization Tests
```bash
# Test dashboard access with different user roles
# Create users with different permission levels
# Verify access controls work correctly
```

### 3. Input Validation Tests
```bash
# Test with invalid data
curl -X POST http://localhost:3000/api/dashboards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",  # Invalid: empty name
    "type": "invalid_type",  # Invalid: unknown type
    "organizationId": "not-a-uuid"  # Invalid: not UUID
  }'
# Should return 400 with validation errors
```

## Performance Testing

### 1. Database Performance
```bash
# Test dashboard queries with large datasets
npm run db:audit:performance

# Check query execution plans
npm run db:audit:queries
```

### 2. API Performance
```bash
# Test API response times
npm run test:performance

# Load testing with multiple concurrent requests
npm run test:load
```

### 3. Memory Usage
```bash
# Monitor memory usage during operations
npm run test:memory

# Check for memory leaks
npm run test:memory:leak
```

## Deployment

### 1. Production Build
```bash
# Build the application
npm run build

# Verify build output
ls -la dist/
```

### 2. Environment Configuration
```bash
# Set production environment variables
export NODE_ENV=production
export DATABASE_URL=your_production_db_url
export JWT_SECRET=your_production_jwt_secret
```

### 3. Database Migration (Production)
```bash
# Run migrations on production database
npm run migration:run

# Verify production schema
npm run db:audit:schema:prod
```

### 4. Health Checks
```bash
# Verify production deployment
curl https://your-domain.com/health

# Check dashboard endpoints
curl https://your-domain.com/api/dashboards
```

## Monitoring & Debugging

### 1. Logs
```bash
# View application logs
npm run logs

# View error logs
npm run logs:error

# View dashboard-specific logs
npm run logs | grep dashboard
```

### 2. Metrics
```bash
# View performance metrics
curl http://localhost:3000/metrics

# Check dashboard usage analytics
curl http://localhost:3000/api/dashboards/DASHBOARD_ID/analytics
```

### 3. Database Monitoring
```bash
# Check database connections
npm run db:status

# Monitor slow queries
npm run db:slow-queries

# Check table sizes
npm run db:table-sizes
```

## Troubleshooting

### Common Issues

#### 1. Migration Failures
```bash
# Check migration status
npm run migration:show

# Reset migrations (DANGEROUS - only in development)
npm run migration:revert:all
npm run migration:run
```

#### 2. Database Connection Issues
```bash
# Test database connection
npm run db:test-connection

# Check database configuration
npm run db:config
```

#### 3. Permission Issues
```bash
# Verify JWT token
npm run auth:verify-token YOUR_TOKEN

# Check user permissions
npm run auth:check-permissions USER_ID DASHBOARD_ID
```

#### 4. Widget Rendering Issues
```bash
# Check widget configuration
npm run dashboard:validate-widgets DASHBOARD_ID

# Test widget data sources
npm run dashboard:test-data-sources DASHBOARD_ID
```

### Debug Mode
```bash
# Start with debug logging
DEBUG=dashboard:* npm run start:dev

# Enable verbose logging
LOG_LEVEL=debug npm run start:dev
```

## CI/CD Pipeline

### 1. Automated Testing
```yaml
# .github/workflows/dashboard-test.yml
name: Dashboard System Tests

on:
  push:
    paths: ['src/dashboard/**']
  pull_request:
    paths: ['src/dashboard/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:dashboard
      - run: npm run test:e2e:dashboard
      - run: npm run build
```

### 2. Security Scanning
```bash
# Run security audit
npm audit

# Run dependency vulnerability scan
npm run security:scan

# Run code quality checks
npm run lint
npm run lint:fix
```

### 3. Performance Regression Testing
```bash
# Baseline performance
npm run test:performance:baseline

# Current performance
npm run test:performance:current

# Compare results
npm run test:performance:compare
```

## Maintenance

### 1. Regular Tasks
```bash
# Daily: Check system health
npm run health:check

# Weekly: Update dependencies
npm update
npm audit fix

# Monthly: Database maintenance
npm run db:maintenance
npm run db:vacuum
```

### 2. Backup & Recovery
```bash
# Create backup
npm run db:backup

# Test recovery
npm run db:recovery:test

# Schedule automated backups
npm run db:backup:schedule
```

### 3. Performance Optimization
```bash
# Analyze slow queries
npm run db:analyze:slow-queries

# Optimize indexes
npm run db:optimize:indexes

# Update statistics
npm run db:update:statistics
```

## Support & Documentation

### 1. API Documentation
```bash
# Generate Swagger documentation
npm run docs:generate

# View API documentation
npm run docs:serve
```

### 2. System Health
```bash
# Comprehensive health check
npm run health:comprehensive

# Generate health report
npm run health:report
```

### 3. Troubleshooting Guide
```bash
# Interactive troubleshooting
npm run troubleshoot

# Generate diagnostic report
npm run diagnose
```

---

This CI/CD guide ensures that the dashboard system is properly tested, deployed, and maintained in both development and production environments. Follow these steps carefully to ensure a robust and reliable deployment.
