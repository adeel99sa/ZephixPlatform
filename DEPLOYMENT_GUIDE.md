# Zephix Enterprise Deployment Guide

## 🚀 Overview

This guide covers the complete enterprise-grade deployment infrastructure for Zephix, a Project Management AI Co-pilot SaaS application. The infrastructure is designed to scale to 100k+ customers with enterprise-grade security, monitoring, and reliability.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React/Vite)  │◄──►│   (NestJS)      │◄──►│  (PostgreSQL)   │
│   Port: 8080    │    │   Port: 3000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Railway       │    │   Redis Cache   │    │   Monitoring    │
│   Load Balancer │    │   (BullMQ)      │    │   (Health)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- **Node.js**: Version 20.x (LTS)
- **PostgreSQL**: Version 15+
- **Redis**: Version 7+
- **Railway Account**: With API access
- **GitHub Repository**: Connected to Railway
- **Environment Variables**: Properly configured

## 🔧 Configuration Files

### 1. Railway Configuration (`railway.toml`)

The main Railway configuration file defines:
- Service definitions and dependencies
- Build and start commands
- Health check endpoints
- Environment variables
- Resource allocation

### 2. Docker Configuration

#### Frontend Dockerfile (`zephix-frontend/Dockerfile.prod`)
- Multi-stage build for optimization
- Node.js 20 Alpine base image
- Non-root user execution
- Health check implementation
- Security hardening

#### Backend Dockerfile (`zephix-backend/Dockerfile.prod`)
- Multi-stage build with TypeScript compilation
- Production dependencies only
- Health check endpoints
- Security and performance optimization

### 3. CI/CD Pipeline (`.github/workflows/deploy.yml`)

Automated deployment pipeline with:
- Code quality gates (ESLint, TypeScript, Prettier)
- Security scanning (Trivy, Snyk, Gitleaks)
- Automated testing (unit, integration, E2E)
- Staging and production deployments
- Health check verification

## 🚀 Deployment Process

### Phase 1: Infrastructure Setup

1. **Verify Railway Project**
   ```bash
   # Check project status
   railway project:info
   ```

2. **Update Service Configurations**
   - Frontend: Port 8080, health check `/`
   - Backend: Port 3000, health check `/api/health`
   - Database: PostgreSQL 15 with proper credentials

3. **Environment Variables**
   ```bash
   # Set critical environment variables
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=$DATABASE_URL
   railway variables set JWT_SECRET=$JWT_SECRET
   ```

### Phase 2: Service Deployment

1. **Deploy Backend**
   ```bash
   cd zephix-backend
   railway up
   ```

2. **Deploy Frontend**
   ```bash
   cd zephix-frontend
   railway up
   ```

3. **Verify Deployment**
   ```bash
   # Run deployment verification
   npm run verify:deployment
   ```

### Phase 3: Database Migration

1. **Run Migration Safety Script**
   ```bash
   cd zephix-backend
   npm run migration:safety
   ```

2. **Verify Database Health**
   ```bash
   curl -f $BACKEND_URL/api/health
   ```

## 🔍 Health Checks

### Backend Health Endpoints

- **`/api/health`**: Comprehensive health check
- **`/api/health/ready`**: Readiness probe
- **`/api/health/live`**: Liveness probe

### Frontend Health Checks

- **`/`**: Main application health
- **Build verification**: Automated during deployment

### Health Check Response Format

```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T23:42:59.000Z",
  "uptime": 1234.56,
  "responseTime": "45ms",
  "environment": "production",
  "version": "1.0.0",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "critical": true,
      "details": "Connected and responsive"
    }
  ],
  "memory": {
    "used": 45,
    "total": 128,
    "external": 12
  }
}
```

## 🛡️ Security Features

### 1. Container Security
- Non-root user execution
- Minimal attack surface
- Security scanning integration
- Regular vulnerability updates

### 2. Network Security
- HTTPS enforcement
- CORS configuration
- Rate limiting
- Input validation

### 3. Secrets Management
- Railway environment variables
- No hardcoded secrets
- Secure credential rotation
- Access control

## 📊 Monitoring & Observability

### 1. Health Monitoring
- Real-time health checks
- Dependency validation
- Performance metrics
- Error tracking

### 2. Logging
- Structured JSON logging
- Request correlation IDs
- Error context preservation
- Log aggregation

### 3. Metrics
- Prometheus-compatible endpoints
- Custom business metrics
- Performance indicators
- Resource utilization

## 🔄 CI/CD Pipeline

### Quality Gates

1. **Code Quality**
   - TypeScript compilation
   - ESLint compliance
   - Prettier formatting
   - Security audit

2. **Testing**
   - Unit test coverage
   - Integration tests
   - E2E test suite
   - Performance benchmarks

3. **Security**
   - Vulnerability scanning
   - Secret detection
   - Dependency analysis
   - Container scanning

### Deployment Stages

1. **Staging** (`develop` branch)
   - Automated deployment
   - Smoke tests
   - Performance validation

2. **Production** (`main` branch)
   - Manual approval required
   - Comprehensive verification
   - Rollback capability

## 🚨 Troubleshooting

### Common Issues

#### Frontend "Invalid Input" Error
**Cause**: Node.js version mismatch or build configuration
**Solution**: 
1. Verify Node.js version (should be 20.x)
2. Check build commands in Railway
3. Verify root directory path

#### Backend Connection Issues
**Cause**: Database connectivity or environment variables
**Solution**:
1. Check DATABASE_URL configuration
2. Verify PostgreSQL service status
3. Run health check endpoints

#### Migration Failures
**Cause**: Database schema conflicts or connection issues
**Solution**:
1. Use migration safety script
2. Check database permissions
3. Verify migration state

### Debug Commands

```bash
# Check service logs
railway logs

# Verify service status
railway service:info

# Test health endpoints
curl -f $SERVICE_URL/health

# Check environment variables
railway variables:list
```

## 📈 Scaling Considerations

### 1. Horizontal Scaling
- Multiple service replicas
- Load balancer configuration
- Database connection pooling
- Cache distribution

### 2. Performance Optimization
- CDN integration
- Image optimization
- Database indexing
- Query optimization

### 3. Resource Management
- Memory limits
- CPU allocation
- Storage optimization
- Network bandwidth

## 🔒 Backup & Recovery

### 1. Database Backups
- Automated daily backups
- Point-in-time recovery
- Cross-region replication
- Backup verification

### 2. Application Recovery
- Blue-green deployments
- Rollback procedures
- Disaster recovery plans
- Data consistency checks

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [NestJS Deployment Guide](https://docs.nestjs.com/deployment)
- [React Production Build](https://create-react-app.dev/docs/production-build/)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/current/)

## 🆘 Support

For deployment issues:
1. Check service logs in Railway dashboard
2. Verify environment variable configuration
3. Run health check endpoints
4. Review CI/CD pipeline status
5. Contact engineering team with error details

---

**Last Updated**: January 13, 2025  
**Version**: 1.0.0  
**Maintainer**: Zephix Engineering Team
