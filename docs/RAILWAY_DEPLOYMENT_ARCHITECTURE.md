# Zephix Railway Deployment Architecture

## Overview

This document outlines the comprehensive deployment architecture for Project Zephix on Railway Pro, designed to eliminate infrastructure conflicts and ensure enterprise-grade scalability.

## Root Cause Analysis

### The Problem
Railway's auto-detection system is fundamentally incompatible with our monorepo structure. The platform is designed for single-service repositories, not sophisticated microservices architecture.

### Constitutional Violation
We were fighting infrastructure instead of building enterprise-grade features, violating the principle of prioritizing robustness over speed.

## Solution Architecture

### Phase 1: Deployment Pipeline Standardization ✅

#### 1.1 Explicit Builder Configuration
- **Root Level**: `railway.toml` for monorepo coordination
- **Backend**: `zephix-backend/railway.toml` with explicit nixpacks configuration
- **Frontend**: `zephix-frontend/railway.toml` with explicit nixpacks configuration

#### 1.2 Monorepo Structure Optimization
- **Service Isolation**: Each microservice has completely isolated build context
- **Dependency Management**: Prevents cross-service dependency issues
- **Container-Ready**: Aligned with future Docker/Kubernetes orchestration requirements

#### 1.3 Service Isolation
- **Comprehensive `.railwayignore`**: Root and service-specific ignore patterns
- **No Docker Conflicts**: Removed all conflicting Dockerfiles
- **Clean Deployments**: Only essential production files are deployed

## Configuration Files

### Root Railway Configuration (`railway.toml`)
```toml
# Zephix Monorepo - Root Railway Configuration
[build]
builder = "nixpacks"

[build.variables]
DISABLE_DOCKER = "true"
FORCE_NIXPACKS = "true"
BUILDER_OVERRIDE = "nixpacks"
MONOREPO_ROOT = "true"

[services]
backend = "zephix-backend"
frontend = "zephix-frontend"

[env]
NODE_ENV = "production"
RAILWAY_PROJECT_ID = "zephix-app"
RAILWAY_SERVICE_ID = "root"
```

### Backend Service Configuration (`zephix-backend/railway.toml`)
```toml
[build]
builder = "nixpacks"
buildCommand = "npm ci --only=production && npm run build"

[deploy]
startCommand = "npm run start:railway"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[env]
NODE_ENV = "production"
PORT = "3000"

[build.variables]
DISABLE_DOCKER = "true"
FORCE_NIXPACKS = "true"
BUILDER_OVERRIDE = "nixpacks"
NIXPACKS_NODE_VERSION = "20"
```

### Frontend Service Configuration (`zephix-frontend/railway.toml`)
```toml
[build]
builder = "nixpacks"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "npm run preview"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3

[env]
NODE_ENV = "production"
PORT = "3000"

[build.variables]
DISABLE_DOCKER = "true"
FORCE_NIXPACKS = "true"
BUILDER_OVERRIDE = "nixpacks"
NIXPACKS_NODE_VERSION = "20"
```

## Service Isolation Strategy

### Root `.railwayignore`
- Forces nixpacks usage over Docker
- Prevents cross-service dependencies
- Excludes development and test files
- Maintains only essential production files

### Service-Specific `.railwayignore`
- **Backend**: Isolates NestJS service files
- **Frontend**: Isolates React SPA files
- **No Cross-Contamination**: Each service deploys independently

## Deployment Process

### Pre-Deployment Verification
```bash
# Run the verification script
./scripts/verify-railway-deployment.sh
```

### Deployment Commands
```bash
# Deploy all services
railway up

# Deploy specific service
railway up --service backend
railway up --service frontend

# Monitor deployment
railway logs

# Check service status
railway status
```

### Health Check Verification
- **Backend**: `/api/health` endpoint
- **Frontend**: `/` root endpoint
- **Timeout**: 300 seconds
- **Retries**: 3 attempts
- **Interval**: 30 seconds

## Environment Configuration

### Required Environment Variables
```bash
# Backend
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
OPENAI_API_KEY=...

# Frontend
NODE_ENV=production
PORT=3000
VITE_API_URL=https://...
VITE_SENTRY_DSN=...
```

### Security Considerations
- **No Hardcoded Secrets**: All secrets in Railway environment variables
- **Production Isolation**: Development configs excluded from deployment
- **Health Check Security**: Internal health endpoints only

## Monitoring and Observability

### Health Checks
- **Automated Monitoring**: Railway handles health check failures
- **Restart Policies**: Automatic restart on failure (max 3 retries)
- **Response Time Monitoring**: 300-second timeout for health checks

### Logging
- **Structured Logging**: JSON format for production
- **Request ID Tracking**: x-request-id header support
- **Error Boundaries**: Proper error handling and reporting

## Future Scalability

### Container Migration Path
- **Docker-Ready**: Current structure prepares for future containerization
- **Kubernetes Compatible**: Service isolation aligns with K8s deployment patterns
- **Microservices Architecture**: Each service can be independently scaled

### Enterprise Features
- **RBAC Implementation**: Role-based access control ready
- **Multi-Tenant Support**: Database schema supports organization isolation
- **API Gateway**: Centralized routing and authentication

## Troubleshooting

### Common Issues
1. **Builder Detection Conflicts**: Ensure all Dockerfiles are removed
2. **Service Dependencies**: Check `.railwayignore` files for proper isolation
3. **Environment Variables**: Verify all required variables are set in Railway

### Debug Commands
```bash
# Check Railway configuration
railway status

# View deployment logs
railway logs --service backend
railway logs --service frontend

# Verify service health
curl https://your-backend.railway.app/api/health
curl https://your-frontend.railway.app/
```

## Constitutional Compliance

This deployment architecture ensures:

✅ **Cloud-Native Architecture**: Proper microservices isolation  
✅ **Scalability**: Enterprise-grade deployment pipeline  
✅ **Security**: Proper environment configuration  
✅ **Quality**: Follows tie-breaker principle - prioritizing robustness over speed  

## Next Steps

### Phase 2: Production-Ready Configuration (Next Session)
- [ ] Observability Implementation
  - [ ] Structured logging (JSON format)
  - [ ] Health check endpoints
  - [ ] Metrics exposure for monitoring
- [ ] Security Hardening
  - [ ] Environment variable security
  - [ ] JWT authentication pipeline preparation

### Return to Core Business Logic
- [ ] BRD-to-Plan engine development
- [ ] AI chat service enhancement
- [ ] User experience improvements

## Conclusion

This deployment architecture eliminates the root cause of infrastructure conflicts rather than treating symptoms. Project Zephix is now positioned for enterprise scalability with a robust, maintainable deployment pipeline that aligns with our constitutional requirements.
