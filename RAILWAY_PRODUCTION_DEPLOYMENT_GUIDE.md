# 🚀 Railway Production Deployment Guide - Zephix Backend

## 📋 Overview

This guide provides step-by-step instructions for deploying the Zephix Backend to Railway in production with all optimizations, health checks, and monitoring enabled.

## 🎯 Production Features Implemented

### ✅ Core Infrastructure
- **Enhanced main.ts** with production CORS, validation, and graceful shutdown
- **Robust health checks** with database connectivity tests
- **Production database configuration** with auto-migrations
- **Railway-optimized Dockerfile** with health checks
- **Comprehensive logging** with structured error handling

### ✅ Security & Performance
- **CORS Configuration** for production domains (getzephix.com, railway.app)
- **Helmet Security Headers** enabled by default
- **Rate Limiting** with auth-specific limits
- **IPv4 Enforcement** to prevent Railway connection issues
- **Connection Pool Optimization** for Railway limits

### ✅ Monitoring & Observability
- **Health Check Endpoint**: `/api/health`
- **Readiness Check Endpoint**: `/api/ready`
- **Metrics Endpoint**: `/api/metrics`
- **Structured Logging** with request IDs
- **OpenTelemetry Traces** enabled

## 🚀 Deployment Steps

### Phase 1: Railway Service Setup

1. **Create New Railway Service**
   ```bash
   # In Railway Dashboard:
   # 1. Create new project: "zephix-backend-production"
   # 2. Connect GitHub repository
   # 3. Select zephix-backend directory as root
   ```

2. **Configure Environment Variables**
   ```bash
   # Required Production Variables:
   NODE_ENV=production
   JWT_SECRET=your-super-secure-jwt-secret
   ANTHROPIC_API_KEY=your-anthropic-key
   CORS_ALLOWED_ORIGINS=https://getzephix.com,https://www.getzephix.com
   
   # Database (Auto-configured by Railway):
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   
   # Security & Performance:
   HELMET_ENABLED=true
   RATE_LIMIT_ENABLED=true
   RUN_MIGRATIONS_ON_BOOT=true
   ```

3. **Railway Service Configuration**
   ```yaml
   # Service Settings:
   Root Directory: zephix-backend
   Build Command: npm run build
   Start Command: npm run start:prod
   Health Check Path: /api/health
   Health Check Timeout: 30s
   Auto Deploy: true (on main branch)
   ```

### Phase 2: Database Setup

1. **Add PostgreSQL Database**
   ```bash
   # In Railway Dashboard:
   # 1. Click "Add Database" > PostgreSQL
   # 2. Railway automatically provisions and connects database
   # 3. DATABASE_URL environment variable is auto-created
   ```

2. **Migration Configuration**
   ```bash
   # Migrations will run automatically on startup via:
   RUN_MIGRATIONS_ON_BOOT=true
   
   # Manual migration (if needed):
   npm run migration:run
   ```

### Phase 3: Domain & SSL Setup

1. **Configure Custom Domain**
   ```bash
   # In Railway Dashboard:
   # 1. Go to service Settings > Domains
   # 2. Add custom domain: api.getzephix.com
   # 3. Configure DNS CNAME to point to Railway URL
   # 4. SSL certificate auto-provisioned
   ```

2. **Verify Health Checks**
   ```bash
   # Test endpoints:
   curl https://api.getzephix.com/api/health
   curl https://api.getzephix.com/api/ready
   curl https://api.getzephix.com/api/_status
   ```

## 🔧 Local Development Setup

### Prerequisites
```bash
# Install dependencies
cd zephix-backend
npm install

# Set up local environment
cp env.production.template .env
# Edit .env with your local database credentials
```

### Database Setup
```bash
# Start local PostgreSQL (using Docker)
docker run -d \
  --name zephix-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=zephix \
  -p 5432:5432 \
  postgres:15-alpine

# Run migrations
npm run db:migrate:dev
```

### Development Commands
```bash
# Start development server
npm run start:dev

# Run tests
npm run test

# Lint and format
npm run lint
npm run format

# Build for production
npm run build
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints

1. **Basic Health Check** - `/api/health`
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-15T10:30:00.000Z",
     "service": "Zephix Backend Service",
     "database": "connected",
     "environment": "production",
     "version": "1.0.0"
   }
   ```

2. **Readiness Check** - `/api/ready`
   ```json
   {
     "status": "ready",
     "timestamp": "2024-01-15T10:30:00.000Z",
     "checks": {
       "database": "pass",
       "migrations": "pass",
       "essential_tables": "pass"
     }
   }
   ```

3. **Metrics** - `/api/metrics`
   - Prometheus-formatted metrics
   - Database connection stats
   - Request/response metrics
   - System resource usage

### Railway Monitoring

```bash
# Railway CLI commands for monitoring:
railway logs --follow
railway status
railway connect

# View metrics in Railway Dashboard:
# - CPU/Memory usage
# - Request volume
# - Error rates
# - Response times
```

## 🛡️ Security Configuration

### Environment Variables Security
```bash
# Store sensitive data in Railway environment variables:
# - JWT_SECRET (generate secure random string)
# - ANTHROPIC_API_KEY (from Anthropic Console)
# - SMTP credentials (if email enabled)
# - Database credentials (auto-managed by Railway)
```

### CORS Security
```typescript
// Production CORS configuration:
const productionOrigins = [
  'https://getzephix.com',
  'https://www.getzephix.com',
  /\.railway\.app$/,
];
```

### Rate Limiting
```bash
# Global rate limiting: 60 requests/minute per IP
# Auth endpoints: 5 attempts per 15 minutes per IP
# Health checks: unlimited (excluded from rate limiting)
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check Railway database status
   railway status
   
   # Verify DATABASE_URL is set
   railway variables
   
   # Check connection pool settings in app.module.ts
   ```

2. **Migration Failures**
   ```bash
   # Run migrations manually
   railway run npm run migration:run
   
   # Check migration logs
   railway logs --filter migration
   ```

3. **Health Check Failures**
   ```bash
   # Test health endpoint
   curl -f https://your-app.railway.app/api/health
   
   # Check application logs
   railway logs --tail 100
   ```

4. **CORS Issues**
   ```bash
   # Verify CORS_ALLOWED_ORIGINS includes your frontend domain
   # Check browser developer tools for CORS errors
   # Ensure credentials: true for authenticated requests
   ```

### Performance Optimization

1. **Connection Pool Settings**
   ```typescript
   // Already optimized for Railway:
   max: 10,        // Connection pool size
   min: 2,         // Minimum connections
   family: 4,      // Force IPv4 (prevents timeouts)
   acquire: 60000, // 60s timeout for Railway delays
   ```

2. **Logging Configuration**
   ```bash
   # Production logging (optimized):
   LOG_LEVEL=info
   DB_LOGGING=false
   OTEL_ENABLED=true
   ```

## 📈 Scaling & Performance

### Railway Auto-Scaling
```bash
# Railway automatically scales based on:
# - CPU usage
# - Memory usage
# - Request volume
# - Response times

# Monitor scaling in Railway Dashboard > Metrics
```

### Database Performance
```sql
-- Monitor database performance:
SELECT * FROM pg_stat_activity WHERE state = 'active';
SELECT * FROM pg_stat_database WHERE datname = 'railway';

-- Check connection usage:
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

## 🔄 Deployment Workflow

### Automated Deployment
```bash
# Push to main branch triggers automatic deployment:
git add .
git commit -m "feat: production deployment updates"
git push origin main

# Railway automatically:
# 1. Builds the application
# 2. Runs health checks
# 3. Deploys if successful
# 4. Updates domain routing
```

### Manual Deployment
```bash
# Using Railway CLI:
railway login
railway link [project-id]
railway up

# Monitor deployment:
railway logs --follow
```

## 📞 Support & Monitoring

### Health Check URLs
- **Production Health**: https://api.getzephix.com/api/health
- **Production Readiness**: https://api.getzephix.com/api/ready
- **Production Metrics**: https://api.getzephix.com/api/metrics

### Monitoring Alerts
```bash
# Set up monitoring alerts for:
# - Health check failures (>30s downtime)
# - High error rates (>5% 5xx responses)
# - Database connection issues
# - High response times (>2s average)
```

### Rollback Procedure
```bash
# Emergency rollback:
# 1. Go to Railway Dashboard > Deployments
# 2. Click "Rollback" on previous successful deployment
# 3. Monitor health checks after rollback
# 4. Investigate and fix issues in development
```

---

## 🎉 Deployment Complete!

Your Zephix Backend is now running in production on Railway with:
- ✅ Robust health checks and monitoring
- ✅ Production-optimized database configuration
- ✅ Enhanced security with CORS, Helmet, and rate limiting
- ✅ Automatic migrations and graceful shutdowns
- ✅ Comprehensive logging and observability
- ✅ SSL/TLS encryption and custom domain support

**Next Steps:**
1. Configure frontend to use production API URL
2. Set up monitoring alerts and dashboards
3. Test all functionality in production environment
4. Document any environment-specific configurations
